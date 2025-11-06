"use client";

import { useEffect, useState } from "react";
import { AIChat } from "@/components/features/ai";
import { getAllIngredients } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function PlannerPage() {
  const [availableIngredients, setAvailableIngredients] = useState<string[]>([]);

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

  const aiContext = {
    availableIngredients,
    currentMenu: [],
    dietaryPreferences: []
  };

  return (
    <div className="animate-fade-in">
      <AIChat
        onFeatureSelect={async () => { /* no-op in chatbot-only view */ }}
        context={aiContext}
      />
    </div>
  );
}