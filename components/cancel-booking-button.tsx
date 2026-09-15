"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { cancelBooking } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CancelBookingButton({
  bookingId,
  canCancel,
  admin = false,
}: {
  bookingId: string;
  canCancel: boolean;
  admin?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function confirmCancellation() {
    if (pending) return;
    setMessage("");
    startTransition(async () => {
      let result;
      try {
        result = await cancelBooking(bookingId);
      } catch {
        setMessage("We couldn’t cancel this booking. Check your connection and try again.");
        return;
      }
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={!canCancel || pending}
        onClick={() => { setMessage(""); setOpen(true); }}
        className="rounded-full border-line bg-paper text-ink hover:border-destructive hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending && <LoaderCircle className="mr-2 animate-spin" size={15} aria-hidden="true" />}
        Cancel booking
      </Button>
      {!canCancel && !admin && (
        <p className="mt-2 max-w-xs text-xs leading-5 text-muted-foreground">
          Cancellation closes 30 minutes before the meeting.
        </p>
      )}
      <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && pending) return; setOpen(nextOpen); }}>
        <DialogContent className="max-w-md rounded-2xl border-line bg-paper p-0">
          <DialogHeader className="px-6 pt-6">
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-rose-soft text-rose-strong">
              <AlertTriangle size={18} aria-hidden="true" />
            </div>
            <DialogTitle className="font-heading text-2xl">Cancel this booking?</DialogTitle>
            <DialogDescription>
              {admin
                ? "This will free the room for other students. Admins can cancel at any time."
                : "This will free the room for someone else. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {message && <p role="alert" className="mx-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm leading-5 text-destructive">{message}</p>}
          <DialogFooter className="mt-3">
            <Button type="button" variant="outline" disabled={pending} className="rounded-full" onClick={() => setOpen(false)}>Keep booking</Button>
            <Button type="button" disabled={pending} className="rounded-full bg-destructive text-white hover:bg-destructive/90" onClick={confirmCancellation}>
              {pending ? "Cancelling…" : "Yes, cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
