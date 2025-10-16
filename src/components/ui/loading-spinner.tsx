import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "culinary" | "fresh";
}

export function LoadingSpinner({
  className,
  size = "md",
  variant = "default",
}: LoadingSpinnerProps) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-transparent",
        {
          "border-b-sage-600": variant === "default",
          "border-b-wood-600": variant === "culinary", 
          "border-b-mint-500": variant === "fresh",
          "h-4 w-4": size === "sm",
          "h-8 w-8": size === "md",
          "h-12 w-12": size === "lg",
        },
        className,
      )}
    />
  );
}
