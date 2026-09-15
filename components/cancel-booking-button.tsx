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
    setMessage("");
    startTransition(async () => {
      const result = await cancelBooking(bookingId);
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
        onClick={() => setOpen(true)}
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
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl border-line bg-paper p-0">
          <DialogHeader className="px-6 pt-6">
            <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-[#f7e8e0] text-[#8b4634]">
              <AlertTriangle size={18} aria-hidden="true" />
            </div>
            <DialogTitle className="font-heading text-2xl">Cancel this booking?</DialogTitle>
            <DialogDescription>
              {admin
                ? "This will free the room for other students. Admins can cancel at any time."
                : "This will free the room for someone else. This action cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          {message && <p role="alert" className="mx-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{message}</p>}
          <DialogFooter className="mt-3">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Keep booking</Button>
            <Button type="button" disabled={pending} className="rounded-full bg-destructive text-white hover:bg-destructive/90" onClick={confirmCancellation}>
              {pending ? "Cancelling…" : "Yes, cancel booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
