import { NextRequest } from "next/server";
import { createSupabaseUserClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserProfile } from "@/lib/friends/types";

export interface AuthResult {
  user: User;
  supabase: SupabaseClient;
}

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthResult | null> {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const accessToken = authHeader.replace("Bearer ", "");
    const supabase = createSupabaseUserClient(accessToken);

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return null;

    return { user: authData.user, supabase };
  } catch {
    return null;
  }
}

/**
 * 批量查询用户资料并返回 Map（以 id 为键）
 * 无结果时返回空 Map
 */
export async function fetchProfilesByIds<T = UserProfile>(
  supabase: SupabaseClient,
  ids: string[],
  select = "id, username, display_name, avatar_url, is_online, last_seen"
): Promise<Map<string, T>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from("profiles")
    .select(select)
    .in("id", ids);
  const rows = ((data ?? []) as unknown) as Array<{ id: string } & T>;
  return new Map(rows.map((p) => [p.id, p] as [string, T]));
}
