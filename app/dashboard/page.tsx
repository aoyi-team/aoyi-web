"use client";

import * as React from "react";
import { SiteNav } from "@/components/site-nav";
import { DashboardContent } from "@/components/dashboard-content";
import { supabase } from "@/lib/supabase/client";
import { usePresence } from "@/lib/friends/use-presence";
import type { ProfileData, MatchRecord } from "@/lib/data/queries";

const MATCH_TYPE_LABEL: Record<string, string> = {
  rank: "排位",
  casual: "匹配",
  friendly: "友谊赛",
};

export default function DashboardPage() {
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [matches, setMatches] = React.useState<MatchRecord[]>([]);
  const [stats, setStats] = React.useState<{ total_score: number; wins: number; losses: number; rank_tier: string } | null>(null);
  const [loading, setLoading] = React.useState(true);

  usePresence();

  React.useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) {
        setLoading(false);
        return;
      }
      const userId = data.session.user.id;
      const accessToken = data.session.access_token;

      try {
        // 并行请求用户数据
        const [profileRes, matchesRes, statsRes] = await Promise.all([
          fetch("/api/profile", {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then((r) => r.json()),
          fetch("/api/matches", {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then((r) => r.json()),
          fetch("/api/stats", {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then((r) => r.json()),
        ]);

        if (cancelled) return;

        setProfile(profileRes.profile ?? null);
        setMatches(matchesRes.matches ?? []);
        setStats(statsRes.stats ?? null);
      } catch {
        // 忽略错误
      } finally {
        if (!cancelled) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="w-screen min-h-screen">
        <SiteNav />
        <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
          加载中...
        </div>
      </main>
    );
  }

  return (
    <main className="w-screen min-h-screen page-enter">
      <SiteNav />
      <DashboardContent profile={profile} matches={matches} stats={stats} />
    </main>
  );
}
