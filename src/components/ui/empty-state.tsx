import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Button } from "./button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
  actionLabel?: string;
  actionHref?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  className,
  actionLabel,
  actionHref,
  action,
}: EmptyStateProps) {
  return (
    <div className={cn("text-center py-12", className)}>
      {icon && <div className="mx-auto mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
      {description && <p className="text-muted-foreground mb-4">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
      {actionLabel && actionHref && (
        <div className="mt-4">
          <Link href={actionHref}>
            <Button variant="culinary">{actionLabel}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
