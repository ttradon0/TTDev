import { z } from "zod";
import { ALLOWED_DURATIONS } from "@/lib/time";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const bookingSchema = z.object({
  room_id: z.string().uuid("Choose a room."),
  meeting_name: z.string().trim().min(2, "Add a meeting name.").max(120, "Use 120 characters or fewer."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a booking date.").refine((value) => {
    const date = new Date(value + "T00:00:00.000Z");
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Choose a valid booking date."),
  start_time: z.string().regex(/^(0[6-9]|1[0-7]):(00|30)$/, "Choose a 30-minute starting slot between 06:00 and 17:30."),
  duration_minutes: z.coerce.number().refine(
    (duration): duration is (typeof ALLOWED_DURATIONS)[number] =>
      ALLOWED_DURATIONS.includes(duration as (typeof ALLOWED_DURATIONS)[number]),
    "Choose a duration of 30, 60, 90, or 120 minutes.",
  ),
  attendee_count: z.coerce.number().int().min(1, "At least one person is required."),
});

export const roomSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Room name must be at least 2 characters.").max(100),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least one.").max(500),
  status: z.enum(["available", "maintenance"]),
});

export const uuidSchema = z.string().uuid();

export type LoginInput = z.infer<typeof loginSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
