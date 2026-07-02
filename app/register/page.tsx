"use client";

import * as React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/password-input";
import { SocialLogin } from "@/components/social-login";
import { createUserMetadata } from "@/lib/auth/user-metadata";
import { supabase } from "@/lib/supabase/client";

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  agreement?: string;
}

function getAuthErrorMessage(message: string) {
  if (message === "User already registered") {
    return "这个邮箱已经注册过，请直接登录";
  }
  if (message === "Password should be at least 6 characters") {
    return "密码至少 6 位";
  }
  return message;
}

export default function RegisterPage() {
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [agreement, setAgreement] = React.useState(false);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitError, setSubmitError] = React.useState("");
  const [submitMessage, setSubmitMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [shake, setShake] = React.useState(false);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!username.trim()) {
      nextErrors.username = "请输入用户名";
    } else if (username.length < 2 || username.length > 20) {
      nextErrors.username = "用户名长度为 2-20 位";
    }
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
    if (!confirmPassword) {
      nextErrors.confirmPassword = "请再次输入密码";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "两次输入的密码不一致";
    }
    if (!agreement) {
      nextErrors.agreement = "请阅读并同意用户协议和隐私政策";
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
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: createUserMetadata(username),
      },
    });

    if (error) {
      setSubmitError(getAuthErrorMessage(error.message));
      setShake(true);
      setTimeout(() => setShake(false), 300);
    } else if (data.session) {
      setSubmitMessage("注册成功");
    } else {
      setSubmitMessage("注册成功，请查看邮箱完成验证");
    }

    setIsLoading(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div
        className={`w-full max-w-[400px] max-h-[92vh] overflow-y-auto no-scrollbar bg-card border border-border rounded-md p-6 md:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300 ${
          shake ? "animate-shake" : ""
        }`}
      >
        <h1 className="font-serif text-2xl tracking-tight text-center text-card-foreground">
          奥义联盟
        </h1>
        <p className="text-sm text-center text-muted-foreground mt-1">
          创建新账号
        </p>

        <div className="border-b border-border my-6" />

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label
              htmlFor="username"
              className="block text-xs text-muted-foreground mb-1.5 font-normal"
            >
              用户名
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errors.username)
                  setErrors((prev) => ({ ...prev, username: undefined }));
              }}
              aria-invalid={!!errors.username}
              autoComplete="username"
            />
            {errors.username && (
              <p className="text-xs text-destructive mt-1">
                {errors.username}
              </p>
            )}
          </div>

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
                if (errors.email)
                  setErrors((prev) => ({ ...prev, email: undefined }));
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
              placeholder="设置密码"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password)
                  setErrors((prev) => ({ ...prev, password: undefined }));
              }}
              aria-invalid={!!errors.password}
              autoComplete="new-password"
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <Label
              htmlFor="confirmPassword"
              className="block text-xs text-muted-foreground mb-1.5 font-normal"
            >
              确认密码
            </Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword)
                  setErrors((prev) => ({
                    ...prev,
                    confirmPassword: undefined,
                  }));
              }}
              aria-invalid={!!errors.confirmPassword}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive mt-1">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={agreement}
              onCheckedChange={(checked) => {
                setAgreement(checked === true);
                if (errors.agreement)
                  setErrors((prev) => ({ ...prev, agreement: undefined }));
              }}
              className="mt-0.5 shrink-0"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              我已阅读并同意《用户协议》和《隐私政策》
            </span>
          </label>
          {errors.agreement && (
            <p className="text-xs text-destructive -mt-2">{errors.agreement}</p>
          )}

          <Button
            type="submit"
            className="w-full py-2.5 h-auto rounded-md"
            disabled={isLoading}
          >
            {isLoading ? "注册中..." : "立即注册"}
          </Button>
          {submitError && (
            <p className="text-xs text-destructive text-center">{submitError}</p>
          )}
          {submitMessage && (
            <p className="text-xs text-foreground text-center">{submitMessage}</p>
          )}
        </form>

        <SocialLogin mode="register" className="mt-6" />

        <p className="text-center mt-6 text-xs text-muted-foreground">
          已有账号？
          <Link
            href="/login"
            className="text-foreground hover:underline transition-colors"
          >
            立即登录
          </Link>
        </p>
      </div>
    </main>
  );
}
