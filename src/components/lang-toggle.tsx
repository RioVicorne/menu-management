"use client";

import { useI18n } from "./i18n";
import { Languages } from "lucide-react";

export function LangToggle() {
  const { lang, setLang } = useI18n();
  const next = lang === "en" ? "vi" : "en";
  
  return (
    <button
      type="button"
      aria-label="Toggle language"
      onClick={() => setLang(next)}
      className="inline-flex items-center justify-center h-9 px-3 rounded-lg border border-border bg-background text-foreground hover:bg-muted"
    >
      <Languages className="h-4 w-4 mr-2" />
      <span className="text-sm font-medium uppercase">{next}</span>
    </button>
  );
}


