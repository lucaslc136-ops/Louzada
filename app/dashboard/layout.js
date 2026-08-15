import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardSidebar from "./dashboard-sidebar";
import DashboardTopbar from "./dashboard-topbar";

export default async function DashboardLayout({ children }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id, households(name, invite_code)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  return (
    <div className="min-h-screen flex" style={{ background: "var(--paper)" }}>
      <DashboardSidebar />
      <div className="flex-1 min-w-0">
        <DashboardTopbar
          userEmail={user.email}
          householdName={membership.households?.name}
        />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
