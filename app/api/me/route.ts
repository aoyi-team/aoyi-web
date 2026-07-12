import { NextRequest } from "next/server";
import { createSupabaseUserClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      // 客户端 fetch 不带 Authorization 头时，尝试从 cookie 读取
      // 但 Supabase JS 客户端使用 localStorage，这里需要另一种方式
      return Response.json({ user: null });
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseUserClient(accessToken);

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return Response.json({ user: null });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, username, display_name, email, avatar_url")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      return Response.json({
        user: {
          id: authData.user.id,
          username: authData.user.email?.split("@")[0] ?? "玩家",
          display_name: authData.user.email?.split("@")[0] ?? "玩家",
          email: authData.user.email ?? "",
          avatar_url: null,
        },
      });
    }

    return Response.json({ user: profile });
  } catch {
    return Response.json({ user: null });
  }
}
