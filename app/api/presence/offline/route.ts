import { NextRequest } from "next/server";
import { createSupabaseUserClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseUserClient(accessToken);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq("id", authData.user.id);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "更新离线状态失败" },
      { status: 500 }
    );
  }
}
