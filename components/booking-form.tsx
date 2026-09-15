"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { ArrowRight, Check, Clock3, LoaderCircle, UsersRound } from "lucide-react";
import { createBooking } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ALLOWED_DURATIONS, formatDuration, formatRange } from "@/lib/time";
import { bookingSchema, type BookingInput } from "@/lib/validation";

type BookingFormFields = z.input<typeof bookingSchema>;

export type CalendarSlot = {
  time: string;
  startsAt: string;
  available: boolean;
  occupied: boolean;
};

export function BookingForm({
  roomId,
  roomName,
  capacity,
  date,
  dateLabel,
  minDate,
  maxDate,
  slots,
  hasActiveBooking,
  activeRoomName,
  maintenance,
}: {
  roomId: string;
  roomName: string;
  capacity: number;
  date: string;
  dateLabel: string;
  minDate: string;
  maxDate: string;
  slots: CalendarSlot[];
  hasActiveBooking: boolean;
  activeRoomName: string | null;
  maintenance: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [review, setReview] = useState<BookingInput | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const {
    register,
    setValue,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormFields, unknown, BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      room_id: roomId,
      meeting_name: "",
      date,
      start_time: "",
      duration_minutes: 30,
      attendee_count: 1,
    },
  });

  const startTime = useWatch({ control, name: "start_time" });
  const duration = Number(useWatch({ control, name: "duration_minutes" })) || 30;
  const attendeeCount = Number(useWatch({ control, name: "attendee_count" })) || 1;
  const startIndex = slots.findIndex((slot) => slot.time === startTime);
  const selectedRange = useMemo(() => {
    if (startIndex < 0) return new Set<string>();
    return new Set(slots.slice(startIndex, startIndex + duration / 30).map((slot) => slot.time));
  }, [duration, slots, startIndex]);

  function durationFits(minutes: number, index: number) {
    const count = minutes / 30;
    if (index < 0 || index + count > slots.length || hasActiveBooking || maintenance) return false;
    return slots.slice(index, index + count).every((slot) => !slot.occupied);
  }

  function chooseSlot(slot: CalendarSlot) {
    if (!slot.available || slot.occupied || hasActiveBooking || maintenance) return;
    const index = slots.findIndex((candidate) => candidate.time === slot.time);
    setValue("start_time", slot.time, { shouldValidate: true, shouldDirty: true });
    if (!durationFits(duration, index)) setValue("duration_minutes", 30, { shouldValidate: true });
    setMessage("");
  }

  function openConfirmation() {
    setMessage("");
    handleSubmit((values) => {
      setReview(values);
      setConfirmOpen(true);
    })();
  }

  function confirmBooking() {
    if (!review) return;
    setMessage("");
    startTransition(async () => {
      const result = await createBooking(review);
      if (!result.ok) {
        setConfirmOpen(false);
        setMessage(result.message);
        return;
      }
      setConfirmOpen(false);
      setSubmitted(true);
      router.refresh();
    });
  }

  const startAllowed = !hasActiveBooking && !maintenance;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
      <section className="rounded-3xl border border-line bg-card p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">Day view</p>
            <h2 className="mt-1 font-heading text-2xl">{dateLabel}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Select a free half-hour starting slot.</p>
          </div>
          <form method="get" className="flex items-end gap-2">
            <label className="text-xs font-medium text-muted-foreground">
              View date
              <Input
                type="date"
                name="date"
                defaultValue={date}
                min={minDate}
                max={maxDate}
                className="mt-1 h-10 rounded-xl border-line bg-paper"
              />
            </label>
            <Button type="submit" variant="outline" className="h-10 rounded-full border-line">Go</Button>
          </form>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-muted-foreground" aria-label="Calendar legend">
          <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-[#7b9c76]" /> Available</span>
          <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-[#c57c59]" /> Booked</span>
          <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-forest" /> Selected</span>
          <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-[#cbc8be]" /> Unavailable</span>
        </div>

        {(hasActiveBooking || maintenance) && (
          <div role="status" className="mt-5 rounded-2xl border border-[#e5dfd1] bg-cream p-4 text-sm leading-6 text-ink/80">
            {maintenance
              ? "This room is under maintenance. Its schedule remains visible, but bookings are disabled."
              : "You already have a booking at " + (activeRoomName ?? "another room") + ". You can book again after it ends or is cancelled."}
          </div>
        )}

        <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-paper">
          {slots.map((slot, index) => {
            const selected = selectedRange.has(slot.time);
            const blocked = slot.occupied;
            const enabled = startAllowed && slot.available && !blocked;
            const label = blocked ? "Booked" : selected ? "Selected" : enabled ? "Available" : "Unavailable";
            const firstInHour = slot.time.endsWith(":00");
            return (
              <div key={slot.time} className={"grid grid-cols-[72px_minmax(0,1fr)] border-b border-line last:border-b-0 sm:grid-cols-[94px_minmax(0,1fr)] " + (firstInHour ? "bg-[#f8f6ef]" : "")}>
                <div className="flex items-center justify-end pr-3 sm:pr-5">
                  <time className={"font-mono text-xs " + (firstInHour ? "font-medium text-ink" : "text-muted-foreground")}>{slot.time}</time>
                </div>
                <div className="border-l border-line py-1.5 pr-2 sm:pr-3">
                  <button
                    type="button"
                    disabled={!enabled}
                    onClick={() => chooseSlot(slot)}
                    aria-pressed={slot.time === startTime}
                    aria-label={slot.time + ", " + label.toLowerCase()}
                    className={
                      "flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-left text-xs transition sm:px-4 " +
                      (selected
                        ? "bg-forest font-medium text-paper"
                        : blocked
                          ? "cursor-not-allowed bg-[#f3e7df] text-[#8b5945]"
                          : enabled
                            ? "bg-[#eaf0e4] text-forest hover:bg-[#dbe6d2]"
                            : "cursor-not-allowed bg-[#f1efe9] text-[#9b9a91]")
                    }
                  >
                    <span className="inline-flex items-center gap-2">
                      <span className={"size-1.5 rounded-full " + (selected ? "bg-sage" : blocked ? "bg-[#b87553]" : enabled ? "bg-[#74916d]" : "bg-[#c3c1b8]")} />
                      {label}
                    </span>
                    {slot.time === startTime && <span className="font-medium">{duration} min start</span>}
                    {index === slots.length - 1 && <span className="sr-only">Bookings end at 18:00.</span>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-line bg-cream p-5 sm:p-7">
        {submitted ? (
          <div role="status" className="py-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-forest text-paper"><Check size={22} /></div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-forest">Booking confirmed</p>
            <h2 className="mt-2 font-heading text-3xl">You’re all set.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Your room is reserved. It now appears as booked on the schedule.</p>
            <Button asChild className="mt-6 rounded-full bg-forest text-paper hover:bg-forest/90"><Link href="/rooms">View your booking <ArrowRight className="ml-2" size={15} /></Link></Button>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">Make it official</p>
            <h2 className="mt-1 font-heading text-3xl">Booking details</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">A few details, then we’ll save your room right away.</p>

            <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); openConfirmation(); }} noValidate>
              <input type="hidden" {...register("room_id")} />
              <input type="hidden" {...register("date")} />
              <input type="hidden" {...register("start_time")} />
              <div>
                <label htmlFor="meeting-name" className="mb-2 block text-sm font-medium">Meeting name</label>
                <Input id="meeting-name" maxLength={120} placeholder="e.g. Design project check-in" className="h-11 rounded-xl border-line bg-card" aria-invalid={Boolean(errors.meeting_name)} {...register("meeting_name")} />
                {errors.meeting_name && <p className="mt-1.5 text-xs text-destructive">{errors.meeting_name.message}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Starting time</label>
                <div className="flex h-11 items-center gap-3 rounded-xl border border-line bg-card px-3">
                  <Clock3 size={16} className="text-forest" aria-hidden="true" />
                  <span className={startTime ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
                    {startTime || "Choose a slot on the schedule"}
                  </span>
                </div>
                {!startTime && errors.start_time && <p className="mt-1.5 text-xs text-destructive">Choose a starting slot on the day view.</p>}
              </div>

              <fieldset>
                <legend className="mb-2 block text-sm font-medium">Duration</legend>
                <div className="grid grid-cols-2 gap-2">
                  {ALLOWED_DURATIONS.map((minutes) => {
                    const fits = startIndex >= 0 && durationFits(minutes, startIndex);
                    const active = duration === minutes;
                    return (
                      <button
                        key={minutes}
                        type="button"
                        disabled={!fits}
                        aria-pressed={active}
                        onClick={() => setValue("duration_minutes", minutes, { shouldValidate: true, shouldDirty: true })}
                        className={"rounded-xl border px-3 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-40 " + (active ? "border-forest bg-forest text-paper" : "border-line bg-card text-ink hover:border-forest")}
                      >
                        {formatDuration(minutes)}
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" {...register("duration_minutes")} />
                {errors.duration_minutes && <p className="mt-1.5 text-xs text-destructive">{errors.duration_minutes.message}</p>}
              </fieldset>

              <div>
                <label htmlFor="attendee-count" className="mb-2 block text-sm font-medium">Number of people</label>
                <div className="relative">
                  <UsersRound size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-forest" aria-hidden="true" />
                  <Input id="attendee-count" type="number" min={1} max={capacity} step={1} className="h-11 rounded-xl border-line bg-card pl-10" aria-invalid={Boolean(errors.attendee_count)} {...register("attendee_count", { valueAsNumber: true })} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">Room capacity: {capacity}</p>
                {errors.attendee_count && <p className="mt-1.5 text-xs text-destructive">{errors.attendee_count.message}</p>}
              </div>

              {message && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-5 text-red-800">{message}</p>}
              <Button type="submit" disabled={!startAllowed || !startTime} className="h-12 w-full rounded-full bg-forest text-paper hover:bg-forest/90 disabled:opacity-50">
                Review booking <ArrowRight className="ml-2" size={16} aria-hidden="true" />
              </Button>
              <p className="text-center text-xs text-muted-foreground">Bookings confirm instantly · Bangkok time</p>
            </form>
          </>
        )}
      </aside>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-lg rounded-3xl border-line bg-paper p-0">
          <DialogHeader className="px-6 pt-6 sm:px-7 sm:pt-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">One last look</p>
            <DialogTitle className="font-heading text-3xl">Confirm your booking</DialogTitle>
            <DialogDescription>Your time will be reserved as soon as you confirm.</DialogDescription>
          </DialogHeader>
          <div className="mx-6 grid grid-cols-2 gap-4 rounded-2xl border border-line bg-card p-4 sm:mx-7">
            <Summary label="Room" value={roomName} />
            <Summary label="Meeting" value={review?.meeting_name ?? ""} />
            <Summary label="Date" value={dateLabel} />
            <Summary label="Time" value={review && startIndex >= 0 ? formatRange(slots[startIndex].startsAt, new Date(new Date(slots[startIndex].startsAt).getTime() + review.duration_minutes * 60_000).toISOString()) : "Choose a time"} />
            <Summary label="Duration" value={formatDuration(review?.duration_minutes ?? duration)} />
            <Summary label="People" value={(review?.attendee_count ?? attendeeCount) + ((review?.attendee_count ?? attendeeCount) === 1 ? " person" : " people")} />
          </div>
          <DialogFooter className="mt-2">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setConfirmOpen(false)}>Go back</Button>
            <Button type="button" disabled={pending} className="rounded-full bg-forest text-paper hover:bg-forest/90" onClick={confirmBooking}>
              {pending && <LoaderCircle className="mr-2 animate-spin" size={15} />}
              {pending ? "Saving…" : "Confirm booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value || "—"}</p>
    </div>
  );
}
