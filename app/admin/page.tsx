import Link from "next/link";
import { Activity, ArrowRight, CalendarDays, DoorOpen, Wrench } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { RoomStatus } from "@/components/room-status";
import { Button } from "@/components/ui/button";
import { listAdminBookings, listRooms } from "@/lib/queries";
import { bangkokDateLabel, currentTimestamp, formatRange } from "@/lib/time";
import { requireRole } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const user = await requireRole("admin");
  const [rooms, bookings] = await Promise.all([
    listRooms(user.supabase, true),
    listAdminBookings(user.supabase),
  ]);
  const activeRooms = rooms.filter((room) => !room.removed_at);
  const confirmed = bookings.filter((booking) => booking.status === "confirmed");
  const now = currentTimestamp();
  const inUse = new Set(confirmed
    .filter((booking) => new Date(booking.starts_at).getTime() <= now && new Date(booking.ends_at).getTime() > now)
    .map((booking) => booking.room_id));
  const availableCount = activeRooms.filter((room) => room.status === "available").length;
  const maintenanceCount = activeRooms.filter((room) => room.status === "maintenance").length;
  const popularRooms = [...confirmed.reduce((counts, booking) => {
    counts.set(booking.room_name_snapshot, (counts.get(booking.room_name_snapshot) ?? 0) + 1);
    return counts;
  }, new Map<string, number>()).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const latest = bookings.slice(0, 5);

  return (
    <div>
      <section className="relative overflow-hidden rounded-[2rem] bg-forest px-7 py-9 text-paper sm:px-11 sm:py-12">
        <div className="absolute -right-12 -top-28 size-80 rounded-full border border-white/10" />
        <div className="relative z-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sage">Administrator · Campus spaces</p>
            <h1 className="mt-3 font-heading text-4xl leading-tight tracking-[-0.035em] sm:text-5xl">A clearer view of campus.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-paper/70">Today is {bangkokDateLabel(new Date())}. See room activity and keep the schedule moving.</p>
          </div>
          <Button asChild variant="secondary" className="w-fit rounded-full bg-paper text-forest hover:bg-sage">
            <Link href="/admin/bookings">Explore bookings <ArrowRight className="ml-2" size={15} /></Link>
          </Button>
        </div>
      </section>

      <section aria-label="Usage statistics" className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total bookings" value={bookings.length} note="Confirmed and cancelled" icon={CalendarDays} />
        <StatCard label="Rooms in use" value={inUse.size} note="Occupied at this moment" icon={Activity} />
        <StatCard label="Available rooms" value={availableCount} note="Ready for new bookings" icon={DoorOpen} />
        <StatCard label="Maintenance" value={maintenanceCount} note="Visible, unavailable to book" icon={Wrench} />
      </section>

      <section className="mt-8 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <article className="rounded-3xl border border-line bg-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-forest">Room rhythm</p>
              <h2 className="mt-1 font-heading text-2xl">Most booked rooms</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="rounded-full text-forest">
              <Link href="/admin/rooms">Manage rooms <ArrowRight className="ml-1" size={14} /></Link>
            </Button>
          </div>
          {popularRooms.length ? (
            <ol className="mt-5 space-y-3">
              {popularRooms.map(([name, count], index) => (
                <li key={name} className="flex items-center gap-3 border-b border-line pb-3 last:border-b-0 last:pb-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cream font-mono text-xs text-forest">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground">{count} {count === 1 ? "booking" : "bookings"}</span>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-6 rounded-2xl bg-cream px-4 py-7 text-center">
              <p className="font-heading text-xl">Usage will appear here.</p>
              <p className="mt-1 text-xs text-muted-foreground">Confirmed bookings build this view.</p>
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-line bg-card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.17em] text-forest">Recent activity</p>
              <h2 className="mt-1 font-heading text-2xl">Latest bookings</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="rounded-full text-forest">
              <Link href="/admin/bookings">All bookings <ArrowRight className="ml-1" size={14} /></Link>
            </Button>
          </div>
          {latest.length ? (
            <div className="mt-4 divide-y divide-line">
              {latest.map((booking) => (
                <Link key={booking.id} href={"/admin/bookings/" + booking.id} className="flex flex-col gap-1 py-3 transition hover:text-forest sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{booking.details?.meeting_name ?? "Booking"} · {booking.room_name_snapshot}</p>
                    <p className="text-xs text-muted-foreground">{booking.student?.display_name ?? "Demo Student"} · {bangkokDateLabel(booking.starts_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{formatRange(booking.starts_at, booking.ends_at)}</span>
                    <span className={"rounded-full px-2.5 py-1 text-[10px] capitalize " + (booking.status === "confirmed" ? "bg-[#e7eddf] text-forest" : "bg-[#eeeae0] text-muted-foreground")}>{booking.status}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-6 rounded-2xl bg-cream px-4 py-7 text-center text-sm text-muted-foreground">No bookings yet.</p>
          )}
        </article>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.17em] text-forest">Space directory</p>
            <h2 className="mt-1 font-heading text-2xl">Room status at a glance</h2>
          </div>
          <Link href="/admin/rooms" className="text-sm font-medium text-forest underline-offset-4 hover:underline">View all rooms</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {activeRooms.slice(0, 6).map((room) => (
            <div key={room.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card px-5 py-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{room.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Capacity {room.capacity}</p>
              </div>
              <RoomStatus status={room.status} />
            </div>
          ))}
          {!activeRooms.length && <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-sm text-muted-foreground">Add a room to start building the directory.</p>}
        </div>
      </section>
    </div>
  );
}
