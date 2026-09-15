import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/database.types";

export type Profile = Pick<Tables<"profiles">, "id" | "email" | "display_name" | "role">;
export type CurrentUser = { supabase: Awaited<ReturnType<typeof createClient>>; profile: Profile };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || typeof userId !== "string") return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,display_name,role")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;
  return { supabase, profile };
}

export async function requireRole(role: Enums<"user_role">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.profile.role !== role) {
    redirect(user.profile.role === "admin" ? "/admin" : "/rooms");
  }
  return user;
}
