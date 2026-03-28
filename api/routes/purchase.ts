import express from "express";
import crypto from "crypto";
import prisma from "../../lib/prisma";
import { requireAuth } from "../../lib/auth-middleware";
import { TicketStatus } from "@prisma/client";

const router = express.Router();

interface CartItem {
  id: string;
  occurrenceId: string;
  ticketTypeId: string;
  quantity: number;
  eventTitle?: string;
  eventImage?: string;
  date?: string;
  price: number;
}

router.post("/", requireAuth, async (req, res): Promise<any> => {
  const { userId, cartItems } = req.body;

  // Validate input
  if (!userId || !Array.isArray(cartItems) || cartItems.length === 0) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate each cart item structure
  for (const item of cartItems) {
    if (
      !item.id ||
      !item.occurrenceId ||
      !item.ticketTypeId ||
      !item.quantity ||
      item.quantity <= 0
    ) {
      return res
        .status(400)
        .json({ error: "Invalid cart item data structure" });
    }
  }

  try {
    // Start a transaction with increased timeout (15 seconds)
    const result = await prisma.$transaction(
      async (tx) => {
        let totalPrice = 0;
        const ticketsToCreate = [];

        // Validate availability and calculate total price
        for (const item of cartItems) {
          // Fetch ticket type with event details
          const ticketType = await tx.ticketType.findUnique({
            where: { id: item.ticketTypeId },
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                  isFree: true,
                },
              },
            },
          });

          if (!ticketType) {
            throw new Error(`Ticket type ${item.ticketTypeId} not found`);
          }

          // Check if event occurrence exists
          const eventOccurrence = await tx.eventOccurrence.findUnique({
            where: { id: item.occurrenceId },
          });

          if (!eventOccurrence) {
            throw new Error(`Event occurrence ${item.occurrenceId} not found`);
          }

          // Verify the event occurrence belongs to the correct event
          if (eventOccurrence.eventId !== item.id) {
            throw new Error(
              `Event occurrence ${item.occurrenceId} doesn't belong to event ${item.id}`
            );
          }

          // Check ticket availability
          const availableQuantity =
            ticketType.quantityTotal - ticketType.quantitySold;
          if (item.quantity > availableQuantity) {
            throw new Error(
              `Only ${availableQuantity} tickets available for ${ticketType.name}`
            );
          }

          // Calculate price for this item
          const itemPrice = ticketType.price.toNumber();
          const itemTotal = itemPrice * item.quantity;
          totalPrice += itemTotal;

          // Generate individual tickets for this item
          for (let i = 0; i < item.quantity; i++) {
            ticketsToCreate.push({
              userId,
              eventId: item.id,
              eventOccurrenceId: item.occurrenceId,
              ticketTypeId: item.ticketTypeId,
              barcodeValue: crypto.randomUUID(),
              status: TicketStatus.valid,
              issuedAt: new Date(),
            });
          }
        }

        // Create the purchase record
        const purchase = await tx.purchase.create({
          data: {
            userId,
            totalPrice,
            discountCodeId: null, // No discount codes as requested
          },
        });

        // Create all tickets and link them to the purchase
        await tx.ticket.createMany({
          data: ticketsToCreate.map((ticket) => ({
            ...ticket,
            purchaseId: purchase.id,
          })),
        });

        // Update ticket type quantities
        for (const item of cartItems) {
          await tx.ticketType.update({
            where: { id: item.ticketTypeId },
            data: {
              quantitySold: { increment: item.quantity },
            },
          });
        }

        // Return the purchase ID instead of doing another query
        return purchase.id;
      },
      {
        timeout: 15000, // 15 seconds timeout
      }
    );

    // Fetch the complete purchase data outside the transaction
    const purchaseWithTickets = await prisma.purchase.findUnique({
      where: { id: result },
      include: {
        tickets: {
          include: {
            event: {
              select: {
                title: true,
                location: true,
                imageUrl: true,
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
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: "Purchase completed successfully",
      purchase: purchaseWithTickets,
    });
  } catch (error) {
    console.error("Purchase error:", error);

    return res
      .status(500)
      .json({ error: "Something went wrong during purchase" });
  }
});

router.get("/user/:userId", requireAuth, async (req, res): Promise<any> => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    const purchases = await prisma.purchase.findMany({
      where: { userId },
      include: {
        tickets: {
          include: {
            event: {
              select: {
                title: true,
                location: true,
                imageUrl: true,
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
          },
        },
      },
      orderBy: {
        purchasedAt: "desc",
      },
    });

    return res.json(purchases);
  } catch (error) {
    console.error("Error fetching purchase history:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

router.get("/:purchaseId", requireAuth, async (req, res): Promise<any> => {
  const { purchaseId } = req.params;

  if (!purchaseId) {
    return res.status(400).json({ error: "Purchase ID is required" });
  }

  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        tickets: {
          include: {
            event: {
              select: {
                title: true,
                location: true,
                imageUrl: true,
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
          },
        },
      },
    });

    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    return res.json(purchase);
  } catch (error) {
    console.error("Error fetching purchase:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;