"use client";

import * as React from "react";

/**
 * Esc 键关闭的通用 hook
 * 当用户按下 Escape 键时调用 onClose
 *
 * @param onClose 关闭回调
 * @param active 是否激活（默认 true，false 时不监听）
 */
export function useEscClose(onClose: () => void, active: boolean = true) {
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [active]);
}
