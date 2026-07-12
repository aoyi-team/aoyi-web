"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "aoyi-theme";

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as "light" | "dark" | null;
    const initial = saved ?? "dark";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem(STORAGE_KEY, next);
  };

  if (!mounted) {
    return (
      <button
        className={cn(
          "size-9 rounded-md border border-border bg-card text-muted-foreground",
          className
        )}
      />
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label="切换主题"
      className={cn(
        "size-9 rounded-md border border-border bg-card text-muted-foreground",
        "hover:bg-secondary hover:text-foreground transition-colors",
        "flex items-center justify-center cursor-pointer",
        className
      )}
    >
      {theme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  );
}
