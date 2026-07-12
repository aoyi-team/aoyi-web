import { NextRequest } from "next/server";
import { createSupabaseUserClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ stats: null });
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseUserClient(accessToken);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return Response.json({ stats: null });
    }

    const { data, error } = await supabase
      .from("leaderboard")
      .select("total_score, wins, losses, rank_tier")
      .eq("user_id", authData.user.id)
      .single();

    if (error || !data) {
      return Response.json({ stats: null });
    }

    return Response.json({ stats: data });
  } catch {
    return Response.json({ stats: null });
  }
}
