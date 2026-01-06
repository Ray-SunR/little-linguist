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
    <motion.div
      className={cn("relative flex items-center justify-center", sizeClasses[size], className)}
      animate={{
        y: [0, -5, 0],
        rotate: [0, 5, -5, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <CachedImage
        src="/lumo-mascot.png"
        alt="Lumo Mascot"
        fill
        className="object-contain relative z-10 rounded-full"
      />
    </motion.div>
  );
}
