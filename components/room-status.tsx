import { Wrench } from "lucide-react";

export function RoomStatus({ status }: { status: "available" | "maintenance" }) {
  const available = status === "available";
  return (
    <span className={available
      ? "inline-flex items-center gap-2 rounded-full bg-[#e7eddf] px-3 py-1 text-xs font-medium text-forest"
      : "inline-flex items-center gap-2 rounded-full bg-[#f7e8e0] px-3 py-1 text-xs font-medium text-[#8b4634]"}>
      <span className={available ? "size-1.5 rounded-full bg-[#4f7758]" : "size-1.5 rounded-full bg-[#b06046]"} />
      {available ? "Available" : <><Wrench size={12} aria-hidden="true" /> Maintenance</>}
    </span>
  );
}
