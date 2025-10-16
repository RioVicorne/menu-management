import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "culinary"
    | "fresh";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover-lift",
          {
            "btn-primary text-white shadow-soft":
              variant === "default",
            "bg-red-500 text-white hover:bg-red-600 shadow-soft":
              variant === "destructive",
            "btn-outline border-sage-300 text-sage-700 hover:bg-sage-100":
              variant === "outline",
            "btn-secondary text-foreground":
              variant === "secondary",
            "hover:bg-sage-100 hover:text-sage-800 text-sage-600": 
              variant === "ghost",
            "text-sage-600 underline-offset-4 hover:underline hover:text-sage-800":
              variant === "link",
            "gradient-warm text-white shadow-soft hover:shadow-lg":
              variant === "culinary",
            "gradient-fresh text-white shadow-soft hover:shadow-lg":
              variant === "fresh",
          },
          {
            "h-11 px-6 py-3": size === "default",
            "h-9 px-4 py-2 text-xs": size === "sm",
            "h-12 px-8 py-4 text-base": size === "lg",
            "h-11 w-11": size === "icon",
          },
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
