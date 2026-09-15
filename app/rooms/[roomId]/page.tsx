import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { BookingForm, type CalendarSlot } from "@/components/booking-form";
import { RoomStatus } from "@/components/room-status";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { findRoom, getCurrentBooking, listDayBookings } from "@/lib/queries";
import { bangkokDateKey, bangkokDateLabel, currentTimestamp, makeDaySlots, toBangkokInstant } from "@/lib/time";

type RoomPageProps = {
  params: Promise<{ roomId: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
};

function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default async function RoomBookingPage({ params, searchParams }: RoomPageProps) {
  const user = await requireRole("student");
  const [{ roomId }, query] = await Promise.all([params, searchParams]);
  const room = await findRoom(user.supabase, roomId);
  if (!room || room.removed_at) notFound();

  const today = bangkokDateKey();
  const tomorrow = bangkokDateKey(new Date(toBangkokInstant(today, "12:00").getTime() + 86_400_000));
  const requested = typeof query.date === "string" ? query.date : today;
  const date = isDateKey(requested) && requested >= today && requested <= tomorrow ? requested : today;
  const [current, bookings] = await Promise.all([
    getCurrentBooking(user.supabase, user.profile.id),
    listDayBookings(user.supabase, room.id, date),
  ]);
  const now = currentTimestamp();
  const schedule = makeDaySlots(date).map((slot): CalendarSlot => {
    const slotStart = new Date(slot.startsAt).getTime();
    const slotEnd = slotStart + 30 * 60_000;
    const occupied = bookings.some((booking) =>
      new Date(booking.starts_at).getTime() < slotEnd &&
      new Date(booking.ends_at).getTime() > slotStart,
    );
    return {
      time: slot.time,
      startsAt: slot.startsAt,
      occupied,
      available: slotStart > now && slotStart <= now + 86_400_000,
    };
  });

  return (
    <AppShell profile={user.profile}>
      <div className="mb-6">
        <Button asChild variant="ghost" className="-ml-3 rounded-full text-muted-foreground hover:text-forest">
          <Link href="/rooms"><ArrowLeft className="mr-2" size={15} /> Back to rooms</Link>
        </Button>
      </div>
      <section className="mb-8 flex flex-col justify-between gap-5 rounded-3xl border border-line bg-card p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">Room schedule</p>
            <RoomStatus status={room.status} />
          </div>
          <h1 className="mt-2 font-heading text-4xl tracking-[-0.035em] sm:text-5xl">{room.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><UsersRound size={15} /> Seats up to {room.capacity} people</p>
        </div>
        <div className="rounded-2xl bg-cream px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Booking window</p>
          <p className="mt-1 font-heading text-xl">Next 24 hours</p>
          <p className="mt-1 text-xs text-muted-foreground">30-minute slots · Bangkok time</p>
        </div>
      </section>
      <BookingForm
        key={room.id + ":" + date}
        roomId={room.id}
        roomName={room.name}
        capacity={room.capacity}
        date={date}
        dateLabel={bangkokDateLabel(toBangkokInstant(date, "12:00"))}
        minDate={today}
        maxDate={tomorrow}
        slots={schedule}
        hasActiveBooking={Boolean(current)}
        activeRoomName={current?.booking.room_name_snapshot ?? null}
        maintenance={room.status !== "available"}
      />
    </AppShell>
  );
}
