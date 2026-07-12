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
    const requesterId: string | undefined = body.requesterId;

    if (!requesterId) {
      return Response.json({ error: "缺少申请者 ID" }, { status: 400 });
    }

    // 拒绝申请：将状态改为 declined
    const { count, error } = await supabase
      .from("friendships")
      .update({ status: "declined" }, { count: "exact" })
      .eq("requester_id", requesterId)
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!count || count === 0) {
      return Response.json({ error: "申请不存在或已处理" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "拒绝申请失败" },
      { status: 500 }
    );
  }
}
