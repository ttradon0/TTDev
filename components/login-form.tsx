"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, KeyRound, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginInput } from "@/lib/validation";
import { signIn } from "@/app/actions";

export function LoginForm() {
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const submit = handleSubmit((values) => {
    setMessage("");
    startTransition(async () => {
      const result = await signIn(values);
      if (!result.ok) setMessage(result.message);
    });
  });

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="email">University email</label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} aria-hidden="true" />
          <Input id="email" type="email" autoComplete="username" placeholder="you@university.edu" className="h-12 rounded-xl border-line bg-paper pl-11" aria-invalid={Boolean(errors.email)} {...register("email")} />
        </div>
        {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>}
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="password">Password</label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={17} aria-hidden="true" />
          <Input id="password" type="password" autoComplete="current-password" placeholder="Your password" className="h-12 rounded-xl border-line bg-paper pl-11" aria-invalid={Boolean(errors.password)} {...register("password")} />
        </div>
        {errors.password && <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>}
      </div>
      {message && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{message}</p>}
      <Button type="submit" disabled={pending} className="h-12 w-full rounded-full bg-forest text-paper hover:bg-forest/90">
        {pending ? "Opening your workspace…" : "Continue to Common Room"}
        {!pending && <ArrowRight className="ml-2" size={16} aria-hidden="true" />}
      </Button>
      <p className="text-center text-xs leading-5 text-muted-foreground">Demo access only. Ask your university admin for an account.</p>
    </form>
  );
}
