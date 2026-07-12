import { NextRequest } from "next/server";
import { createSupabaseUserClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ profile: null });
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseUserClient(accessToken);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return Response.json({ profile: null });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, email, avatar_url")
      .eq("id", authData.user.id)
      .single();

    if (error || !data) {
      return Response.json({
        profile: {
          id: authData.user.id,
          username: authData.user.email?.split("@")[0] ?? "玩家",
          display_name: authData.user.email?.split("@")[0] ?? "玩家",
          email: authData.user.email ?? "",
          avatar_url: null,
        },
      });
    }

    return Response.json({ profile: data });
  } catch {
    return Response.json({ profile: null });
  }
}
