import "server-only";

import type { CurrentUser } from "@/lib/auth";
import type { Tables } from "@/lib/supabase/database.types";
import { dayBounds } from "@/lib/time";

type Supabase = CurrentUser["supabase"];
export type Room = Tables<"rooms">;
export type Booking = Tables<"bookings">;
export type BookingDetails = Tables<"booking_details">;
export type BookingView = Booking & {
  details: BookingDetails | null;
  student: Pick<Tables<"profiles">, "display_name" | "email"> | null;
};

export async function listRooms(supabase: Supabase, includeRemoved = false) {
  let query = supabase.from("rooms").select("*").order("name");
  if (!includeRemoved) query = query.is("removed_at", null);
  const { data } = await query;
  return (data ?? []) as Room[];
}

export async function findRoom(supabase: Supabase, roomId: string) {
  const { data } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
  return data as Room | null;
}

export async function getCurrentBooking(supabase: Supabase, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("active_booking_id")
    .eq("id", userId)
    .maybeSingle();
  if (!profile?.active_booking_id) return null;

  const { data: booking } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", profile.active_booking_id)
    .eq("status", "confirmed")
    .gt("ends_at", new Date().toISOString())
    .maybeSingle();
  if (!booking) return null;

  const { data: details } = await supabase
    .from("booking_details")
    .select("*")
    .eq("booking_id", booking.id)
    .maybeSingle();
  return { booking: booking as Booking, details: details as BookingDetails | null };
}

export async function listDayBookings(supabase: Supabase, roomId: string, date: string) {
  const { start, end } = dayBounds(date);
  const { data } = await supabase
    .from("bookings")
    .select("id,room_id,room_name_snapshot,starts_at,ends_at,status,created_at")
    .eq("room_id", roomId)
    .eq("status", "confirmed")
    .lt("starts_at", end)
    .gt("ends_at", start)
    .order("starts_at");
  return (data ?? []) as Booking[];
}

export async function listAdminBookings(supabase: Supabase): Promise<BookingView[]> {
  const pageSize = 1000;
  const bookings: Booking[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("starts_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) throw new Error("Booking records could not be loaded.");

    const page = (data ?? []) as Booking[];
    bookings.push(...page);
    if (page.length < pageSize) break;
  }
  if (!bookings.length) return [];

  const chunks = <T,>(values: T[], size: number) => {
    const result: T[][] = [];
    for (let offset = 0; offset < values.length; offset += size) {
      result.push(values.slice(offset, offset + size));
    }
    return result;
  };

  const bookingIds = bookings.map((booking) => booking.id);
  const detailPages = await Promise.all(chunks(bookingIds, 500).map(async (ids) => {
    const { data, error } = await supabase.from("booking_details").select("*").in("booking_id", ids);
    if (error) throw new Error("Booking details could not be loaded.");
    return (data ?? []) as BookingDetails[];
  }));
  const detailRows = detailPages.flat();
  const userIds = [...new Set(detailRows.map((detail) => detail.user_id))];
  const profilePages = await Promise.all(chunks(userIds, 500).map(async (ids) => {
    const { data, error } = await supabase.from("profiles").select("id,display_name,email").in("id", ids);
    if (error) throw new Error("Student profiles could not be loaded.");
    return data ?? [];
  }));
  const profileRows = profilePages.flat();
  const detailByBooking = new Map(detailRows.map((detail) => [detail.booking_id, detail]));
  const profileById = new Map(profileRows.map((profile) => [profile.id, profile]));

  return bookings.map((booking) => {
    const details = detailByBooking.get(booking.id) ?? null;
    const student = details ? profileById.get(details.user_id) ?? null : null;
    return { ...booking, details, student };
  });
}
