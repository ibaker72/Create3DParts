import { redirect } from "next/navigation";
import { createServerSupabase } from "@/utils/supabase/server";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, company")
    .eq("id", user.id)
    .single();

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0a0a", color: "#efefef" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Topbar name={profile?.name ?? user.email ?? "Account"} />
        <main style={{ flex: 1, padding: "1.5rem", maxWidth: 960, width: "100%" }}>
          {children}
        </main>
      </div>
    </div>
  );
}