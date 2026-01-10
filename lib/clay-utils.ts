import { cva } from "class-variance-authority";
import { cn } from "@/lib/core"; // Assuming core exports cn, otherwise import from clsx/tailwind-merge

// Claymorphism utility for generating the "inflated" 3D look
// We use multiple box-shadows: two inset for the highlight/shadow (concavity/convexity) and one for drop shadow

export const clayVariants = cva(
  "transition-all duration-300 ease-out active:scale-95 relative overflow-hidden",
  {
    variants: {
      intensity: {
        low: "shadow-clay-sm",
        medium: "shadow-clay-md", 
        high: "shadow-clay-lg",
        inset: "shadow-clay-inset"
      },
      shape: {
        rounded: "rounded-xl",
        pill: "rounded-full",
        circle: "rounded-full aspect-square flex items-center justify-center p-0"
      },
      color: {
        white: "bg-white text-slate-600",
        purple: "bg-[#f3e8ff] text-purple-700", // purple-100 base
        pink: "bg-[#fce7f3] text-pink-700", // pink-100 base
        blue: "bg-[#e0f2fe] text-blue-700", // sky-100 base
        green: "bg-[#dcfce7] text-green-700", // green-100 base
        orange: "bg-[#ffedd5] text-orange-700", // orange-100 base
        red: "bg-[#fee2e2] text-red-700", // red-100 base
        accent: "bg-accent text-white",
        glass: "bg-white/70 backdrop-blur-lg border border-white/40 text-slate-700"
      }
    },
    defaultVariants: {
      intensity: "medium",
      shape: "rounded",
      color: "white"
    }
  }
);

/*
  Note: Make sure your Tailwind config or global CSS defines these custom shadows.
  If not, here are the inline styles equivalent for quick reference or fallback:
  
  shadow-clay-sm: 
    box-shadow: 
      inset 1px 1px 2px rgba(255, 255, 255, 0.6), 
      inset -1px -1px 2px rgba(174, 174, 192, 0.4), 
      3px 3px 6px rgba(174, 174, 192, 0.4);

  shadow-clay-md:
    box-shadow: 
      inset 2px 2px 4px rgba(255, 255, 255, 0.6), 
      inset -2px -2px 4px rgba(174, 174, 192, 0.4), 
      6px 6px 12px rgba(174, 174, 192, 0.4);
      
  shadow-clay-lg:
    box-shadow: 
      inset 3px 3px 6px rgba(255, 255, 255, 0.7), 
      inset -3px -3px 6px rgba(174, 174, 192, 0.5), 
      10px 10px 20px rgba(174, 174, 192, 0.4);

  shadow-clay-inset:
    box-shadow: 
      inset 4px 4px 8px rgba(174, 174, 192, 0.4), 
      inset -4px -4px 8px rgba(255, 255, 255, 0.7);
*/

export const getClayClass = (props: any) => cn(clayVariants(props));
