import Link from "next/link";
import { ArrowUpRight, BookOpen, CalendarDays, DoorOpen, ShieldCheck } from "lucide-react";
import type { Profile } from "@/lib/auth";
import { signOut } from "@/app/actions";

export function AppShell({
  profile,
  children,
  admin = false,
}: {
  profile: Profile;
  children: React.ReactNode;
  admin?: boolean;
}) {
  const links = admin
    ? [
        { href: "/admin", label: "Overview", icon: CalendarDays },
        { href: "/admin/rooms", label: "Rooms", icon: DoorOpen },
        { href: "/admin/bookings", label: "Bookings", icon: BookOpen },
      ]
    : [{ href: "/rooms", label: "Rooms", icon: DoorOpen }];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-line bg-paper/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href={admin ? "/admin" : "/rooms"} className="group flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-full bg-forest text-paper">
              {admin ? <ShieldCheck size={18} /> : <BookOpen size={18} />}
            </span>
            <span>
              <span className="block font-heading text-xl leading-none">Common Room</span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                University spaces
              </span>
            </span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 sm:flex">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-ink/75 transition hover:bg-cream hover:text-forest">
                <Icon size={15} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{profile.display_name}</p>
              <p className="text-xs capitalize text-muted-foreground">{profile.role}</p>
            </div>
            <form action={signOut}>
              <button className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm transition hover:border-forest hover:text-forest">
                Sign out <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Mobile navigation" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 pb-3 sm:hidden">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="inline-flex shrink-0 items-center gap-2 rounded-full bg-cream px-4 py-2 text-sm text-forest">
              <Icon size={15} aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-12">{children}</main>
      <footer className="mx-auto flex max-w-7xl justify-between px-5 pb-8 text-xs text-muted-foreground sm:px-8">
        <span>Built for good work, together.</span>
        <span>Bangkok time · 06:00–18:00</span>
      </footer>
    </div>
  );
}
