"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/dashboard", label: "主页" },
  { href: "/leaderboard", label: "排行榜" },
  { href: "/community", label: "社区" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [displayName, setDisplayName] = React.useState<string>("玩家");

  React.useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return;
      const userId = data.session.user.id;
      supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", userId)
        .single()
        .then(({ data }) => {
          if (cancelled || !data) return;
          setDisplayName(data.display_name || data.username || "玩家");
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 切换路由时关闭移动端菜单
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-20 w-full bg-card/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 max-w-6xl mx-auto">
        {/* Logo + 桌面导航 */}
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard"
            className="font-serif text-lg text-card-foreground tracking-tight"
          >
            奥义传说
          </Link>
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 桌面端用户区 */}
        <div className="hidden md:flex items-center gap-3">
          <NotificationBell />
          <ThemeToggle />
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
            <User className="size-4 text-muted-foreground" />
          </div>
          <span className="text-sm text-card-foreground">{displayName}</span>
          <span className="text-muted-foreground">|</span>
          <Link
            href="/login"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            退出
          </Link>
        </div>

        {/* 移动端右侧 */}
        <div className="flex md:hidden items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="菜单"
            className="size-9 rounded-md border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center justify-center"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* 移动端菜单 */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="flex flex-col px-4 py-3 gap-1">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm py-2 transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="flex items-center gap-3 pt-3 mt-1 border-t border-border">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <User className="size-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-card-foreground">{displayName}</span>
              <Link
                href="/login"
                className="text-xs text-muted-foreground ml-auto"
              >
                退出
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
