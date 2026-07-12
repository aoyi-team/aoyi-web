"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase/client";

/**
 * 管理用户在线状态：
 * - 挂载时标记在线
 * - beforeunload 时通过 sendBeacon 标记离线
 * - 页面可见性变化时更新状态
 */
export function usePresence() {
  React.useEffect(() => {
    let markedOnline = false;

    const markOnline = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      try {
        await fetch("/api/presence/online", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });
        markedOnline = true;
      } catch {
        // 忽略
      }
    };

    const markOffline = () => {
      supabase.auth.getSession().then(({ data: sessionData }) => {
        if (!sessionData.session) return;
        const token = sessionData.session.access_token;
        // sendBeacon 不支持自定义 headers，用 Blob 模拟
        const blob = new Blob([JSON.stringify({})], {
          type: "application/json",
        });
        // sendBeacon 无法设置 Authorization header，改为 fetch keepalive
        fetch("/api/presence/offline", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: blob,
          keepalive: true,
        }).catch(() => {});
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markOnline();
      } else if (document.visibilityState === "hidden") {
        markOffline();
      }
    };

    const handleBeforeUnload = () => {
      if (markedOnline) {
        markOffline();
      }
    };

    markOnline();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // 组件卸载时标记离线
      if (markedOnline) {
        markOffline();
      }
    };
  }, []);
}
