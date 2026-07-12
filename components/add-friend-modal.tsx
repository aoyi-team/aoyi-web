"use client";

import * as React from "react";
import { Search, X, UserPlus, Check } from "lucide-react";
import { fetchWithAuth, dispatchFriendsChanged } from "@/lib/friends/client-helpers";
import { useEscClose } from "@/lib/hooks/use-esc-close";
import { UserAvatar } from "@/components/user-avatar";
import type { SearchResult } from "@/lib/friends/types";

interface AddFriendModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddFriendModal({ open, onClose }: AddFriendModalProps) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [sentIds, setSentIds] = React.useState<Set<string>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  // 打开时自动聚焦
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
      setSentIds(new Set());
      setError(null);
    }
    // Cleanup: always restore overflow when effect re-runs or component unmounts
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEscClose(onClose, open);

  // 防抖搜索
  React.useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();

    debounceRef.current = setTimeout(async () => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(
          `/api/friends/search?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        const json = await res.json();
        setResults(json.users ?? []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("搜索失败，请重试");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [query, open]);

  const handleSendRequest = async (userId: string) => {
    setError(null);
    try {
      const res = await fetchWithAuth("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "发送申请失败");
        return;
      }
      setSentIds((prev) => new Set(prev).add(userId));
      dispatchFriendsChanged({ type: "request-sent" });
    } catch {
      setError("网络错误，请重试");
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-md p-6 w-full max-w-sm mx-4 scale-in">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-card-foreground">添加好友</h2>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="size-6 flex items-center justify-center rounded-md hover:bg-secondary transition-colors cursor-pointer"
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </div>

        {/* 搜索框 */}
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入玩家名称或ID..."
            className="w-full bg-input border border-border text-card-foreground placeholder-muted-foreground pl-9 pr-3 py-2 text-sm rounded-md outline-none transition-colors focus:ring-1 focus:ring-ring focus:border-ring"
          />
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-3 px-3 py-2 text-xs text-destructive bg-destructive/10 rounded-md">
            {error}
          </div>
        )}

        {/* 搜索结果 */}
        <div className="flex flex-col gap-1 mb-4 max-h-64 overflow-y-auto no-scrollbar">
          {!query.trim() ? (
            <div className="text-xs text-muted-foreground text-center py-4 flex flex-col items-center gap-2">
              <UserPlus className="size-6 text-muted-foreground/50" />
              输入名称搜索玩家
            </div>
          ) : loading ? (
            <div className="text-xs text-muted-foreground text-center py-4">搜索中...</div>
          ) : results.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4">未找到匹配的玩家</div>
          ) : (
            results.map((user) => {
              const name = user.display_name || user.username;
              const sent = sentIds.has(user.id);
              return (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar isOnline={user.is_online} />
                    <div>
                      <div className="text-sm text-card-foreground">{name}</div>
                      <div className="text-xs text-muted-foreground">{user.username}</div>
                    </div>
                  </div>
                  {sent ? (
                    <span className="flex items-center gap-1 px-3 py-1 text-xs text-green-400">
                      <Check className="size-3" />
                      已发送
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      添加
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 取消按钮 */}
        <button
          onClick={onClose}
          className="w-full border border-border rounded-md py-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
        >
          取消
        </button>
      </div>
    </div>
  );
}
