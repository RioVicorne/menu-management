import React from "react";
import { AlertCircle } from "lucide-react";

interface ErrorDisplayProps {
  error?: string | Error | null;
  message?: string;
  className?: string;
}

export default function ErrorDisplay({
  error,
  message = "An error occurred",
  className = "",
}: ErrorDisplayProps) {
  const errorMessage =
    error instanceof Error ? error.message : error || message;

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <div className="text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Error
        </h3>
        <p className="text-gray-600 dark:text-gray-400">{errorMessage}</p>
      </div>
    </div>
  );
}
