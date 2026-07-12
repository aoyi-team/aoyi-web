"use client";

import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  /** 在线状态，不传则不显示状态指示点 */
  isOnline?: boolean;
  /** 头像尺寸，sm=24px，md=32px（默认） */
  size?: "sm" | "md";
  className?: string;
}

/**
 * 用户头像组件：圆形背景 + User 图标 + 可选在线状态指示点
 * 用于好友列表、搜索结果、通知列表等场景
 */
export function UserAvatar({ isOnline, size = "md", className }: UserAvatarProps) {
  const box = size === "sm" ? "w-6 h-6" : "w-8 h-8";
  const icon = size === "sm" ? "size-3" : "size-4";
  return (
    <div className={cn("relative shrink-0", className)}>
      <div className={cn(box, "rounded-full bg-secondary flex items-center justify-center")}>
        <User className={cn(icon, "text-muted-foreground")} />
      </div>
      {isOnline !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
            isOnline ? "bg-green-500" : "bg-muted-foreground"
          )}
        />
      )}
    </div>
  );
}
