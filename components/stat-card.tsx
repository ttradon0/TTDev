import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <article className="rounded-3xl border border-line bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-full bg-cream text-forest"><Icon size={16} aria-hidden="true" /></span>
      </div>
      <p className="mt-4 font-heading text-4xl tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </article>
  );
}
