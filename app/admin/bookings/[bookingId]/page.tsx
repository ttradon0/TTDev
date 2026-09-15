import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock3, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { Button } from "@/components/ui/button";
import { listAdminBookings } from "@/lib/queries";
import { bangkokDateLabel, bangkokTime, formatDuration, formatRange } from "@/lib/time";
import { requireRole } from "@/lib/auth";

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const user = await requireRole("admin");
  const { bookingId } = await params;
  const bookings = await listAdminBookings(user.supabase);
  const booking = bookings.find((item) => item.id === bookingId);
  if (!booking) notFound();
  const duration = Math.round((new Date(booking.ends_at).getTime() - new Date(booking.starts_at).getTime()) / 60_000);

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" className="-ml-3 mb-6 rounded-full text-muted-foreground hover:text-forest">
        <Link href="/admin/bookings"><ArrowLeft className="mr-2" size={15} /> Back to bookings</Link>
      </Button>
      <section className="overflow-hidden rounded-[2rem] border border-line bg-card">
        <div className="bg-forest px-6 py-8 text-paper sm:px-9">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sage">Booking details</p>
              <h1 className="mt-2 font-heading text-4xl tracking-[-0.035em]">{booking.room_name_snapshot}</h1>
              <p className="mt-2 text-sm text-paper/70">{booking.details?.meeting_name ?? "Meeting"}</p>
            </div>
            <span className={"rounded-full px-3 py-1.5 text-xs capitalize " + (booking.status === "confirmed" ? "bg-sage text-forest" : "bg-white/15 text-paper")}>{booking.status}</span>
          </div>
        </div>
        <div className="grid gap-8 p-6 sm:grid-cols-2 sm:p-9">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Schedule</p>
            <div className="mt-4 space-y-4">
              <Detail icon={CalendarDays} label="Date" value={bangkokDateLabel(booking.starts_at)} />
              <Detail icon={Clock3} label="Time" value={formatRange(booking.starts_at, booking.ends_at) + " · " + formatDuration(duration)} />
              <Detail icon={UsersRound} label="People" value={String(booking.details?.attendee_count ?? "—")} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Student</p>
            <div className="mt-4 rounded-2xl bg-cream p-4">
              <p className="font-medium">{booking.student?.display_name ?? "Demo Student"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{booking.student?.email ?? "Student account"}</p>
            </div>
            {booking.status === "cancelled" && (
              <div className="mt-4 rounded-2xl border border-line p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Cancellation record</p>
                <p className="mt-2 text-sm">Cancelled {booking.details?.cancelled_at ? bangkokDateLabel(booking.details.cancelled_at) + " at " + bangkokTime(booking.details.cancelled_at) : "by an administrator or student"}.</p>
              </div>
            )}
          </div>
        </div>
        {booking.status === "confirmed" && (
          <div className="flex flex-col justify-between gap-4 border-t border-line bg-cream/60 px-6 py-5 sm:flex-row sm:items-center sm:px-9">
            <p className="max-w-lg text-sm text-muted-foreground">Admin cancellation is available at any time and releases the room immediately.</p>
            <CancelBookingButton bookingId={booking.id} canCancel admin />
          </div>
        )}
      </section>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-cream text-forest"><Icon size={16} /></span>
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>
    </div>
  );
}
