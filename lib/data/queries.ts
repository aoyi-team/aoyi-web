import { createSupabaseAdminClient } from "@/lib/supabase/server";

// 默认展示的用户 ID（sansenjian，第一个注册用户）
const DEFAULT_USER_ID = "f9734755-7dd7-4202-b9a6-37031bb29ed0";

export interface ProfileData {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
}

export interface MatchRecord {
  id: string;
  match_type: "casual" | "rank" | "friendly";
  result: "win" | "lose" | "draw";
  score: number;
  duration_seconds: number;
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  total_score: number;
  wins: number;
  losses: number;
  rank_tier: string;
  profiles: { display_name: string; username: string } | null;
}

/**
 * 获取用户资料
 */
export async function getProfile(userId: string = DEFAULT_USER_ID): Promise<ProfileData | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, email, avatar_url")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as ProfileData;
}

/**
 * 获取用户最近对战记录
 */
export async function getRecentMatches(
  userId: string = DEFAULT_USER_ID,
  limit = 10
): Promise<MatchRecord[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id, match_type, result, score, duration_seconds, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as MatchRecord[];
}

/**
 * 获取用户排行榜数据
 */
export async function getUserLeaderboard(
  userId: string = DEFAULT_USER_ID
): Promise<{ total_score: number; wins: number; losses: number; rank_tier: string } | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("total_score, wins, losses, rank_tier")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data;
}

/**
 * 获取全局排行榜（按积分降序）
 */
export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const supabase = createSupabaseAdminClient();

  const { data: rows, error } = await supabase
    .from("leaderboard")
    .select("user_id, total_score, wins, losses, rank_tier")
    .order("total_score", { ascending: false })
    .limit(limit);

  if (error || !rows || rows.length === 0) return [];

  // 查询对应的用户资料
  const userIds = rows.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  return rows.map((row) => ({
    ...row,
    profiles: profileMap.get(row.user_id) ?? null,
  })) as unknown as LeaderboardEntry[];
}
