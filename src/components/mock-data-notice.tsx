"use client";

import { AlertCircle } from "lucide-react";

export default function MockDataNotice() {
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="text-sm">
          <p className="text-yellow-800 dark:text-yellow-200 font-medium">
            Running in Mock Data Mode
          </p>
          <p className="text-yellow-700 dark:text-yellow-300 mt-1">
            Supabase is not configured. Data will not persist between sessions.
            <a
              href="/SUPABASE_SETUP.md"
              target="_blank"
              className="underline hover:no-underline ml-1"
            >
              Setup Supabase →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
