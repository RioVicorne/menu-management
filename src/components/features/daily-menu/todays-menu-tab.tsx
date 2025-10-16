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
import { EditDishModal } from "@/components";
import Modal from "@/components/ui/modal";

interface TodaysMenuTabProps {
  onAddDish?: () => void;
}

export default function TodaysMenuTab({ onAddDish }: TodaysMenuTabProps) {
  const { dishes, loading, error, updateDish, removeDish } = useMenu();
  const [editingDish, setEditingDish] = useState<{
    id: string;
    ten_mon_an: string;
    boi_so: number;
    ghi_chu?: string;
  } | null>(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedDishes, setSelectedDishes] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dishToDelete, setDishToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const totalDishes = dishes.length;
  const totalServings = dishes.reduce(
    (sum, dish) => sum + (dish.boi_so || 0),
    0,
  );
  const totalCalories = dishes.reduce(
    (sum, dish) => sum + (dish.boi_so || 0) * 300,
    0,
  ); // Mock calories

  const handleEdit = useCallback((dish: { id: string; ten_mon_an?: string; boi_so: number; ghi_chu?: string }) => {
    if (!dish.ten_mon_an) return; // Don't edit if dish name is missing
    setEditingDish({
      id: dish.id,
      ten_mon_an: dish.ten_mon_an,
      boi_so: dish.boi_so,
      ghi_chu: dish.ghi_chu
    });
  }, []);

  const handleSaveDish = useCallback(async (dishId: string, data: { servings: number; notes: string }) => {
    try {
      await updateDish(dishId, data);
      setEditingDish(null);
    } catch (error) {
      logger.error("Error updating dish:", error);
      throw error;
    }
  }, [updateDish]);

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

  const handleDeleteClick = useCallback((dish: { id: string; ten_mon_an?: string }) => {
    setDishToDelete({ id: dish.id, name: dish.ten_mon_an || 'Unknown' });
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!dishToDelete) return;
    
    try {
      await handleDelete(dishToDelete.id);
      setShowDeleteConfirm(false);
      setDishToDelete(null);
    } catch (error) {
      logger.error("Error confirming delete:", error);
    }
  }, [dishToDelete, handleDelete]);

  const cancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setDishToDelete(null);
  }, []);

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
        <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <ChefHat className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Tổng món
              </p>
              <p className="text-2xl font-bold text-foreground">
                {totalDishes}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Tổng khẩu phần
              </p>
              <p className="text-2xl font-bold text-foreground">
                {totalServings}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Zap className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Tổng calo
              </p>
              <p className="text-2xl font-bold text-foreground">
                {totalCalories.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dishes List */}
      <div className="bg-background rounded-xl shadow-sm border border-border">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
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
            <p className="text-muted-foreground">
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
                    className="h-4 w-4 text-blue-600 bg-muted border-border rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="select-all" className="text-sm font-medium text-orange-800 dark:text-orange-200 cursor-pointer">
                      Chọn tất cả ({selectedDishes.size}/{dishes.length})
                    </label>
                  </div>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={selectedDishes.size === 0 || isDeleting}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:opacity-75 text-white rounded-lg text-sm font-medium transition-colors"
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
            
            <div>
            {dishes.length === 0 ? (
              <div className="p-10 text-center">
                <ChefHat className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <p className="text-muted-foreground">Chưa có món.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {dishes.map((dish) => {
                  const isSelected = selectedDishes.has(dish.id);
                  return (
                    <div
                      key={dish.id}
                      className={`group relative rounded-xl border border-border bg-background/80 backdrop-blur-sm p-5 shadow-sm transition-all hover:shadow-md ${
                        deleteMode && isSelected ? "ring-2 ring-red-500/60" : ""
                      }`}
                    >
                      {deleteMode && (
                        <button
                          onClick={() => toggleSelectDish(dish.id)}
                          disabled={isDeleting}
                          className="absolute left-3 top-1/2 -translate-y-1/2 disabled:opacity-50"
                          aria-label="Chọn để xóa"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-red-600" />
                          ) : (
                            <Square className="h-5 w-5 text-gray-400 hover:text-red-600" />
                          )}
                        </button>
                      )}

                      <div className={`pr-10 ${deleteMode ? "pl-9" : ""}`}>
                        <div className="flex items-start gap-2">
                          <h3
                            className={`text-base font-semibold flex-1 break-words ${
                              deleteMode && isSelected ? "text-red-600 line-through" : "text-foreground"
                            }`}
                          >
                            {dish.ten_mon_an || "Món chưa đặt tên"}
                          </h3>
                          <span className="ml-2 inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                            {dish.boi_so || 0} khẩu phần
                          </span>
                        </div>
                        {dish.ghi_chu && (
                          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-800 dark:bg-blue-900/20">
                            <div className="flex items-center gap-2">
                              <StickyNote className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-blue-800 dark:text-blue-200 break-words">
                                {dish.ghi_chu}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {!deleteMode && (
                        <div className="mt-4 flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(dish)}
                            className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-blue-600 hover:border-blue-300 transition-colors"
                            title="Sửa món"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(dish)}
                            className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:text-red-600 hover:border-red-300 transition-colors"
                            title="Xóa món"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </>
        )}
      </div>

      {/* Edit Dish Modal */}
      <EditDishModal
        isOpen={Boolean(editingDish)}
        onClose={() => setEditingDish(null)}
        dish={editingDish}
        onSave={handleSaveDish}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={cancelDelete}
        title="Xác nhận xóa món ăn"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Bạn có chắc chắn muốn xóa món <strong>&quot;{dishToDelete?.name}&quot;</strong> khỏi thực đơn không?
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Hành động này không thể hoàn tác.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={cancelDelete}
              className="px-4 py-2 text-muted-foreground bg-muted rounded-lg hover:bg-muted transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Xóa
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
