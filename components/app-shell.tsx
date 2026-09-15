import Link from "next/link";
import { BookOpen, CalendarDays, DoorOpen, LogOut, ShieldCheck } from "lucide-react";
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
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-4">
          <Link href={admin ? "/admin" : "/rooms"} className="group flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-forest text-white sm:size-10">
              {admin ? <ShieldCheck size={18} /> : <BookOpen size={18} />}
            </span>
            <span className="min-w-0">
              <span className="block whitespace-nowrap font-heading text-lg leading-none sm:text-xl">Common Room</span>
              <span className="mt-1 block max-w-[40vw] truncate text-[8px] font-semibold uppercase tracking-[0.1em] text-muted-foreground sm:max-w-none sm:text-[10px] sm:tracking-[0.18em]">
                Chulalongkorn University
              </span>
            </span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-ink/75 transition hover:bg-cream hover:text-forest">
                <Icon size={15} aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden text-right lg:block">
              <p className="text-sm font-medium">{profile.display_name}</p>
              <p className="text-xs capitalize text-muted-foreground">{profile.role}</p>
            </div>
            <form action={signOut}>
              <button className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3 py-2 text-xs transition hover:border-forest hover:text-forest sm:gap-2 sm:px-4 sm:text-sm">
                Sign out <LogOut size={14} aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
        <nav aria-label="Main navigation" className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 pb-3 lg:hidden">
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
        <span>Chulalongkorn University · Bangkok</span>
        <span>Bangkok time · 06:00–18:00</span>
      </footer>
    </div>
  );
}
