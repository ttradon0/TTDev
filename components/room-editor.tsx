"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, LoaderCircle, Plus, Save } from "lucide-react";
import { removeRoom, restoreRoom, saveRoom } from "@/app/actions";
import { RoomStatus } from "@/components/room-status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Room } from "@/lib/queries";
import { roomSchema } from "@/lib/validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type RoomFormValues = {
  id?: string;
  name: string;
  capacity: number;
  status: "available" | "maintenance";
};

export function RoomEditor({ room }: { room?: Room }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [removeOpen, setRemoveOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      id: room?.id ?? "",
      name: room?.name ?? "",
      capacity: room?.capacity ?? 8,
      status: room?.status ?? "available",
    },
  });

  const submit = handleSubmit((values) => {
    setMessage("");
    const data = new FormData();
    data.set("id", values.id ?? "");
    data.set("name", values.name);
    data.set("capacity", String(values.capacity));
    data.set("status", values.status);
    startTransition(async () => {
      const result = await saveRoom(data);
      setMessage(result.ok ? (room ? "Room updated." : "Room added.") : result.message);
      if (result.ok) router.refresh();
    });
  });

  function onRemove() {
    if (!room) return;
    setMessage("");
    startTransition(async () => {
      const result = await removeRoom(room.id);
      if (result.ok) {
        setRemoveOpen(false);
        router.refresh();
      } else {
        setMessage(result.message);
      }
    });
  }

  function onRestore() {
    if (!room) return;
    setMessage("");
    startTransition(async () => {
      const result = await restoreRoom(room.id);
      setMessage(result.ok ? "Room restored." : result.message);
      if (result.ok) router.refresh();
    });
  }

  const removed = Boolean(room?.removed_at);

  return (
    <>
      <form onSubmit={(event) => { event.preventDefault(); submit(); }} noValidate className="rounded-3xl border border-line bg-card p-5 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.19em] text-muted-foreground">{room ? "Edit room" : "Add a new room"}</p>
            <h3 className="mt-1 font-heading text-2xl">{room?.name ?? "New space"}</h3>
          </div>
          {room && !removed && <RoomStatus status={room.status} />}
          {removed && <span className="rounded-full bg-[#eeeae0] px-3 py-1 text-xs text-muted-foreground">Removed · history kept</span>}
        </div>
        <input type="hidden" {...register("id")} />
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
          <div>
            <label htmlFor={"room-name-" + (room?.id ?? "new")} className="mb-1.5 block text-xs font-medium">Room name</label>
            <Input id={"room-name-" + (room?.id ?? "new")} disabled={removed} placeholder="e.g. The Reading Room" className="h-10 rounded-xl border-line bg-paper" aria-invalid={Boolean(errors.name)} {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor={"room-capacity-" + (room?.id ?? "new")} className="mb-1.5 block text-xs font-medium">Capacity</label>
            <Input id={"room-capacity-" + (room?.id ?? "new")} type="number" min={1} max={500} disabled={removed} className="h-10 rounded-xl border-line bg-paper" aria-invalid={Boolean(errors.capacity)} {...register("capacity", { valueAsNumber: true })} />
            {errors.capacity && <p className="mt-1 text-xs text-destructive">{errors.capacity.message}</p>}
          </div>
        </div>
        <div className="mt-4">
          <label htmlFor={"room-status-" + (room?.id ?? "new")} className="mb-1.5 block text-xs font-medium">Status</label>
          <select id={"room-status-" + (room?.id ?? "new")} disabled={removed} className="h-10 w-full rounded-xl border border-line bg-paper px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" {...register("status")}>
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
          </select>
        </div>
        {message && <p role="status" className={"mt-3 text-xs " + (message.includes("could not") || message.includes("already") ? "text-destructive" : "text-forest")}>{message}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          {removed ? (
            <Button type="button" variant="outline" disabled={pending} onClick={onRestore} className="rounded-full border-line"><Check size={15} className="mr-2" /> Restore room</Button>
          ) : (
            <Button type="submit" disabled={pending} className="rounded-full bg-forest text-paper hover:bg-forest/90">
              {pending ? <LoaderCircle size={15} className="mr-2 animate-spin" /> : room ? <Save size={15} className="mr-2" /> : <Plus size={15} className="mr-2" />}
              {pending ? "Saving…" : room ? "Save changes" : "Add room"}
            </Button>
          )}
          {room && !removed && <Button type="button" variant="ghost" onClick={() => setRemoveOpen(true)} className="ml-auto rounded-full text-muted-foreground hover:text-destructive">Remove room</Button>}
        </div>
      </form>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="max-w-md rounded-2xl border-line bg-paper">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl">Remove {room?.name}?</DialogTitle>
            <DialogDescription>This room will disappear from Student booking. Existing booking history will stay available to admins.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setRemoveOpen(false)}>Keep room</Button>
            <Button type="button" disabled={pending} className="rounded-full bg-destructive text-white hover:bg-destructive/90" onClick={onRemove}>{pending ? "Removing…" : "Remove room"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
