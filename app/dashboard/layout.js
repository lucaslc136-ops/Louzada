import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardHeader from "./dashboard-header";

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
    <div className="min-h-screen" style={{ background: "var(--paper)" }}>
      <DashboardHeader
        userEmail={user.email}
        householdName={membership.households?.name}
        inviteCode={membership.households?.invite_code}
      />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">{children}</main>
    </div>
  );
}
