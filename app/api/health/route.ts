import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();

    // 并行查询各表数据量
    const [profiles, matches, leaderboard, rooms] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("matches").select("id", { count: "exact", head: true }),
      supabase.from("leaderboard").select("id", { count: "exact", head: true }),
      supabase.from("rooms").select("id", { count: "exact", head: true }),
    ]);

    const hasError = [profiles, matches, leaderboard, rooms].some((r) => r.error);

    if (hasError) {
      return Response.json(
        {
          status: "error",
          message: "部分表查询失败",
          errors: {
            profiles: profiles.error?.message ?? null,
            matches: matches.error?.message ?? null,
            leaderboard: leaderboard.error?.message ?? null,
            rooms: rooms.error?.message ?? null,
          },
        },
        { status: 500 }
      );
    }

    return Response.json({
      status: "ok",
      database: "connected",
      tables: {
        profiles: profiles.count ?? 0,
        matches: matches.count ?? 0,
        leaderboard: leaderboard.count ?? 0,
        rooms: rooms.count ?? 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "数据库连接失败",
      },
      { status: 500 }
    );
  }
}
