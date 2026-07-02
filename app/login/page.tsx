"use client";

import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/password-input";
import { SocialLogin } from "@/components/social-login";
import { supabase } from "@/lib/supabase/client";

interface FormErrors {
  email?: string;
  password?: string;
}

function getAuthErrorMessage(message: string) {
  if (message === "Invalid login credentials") {
    return "邮箱或密码不正确，或账号还没有注册";
  }
  if (message === "Email not confirmed") {
    return "邮箱还没有验证，请先查看邮箱完成验证";
  }
  return message;
}

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [remember, setRemember] = React.useState(false);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitError, setSubmitError] = React.useState("");
  const [submitMessage, setSubmitMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [shake, setShake] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem("aoyi.rememberEmail");
    if (saved) {
      const timer = window.setTimeout(() => {
        setEmail(saved);
        setRemember(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!email.trim()) {
      nextErrors.email = "请输入邮箱";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "邮箱格式不正确";
    }
    if (!password) {
      nextErrors.password = "请输入密码";
    } else if (password.length < 6) {
      nextErrors.password = "密码至少 6 位";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitMessage("");
    if (!validate()) {
      setShake(true);
      setTimeout(() => setShake(false), 300);
      return;
    }

    setIsLoading(true);
    if (remember) {
      localStorage.setItem("aoyi.rememberEmail", email);
    } else {
      localStorage.removeItem("aoyi.rememberEmail");
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setSubmitError(getAuthErrorMessage(error.message));
      setShake(true);
      setTimeout(() => setShake(false), 300);
    } else {
      setSubmitMessage("登录成功");
    }

    setIsLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div
        className={`w-full max-w-[400px] bg-card border border-border rounded-md p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
          shake ? "animate-shake" : ""
        }`}
      >
        <h1 className="font-serif text-2xl tracking-tight text-card-foreground">
          奥义联盟
        </h1>
        <p className="text-sm text-muted-foreground mt-1">登录到你的账号</p>

        <div className="border-b border-border my-6" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label
              htmlFor="email"
              className="block text-xs text-muted-foreground mb-1.5 font-normal"
            >
              邮箱
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              aria-invalid={!!errors.email}
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <Label
              htmlFor="password"
              className="block text-xs text-muted-foreground mb-1.5 font-normal"
            >
              密码
            </Label>
            <PasswordInput
              id="password"
              placeholder="输入密码"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              aria-invalid={!!errors.password}
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Checkbox
                checked={remember}
                onCheckedChange={(checked) => setRemember(checked === true)}
              />
              <span>记住我</span>
            </label>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => alert("忘记密码功能后续实现")}
            >
              忘记密码?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full py-2.5 h-auto rounded-md"
            disabled={isLoading}
          >
            {isLoading ? "登录中..." : "登录"}
          </Button>
          {submitError && (
            <p className="text-xs text-destructive text-center">{submitError}</p>
          )}
          {submitMessage && (
            <p className="text-xs text-foreground text-center">{submitMessage}</p>
          )}
        </form>

        <SocialLogin mode="login" className="mt-6" />

        <p className="text-center mt-6 text-xs text-muted-foreground">
          还没有账号？
          <Link
            href="/register"
            className="text-foreground hover:underline transition-colors"
          >
            立即注册
          </Link>
        </p>
      </div>
    </main>
  );
}
