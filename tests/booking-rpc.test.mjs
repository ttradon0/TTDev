import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const studentPassword = process.env.DEMO_STUDENT_PASSWORD;

test("the booking RPC rejects a same-slot race between two Students", {
  skip: !url || !publishableKey || !secretKey || !studentPassword
    ? "Set the Supabase URL, publishable key, server secret, and seeded Student password in .env.local."
    : false,
}, async (context) => {
  const authOptions = { auth: { autoRefreshToken: false, persistSession: false } };
  const admin = createClient(url, secretKey, authOptions);
  const student = createClient(url, publishableKey, authOptions);
  const { error: signInError } = await student.auth.signInWithPassword({
    email: "student@ttdev.demo",
    password: studentPassword,
  });
  assert.ifError(signInError);

  const { data: userData, error: userError } = await student.auth.getUser();
  assert.ifError(userError);
  assert.ok(userData.user, "the seeded Student account must be available");
  const { data: profile, error: profileError } = await student
    .from("profiles")
    .select("active_booking_id")
    .eq("id", userData.user.id)
    .single();
  assert.ifError(profileError);
  if (profile.active_booking_id) {
    const { data: existing } = await student
      .from("bookings")
      .select("ends_at")
      .eq("id", profile.active_booking_id)
      .maybeSingle();
    if (existing && new Date(existing.ends_at).getTime() > Date.now()) {
      context.skip("Cancel or finish the Student’s active booking before running the RPC concurrency check.");
      return;
    }
  }

  let temporaryUserId;
  let profileWasCreated = false;
  const createdBookingIds = [];
  try {
    const temporaryEmail = `booking-rpc-${randomUUID()}@ttdev.test`;
    const temporaryPassword = randomBytes(32).toString("base64url");
    const { data: temporaryUserData, error: createUserError } = await admin.auth.admin.createUser({
      email: temporaryEmail,
      password: temporaryPassword,
      email_confirm: true,
    });
    assert.ifError(createUserError);
    temporaryUserId = temporaryUserData.user.id;

    const { error: createProfileError } = await admin.from("profiles").insert({
      id: temporaryUserId,
      email: temporaryEmail,
      display_name: "Temporary RPC Test Student",
      role: "student",
    });
    assert.ifError(createProfileError);
    profileWasCreated = true;

    const competitor = createClient(url, publishableKey, authOptions);
    const { error: competitorSignInError } = await competitor.auth.signInWithPassword({
      email: temporaryEmail,
      password: temporaryPassword,
    });
    assert.ifError(competitorSignInError);

    const { data: rooms, error: roomError } = await student
      .from("rooms")
      .select("id")
      .eq("status", "available")
      .is("removed_at", null)
      .order("name");
    assert.ifError(roomError);
    assert.ok(rooms?.length, "seed at least one Available room");

    const now = Date.now();
    const upperBound = now + 24 * 60 * 60_000;
    let candidate;
    for (let offset = 90 * 60_000; offset < 24 * 60 * 60_000 && !candidate; offset += 30 * 60_000) {
      const startsAt = new Date(Math.ceil((now + offset) / (30 * 60_000)) * (30 * 60_000));
      if (startsAt.getTime() > upperBound) break;
      const localStart = formatInTimeZone(startsAt, "Asia/Bangkok", "HH:mm");
      const localMinute = Number(localStart.slice(0, 2)) * 60 + Number(localStart.slice(3));
      if (localMinute < 360 || localMinute + 30 > 1080) continue;
      const endsAt = new Date(startsAt.getTime() + 30 * 60_000);
      for (const room of rooms ?? []) {
        const { data: collisions, error } = await student
          .from("bookings")
          .select("id")
          .eq("room_id", room.id)
          .eq("status", "confirmed")
          .lt("starts_at", endsAt.toISOString())
          .gt("ends_at", startsAt.toISOString());
        assert.ifError(error);
        if (!collisions?.length) {
          candidate = { roomId: room.id, startsAt };
          break;
        }
      }
    }
    assert.ok(candidate, "find a free 30-minute slot at least 90 minutes from now");

    const date = formatInTimeZone(candidate.startsAt, "Asia/Bangkok", "yyyy-MM-dd");
    const start = formatInTimeZone(candidate.startsAt, "Asia/Bangkok", "HH:mm");
    const startsAt = fromZonedTime(date + "T" + start + ":00", "Asia/Bangkok");
    const endsAt = new Date(startsAt.getTime() + 30 * 60_000);
    const attempt = (client) => client.rpc("create_booking", {
      p_room_id: candidate.roomId,
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString(),
      p_meeting_name: "RPC concurrency verification",
      p_attendee_count: 1,
    });

    const results = await Promise.all([attempt(student), attempt(competitor)]);
    const successful = results.filter((result) => !result.error);
    const rejected = results.filter((result) => result.error);
    createdBookingIds.push(...successful.map((result) => result.data));
    assert.equal(successful.length, 1, "exactly one Student should reserve the shared slot");
    assert.equal(rejected.length, 1, "the competing Student should be rejected");
    assert.equal(rejected[0].error.code, "23P01", "the rejection must come from room overlap protection");
  } finally {
    if (createdBookingIds.length) {
      const { error: detailDeleteError } = await admin
        .from("booking_details")
        .delete()
        .in("booking_id", createdBookingIds);
      assert.ifError(detailDeleteError);
      const { error: bookingDeleteError } = await admin
        .from("bookings")
        .delete()
        .in("id", createdBookingIds);
      assert.ifError(bookingDeleteError);
    }
    if (profileWasCreated) {
      const { error: profileDeleteError } = await admin.from("profiles").delete().eq("id", temporaryUserId);
      assert.ifError(profileDeleteError);
    }
    if (temporaryUserId) {
      const { error: deleteUserError } = await admin.auth.admin.deleteUser(temporaryUserId);
      assert.ifError(deleteUserError);
    }
  }
});
