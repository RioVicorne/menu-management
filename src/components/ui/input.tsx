import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  variant?: "default" | "modern" | "outline";
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, variant = "default", ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-xl text-sm transition-all duration-300 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none",
          {
            "input-modern h-11 px-4 py-3": variant === "modern",
            "h-11 px-4 py-3 border-2 border-sage-200 bg-background text-foreground placeholder:text-muted-foreground focus-visible:border-sage-400 focus-visible:ring-2 focus-visible:ring-sage-400/20": variant === "outline",
            "h-10 px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2": variant === "default",
          },
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
