"use client";

import * as React from "react";

/**
 * 点击外部关闭的通用 hook
 * 当鼠标点击发生在所有 refs 之外时，调用 onClose
 *
 * @param refs 需要排除的元素引用数组（如触发按钮 + 下拉面板）
 * @param onClose 关闭回调
 * @param active 是否激活（默认 true，false 时不监听）
 */
export function useClickOutside(
  refs: React.RefObject<HTMLElement | null>[],
  onClose: () => void,
  active: boolean = true
) {
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      if (
        refs.every(
          (ref) => ref.current && !ref.current.contains(e.target as Node)
        )
      ) {
        onCloseRef.current();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // refs 数组引用稳定时不重新绑定
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
