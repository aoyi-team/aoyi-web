"use client";

import { cn } from "@/lib/utils";

interface SocialLoginProps {
  mode?: "login" | "register";
  className?: string;
}

function SocialIconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="size-10 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-secondary hover:border-accent hover:text-foreground transition-colors"
      aria-label={label}
    >
      {children}
    </button>
  );
}

function QqIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3C8.5 3 6 5.5 6 9v2c-1.5 1-2 3-2 5 0 1.5.5 2.5 1.5 3 .5.5 1.5 1 2.5 1 .5 1 1.5 1.5 4 1.5s3.5-.5 4-1.5c1 0 2-.5 2.5-1 1-.5 1.5-1.5 1.5-3 0-2-.5-4-2-5V9c0-3.5-2.5-6-6-6z" />
    </svg>
  );
}

function WechatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-5", className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 4C5.5 4 3 6.5 3 9.5c0 1.5.7 2.8 1.8 3.8L4 16l2.8-1.4c.7.2 1.4.4 2.2.4" />
      <path d="M15 10c-3.3 0-6 2.2-6 5s2.7 5 6 5c.7 0 1.3-.1 2-.3L19.5 21l-1-2.3c1-.9 1.5-2.1 1.5-3.5 0-2.8-2.7-5.2-4.5-5.2z" />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-5", className)}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-5", className)}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.05 0 0 .97-.31 3.17 1.18A10.9 10.9 0 0 1 12 6.01c.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.13v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export function SocialLogin({ mode = "login", className }: SocialLoginProps) {
  const action = mode === "login" ? "登录" : "注册";

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          其他{action}方式
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="flex items-center justify-center gap-3">
        <SocialIconButton label={`QQ${action}`}>
          <QqIcon />
        </SocialIconButton>
        <SocialIconButton label={`微信${action}`}>
          <WechatIcon />
        </SocialIconButton>
        <SocialIconButton label={`Google${action}`}>
          <GoogleIcon />
        </SocialIconButton>
        <SocialIconButton label={`GitHub${action}`}>
          <GithubIcon />
        </SocialIconButton>
      </div>
    </div>
  );
}
