import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();

    // 查询排行榜
    const { data: rows, error } = await supabase
      .from("leaderboard")
      .select("user_id, total_score, wins, losses, rank_tier")
      .order("total_score", { ascending: false })
      .limit(20);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      return Response.json({ leaderboard: [] });
    }

    // 查询对应的用户资料
    const userIds = rows.map((r) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", userIds);

    // 合并数据
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
    const leaderboard = rows.map((row) => ({
      ...row,
      profiles: profileMap.get(row.user_id) ?? null,
    }));

    return Response.json({ leaderboard });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "查询排行榜失败" },
      { status: 500 }
    );
  }
}
