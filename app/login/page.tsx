import { redirect } from "next/navigation";
import { ArrowUpRight, Clock3, MapPin } from "lucide-react";
import BlurText from "@/components/BlurText";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.profile.role === "admin" ? "/admin" : "/rooms");

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
      <section className="relative flex min-h-[48vh] flex-col justify-between overflow-hidden bg-cream px-7 py-8 text-ink sm:px-12 sm:py-10 lg:min-h-screen lg:px-16">
        <div className="absolute -right-24 top-24 size-80 rounded-full border border-forest/10" />
        <div className="absolute -right-10 top-40 size-52 rounded-full border border-forest/10" />
        <div className="absolute -left-16 top-1/3 size-64 rounded-full bg-rose-soft/55 blur-3xl" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full border border-forest/20 bg-white font-heading text-xl text-forest shadow-sm">C</span>
          <div>
            <p className="font-heading text-lg leading-none">Common Room</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Chulalongkorn University</p>
          </div>
        </div>
        <div className="relative z-10 my-16 max-w-xl lg:my-0">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-forest">A little room to think</p>
          <BlurText text="Make space for good ideas." className="font-heading text-5xl leading-[1.04] tracking-[-0.04em] text-ink sm:text-6xl lg:text-7xl" delay={80} />
          <p className="mt-6 max-w-md text-base leading-7 text-muted-foreground">Find a quiet corner, bring your group together, and make the next hour count.</p>
        </div>
        <div className="relative z-10 flex flex-wrap gap-6 text-sm text-ink/75">
          <span className="inline-flex items-center gap-2"><MapPin size={15} className="text-forest" /> Chulalongkorn campus</span>
          <span className="inline-flex items-center gap-2"><Clock3 size={15} className="text-forest" /> Open 06:00–18:00</span>
        </div>
        <div className="pointer-events-none absolute bottom-16 right-14 hidden size-44 rotate-12 items-center justify-center rounded-[2rem] border border-forest/10 bg-white/50 lg:flex">
          <ArrowUpRight size={44} strokeWidth={1} className="text-forest/60" />
        </div>
      </section>
      <section className="flex items-center justify-center bg-white px-6 py-14 sm:px-12">
        <div className="w-full max-w-md">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-forest">Welcome back</p>
          <h1 className="font-heading text-4xl tracking-[-0.035em] sm:text-5xl">Your space is waiting.</h1>
          <p className="mb-9 mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Sign in with your university demo account to see rooms and today’s schedule.</p>
          <LoginForm />
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-forest" /> Secure email and password sign in
          </div>
        </div>
      </section>
    </main>
  );
}
