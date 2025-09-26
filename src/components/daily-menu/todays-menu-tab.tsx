"use client";

import React, { useState, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ChefHat,
  Users,
  Zap,
  StickyNote,
  Loader2,
  CheckSquare,
  Square,
} from "lucide-react";
import { useMenu } from "@/contexts/menu-context";
import { logger } from "@/lib/logger";

interface TodaysMenuTabProps {
  onAddDish?: () => void;
}

export default function TodaysMenuTab({ onAddDish }: TodaysMenuTabProps) {
  const { dishes, loading, error, updateDish, removeDish } = useMenu();
  const [editingDish, setEditingDish] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    servings?: number;
    notes?: string;
  }>({});
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDishes, setSelectedDishes] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const totalDishes = dishes.length;
  const totalServings = dishes.reduce(
    (sum, dish) => sum + (dish.boi_so || 0),
    0,
  );
  const totalCalories = dishes.reduce(
    (sum, dish) => sum + (dish.boi_so || 0) * 300,
    0,
  ); // Mock calories

  const handleEdit = useCallback((dish: { id: string; boi_so: number; ghi_chu?: string }) => {
    setEditingDish(dish.id);
    setEditForm({
      servings: dish.boi_so,
      notes: dish.ghi_chu || "",
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (editingDish) {
      try {
        await updateDish(editingDish, editForm);
        setEditingDish(null);
        setEditForm({});
      } catch (error) {
        logger.error("Error updating dish:", error);
      }
    }
  }, [editingDish, editForm, updateDish]);

  const handleDelete = useCallback(
    async (dishId: string) => {
      try {
        await removeDish(dishId);
      } catch (error) {
        logger.error("Error deleting dish:", error);
      }
    },
    [removeDish],
  );

  // Delete mode functions
  const toggleDeleteMode = useCallback(() => {
    setDeleteMode(!deleteMode);
    setSelectedDishes(new Set());
  }, [deleteMode]);

  const toggleSelectDish = useCallback((dishId: string) => {
    setSelectedDishes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dishId)) {
        newSet.delete(dishId);
      } else {
        newSet.add(dishId);
      }
      return newSet;
    });
  }, []);

  const selectAllDishes = useCallback(() => {
    setSelectedDishes(new Set(dishes.map(dish => dish.id)));
  }, [dishes]);

  const deselectAllDishes = useCallback(() => {
    setSelectedDishes(new Set());
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedDishes.size === 0) return;
    
    try {
      setIsDeleting(true);
      // Xóa tất cả cùng lúc với Promise.all
      await Promise.all(
        Array.from(selectedDishes).map(dishId => removeDish(dishId))
      );
      setSelectedDishes(new Set());
      setDeleteMode(false);
    } catch (error) {
      logger.error("Error deleting dishes:", error);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedDishes, removeDish]);

  const handleAddDish = useCallback(async () => {
    logger.debug("handleAddDish called");
    onAddDish?.();
  }, [onAddDish]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ChefHat className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tổng món
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalDishes}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tổng khẩu phần
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalServings}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tổng calo
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalCalories.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dishes List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Món ăn
            </h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleAddDish}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Thêm món</span>
              </button>
              
              <button
                onClick={toggleDeleteMode}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  deleteMode 
                    ? "bg-red-600 hover:bg-red-700 text-white" 
                    : "bg-gray-600 hover:bg-gray-700 text-white"
                }`}
              >
                <Trash2 className="h-4 w-4" />
                <span>{deleteMode ? "Hủy xóa" : "Xóa món"}</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Loading dishes...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-500 dark:text-red-400">{error}</p>
          </div>
        ) : (
          <>
            {/* Delete Mode Controls */}
            {deleteMode && dishes.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="select-all"
                      checked={selectedDishes.size === dishes.length && dishes.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllDishes();
                        } else {
                          deselectAllDishes();
                        }
                      }}
                      disabled={isDeleting}
                      className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="select-all" className="text-sm font-medium text-orange-800 dark:text-orange-200 cursor-pointer">
                      Chọn tất cả ({selectedDishes.size}/{dishes.length})
                    </label>
                  </div>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedDishes.size === 0 || isDeleting}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span>
                      {isDeleting ? `Đang xóa ${selectedDishes.size} món...` : `Xóa đã chọn (${selectedDishes.size})`}
                    </span>
                  </button>
                </div>
              </div>
            )}
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {dishes.length === 0 ? (
              <div className="p-8 text-center">
                <ChefHat className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Chưa có món.
                </p>
              </div>
            ) : (
              dishes.map((dish) => (
                <div
                  key={dish.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  {editingDish === dish.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Servings
                          </label>
                          <input
                            type="number"
                            value={editForm.servings || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                servings: parseInt(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Notes
                          </label>
                          <input
                            type="text"
                            value={editForm.notes || ""}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                notes: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSave}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingDish(null);
                            setEditForm({});
                          }}
                          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2 min-w-0">
                          {/* Checkbox for delete mode */}
                          {deleteMode && (
                            <button
                              onClick={() => toggleSelectDish(dish.id)}
                              disabled={isDeleting}
                              className="flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {selectedDishes.has(dish.id) ? (
                                <CheckSquare className="h-5 w-5 text-red-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400 hover:text-red-600" />
                              )}
                            </button>
                          )}
                          
                          <h3 className={`text-lg font-medium whitespace-normal break-words leading-snug min-w-0 ${
                            deleteMode && selectedDishes.has(dish.id) 
                              ? "text-red-600 line-through" 
                              : "text-gray-900 dark:text-white"
                          }`}>
                            {dish.ten_mon_an || "Món chưa đặt tên"}
                          </h3>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full flex-shrink-0">
                            {dish.boi_so || 0} Khẩu phần
                          </span>
                        </div>

                        <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Zap className="h-4 w-4" />
                            <span>{(dish.boi_so || 0) * 300} cal total</span>
                          </div>
                          {dish.ghi_chu && (
                            <div className="flex items-center space-x-1">
                              <StickyNote className="h-4 w-4" />
                              <span>{dish.ghi_chu}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {!deleteMode && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(dish)}
                            className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dish.id)}
                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
