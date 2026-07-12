"use client";

import * as React from "react";
import { UserPlus, Search, ChevronDown, X } from "lucide-react";
import { fetchWithAuth, dispatchFriendsChanged, FriendsChangedDetail } from "@/lib/friends/client-helpers";
import { cn } from "@/lib/utils";
import { AddFriendModal } from "@/components/add-friend-modal";
import { UserAvatar } from "@/components/user-avatar";
import type { FriendProfile } from "@/lib/friends/types";

function formatLastSeen(dateStr: string | null): string {
  if (!dateStr) return "离线";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 3600) return "刚刚在线";
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前在线`;
  if (diff < 172800) return "昨天在线";
  return `${Math.floor(diff / 86400)}天前在线`;
}

const OFFLINE_PREVIEW_COUNT = 4;

export function FriendListSidebar() {
  const [friends, setFriends] = React.useState<FriendProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showAllOffline, setShowAllOffline] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);

  const fetchFriends = React.useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/friends");
      if (!res.ok) {
        setFriends([]);
        return;
      }
      const json = await res.json();
      setFriends(json.friends ?? []);
    } catch {
      // 忽略
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchFriends();
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<FriendsChangedDetail>).detail;
      if (!detail) {
        // 无 detail，全量刷新
        fetchFriends();
        return;
      }
      switch (detail.type) {
        case "accept":
          if (detail.friend) {
            setFriends((prev) => {
              // 避免重复添加
              if (prev.some((f) => f.id === detail.friend!.id)) return prev;
              return [...prev, detail.friend!];
            });
          } else {
            fetchFriends();
          }
          break;
        case "delete":
          if (detail.friendId) {
            setFriends((prev) => prev.filter((f) => f.id !== detail.friendId));
          } else {
            fetchFriends();
          }
          break;
        default:
          // request-sent, decline 等情况不需要更新好友列表
          break;
      }
    };
    window.addEventListener("friends-changed", handler);
    return () => window.removeEventListener("friends-changed", handler);
  }, [fetchFriends]);

  // 按搜索词过滤
  const filtered = React.useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.trim().toLowerCase();
    return friends.filter((f) => {
      const name = (f.display_name || f.username).toLowerCase();
      return name.includes(q) || f.username.toLowerCase().includes(q);
    });
  }, [friends, searchQuery]);

  const onlineFriends = filtered.filter((f) => f.is_online);
  const offlineFriends = filtered.filter((f) => !f.is_online);
  const displayedOffline = showAllOffline
    ? offlineFriends
    : offlineFriends.slice(0, OFFLINE_PREVIEW_COUNT);

  return (
    <>
      <aside className="w-56 shrink-0 hidden lg:block">
        <div className="bg-card border border-border rounded-md p-4 sticky top-20 fade-in">
          {/* 头部：标题 + 数量 + 添加按钮 */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-card-foreground">好友列表</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{friends.length}</span>
              <button
                onClick={() => setModalOpen(true)}
                aria-label="添加好友"
                title="添加好友"
                className="size-6 flex items-center justify-center rounded-md hover:bg-secondary transition-colors cursor-pointer"
              >
                <UserPlus className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* 搜索框 */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索好友..."
              className="w-full bg-input border border-border text-card-foreground placeholder-muted-foreground pl-8 pr-3 py-1.5 text-xs rounded-md outline-none transition-colors focus:ring-1 focus:ring-ring focus:border-ring"
            />
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-muted-foreground">加载中...</div>
          ) : friends.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <UserPlus className="size-6 text-muted-foreground/50" />
              暂无好友
              <button
                onClick={() => setModalOpen(true)}
                className="text-xs text-primary hover:underline"
              >
                添加好友
              </button>
            </div>
          ) : (
            <>
              {/* 在线好友 */}
              {onlineFriends.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-xs text-muted-foreground">
                      在线 ({onlineFriends.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {onlineFriends.map((friend) => (
                      <FriendCard key={friend.id} friend={friend} />
                    ))}
                  </div>
                </div>
              )}

              {/* 离线好友 */}
              {offlineFriends.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      离线 ({offlineFriends.length})
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {displayedOffline.map((friend) => (
                      <FriendCard key={friend.id} friend={friend} />
                    ))}
                  </div>
                  {!showAllOffline && offlineFriends.length > OFFLINE_PREVIEW_COUNT && (
                    <button
                      onClick={() => setShowAllOffline(true)}
                      className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1 flex items-center justify-center gap-1"
                    >
                      查看全部离线好友
                      <ChevronDown className="size-3" />
                    </button>
                  )}
                </div>
              )}

              {/* 搜索无结果 */}
              {filtered.length === 0 && searchQuery.trim() && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  未找到匹配的好友
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      <AddFriendModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

function FriendCard({ friend }: { friend: FriendProfile }) {
  const name = friend.display_name || friend.username;
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetchWithAuth(`/api/friends/${friend.friendship_id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        dispatchFriendsChanged({ type: "delete", friendId: friend.id });
      }
    } catch {
      // 忽略
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="group flex items-center gap-2 p-2 rounded-md hover:bg-secondary transition-colors cursor-pointer">
      <UserAvatar isOnline={friend.is_online} />
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "text-sm truncate",
            friend.is_online ? "text-card-foreground" : "text-muted-foreground"
          )}
        >
          {name}
        </div>
        <div className="text-xs text-muted-foreground">
          {friend.is_online ? "在线中" : formatLastSeen(friend.last_seen)}
        </div>
      </div>
      {confirming ? (
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-1.5 py-0.5 text-[10px] bg-destructive text-destructive-foreground rounded hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
          >
            确认
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="px-1.5 py-0.5 text-[10px] border border-border text-muted-foreground rounded hover:bg-secondary transition-colors cursor-pointer"
          >
            取消
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          aria-label="删除好友"
          className="size-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all cursor-pointer"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  );
}
