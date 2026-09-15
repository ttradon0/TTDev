import { DoorOpen, Info } from "lucide-react";
import { RoomEditor } from "@/components/room-editor";
import { requireRole } from "@/lib/auth";
import { listRooms } from "@/lib/queries";

export default async function AdminRoomsPage() {
  const user = await requireRole("admin");
  const rooms = await listRooms(user.supabase, true);
  const active = rooms.filter((room) => !room.removed_at);
  const removed = rooms.filter((room) => room.removed_at);

  return (
    <div>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-forest">Admin workspace</p>
          <h1 className="mt-2 font-heading text-4xl tracking-[-0.035em] sm:text-5xl">Manage meeting rooms</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Keep the campus directory current. Maintenance rooms stay visible to Students but cannot be booked.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-xs text-ink/75">
          <DoorOpen size={15} className="text-forest" /> {active.length} active spaces
        </div>
      </div>
      <div className="mb-7 flex items-start gap-3 rounded-2xl border border-line bg-cream/80 p-4 text-sm leading-6 text-ink/75">
        <Info size={17} className="mt-0.5 shrink-0 text-forest" aria-hidden="true" />
        Removing a room hides it from future bookings while preserving its existing schedule and history.
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <RoomEditor />
        {active.map((room) => <RoomEditor key={room.id} room={room} />)}
      </div>
      {removed.length > 0 && (
        <section className="mt-12">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Room history</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {removed.map((room) => <RoomEditor key={room.id} room={room} />)}
          </div>
        </section>
      )}
    </div>
  );
}
