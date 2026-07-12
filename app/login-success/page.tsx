"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck, ArrowRight, Settings, User } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function LoginSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = React.useState(3);
  const [canceled, setCanceled] = React.useState(false);
  const [displayName, setDisplayName] = React.useState("玩家");
  const [email, setEmail] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return;
      const user = data.session.user;
      setEmail(user.email ?? "");
      const userId = user.id;
      supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", userId)
        .single()
        .then(({ data }) => {
          if (cancelled || !data) return;
          setDisplayName(data.display_name || data.username || "玩家");
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (canceled) return;
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [canceled, countdown]);

  React.useEffect(() => {
    if (countdown === 0 && !canceled) {
      router.push("/dashboard");
    }
  }, [countdown, canceled, router]);

  return (
    <main className="w-screen h-screen flex items-center justify-center overflow-hidden p-4">
      <div className="flex flex-col items-center px-6 w-full max-w-md page-enter">
        {/* 成功图标 */}
        <div className="flex items-center justify-center scale-in" style={{ animationDelay: "0.1s" }}>
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full bg-green-500/20 animate-ping"
              style={{ animationDuration: "2s" }}
            />
            <div className="relative w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CircleCheck className="size-8 text-green-400" />
            </div>
          </div>
        </div>

        {/* 标题 */}
        <h1 className="font-serif text-2xl text-card-foreground text-center mt-6 fade-in" style={{ animationDelay: "0.2s" }}>
          欢迎回来
        </h1>

        {/* 副标题 */}
        <p className="text-sm text-muted-foreground text-center mt-1 fade-in" style={{ animationDelay: "0.3s" }}>
          你已成功登录奥义传说
        </p>

        {/* 分隔线 */}
        <div className="border-b border-border my-8 max-w-xs w-full fade-in" style={{ animationDelay: "0.35s" }} />

        {/* 用户信息卡片 */}
        <div className="bg-card border border-border rounded-md p-4 max-w-sm w-full card-hover fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-muted-foreground">
              <User className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-card-foreground font-medium">{displayName}</span>
              <span className="text-xs text-muted-foreground">{email}</span>
            </div>
            <div className="ml-auto">
              <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-medium">在线</span>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 justify-center max-w-sm w-full mt-6 fade-in" style={{ animationDelay: "0.5s" }}>
          <Link
            href="/dashboard"
            className="flex-1 bg-primary text-primary-foreground rounded-md py-2.5 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowRight className="size-4" />
            进入主页
          </Link>
          <button
            onClick={() => alert("账号管理功能开发中")}
            className="flex-1 border border-border bg-card text-card-foreground rounded-md py-2.5 text-sm font-medium hover:bg-secondary transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Settings className="size-4" />
            管理账号
          </button>
        </div>

        {/* 自动跳转提示 */}
        <p className="text-xs text-muted-foreground text-center mt-8 fade-in" style={{ animationDelay: "0.6s" }}>
          {canceled ? (
            "已取消自动跳转，点击「进入主页」继续"
          ) : (
            <>
              <span>{countdown}</span> 秒后自动跳转到主页...
              <button
                onClick={() => setCanceled(true)}
                className="ml-1 text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                取消
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
