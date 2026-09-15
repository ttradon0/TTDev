import Link from "next/link";
import { ArrowRight, CalendarClock, Clock3, DoorOpen, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { RoomStatus } from "@/components/room-status";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { getCurrentBooking, listRooms } from "@/lib/queries";
import { bangkokDateLabel, currentTimestamp, formatDuration, formatRange } from "@/lib/time";

export default async function RoomsPage() {
  const user = await requireRole("student");
  const [rooms, current] = await Promise.all([
    listRooms(user.supabase),
    getCurrentBooking(user.supabase, user.profile.id),
  ]);
  const booking = current?.booking;
  const detail = current?.details;
  const canCancel = booking
    ? new Date(booking.starts_at).getTime() - currentTimestamp() >= 30 * 60_000
    : false;

  return (
    <AppShell profile={user.profile}>
      <section className="relative overflow-hidden rounded-[2rem] border border-rose-soft bg-cream px-7 py-10 text-ink sm:px-12 sm:py-14">
        <div className="absolute -right-20 -top-24 size-80 rounded-full border border-forest/10" />
        <div className="absolute right-16 top-10 hidden h-64 w-px rotate-45 bg-forest/10 sm:block" />
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-forest">Chulalongkorn University · Bangkok</p>
          <h1 className="mt-4 max-w-xl font-heading text-4xl leading-[1.04] tracking-[-0.04em] sm:text-6xl">
            A good place changes the conversation.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-muted-foreground sm:text-base">
            Find a room that fits your group. Choose a half-hour slot, bring your notes, and get into it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs text-ink/75">
            <span className="inline-flex items-center gap-2 rounded-full border border-forest/15 bg-white/70 px-3 py-2"><Clock3 size={14} className="text-forest" /> 06:00–18:00</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-forest/15 bg-white/70 px-3 py-2"><CalendarClock size={14} className="text-forest" /> Book up to 24 hours ahead</span>
          </div>
        </div>
        <div className="absolute bottom-5 right-8 hidden size-36 rotate-6 items-center justify-center rounded-[1.75rem] border border-forest/10 bg-white/60 sm:flex">
          <DoorOpen size={44} strokeWidth={1.1} className="text-forest/60" aria-hidden="true" />
        </div>
      </section>

      {booking && (
        <section aria-labelledby="current-booking-heading" className="mt-8 rounded-3xl border border-rose-soft bg-rose-pale p-5 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl bg-paper text-forest">
                <CalendarClock size={20} aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">Your current booking</p>
                <h2 id="current-booking-heading" className="mt-1 font-heading text-2xl">{booking.room_name_snapshot}</h2>
                <p className="mt-1 text-sm text-ink/75">{detail?.meeting_name ?? "Meeting"} · {bangkokDateLabel(booking.starts_at)} · {formatRange(booking.starts_at, booking.ends_at)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDuration(Math.round((new Date(booking.ends_at).getTime() - new Date(booking.starts_at).getTime()) / 60_000))} · {detail?.attendee_count ?? 1} {detail?.attendee_count === 1 ? "person" : "people"}</p>
              </div>
            </div>
            <CancelBookingButton bookingId={booking.id} canCancel={canCancel} />
          </div>
        </section>
      )}

      <section className="mt-12 sm:mt-16">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">Room directory</p>
            <h2 className="mt-2 font-heading text-3xl tracking-[-0.025em] sm:text-4xl">Choose your next room</h2>
          </div>
          <p className="text-sm text-muted-foreground">{rooms.length} {rooms.length === 1 ? "space" : "spaces"} on campus</p>
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line bg-card px-6 py-16 text-center">
            <DoorOpen className="mx-auto text-muted-foreground" size={30} />
            <h3 className="mt-4 font-heading text-2xl">Rooms are being prepared</h3>
            <p className="mt-2 text-sm text-muted-foreground">Check back soon or ask an administrator to add a space.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rooms.map((room, index) => (
              <article key={room.id} className="group relative overflow-hidden rounded-3xl border border-line bg-card p-6 transition duration-300 hover:-translate-y-1 hover:border-rose-soft hover:shadow-[0_18px_40px_-32px_rgba(143,36,75,0.22)]">
                <div className="mb-8 flex items-start justify-between gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-cream text-forest">
                    <DoorOpen size={20} strokeWidth={1.6} aria-hidden="true" />
                  </div>
                  <RoomStatus status={room.status} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Space {String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-1 font-heading text-2xl tracking-[-0.02em]">{room.name}</h3>
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <UsersRound size={15} aria-hidden="true" /> Up to {room.capacity} people
                </p>
                <div className="mt-7 border-t border-line pt-5">
                  {room.status === "available" ? (
                    <Button asChild className="w-full rounded-full bg-forest text-paper hover:bg-forest/90">
                      <Link href={"/rooms/" + room.id}>View room schedule <ArrowRight className="ml-2" size={15} /></Link>
                    </Button>
                  ) : (
                    <Button type="button" disabled className="w-full rounded-full bg-muted text-muted-foreground">Unavailable for booking</Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
