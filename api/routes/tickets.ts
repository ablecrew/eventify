import express from "express";
import prisma from "../../lib/prisma";

import { requireAuth } from "../../lib/auth-middleware";

const router = express.Router();

/**
 * Get all tickets belonging to a specific user
 */
router.get("/user/:userId", requireAuth, async (req, res): Promise<any> => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const tickets = await prisma.ticket.findMany({
      where: {
        userId: userId,
      },
      include: {
        event: {
          select: {
            title: true,
            location: true,
            imageUrl: true,
            category: true,
          },
        },
        eventOccurrence: {
          select: {
            startTime: true,
            endTime: true,
            date: true,
          },
        },
        ticketType: {
          select: {
            name: true,
            price: true,
          },
        },
        purchase: {
          select: {
            purchasedAt: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        issuedAt: "desc",
      },
    });

    const formattedTickets = tickets.map((ticket) => {
      const eventDate = new Date(ticket.eventOccurrence.date);
      const startTime = new Date(ticket.eventOccurrence.startTime);
      const purchaseDate = new Date(
        ticket.purchase?.purchasedAt || ticket.issuedAt
      );

      const formatDate = (date: Date) => {
        return date
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
          .replace(/\//g, " / ");
      };

      const formatEventDate = (date: Date) => {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      };

      const formatTime = (date: Date) => {
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      };

      return {
        id: ticket.id,
        eventTitle: ticket.event.title,
        eventType:
          ticket.event.category === "concert"
            ? "Concert"
            : ticket.event.category === "auto_show"
            ? "Auto Show"
            : ticket.event.category === "art"
            ? "Art Show"
            : ticket.event.category === "expo"
            ? "Expo"
            : ticket.event.category === "festival"
            ? "Festival"
            : ticket.event.category === "comedy"
            ? "Comedy Show"
            : ticket.event.category === "food_drink"
            ? "Food & Drink"
            : ticket.event.category === "club"
            ? "Club Event"
            : ticket.event.category === "sport"
            ? "Sports Event"
            : ticket.event.category === "agriculture"
            ? "Agriculture"
            : ticket.event.category === "conference"
            ? "Conference"
            : "General Event",
        ticketType: ticket.ticketType.name,
        purchaseDate: formatDate(purchaseDate),
        eventDate: formatEventDate(eventDate),
        eventTime: formatTime(startTime),
        venue: ticket.event.location,
        price: `Ksh ${ticket.ticketType.price}`,
        imageUrl: ticket.event.imageUrl,
        imageAlt: ticket.event.title,
        category: ticket.event.category,
        userName: ticket.user.name,
        ticketNumber: ticket.barcodeValue,
        status: ticket.status,
      };
    });

    return res.json(formattedTickets);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

router.get("/:id", async (req, res): Promise<any> => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: "Ticket ID is required" });
  }

  try {
    const ticket = await prisma.ticket.findUnique({
      where: {
        id: id,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            description: true,
            location: true,
            imageUrl: true,
          },
        },
        eventOccurrence: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            date: true,
          },
        },
        ticketType: {
          select: {
            id: true,
            name: true,
            price: true,
          },
        },
        purchase: {
          select: {
            id: true,
            totalPrice: true,
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    return res.json(ticket);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;
