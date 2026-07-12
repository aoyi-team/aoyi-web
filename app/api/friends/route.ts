import { NextRequest } from "next/server";
import { getAuthenticatedUser, fetchProfilesByIds } from "@/lib/friends/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return Response.json({ friends: [] });
    }
    const { user, supabase } = auth;

    const myId = user.id;

    // 查询所有已接受的好友关系（双向）
    const { data: friendships, error } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, status, updated_at")
      .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`)
      .eq("status", "accepted");

    if (error || !friendships) {
      return Response.json({ friends: [] });
    }

    // 提取好友的 user_id（关系中的另一方）
    const friendIds = friendships.map((f) =>
      f.requester_id === myId ? f.addressee_id : f.requester_id
    );

    if (friendIds.length === 0) {
      return Response.json({ friends: [] });
    }

    // 批量查询好友资料（含在线状态）
    const profileMap = await fetchProfilesByIds(supabase, friendIds);
    const friends = friendships
      .map((f) => {
        const profile = profileMap.get(
          f.requester_id === myId ? f.addressee_id : f.requester_id
        );
        if (!profile) return null;
        return { ...profile, friendship_id: f.id };
      })
      .filter(Boolean);

    return Response.json({ friends });
  } catch {
    return Response.json({ friends: [] });
  }
}
