"use client";

import {
  User,
  Pencil,
  ArrowRight,
  Mail,
  Lock,
  Smartphone,
  Shield,
  ChevronRight,
  Trophy,
  Star,
  Flame,
  Check,
} from "lucide-react";
import type { ProfileData, MatchRecord } from "@/lib/data/queries";
import { FriendListSidebar } from "@/components/friend-list-sidebar";

interface DashboardContentProps {
  profile: ProfileData | null;
  matches: MatchRecord[];
  stats: { total_score: number; wins: number; losses: number; rank_tier: string } | null;
}

const MATCH_TYPE_LABEL: Record<string, string> = {
  rank: "排位",
  casual: "匹配",
  friendly: "友谊赛",
};

const RANK_TIER_LABEL: Record<string, string> = {
  bronze: "青铜",
  silver: "白银",
  gold: "黄金",
  platinum: "白金",
  diamond: "钻石",
  master: "大师",
  king: "王者",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
}

export function DashboardContent({ profile, matches, stats }: DashboardContentProps) {
  const displayName = profile?.display_name || profile?.username || "未知玩家";
  const email = profile?.email || "";
  const totalGames = stats ? stats.wins + stats.losses : 0;
  const winRate = totalGames > 0 && stats ? ((stats.wins / totalGames) * 100).toFixed(1) : "0";
  const rankTier = stats ? RANK_TIER_LABEL[stats.rank_tier] || stats.rank_tier : "无";
  // 用积分模拟等级：每 10 分一级
  const level = stats ? Math.floor(stats.total_score / 10) + 1 : 1;
  const expInLevel = stats ? stats.total_score % 10 : 0;
  const expPercent = (expInLevel / 10) * 100;

  const accountSettings = [
    { icon: Mail, label: "绑定邮箱", value: email ? `${email.slice(0, 2)}***${email.slice(email.indexOf("@"))}` : "未绑定" },
    { icon: Lock, label: "修改密码", value: null },
    { icon: Smartphone, label: "绑定手机", value: "未绑定" },
    { icon: Shield, label: "两步验证", value: "已开启", valueClass: "text-green-400" },
  ];

  // 根据数据动态计算成就解锁状态
  const achievements = [
    { icon: Trophy, title: "初次胜利", desc: "赢得第一场比赛", unlocked: (stats?.wins ?? 0) >= 1, color: "text-yellow-400" },
    { icon: Star, title: "百战老兵", desc: "完成100场比赛", unlocked: totalGames >= 100, color: "text-yellow-400" },
    { icon: Flame, title: "连胜达人", desc: "达成10连胜", unlocked: false, color: "text-orange-400" },
    { icon: Trophy, title: "钻石之路", desc: "达到钻石段位", unlocked: stats?.rank_tier === "diamond" || stats?.rank_tier === "master" || stats?.rank_tier === "king", color: "text-muted-foreground" },
  ];
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8 flex gap-6">
      <FriendListSidebar />
      <div className="flex-1 min-w-0">
      {/* Section A: 个人卡片 + 战绩 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 stagger">
        {/* 左栏：个人卡片 */}
        <div className="bg-card border border-border rounded-md p-6 card-hover">
          <div className="w-20 h-20 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
            <User className="size-8 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-card-foreground text-center">{displayName}</p>
          <p className="text-xs text-muted-foreground text-center mt-1">Lv.{level}</p>

          {/* 等级进度条 */}
          <div className="mt-3 w-full">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>经验值</span>
              <span>{stats?.total_score ?? 0} 分</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${expPercent}%` }} />
            </div>
          </div>

          <button
            onClick={() => alert("编辑资料功能开发中")}
            className="w-full mt-4 py-2 text-xs border border-border bg-card text-card-foreground rounded-md hover:bg-secondary transition-colors flex items-center justify-center gap-2"
          >
            <Pencil className="size-3.5" />
            编辑资料
          </button>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="bg-background border border-border rounded-md p-2 text-center">
              <p className="text-sm font-medium text-card-foreground whitespace-nowrap">{totalGames}</p>
              <p className="text-xs text-muted-foreground">场次</p>
            </div>
            <div className="bg-background border border-border rounded-md p-2 text-center">
              <p className="text-sm font-medium text-card-foreground whitespace-nowrap">{winRate}%</p>
              <p className="text-xs text-muted-foreground">胜率</p>
            </div>
          </div>
        </div>

        {/* 右栏：最近战绩 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-card-foreground">最近战绩</span>
            <button className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex items-center gap-1">
              查看全部
              <ArrowRight className="size-3" />
            </button>
          </div>
          <div className="bg-card border border-border rounded-md overflow-hidden">
            {matches.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">暂无对战记录</div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium min-w-[60px]">模式</th>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium min-w-[60px]">得分</th>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium min-w-[50px]">结果</th>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium min-w-[60px]">时长</th>
                      <th className="px-4 py-2.5 text-left text-xs text-muted-foreground font-medium min-w-[60px]">日期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map((match) => (
                      <tr key={match.id} className="border-b border-border last:border-b-0 table-row-hover cursor-default">
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{MATCH_TYPE_LABEL[match.match_type] || match.match_type}</td>
                        <td className="px-4 py-2.5 text-card-foreground whitespace-nowrap">{match.score}</td>
                        <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                          <span className={match.result === "win" ? "text-green-400" : match.result === "lose" ? "text-red-400" : "text-yellow-400"}>
                            {match.result === "win" ? "胜利" : match.result === "lose" ? "失败" : "平局"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatDuration(match.duration_seconds)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(match.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Section B: 账号设置 + 成就 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger">
        {/* 左：账号设置 */}
        <div className="bg-card border border-border rounded-md p-5">
          <p className="text-sm font-medium text-card-foreground mb-4">账号设置</p>
          <div className="flex flex-col gap-0">
            {accountSettings.map((item, i) => (
              <div
                key={i}
                onClick={() => alert(item.label)}
                className={`flex items-center justify-between py-2 cursor-pointer table-row-hover ${
                  i < accountSettings.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                    <item.icon className="size-4 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-card-foreground">{item.label}</span>
                </div>
                {item.value ? (
                  <span className={`text-xs ${item.valueClass || "text-muted-foreground"}`}>{item.value}</span>
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 右：成就 */}
        <div className="bg-card border border-border rounded-md p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-card-foreground">成就</p>
            <span className="text-xs text-muted-foreground">{unlockedCount}/{achievements.length}</span>
          </div>
          <div className="flex flex-col gap-3">
            {achievements.map((ach, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-2 rounded-md hover:bg-secondary transition-colors cursor-pointer ${
                  !ach.unlocked ? "opacity-50" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center shrink-0">
                  <ach.icon className={`size-4 ${ach.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-card-foreground font-medium">{ach.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ach.desc}</p>
                </div>
                {ach.unlocked ? (
                  <Check className="size-4 text-green-400 shrink-0 mt-1" />
                ) : (
                  <Lock className="size-4 text-muted-foreground shrink-0 mt-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
