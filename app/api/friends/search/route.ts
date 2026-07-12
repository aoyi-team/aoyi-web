import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/friends/api-helpers";

function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, "\\$&");
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return Response.json({ users: [] });
    }
    const { user, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 1) {
      return Response.json({ users: [] });
    }

    // 转义 LIKE 通配符，防止用户输入 % _ \ 影响查询
    const escapedQuery = escapeLikePattern(query);

    // 若输入包含 @，同时生成邮箱前缀（如 1979432414@qq.com → 1979432414）
    // 让用户既能按完整邮箱也能按用户名前缀搜索
    const searchTerms = new Set<string>([escapedQuery]);
    if (query.includes("@")) {
      const localPart = escapeLikePattern(query.split("@")[0]);
      if (localPart) {
        searchTerms.add(localPart);
      }
    }

    // 按用户名或显示名搜索（排除自己）
    const filters = Array.from(searchTerms)
      .map((term) => `username.ilike.%${term}%,display_name.ilike.%${term}%`)
      .join(",");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, is_online")
      .or(filters)
      .neq("id", user.id)
      .limit(10);

    if (error || !data) {
      return Response.json({ users: [] });
    }

    return Response.json({ users: data });
  } catch {
    return Response.json({ users: [] });
  }
}
