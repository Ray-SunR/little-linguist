"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/core/utils/cn";
import { CachedImage } from "./cached-image";

interface LumoCharacterProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function LumoCharacter({ className, size = "md" }: LumoCharacterProps) {
  const sizeClasses = {
    xs: "w-5 h-5",
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-32 h-32",
  };


  return (
    <div
      className={cn("relative flex items-center justify-center", sizeClasses[size], className)}
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
      <CachedImage
        src="/lumo-mascot.png"
        alt="Lumo Mascot"
        fill
        sizes="(max-width: 768px) 48px, 64px"
        className="object-contain relative z-10 rounded-full"
      />
    </div>
  );
}
