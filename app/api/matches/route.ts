import { NextRequest } from "next/server";
import { createSupabaseUserClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ matches: [] });
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseUserClient(accessToken);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return Response.json({ matches: [] });
    }

    const { data, error } = await supabase
      .from("matches")
      .select("id, match_type, result, score, duration_seconds, created_at")
      .eq("user_id", authData.user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error || !data) {
      return Response.json({ matches: [] });
    }

    return Response.json({ matches: data });
  } catch {
    return Response.json({ matches: [] });
  }
}
