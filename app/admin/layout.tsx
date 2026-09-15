import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole("admin");
  return <AppShell profile={user.profile} admin>{children}</AppShell>;
}
