import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // IMPORTANT: must return void (no push/return)
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  const isAdmin = pathname.startsWith("/admin");

  if (!isDashboard && !isAdmin) return response;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirectWithCookies(request, response, `/login?redirect=${encodeURIComponent(pathname)}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role,status")
    .eq("id", user.id)
    .maybeSingle();

  if (isAdmin && profile?.role !== "admin") {
    return redirectWithCookies(request, response, "/");
  }

  if (isDashboard && profile?.status === "pending" && pathname !== "/pending") {
    return redirectWithCookies(request, response, "/pending");
  }

  return response;
}

function redirectWithCookies(request: NextRequest, response: NextResponse, path: string) {
  const url = request.nextUrl.clone();
  const [newPathname, newSearch] = path.split("?");
  url.pathname = newPathname;
  url.search = newSearch ? `?${newSearch}` : "";

  const redirectResponse = NextResponse.redirect(url);

  // preserve any auth cookies that Supabase refreshed
  response.cookies.getAll().forEach((c) => {
    redirectResponse.cookies.set(c);
  });

  return redirectResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};