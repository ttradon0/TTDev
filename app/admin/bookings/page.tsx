import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listAdminBookings, listRooms } from "@/lib/queries";
import { bangkokDateLabel, formatRange } from "@/lib/time";
import { requireRole } from "@/lib/auth";

type SearchParams = { q?: string | string[]; status?: string | string[]; room?: string | string[] };

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireRole("admin");
  const [query, bookings, rooms] = await Promise.all([
    searchParams,
    listAdminBookings(user.supabase),
    listRooms(user.supabase, true),
  ]);
  const q = typeof query.q === "string" ? query.q.trim().toLowerCase() : "";
  const status = query.status === "confirmed" || query.status === "cancelled" ? query.status : "all";
  const roomId = typeof query.room === "string" ? query.room : "all";
  const filtered = bookings.filter((booking) => {
    if (status !== "all" && booking.status !== status) return false;
    if (roomId !== "all" && booking.room_id !== roomId) return false;
    if (!q) return true;
    const searchText = [
      booking.room_name_snapshot,
      booking.details?.meeting_name,
      booking.student?.display_name,
      booking.student?.email,
    ].filter(Boolean).join(" ").toLowerCase();
    return searchText.includes(q);
  });

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">Admin workspace</p>
          <h1 className="mt-2 font-heading text-4xl tracking-[-0.035em] sm:text-5xl">Booking ledger</h1>
          <p className="mt-3 text-sm text-muted-foreground">Search the schedule, review meeting details, and manage cancellations.</p>
        </div>
        <span className="rounded-full bg-cream px-4 py-2 text-xs text-ink/75">{filtered.length} {filtered.length === 1 ? "result" : "results"}</span>
      </div>

      <form method="get" className="mb-5 grid gap-3 rounded-3xl border border-line bg-card p-4 sm:grid-cols-[minmax(0,1fr)_180px_200px_auto] sm:items-end">
        <label className="text-xs font-medium text-muted-foreground">
          Search bookings
          <span className="relative mt-1 block">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" />
            <Input name="q" defaultValue={q} placeholder="Room, meeting or student" className="h-10 rounded-xl border-line bg-paper pl-9" />
          </span>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Booking status
          <select name="status" defaultValue={status} className="mt-1 h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Room
          <select name="room" defaultValue={roomId} className="mt-1 h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="all">All rooms</option>
            {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}{room.removed_at ? " (removed)" : ""}</option>)}
          </select>
        </label>
        <Button type="submit" className="h-10 rounded-full bg-forest px-5 text-paper hover:bg-forest/90">Apply filters</Button>
      </form>

      <div className="overflow-hidden rounded-3xl border border-line bg-card">
        <div className="hidden grid-cols-[1.1fr_1fr_1.2fr_1fr_auto] gap-4 border-b border-line bg-cream/75 px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground lg:grid">
          <span>Room & meeting</span><span>Student</span><span>Date</span><span>Time</span><span>Status</span>
        </div>
        {filtered.length ? (
          <div className="divide-y divide-line">
            {filtered.map((booking) => (
              <Link key={booking.id} href={"/admin/bookings/" + booking.id} className="grid gap-3 px-5 py-4 transition hover:bg-cream/50 lg:grid-cols-[1.1fr_1fr_1.2fr_1fr_auto] lg:items-center lg:gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{booking.room_name_snapshot}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{booking.details?.meeting_name ?? "Meeting"}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm">{booking.student?.display_name ?? "Demo Student"}</p>
                  <p className="truncate text-xs text-muted-foreground">{booking.student?.email ?? "Student account"}</p>
                </div>
                <p className="text-sm">{bangkokDateLabel(booking.starts_at)}</p>
                <p className="font-mono text-xs text-muted-foreground">{formatRange(booking.starts_at, booking.ends_at)}</p>
                <span className="flex items-center gap-2">
                  <span className={"rounded-full px-2.5 py-1 text-[10px] capitalize " + (booking.status === "confirmed" ? "bg-[#e7eddf] text-forest" : "bg-[#eeeae0] text-muted-foreground")}>{booking.status}</span>
                  <ArrowUpRight size={14} className="text-muted-foreground" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="font-heading text-2xl">No bookings match those filters.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try a different name, status, or room.</p>
          </div>
        )}
      </div>
    </div>
  );
}
