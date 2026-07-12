import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/friends/api-helpers";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }
    const { user, supabase } = auth;

    const body = await request.json().catch(() => ({}));
    const targetUserId: string | undefined = body.userId;

    if (!targetUserId) {
      return Response.json({ error: "缺少目标用户 ID" }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return Response.json({ error: "不能添加自己为好友" }, { status: 400 });
    }

    // 检查是否已有好友关系
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      if (existing.status === "accepted") {
        return Response.json({ error: "你们已经是好友了" }, { status: 409 });
      }
      if (existing.status === "pending") {
        return Response.json({ error: "已有待处理的申请" }, { status: 409 });
      }
      // declined / blocked 允许重新申请，先删除旧记录
      await supabase.from("friendships").delete().eq("id", existing.id);
    }

    // 创建好友申请
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: targetUserId,
      status: "pending",
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "发送申请失败" },
      { status: 500 }
    );
  }
}
