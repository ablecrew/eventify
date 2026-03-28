import express from "express";
import prisma from "../../lib/prisma";
import { requireAuth } from "../../lib/auth-middleware";

const router = express.Router();

const validateEventId = (eventId: string) => {
  return eventId && typeof eventId === "string" && eventId.trim().length > 0;
};

router.post("/batch", requireAuth, async (req, res): Promise<any> => {
  const { eventIds } = req.body;
  const userId = req.user!.id;

  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    return res.status(400).json({ error: "Invalid event IDs array" });
  }

  const invalidIds = eventIds.filter((id) => !validateEventId(id));
  if (invalidIds.length > 0) {
    return res.status(400).json({
      error: "Invalid event IDs",
      invalidIds,
    });
  }

  try {
    const savedEvents = await prisma.savedEvent.findMany({
      where: {
        userId,
        eventId: {
          in: eventIds,
        },
      },
      select: {
        eventId: true,
      },
    });

    const bookmarkStatuses = eventIds.reduce((acc, eventId) => {
      acc[eventId] = savedEvents.some((saved) => saved.eventId === eventId);
      return acc;
    }, {} as Record<string, boolean>);

    return res.json({
      success: true,
      bookmarkStatuses,
    });
  } catch (error) {
    console.error("Batch check saved events failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:eventId", requireAuth, async (req, res): Promise<any> => {
  const { eventId } = req.params;
  const userId = req.user!.id;

  if (!validateEventId(eventId)) {
    return res.status(400).json({ error: "Invalid event ID" });
  }

  try {
    const saved = await prisma.savedEvent.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    return res.json({ isSaved: !!saved });
  } catch (error) {
    console.error("Check saved event failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:eventId", requireAuth, async (req, res): Promise<any> => {
  const { eventId } = req.params;
  const userId = req.user!.id;

  if (!validateEventId(eventId)) {
    return res.status(400).json({ error: "Invalid event ID" });
  }

  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true },
    });

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    const existingSave = await prisma.savedEvent.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    if (existingSave) {
      return res.status(200).json({
        success: true,
        message: "Event already in wishlist",
        eventTitle: event.title,
      });
    }

    await prisma.savedEvent.create({
      data: {
        userId,
        eventId,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Event added to wishlist",
      eventTitle: event.title,
    });
  } catch (error) {
    console.error("Save event failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:eventId", requireAuth, async (req, res): Promise<any> => {
  const { eventId } = req.params;
  const userId = req.user!.id;

  if (!validateEventId(eventId)) {
    return res.status(400).json({ error: "Invalid event ID" });
  }

  try {
    const savedEvent = await prisma.savedEvent.findUnique({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
      include: {
        event: {
          select: { title: true },
        },
      },
    });

    if (!savedEvent) {
      return res.status(404).json({ error: "Event not found in wishlist" });
    }

    await prisma.savedEvent.delete({
      where: {
        userId_eventId: {
          userId,
          eventId,
        },
      },
    });

    return res.json({
      success: true,
      message: "Event removed from wishlist",
      eventTitle: savedEvent.event.title,
    });
  } catch (error) {
    console.error("Unsave event failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/", requireAuth, async (req, res): Promise<any> => {
  const userId = req.user!.id;

  try {
    const savedEvents = await prisma.savedEvent.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            occurrences: true,
            ticketTypes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      events: savedEvents.map((s) => s.event),
    });
  } catch (error) {
    console.error("Fetch saved events failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
