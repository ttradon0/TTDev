import { createClient } from "@supabase/supabase-js";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { Database } from "../lib/supabase/database.types";

const TIME_ZONE = "Asia/Bangkok";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const studentPassword = process.env.DEMO_STUDENT_PASSWORD;
const adminPassword = process.env.DEMO_ADMIN_PASSWORD;

if (!supabaseUrl || !secretKey || !studentPassword || !adminPassword) {
  throw new Error("Set the Supabase URL, server secret, and both demo passwords in .env.local before seeding.");
}

const supabase = createClient<Database>(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureDemoUser(email: string, displayName: string, role: "student" | "admin", password: string) {
  const { data: users, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  let user = users.users.find((candidate) => candidate.email?.toLowerCase() === email);

  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    { id: user.id, email, display_name: displayName, role },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;
  return user.id;
}

async function ensureRoom(name: string, capacity: number, status: "available" | "maintenance") {
  const { data: current, error: findError } = await supabase
    .from("rooms")
    .select("id")
    .eq("name", name)
    .is("removed_at", null)
    .maybeSingle();
  if (findError) throw findError;

  if (current) {
    const { data, error } = await supabase
      .from("rooms")
      .update({ name, capacity, status })
      .eq("id", current.id)
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  const { data, error } = await supabase
    .from("rooms")
    .insert({ name, capacity, status })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

function dateDaysAgo(days: number) {
  const date = new Date(formatInTimeZone(new Date(), TIME_ZONE, "yyyy-MM-dd") + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function instant(date: string, time: string) {
  return fromZonedTime(date + "T" + time + ":00", TIME_ZONE);
}

async function main() {
  const studentId = await ensureDemoUser("student@ttdev.demo", "Mali Srisuk", "student", studentPassword!);
  await ensureDemoUser("admin@ttdev.demo", "Narin Chai", "admin", adminPassword!);

  const roomDefinitions = [
    { name: "North Atrium", capacity: 10, status: "available" as const },
    { name: "Seminar House 2", capacity: 8, status: "available" as const },
    { name: "Garden Studio", capacity: 12, status: "available" as const },
    { name: "Library Nook", capacity: 4, status: "available" as const },
    { name: "East Wing 03", capacity: 6, status: "maintenance" as const },
  ];
  const roomIds = new Map<string, string>();
  for (const room of roomDefinitions) roomIds.set(room.name, await ensureRoom(room.name, room.capacity, room.status));

  const samples = [
    { id: "0a000001-0000-4000-8000-000000000001", room: "North Atrium", daysAgo: 1, start: "09:00", duration: 60, meeting: "Studio planning" },
    { id: "0a000001-0000-4000-8000-000000000002", room: "Garden Studio", daysAgo: 3, start: "13:30", duration: 90, meeting: "Research circle" },
    { id: "0a000001-0000-4000-8000-000000000003", room: "Seminar House 2", daysAgo: 6, start: "10:00", duration: 120, meeting: "Peer tutoring" },
    { id: "0a000001-0000-4000-8000-000000000004", room: "Library Nook", daysAgo: 2, start: "15:30", duration: 30, meeting: "Reading group" },
  ];

  for (const [index, sample] of samples.entries()) {
    const date = dateDaysAgo(sample.daysAgo);
    const startsAt = instant(date, sample.start);
    const endsAt = new Date(startsAt.getTime() + sample.duration * 60_000);
    const { error: bookingError } = await supabase.from("bookings").upsert(
      {
        id: sample.id,
        room_id: roomIds.get(sample.room)!,
        room_name_snapshot: sample.room,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "confirmed",
      },
      { onConflict: "id" },
    );
    if (bookingError) throw bookingError;
    const { error: detailError } = await supabase.from("booking_details").upsert(
      {
        booking_id: sample.id,
        user_id: studentId,
        meeting_name: sample.meeting,
        attendee_count: Math.min(index + 2, roomDefinitions.find((room) => room.name === sample.room)!.capacity),
      },
      { onConflict: "booking_id" },
    );
    if (detailError) throw detailError;
  }

  console.log("Seeded 2 demo accounts, 5 rooms, and 4 historical sample bookings.");
  console.log("Demo emails: student@ttdev.demo, admin@ttdev.demo (passwords stay in your private environment).");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Demo seed failed.");
  process.exitCode = 1;
});
