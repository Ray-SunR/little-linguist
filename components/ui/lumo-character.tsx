"use client";

import Image from "next/image";
import { cn } from "@/lib/core/utils/cn";

interface LumoCharacterProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  priority?: boolean;
}

export function LumoCharacter({ className, size = "md", priority = false }: LumoCharacterProps) {
  const sizeClasses = {
    xs: "w-5 h-5",
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-32 h-32",
  };

  const resolvedSizeClass = sizeClasses[size] ?? sizeClasses.md;

  return (
    <div
      className={cn("relative flex items-center justify-center", resolvedSizeClass, className)}
      style={{
        animation: 'lumo-float 4s ease-in-out infinite'
      }}
    >
      <style jsx>{`
        @keyframes lumo-float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-5px) rotate(5deg); }
        }
      `}</style>
      <Image
        src="/lumo-mascot.png"
        alt="Lumo Mascot"
        fill
        sizes="(max-width: 768px) 100vw, 350px"
        className="object-contain relative z-10 rounded-full"
        priority={priority}
      />
    </div>
  );
}
