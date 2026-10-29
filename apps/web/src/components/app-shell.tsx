"use client";

import { History, LogOut, Trophy, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/logo";
import { SocketProvider, useSocket } from "@/components/socket-provider";
import { ErrorState, LoadingState } from "@/components/states";
import { homeFor, useLogout, useMe } from "@/hooks/use-auth";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const NAV: Record<Role, { href: string; label: string; icon: LucideIcon }[]> = {
  coach: [{ href: "/coach", label: "Tournaments", icon: Trophy }],
  student: [
    { href: "/student", label: "Tournaments", icon: Trophy },
    { href: "/student/matches", label: "My matches", icon: History },
  ],
};

/** Real-time socket status: dot + label. `dark` for the sidebar, light pill for the mobile bar. */
function ConnectionStatus({ dark = false }: { dark?: boolean }) {
  const { connection } = useSocket();
  const label = connection === "connected" ? "Live" : connection === "connecting" ? "Connecting…" : "Offline";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-xs font-medium",
        dark
          ? "rounded-xl bg-white/5 px-3 py-2 text-slate-300"
          : cn(
              "rounded-full px-3 py-1",
              connection === "connected" && "bg-emerald-50 text-emerald-700",
              connection === "connecting" && "bg-amber-50 text-amber-700",
              connection === "disconnected" && "bg-red-50 text-red-700",
            ),
      )}
      title={`Real-time connection: ${label}`}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          connection === "connected" ? "bg-emerald-400" : connection === "connecting" ? "animate-pulse bg-amber-400" : "bg-red-400",
        )}
      />
      {label}
      {dark && connection === "connected" && <span className="text-slate-500">· real-time</span>}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/**
 * Layout for signed-in areas. Frontend half of role enforcement: middleware redirects early,
 * and this re-checks against the verified /me response. `role` omitted = any signed-in user.
 */
export function AppShell({ role, children }: { role?: Role; children: React.ReactNode }) {
  const me = useMe();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  const user = me.data;
  const wrongRole = !!user && !!role && user.role !== role;

  useEffect(() => {
    if (me.isSuccess && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (wrongRole && user) router.replace(homeFor(user.role));
  }, [me.isSuccess, user, wrongRole, router, pathname]);

  if (me.isPending) return <LoadingState label="Checking your session…" />;
  if (me.isError)
    return (
      <div className="mx-auto max-w-md p-8">
        <ErrorState error={me.error} onRetry={() => me.refetch()} />
      </div>
    );
  if (!user || wrongRole) return <LoadingState label="Redirecting…" />;

  const navRole = user.role;
  const nav = NAV[navRole].map((item) => ({
    ...item,
    active:
      item.href === homeFor(navRole)
        ? pathname === item.href || pathname.startsWith(`${item.href}/tournaments`)
        : pathname.startsWith(item.href),
  }));
  const roleLabel = navRole === "coach" ? "♚ Coach" : "♟ Student";
  const logoutButton = (className: string) => (
    <button
      type="button"
      aria-label="Log out"
      title="Log out"
      disabled={logout.isPending}
      onClick={() => logout.mutate()}
      className={cn("rounded-lg p-2 transition-colors", className)}
    >
      <LogOut className="size-4" />
    </button>
  );

  return (
    <SocketProvider userId={user.id}>
      {/* Desktop: fixed slate sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-primary text-white lg:flex">
        <Link href={homeFor(navRole)} aria-label="Home" className="px-6 pt-7 pb-8">
          <Logo tone="dark" />
        </Link>

        <p className="px-6 pb-2 font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase">Menu</p>
        <nav className="flex flex-col gap-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                item.active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              {item.active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-violet-400" />}
              <item.icon className={cn("size-4.5", item.active ? "text-violet-300" : "text-slate-500 group-hover:text-slate-300")} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto space-y-3 p-4">
          <ConnectionStatus dark />
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-white"
              aria-hidden
            >
              {initials(user.name)}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-sm font-semibold">{user.name}</span>
              <span className="block font-mono text-[10px] tracking-wider text-violet-300 uppercase">{roleLabel}</span>
            </span>
            {logoutButton("text-slate-400 hover:bg-white/10 hover:text-white")}
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-64">
        {/* Mobile / tablet: compact top bar with the same nav */}
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur lg:hidden">
          <div className="flex h-14 items-center gap-3 px-4">
            <Link href={homeFor(navRole)} aria-label="Home">
              <Logo iconOnlyOnMobile />
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <span className="max-md:hidden">
                <ConnectionStatus />
              </span>
              <span
                className="flex size-8 items-center justify-center rounded-full bg-brand-accent text-xs font-bold text-white"
                aria-hidden
              >
                {initials(user.name)}
              </span>
              {logoutButton("text-muted-foreground hover:bg-accent hover:text-primary")}
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  item.active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-primary",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-10 lg:py-10">{children}</main>

        <footer className="border-t">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground lg:px-10">
            <span>
              <span className="font-semibold text-primary">Kingdom of Chess</span> · Tournaments
            </span>
            <span className="font-mono">© {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </SocketProvider>
  );
}
