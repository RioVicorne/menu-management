"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  const isDark = (theme === "dark") || (theme === "system" && resolvedTheme === "dark");

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}


