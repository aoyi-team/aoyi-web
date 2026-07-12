"use client";

import { supabase } from "@/lib/supabase/client";
import type { FriendProfile } from "@/lib/friends/types";

/**
 * 发起带认证的 fetch 请求，自动从 Supabase session 获取 access_token
 * 并附加 Authorization: Bearer 头。
 *
 * 如果没有 session，返回一个模拟的 401 Response。
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    // 返回一个模拟的 401 Response
    return new Response(JSON.stringify({ error: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = data.session.access_token;
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}

export type FriendsChangedType = "request-sent" | "accept" | "decline" | "delete";

export interface FriendsChangedDetail {
  type: FriendsChangedType;
  friendId?: string;
  friend?: FriendProfile;
}

export function dispatchFriendsChanged(detail: FriendsChangedDetail) {
  window.dispatchEvent(
    new CustomEvent("friends-changed", { detail })
  );
}
