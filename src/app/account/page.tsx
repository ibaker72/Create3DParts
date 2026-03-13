import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AccountPage() {
  // ✅ Next 16: cookies() returns a Promise
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) redirect("/login?redirect=/account");

  async function signOut() {
    "use server";

    // ✅ also async here
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    await supabase.auth.signOut();
    redirect("/");
  }

  return (
    <main style={{ padding: "72px 20px", maxWidth: 840, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, marginBottom: 6 }}>My Account</h1>
      <p style={{ opacity: 0.85, marginBottom: 14, fontSize: 14 }}>
        Signed in as <b>{user.email}</b>
      </p>

      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}