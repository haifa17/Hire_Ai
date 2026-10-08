"use client";

import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  readonly href?: string;
  readonly className?: string;
  readonly size?: "sm" | "md" | "lg";
  readonly variant?: "light" | "dark";
  readonly collapsed?: boolean;
  readonly useImage?: boolean;
  readonly showText?: boolean;
}

export function Logo({
  href = "/",
  className = "",
  size = "md",
  variant = "light",
  collapsed = false,
  useImage = true,
  showText = true,
}: LogoProps) {
  const heightClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-9",
  };

  const textSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  const badgeSizes = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs sm:text-sm",
    lg: "px-2.5 py-1 text-base",
  };

  const content = collapsed ? (
    <Image
      src="/TalentBridgeAILogo.png"
      alt="TalentBridge AI Logo"
      width={40}
      height={40}
      priority
      className="h-8 w-auto object-contain shrink-0 max-w-[40px]"
    />
  ) : (
    <div className="flex items-center gap-1.5 shrink-0">
      {useImage && (
        <Image
          src="/TalentBridgeAILogo.png"
          alt="TalentBridge AI Logo"
          width={180}
          height={48}
          priority
          className={`${heightClasses[size]} w-auto object-contain shrink-0`}
        />
      )}
      {showText && (
        <div className={`flex items-center tracking-tight font-extrabold select-none ${textSizes[size]}`}>
          <span className={variant === "dark" ? "text-white" : "text-[#06296B]"}>
            Talent
          </span>
          <span className="text-[#0073E6]">
            Bridge
          </span>
          <span className={`ml-1.5 rounded-lg bg-gradient-to-r from-[#0066FF] to-[#0080FF] text-white font-black shadow-sm ${badgeSizes[size]}`}>
            AI
          </span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={`inline-flex items-center shrink-0 ${className}`}>
        {content}
      </Link>
    );
  }

  return <div className={`inline-flex items-center shrink-0 ${className}`}>{content}</div>;
}