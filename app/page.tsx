"use client";

import * as React from "react";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const supportedOtpTypes = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email",
  "email_change",
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return !!value && supportedOtpTypes.has(value);
}

function getAuthErrorMessage(message: string) {
  if (message === "Token has expired or is invalid") {
    return "验证链接已过期或无效";
  }
  return message;
}

function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = React.useState("正在验证邮箱...");
  const [isError, setIsError] = React.useState(false);

  React.useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (!tokenHash && !type) {
      router.replace("/login");
      return;
    }

    if (!tokenHash || !isEmailOtpType(type)) {
      const timer = window.setTimeout(() => {
        setIsError(true);
        setMessage("验证链接不完整");
        window.setTimeout(() => router.replace("/login"), 1800);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let isMounted = true;

    supabase.auth.verifyOtp({ token_hash: tokenHash, type }).then(({ error }) => {
      if (!isMounted) return;

      if (error) {
        setIsError(true);
        setMessage(getAuthErrorMessage(error.message));
      } else {
        setMessage("邮箱验证成功，正在跳转登录...");
      }

      window.setTimeout(() => router.replace("/login"), 1800);
    });

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[400px] rounded-md border border-border bg-card p-6 text-center">
        <h1 className="font-serif text-2xl text-card-foreground">奥义联盟</h1>
        <p
          className={`mt-4 text-sm ${
            isError ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {message}
        </p>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <React.Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background p-4">
          <p className="text-sm text-muted-foreground">正在加载...</p>
        </main>
      }
    >
      <AuthCallback />
    </React.Suspense>
  );
}
