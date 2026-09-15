import { Wrench } from "lucide-react";

export function RoomStatus({ status }: { status: "available" | "maintenance" }) {
  const available = status === "available";
  return (
    <span className={available
      ? "inline-flex items-center gap-2 rounded-full bg-rose-soft px-3 py-1 text-xs font-medium text-rose-strong"
      : "inline-flex items-center gap-2 rounded-full bg-rose-pale px-3 py-1 text-xs font-medium text-rose-strong"}>
      <span className={available ? "size-1.5 rounded-full bg-forest" : "size-1.5 rounded-full bg-destructive"} />
      {available ? "Available" : <><Wrench size={12} aria-hidden="true" /> Maintenance</>}
    </span>
  );
}
