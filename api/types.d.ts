import { z } from "zod";
import { EventCategory, EventType } from "@prisma/client";

const CreateEventSchema = z.object({
  creatorId: z.string(),
  title: z.string(),
  description: z.string(),
  location: z.string(),
  category: z.nativeEnum(EventCategory),
  eventType: z.nativeEnum(EventType),
  ticketType: z.enum(["free", "ticketed"]),
  coverUrl: z.string(),
  eventDates: z.array(
    z.object({
      startDate: z.string(),
      startTime: z.string(),
      endTime: z.string(),
    })
  ),
  ticketTypes: z.array(
    z.object({
      ticketName: z.string(),
      ticketPrice: z.string(),
      ticketStock: z.string(),
    })
  ),
  discountCodes: z
    .array(
      z.object({
        discountCode: z.string(),
        expirationDate: z.string(),
        percentOff: z.string(),
      })
    )
    .optional(),
});

export type CreateEventSchema = z.infer<typeof CreateEventSchema>;