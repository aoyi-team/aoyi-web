import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/friends/api-helpers";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }
    const { user, supabase } = auth;

    const { id } = await params;
    if (!id) {
      return Response.json({ error: "缺少好友关系 ID" }, { status: 400 });
    }

    // 删除好友关系，验证当前用户是 requester 或 addressee
    const { count, error } = await supabase
      .from("friendships")
      .delete({ count: "exact" })
      .eq("id", id)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (!count || count === 0) {
      return Response.json({ error: "好友关系不存在" }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "删除好友失败" },
      { status: 500 }
    );
  }
}
