"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getMenuItems,
  addDishToMenu,
  updateMenuItem,
  deleteMenuItem,
  getCalendarData,
  addMenuItemsBatch,
  MenuItem,
} from "@/lib/api";
import { logger } from "@/lib/logger";

interface MenuContextType {
  // State
  dishes: MenuItem[];
  loading: boolean;
  error: string | null
  // Actions
  addDish: (dish: string, servings: number, notes?: string) => Promise<void>;
  addDishesBatch: (items: Array<{ dishId: string; servings: number; notes?: string }>) => Promise<void>;
  updateDish: (
    dishId: string,
    dishUpdates: { servings?: number; notes?: string },
  ) => Promise<void>;
  removeDish: (dishId: string) => Promise<void>;
  refreshMenu: () => Promise<void>;
  applyChangesWithSingleRefresh: (fn: () => Promise<void>) => Promise<void>;
  getCalendarData: (start: string, end: string) => Promise<Record<string, unknown>[]>;
}

const MenuContext = createContext<MenuContextType | null>(null);

export function MenuProvider({
  children,
  selectedDate,
}: {
  children: React.ReactNode;
  selectedDate: string;
}) {
  const [dishes, setDishes] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load menu items for the selected date
  const loadMenuItems = useCallback(async () => {
    if (!selectedDate) return;

    setLoading(true);
    setError(null);

    try {
      const menuItems = await getMenuItems(selectedDate);
      setDishes(menuItems);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load menu items";
      setError(errorMessage);
      logger.error("Error loading menu items:", err);
      // Don't throw the error, just log it and set error state
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Add a dish to the menu
  const addDish = async (dishId: string, servings: number, notes?: string) => {
    try {
      await addDishToMenu(dishId, selectedDate, servings, notes);
      await refreshMenu();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to add dish";
      setError(errorMessage);
      logger.error("Error adding dish:", errorMessage);
      // Don't throw the error, just log it and set error state
    }
  };

  // Update a dish
  const updateDish = async (
    id: string,
    updates: { servings?: number; notes?: string },
  ) => {
    try {
      await updateMenuItem(id, {
        boi_so: updates.servings,
        ghi_chu: updates.notes,
      });
      await refreshMenu();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update dish";
      setError(errorMessage);
      logger.error("Error updating dish:", errorMessage);
      // Don't throw the error, just log it and set error state
    }
  };

  // Add many dishes in one DB call (uses current selectedDate)
  const addDishesBatch = async (items: Array<{ dishId: string; servings: number; notes?: string }>) => {
    try {
      await addMenuItemsBatch(selectedDate, items);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add dishes";
      setError(errorMessage);
      logger.error("Error adding dishes batch:", errorMessage);
    }
  };

  // Remove a dish
  const removeDish = async (id: string) => {
    try {
      await deleteMenuItem(id);
      await refreshMenu();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to remove dish";
      setError(errorMessage);
      logger.error("Error removing dish:", errorMessage);
      // Don't throw the error, just log it and set error state
    }
  };

  // Refresh menu items
  const refreshMenu = async () => {
    await loadMenuItems();
  };

  // Helper to run multiple ops then refresh once
  const applyChangesWithSingleRefresh = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } finally {
      await refreshMenu();
    }
  };

  // Get calendar data
  const getCalendarDataForRange = async (
    startDate: string,
    endDate: string,
  ) => {
    try {
      return await getCalendarData(startDate, endDate);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load calendar data";
      setError(errorMessage);
      logger.error("Error loading calendar data:", errorMessage);
      // Return empty array instead of throwing
      return [];
    }
  };

  // Load menu items when selectedDate changes
  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  const value: MenuContextType = {
    dishes,
    loading,
    error,
    addDish,
    addDishesBatch,
    updateDish,
    removeDish,
    refreshMenu,
    applyChangesWithSingleRefresh,
    getCalendarData: getCalendarDataForRange,
  };

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error("useMenu must be used within a MenuProvider");
  }
  return context;
}
