import express from "express";
import crypto from "crypto";
import { parse, isValid } from "date-fns";
import prisma from "../../lib/prisma";
import { Prisma, EventCategory } from "@prisma/client";

import { requireAuth } from "../../lib/auth-middleware";
import { CreateEventSchema } from "../types";

const router = express.Router();

function parseTimeString(timeStr: string) {
  const tryFormats = ["h:mm a", "HH:mm"];

  for (const fmt of tryFormats) {
    const parsed = parse(timeStr, fmt, new Date());
    if (isValid(parsed)) return parsed;
  }

  throw new Error(`Invalid time string: ${timeStr}`);
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const data = req.body as unknown as CreateEventSchema;

    const {
      creatorId,
      title,
      description,
      location,
      category,
      eventType,
      ticketType,
      coverUrl,
      eventDates,
      ticketTypes,
      discountCodes = [],
    } = data;

    const createdEventId = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const event = await tx.event.create({
          data: {
            title,
            description,
            location,
            category,
            eventType: eventType === "single_day" ? "single_day" : "recurring",
            isFree: ticketType === "free",
            organizerId: creatorId,
            imageUrl: coverUrl,
          },
        });

        await tx.eventOccurrence.createMany({
          data: eventDates.map((d) => {
            const baseDate = new Date(d.startDate);

            const startTimeParts = parseTimeString(d.startTime);
            const endTimeParts = parseTimeString(d.endTime);

            const startTime = new Date(baseDate);
            startTime.setHours(
              startTimeParts.getHours(),
              startTimeParts.getMinutes()
            );

            const endTime = new Date(baseDate);
            endTime.setHours(
              endTimeParts.getHours(),
              endTimeParts.getMinutes()
            );

            return {
              eventId: event.id,
              startTime,
              endTime,
              date: baseDate,
            };
          }),
        });

        await tx.ticketType.createMany({
          data: ticketTypes.map((t) => ({
            eventId: event.id,
            name: t.ticketName,
            price: parseFloat(t.ticketPrice),
            quantityTotal: parseInt(t.ticketStock),
            quantitySold: 0,
          })),
        });

        if (discountCodes.length > 0) {
          await tx.discountCode.createMany({
            data: discountCodes.map((d) => {
              const codeHash = crypto
                .createHash("sha256")
                .update(d.discountCode)
                .digest("hex");

              return {
                eventId: event.id,
                codeHash,
                discountPercent: parseInt(d.percentOff),
                validTill: new Date(d.expirationDate),
              };
            }),
          });
        }

        return event.id;
      }
    );

    res.status(201).json({ success: true, eventId: createdEventId });
  } catch (error) {
    console.error("Create event failed:", error);
    res.status(500).json({ success: false, error: "Something went wrong" });
  }
});

router.get("/", async (req, res) => {
  try {
    const {
      category,
      organizerId,
      isFree,
      limit = "20",
      offset = "0",
    } = req.query as {
      category?: string;
      organizerId?: string;
      isFree?: string;
      limit?: string;
      offset?: string;
    };

    const events = await prisma.event.findMany({
      where: {
        ...(category && { category: category as any }),
        ...(organizerId && { organizerId }),
        ...(isFree !== undefined && { isFree: isFree === "true" }),
      },
      include: {
        occurrences: true,
        ticketTypes: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    res.json({ success: true, events });
  } catch (error) {
    console.error("Failed to fetch events:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/:id", async (req, res): Promise<any> => {
  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        occurrences: true,
        ticketTypes: true,
        discountCodes: true,
        savedBy: true,
        organizer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    const relatedEvents = await prisma.event.findMany({
      where: {
        // category: event.category,
        id: { not: event.id },
      },
      take: 3,
      orderBy: {
        createdAt: "desc", 
      },
      include: {
        occurrences: true,
        ticketTypes: true,
      },
    });

    res.json({ success: true, event, relatedEvents });
    
  } catch (error) {
    console.error("Failed to fetch event:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/category/:category", async (req, res): Promise<any> => {
  const category = req.params.category.toLowerCase();
  const { limit = "20", offset = "0" } = req.query as {
    limit?: string;
    offset?: string;
  };

  // Find the enum key whose lowercased value matches the incoming category
  const matchedEnumValue = Object.values(EventCategory).find(
    (val) => val.toLowerCase() === category
  );

  if (!matchedEnumValue) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid event category" });
  }

  try {
    const events = await prisma.event.findMany({
      where: {
        category: matchedEnumValue, // Proper enum value from Prisma
      },
      include: {
        occurrences: true,
        ticketTypes: true,
        organizer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    res.json({ success: true, events });
  } catch (error) {
    console.error("Failed to fetch events by category:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.put("/:id", requireAuth, async (req, res): Promise<any> => {
  const { id } = req.params;
  const user = req.user!;
  const { title, description, location, category, coverUrl, eventType } =
    req.body;

  try {
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    if (event.organizerId !== user.id) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        location,
        category,
        imageUrl: coverUrl,
        eventType,
      },
    });

    res.json({ success: true, event: updatedEvent });
  } catch (error) {
    console.error("Update event failed:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.delete("/:id", requireAuth, async (req, res): Promise<any> => {
  const { id } = req.params;
  const user = req.user!;

  try {
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return res.status(404).json({ success: false, error: "Event not found" });
    }

    // Allow deletion if user is the organizer OR if user is an admin
    if (event.organizerId !== user.id && !user.isAdmin) {
      return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    await prisma.event.delete({ where: { id } });

    res.json({ success: true, message: "Event deleted" });
  } catch (error) {
    console.error("Delete event failed:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
