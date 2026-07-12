"use client";

import * as React from "react";
import { SiteNav } from "@/components/site-nav";
import { Crown, User, Calendar } from "lucide-react";

interface LeaderboardRow {
  user_id: string;
  total_score: number;
  wins: number;
  losses: number;
  rank_tier: string;
  profiles: { display_name: string; username: string } | null;
}

const RANK_TIER_LABEL: Record<string, string> = {
  bronze: "青铜",
  silver: "白银",
  gold: "黄金",
  platinum: "白金",
  diamond: "钻石",
  master: "大师",
  king: "王者",
};

const tabs = ["全服", "好友", "公会"] as const;

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = React.useState<(typeof tabs)[number]>("全服");
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [rows, setRows] = React.useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.leaderboard) {
          setRows(data.leaderboard as LeaderboardRow[]);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => setLoadingMore(false), 1500);
  };

  // 前 3 名
  const podium = rows.slice(0, 3);
  // 第 4 名以后
  const rest = rows.slice(3);

  // 领奖台按 [2, 1, 3] 排列
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <main className="w-screen min-h-screen page-enter">
      <SiteNav />

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* 标题 */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-6 fade-in">
          <h1 className="font-serif text-2xl text-card-foreground">排行榜</h1>
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Calendar className="size-3" />
            赛季 3 · 更新于 {new Date().toISOString().slice(0, 10)}
          </span>
        </div>

        {/* Tab 筛选 */}
        <div className="flex gap-2 mb-6 fade-in" style={{ animationDelay: "0.1s" }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-btn ${activeTab === tab ? "active" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">加载中...</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">暂无排行榜数据</div>
        ) : (
          <>
            {/* 前3名领奖台 */}
            {podium.length > 0 && (
              <div className="grid grid-cols-3 gap-2 md:gap-4 mb-6 stagger">
                {podiumOrder.map((player) => {
                  const rank = rows.findIndex((r) => r.user_id === player.user_id) + 1;
                  const isFirst = rank === 1;
                  const name = player.profiles?.display_name || player.profiles?.username || "未知玩家";
                  const totalGames = player.wins + player.losses;
                  const winRate = totalGames > 0 ? ((player.wins / totalGames) * 100).toFixed(1) : "0";

                  return (
                    <div
                      key={player.user_id}
                      className="bg-card border border-border rounded-md p-3 md:p-5 text-center card-hover relative scale-in"
                      style={{ animationDelay: `${0.05 + rank * 0.05}s` }}
                    >
                      {isFirst && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-yellow-400">
                          <Crown className="size-5 md:size-6" />
                        </div>
                      )}
                      <div
                        className={`text-xs mb-2 font-medium ${
                          isFirst ? "text-yellow-400 mt-2" : "text-muted-foreground"
                        }`}
                      >
                        #{rank}
                      </div>
                      <div
                        className={`${isFirst ? "size-12 md:size-14" : "size-10 md:size-12"} rounded-full bg-secondary mx-auto mb-2 flex items-center justify-center ${
                          isFirst ? "ring-2 ring-yellow-400/30" : ""
                        }`}
                      >
                        <User className={isFirst ? "size-6 text-muted-foreground" : "size-5 text-muted-foreground"} />
                      </div>
                      <div className="text-sm font-medium text-card-foreground truncate">{name}</div>
                      <div className={`text-xs ${isFirst ? "text-yellow-400" : "text-muted-foreground"}`}>
                        {RANK_TIER_LABEL[player.rank_tier] || player.rank_tier}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">胜率 {winRate}%</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 排行榜表格 */}
            {rest.length > 0 && (
              <div className="bg-card border border-border rounded-md overflow-hidden fade-in" style={{ animationDelay: "0.3s" }}>
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">#</th>
                        <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">玩家</th>
                        <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">段位</th>
                        <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">场次</th>
                        <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">胜率</th>
                        <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium">积分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rest.map((row, i) => {
                        const rank = i + 4;
                        const name = row.profiles?.display_name || row.profiles?.username || "未知玩家";
                        const totalGames = row.wins + row.losses;
                        const winRate = totalGames > 0 ? ((row.wins / totalGames) * 100).toFixed(1) : "0";

                        return (
                          <tr key={row.user_id} className="border-b border-border last:border-b-0 table-row-hover cursor-default">
                            <td className="px-4 py-2.5 text-muted-foreground">{rank}</td>
                            <td className="px-4 py-2.5 text-card-foreground truncate">{name}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{RANK_TIER_LABEL[row.rank_tier] || row.rank_tier}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{totalGames}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{winRate}%</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{row.total_score}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 加载更多 */}
            <div className="flex justify-center mt-6 fade-in" style={{ animationDelay: "0.4s" }}>
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2 text-xs border border-border bg-card text-muted-foreground rounded-md hover:bg-secondary hover:text-foreground transition-colors disabled:opacity-50"
              >
                {loadingMore ? "加载中..." : "加载更多"}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
