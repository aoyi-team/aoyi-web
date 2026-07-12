"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { fetchWithAuth, dispatchFriendsChanged, FriendsChangedDetail } from "@/lib/friends/client-helpers";
import type { FriendRequest } from "@/lib/friends/types";
import { UserAvatar } from "@/components/user-avatar";
import { useClickOutside } from "@/lib/hooks/use-click-outside";
import { useEscClose } from "@/lib/hooks/use-esc-close";

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 172800) return "昨天";
  return `${Math.floor(diff / 86400)}天前`;
}

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const [requests, setRequests] = React.useState<FriendRequest[]>([]);
  const [actioningId, setActioningId] = React.useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);

  const fetchRequests = React.useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/friends/requests");
      const json = await res.json();
      setRequests(json.requests ?? []);
    } catch {
      // 忽略
    }
  }, []);

  React.useEffect(() => {
    fetchRequests();
    // 监听好友变更事件（来自其他组件的操作）
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<FriendsChangedDetail>).detail;
      if (detail?.type === "delete") return; // 删除好友不影响申请列表
      fetchRequests();
    };
    window.addEventListener("friends-changed", handler);
    return () => window.removeEventListener("friends-changed", handler);
  }, [fetchRequests]);

  useClickOutside([dropdownRef, btnRef], () => setOpen(false), open);
  useEscClose(() => setOpen(false), open);

  const handleAccept = async (requesterId: string, friendshipId: string, req?: FriendRequest) => {
    setActioningId(friendshipId);
    try {
      await fetchWithAuth("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId }),
      });
      setRequests((prev) => prev.filter((r) => r.friendship_id !== friendshipId));
      dispatchFriendsChanged({
        type: "accept",
        friend: req?.profile
          ? {
              id: req.profile.id,
              friendship_id: req.friendship_id,
              username: req.profile.username,
              display_name: req.profile.display_name,
              avatar_url: req.profile.avatar_url,
              is_online: false,
              last_seen: null,
            }
          : undefined,
      });
    } finally {
      setActioningId(null);
    }
  };

  const handleDecline = async (requesterId: string, friendshipId: string) => {
    setActioningId(friendshipId);
    try {
      await fetchWithAuth("/api/friends/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requesterId }),
      });
      setRequests((prev) => prev.filter((r) => r.friendship_id !== friendshipId));
    } finally {
      setActioningId(null);
    }
  };

  const unreadCount = requests.length;

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="通知"
        className="relative size-9 flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-md shadow-lg z-50 scale-in"
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-card-foreground">通知</span>
            <span className="text-xs text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} 条未读` : "已全部读取"}
            </span>
          </div>

          {/* 通知列表 */}
          <div className="max-h-80 overflow-y-auto no-scrollbar">
            {requests.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">暂无新通知</div>
            ) : (
              requests.map((req) => {
                const name = req.profile?.display_name || req.profile?.username || "未知玩家";
                const isActioning = actioningId === req.friendship_id;
                return (
                  <div
                    key={req.friendship_id}
                    className="px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-card-foreground">
                          <span className="font-medium">{name}</span> 申请添加你为好友
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatRelativeTime(req.created_at)}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleAccept(req.requester_id, req.friendship_id, req)}
                            disabled={isActioning}
                            className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
                          >
                            接受
                          </button>
                          <button
                            onClick={() => handleDecline(req.requester_id, req.friendship_id)}
                            disabled={isActioning}
                            className="px-3 py-1 text-xs border border-border text-muted-foreground rounded-md hover:bg-secondary hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                          >
                            拒绝
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
