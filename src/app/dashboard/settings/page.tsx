import { createServerSupabase } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import SettingsForm from "./SettingsForm";

export default async function SettingsPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div style={{ maxWidth: 480 }}>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", letterSpacing: "0.2em", color: "#f4621f", textTransform: "uppercase", marginBottom: "0.4rem" }}>// Account</p>
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: "1.4rem", letterSpacing: "-0.03em", marginBottom: "1.5rem" }}>Settings</h1>
      <SettingsForm profile={profile} email={user.email ?? ""} />
    </div>
  );
}