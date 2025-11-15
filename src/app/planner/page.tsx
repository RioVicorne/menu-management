"use client";

import { useEffect, useState } from "react";
import { AIChat } from "@/components/features/ai";
import { LoginForm } from "@/components/features/common";
import { supabase } from "@/lib/supabase";
import { getAllIngredients, getMenuItems, getDishes } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function PlannerPage() {
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);
  const [currentMenu, setCurrentMenu] = useState<string[]>([]);
  const [availableDishes, setAvailableDishes] = useState<string[]>([]);
  const [isAuthed, setIsAuthed] = useState<boolean>(false);

  useEffect(() => {
    const loadIngredients = async () => {
      const ingredients = await getAllIngredients();
      const ingredientNames = ingredients
        .filter(ing => Number(ing.ton_kho_so_luong || 0) > 0 || Number(ing.ton_kho_khoi_luong || 0) > 0)
        .map(ing => String(ing.ten_nguyen_lieu || ""))
        .filter(name => name.length > 0);
      setAvailableIngredients(ingredientNames);
    };

    loadIngredients();
  }, []);

  // Load today's menu for AI context
  useEffect(() => {
    const loadTodayMenu = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const menuItems = await getMenuItems(today);
        const dishNames = menuItems
          .map(item => String(item.ten_mon_an || ""))
          .filter(name => name.length > 0);
        setCurrentMenu(dishNames);
      } catch (error) {
        logger.error("Failed to load today's menu for AI context", error);
        setCurrentMenu([]);
      }
    };

    loadTodayMenu();
  }, []);

  // Load available dishes from database for AI context
  useEffect(() => {
    const loadAvailableDishes = async () => {
      try {
        const dishes = await getDishes();
        const dishNames = dishes
          .map(dish => String(dish.ten_mon_an || ""))
          .filter(name => name.length > 0);
        setAvailableDishes(dishNames);
      } catch (error) {
        logger.error("Failed to load available dishes for AI context", error);
        setAvailableDishes([]);
      }
    };

    loadAvailableDishes();
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
    currentMenu,
    availableDishes,
    dietaryPreferences: []
  };

  return (
    <div className="animate-fade-in fixed overflow-hidden shadow-lg z-10" data-page="planner">
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