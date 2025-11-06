"use client";

import { useEffect, useState } from "react";
import { AIChat } from "@/components/features/ai";
import { LoginForm } from "@/components/features/common";
import { supabase } from "@/lib/supabase";
import { getAllIngredients } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function PlannerPage() {
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [isAuthed, setIsAuthed] = useState<boolean>(false);

  useEffect(() => {
    const loadIngredients = async () => {
      try {
        const ingredients = await getAllIngredients();
        const ingredientNames = ingredients
          .filter(ing => Number(ing.ton_kho_so_luong || 0) > 0 || Number(ing.ton_kho_khoi_luong || 0) > 0)
          .map(ing => String(ing.ten_nguyen_lieu || ""))
          .filter(name => name.length > 0);
        setAvailableIngredients(ingredientNames);
      } catch (error) {
        logger.error("Error loading ingredients:", error);
      }
    };

    loadIngredients();
  }, []);

  // Auth: check current session and listen for changes
  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const init = async () => {
      if (!supabase) return; // If not configured, skip auth gating
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      setIsAuthed(!!session);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
        setIsAuthed(!!newSession);
      });

      cleanup = () => {
        sub.subscription.unsubscribe();
      };
    };

    init();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const aiContext = {
    availableIngredients,
    currentMenu: [],
    dietaryPreferences: []
  };

  return (
    <div className="animate-fade-in h-screen w-full fixed inset-0 lg:fixed lg:left-64 lg:right-0 lg:top-0 lg:bottom-0" data-page="planner">
      {supabase && !isAuthed ? (
        <div className="h-full flex items-center justify-center p-4 bg-white dark:bg-gray-900">
          <LoginForm onAuthenticated={() => setIsAuthed(true)} />
        </div>
      ) : (
        <div className="h-full w-full">
          <AIChat
            onFeatureSelect={async () => { /* no-op in chatbot-only view */ }}
            context={aiContext}
          />
        </div>
      )}
    </div>
  );
}