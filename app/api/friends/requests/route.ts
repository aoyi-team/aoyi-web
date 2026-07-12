import { NextRequest } from "next/server";
import { getAuthenticatedUser, fetchProfilesByIds } from "@/lib/friends/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return Response.json({ requests: [] });
    }
    const { user, supabase } = auth;

    const myId = user.id;

    // 查询收到的待处理好友申请
    const { data: friendships, error } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, created_at")
      .eq("addressee_id", myId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error || !friendships) {
      return Response.json({ requests: [] });
    }

    if (friendships.length === 0) {
      return Response.json({ requests: [] });
    }

    // 批量查询申请者资料
    const requesterIds = friendships.map((f) => f.requester_id);
    const profileMap = await fetchProfilesByIds(supabase, requesterIds, "id, username, display_name, avatar_url");
    const requests = friendships.map((f) => ({
      friendship_id: f.id,
      requester_id: f.requester_id,
      created_at: f.created_at,
      profile: profileMap.get(f.requester_id) ?? null,
    }));

    return Response.json({ requests });
  } catch {
    return Response.json({ requests: [] });
  }
}
