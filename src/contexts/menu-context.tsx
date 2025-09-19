"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  getMenuItems,
  addDishToMenu,
  updateMenuItem,
  deleteMenuItem,
  getCalendarData,
  Dish,
  MenuItem,
} from "@/lib/api";

interface MenuContextType {
  // State
  dishes: MenuItem[];
  loading: boolean;
  error: string | null;

  // Actions
  addDish: (dishId: string, servings: number, notes?: string) => Promise<void>;
  updateDish: (
    id: string,
    updates: { servings?: number; notes?: string },
  ) => Promise<void>;
  removeDish: (id: string) => Promise<void>;
  refreshMenu: () => Promise<void>;
  getCalendarData: (startDate: string, endDate: string) => Promise<any[]>;
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
  const loadMenuItems = async () => {
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
      console.error("Error loading menu items:", err);
      // Don't throw the error, just log it and set error state
    } finally {
      setLoading(false);
    }
  };

  // Add a dish to the menu
  const addDish = async (dishId: string, servings: number, notes?: string) => {
    try {
      await addDishToMenu(
        dishId,
        selectedDate,
        servings,
        notes,
      );
      await refreshMenu();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to add dish";
      setError(errorMessage);
      console.error("Error adding dish:", errorMessage);
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
      console.error("Error updating dish:", errorMessage);
      // Don't throw the error, just log it and set error state
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
      console.error("Error removing dish:", errorMessage);
      // Don't throw the error, just log it and set error state
    }
  };

  // Refresh menu items
  const refreshMenu = async () => {
    await loadMenuItems();
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
      console.error("Error loading calendar data:", errorMessage);
      // Return empty array instead of throwing
      return [];
    }
  };

  // Load menu items when selectedDate changes
  useEffect(() => {
    loadMenuItems();
  }, [selectedDate]);

  const value: MenuContextType = {
    dishes,
    loading,
    error,
    addDish,
    updateDish,
    removeDish,
    refreshMenu,
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
