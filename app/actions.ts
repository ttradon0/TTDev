"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { getCurrentUser } from "@/lib/auth";
import { TIME_ZONE } from "@/lib/time";
import { bookingSchema, loginSchema, roomSchema, uuidSchema } from "@/lib/validation";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true; bookingId?: string } | { ok: false; message: string };

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your login details." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: "Email or password was not recognized." };

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (typeof userId !== "string") {
    await supabase.auth.signOut();
    return { ok: false, message: "This demo account is not ready yet." };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return { ok: false, message: "This demo account has not been provisioned." };
  }
  redirect(profile.role === "admin" ? "/admin" : "/rooms");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function bookingErrorMessage(message: string) {
  if (/already have an active/i.test(message)) return "You already have a booking in progress or coming up.";
  if (/maintenance/i.test(message)) return "This room is under maintenance and cannot be booked.";
  if (/capacity/i.test(message)) return "The number of people is over this room’s capacity.";
  if (/just booked|overlap|23P01/i.test(message)) return "That time was just booked. Choose another slot.";
  if (/next 24 hours/i.test(message)) return "Bookings must start within the next 24 hours.";
  if (/30 minutes before/i.test(message)) return "Student cancellations close 30 minutes before the meeting.";
  if (/not found|no longer available/i.test(message)) return "This room or booking is no longer available.";
  if (/Only Students/i.test(message)) return "Only Student accounts can create bookings.";
  if (/Only an Admin/i.test(message)) return "Only Admin accounts can manage rooms.";
  if (/cancelled/i.test(message)) return "This booking has already been cancelled.";
  return message;
}

export async function createBooking(input: unknown): Promise<ActionResult> {
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the booking details." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session has expired. Please sign in again." };
  if (user.profile.role !== "student") return { ok: false, message: "Only Student accounts can create bookings." };

  const startsAt = fromZonedTime(parsed.data.date + "T" + parsed.data.start_time + ":00", TIME_ZONE);
  const endsAt = new Date(startsAt.getTime() + parsed.data.duration_minutes * 60_000);
  const { data, error } = await user.supabase.rpc("create_booking", {
    p_room_id: parsed.data.room_id,
    p_starts_at: startsAt.toISOString(),
    p_ends_at: endsAt.toISOString(),
    p_meeting_name: parsed.data.meeting_name,
    p_attendee_count: parsed.data.attendee_count,
  });

  if (error) return { ok: false, message: bookingErrorMessage(error.message) };
  revalidatePath("/rooms");
  revalidatePath("/admin");
  return { ok: true, bookingId: data };
}

export async function cancelBooking(bookingIdInput: unknown): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(bookingIdInput);
  if (!parsed.success) return { ok: false, message: "This booking could not be found." };
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Your session has expired. Please sign in again." };

  const { error } = await user.supabase.rpc("cancel_booking", { p_booking_id: parsed.data });
  if (error) return { ok: false, message: bookingErrorMessage(error.message) };

  revalidatePath("/rooms");
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/bookings/" + parsed.data);
  return { ok: true };
}

export async function saveRoom(formData: FormData): Promise<ActionResult> {
  const parsed = roomSchema.safeParse({
    id: formData.get("id") ?? "",
    name: formData.get("name"),
    capacity: formData.get("capacity"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the room details." };

  const user = await getCurrentUser();
  if (!user || user.profile.role !== "admin") return { ok: false, message: "Only Admin accounts can manage rooms." };

  const values = { name: parsed.data.name, capacity: parsed.data.capacity, status: parsed.data.status };
  const result = parsed.data.id
    ? await user.supabase.from("rooms").update(values).eq("id", parsed.data.id).select("id").maybeSingle()
    : await user.supabase.from("rooms").insert(values).select("id").single();

  if (result.error) return { ok: false, message: /rooms_active_name_unique/i.test(result.error.message) ? "A room with that name already exists." : "Room details could not be saved." };
  revalidatePath("/admin");
  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  return { ok: true };
}

export async function removeRoom(roomIdInput: unknown): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(roomIdInput);
  if (!parsed.success) return { ok: false, message: "This room could not be found." };
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "admin") return { ok: false, message: "Only Admin accounts can manage rooms." };

  const { error } = await user.supabase
    .from("rooms")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", parsed.data);
  if (error) return { ok: false, message: "This room could not be removed." };
  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  return { ok: true };
}

export async function restoreRoom(roomIdInput: unknown): Promise<ActionResult> {
  const parsed = uuidSchema.safeParse(roomIdInput);
  if (!parsed.success) return { ok: false, message: "This room could not be found." };
  const user = await getCurrentUser();
  if (!user || user.profile.role !== "admin") return { ok: false, message: "Only Admin accounts can manage rooms." };

  const { error } = await user.supabase
    .from("rooms")
    .update({ removed_at: null })
    .eq("id", parsed.data);
  if (error) return { ok: false, message: /rooms_active_name_unique/i.test(error.message) ? "An active room already uses that name." : "This room could not be restored." };
  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  return { ok: true };
}
