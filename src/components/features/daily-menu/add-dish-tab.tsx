"use client";

import React, { useState, useEffect } from "react";
import {
  ChefHat,
  Plus,
  Loader2,
  CheckCircle,
  Search,
  X,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useMenu } from "@/contexts/menu-context";
import { getDishes, Dish, consumeIngredientsForDish, consumeIngredientsForDishesBatch, addMenuItemsBatch, getRecipeForDish } from "@/lib/api";
import { logger } from "@/lib/logger";
import Modal from "@/components/ui/modal";

interface SelectedDishItem {
  dish: Dish;
  servings: number;
  notes: string;
}

interface AddDishTabProps {
  onDishAdded?: () => void;
}

export default function AddDishTab({ onDishAdded }: AddDishTabProps) {
  const { addDish, addDishesBatch, dishes: currentMenuDishes, updateDish, applyChangesWithSingleRefresh } = useMenu();
  const [availableDishes, setAvailableDishes] = useState<Dish[]>([]);
  const [selectedDishes, setSelectedDishes] = useState<SelectedDishItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showAllDishes, setShowAllDishes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dishCalories, setDishCalories] = useState<Record<string, number>>({});
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isDishListExpanded, setIsDishListExpanded] = useState(false);

  // Load available dishes from database with caching
  useEffect(() => {
    const loadDishes = async () => {
      try {
        setLoading(true);
        // Check if dishes are already cached in context or component
        if (availableDishes.length === 0) {
          const dishes = await getDishes();
          setAvailableDishes(dishes);
        }
      } catch (error) {
        logger.error("Error loading dishes:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDishes();
  }, []);

  const handleDishSelect = (dish: Dish) => {
    // Check if dish is already selected
    const existingIndex = selectedDishes.findIndex(item => item.dish.id === dish.id);
    
    if (existingIndex >= 0) {
      // If dish is already selected, remove it (toggle off)
      setSelectedDishes(prev => prev.filter((_, index) => index !== existingIndex));
    } else {
      // If dish is not selected, add it with default values (toggle on)
      const newDishItem: SelectedDishItem = {
        dish,
        servings: 1, // Default servings
        notes: "" // Default empty notes
      };
      setSelectedDishes(prev => [...prev, newDishItem]);
      // Auto-collapse when adding new dishes
      setIsDishListExpanded(false);
    }
  };



  // Helper function to check if dish exists in current menu and merge if needed
  const addOrUpdateDishInMenu = async (dishId: string, servings: number, notes?: string) => {
    // Check if dish already exists in current menu
    const existingMenuItem = currentMenuDishes.find(item => item.ma_mon_an === dishId);
    
    if (existingMenuItem) {
      // If dish exists, update its servings and merge notes
      const newServings = existingMenuItem.boi_so + servings;
      const newNotes = existingMenuItem.ghi_chu 
        ? `${existingMenuItem.ghi_chu}; ${notes}`.replace(/^; /, '').replace(/; $/, '')
        : notes;
      
      await updateDish(existingMenuItem.id, {
        servings: newServings,
        notes: newNotes
      });
      
      return { action: 'updated', servings: newServings, originalServings: existingMenuItem.boi_so };
    } else {
      // If dish doesn't exist, add new dish
      await addDish(dishId, servings, notes);
      return { action: 'added', servings };
    }
  };

  const handleAddToMenu = async () => {
    if (selectedDishes.length === 0) return;

    setIsAdding(true);

    // Keep the popup open and selection visible until API completes
    const dishesToAdd = [...selectedDishes];

    try {
      // Process all selected dishes with a single refresh at the end
      const results: Array<{ dish: Dish; result: { action: 'added' | 'updated'; servings: number; originalServings?: number } }> = [];
      const addedDishes: string[] = [];
      const updatedDishes: Array<{ name: string; newServings: number; addedServings: number }> = [];

      await applyChangesWithSingleRefresh(async () => {
        // First handle updates for dishes already in menu to avoid insert conflicts
        const toInsert: Array<{ dishId: string; servings: number; notes?: string }> = [];

        for (const item of dishesToAdd) {
          const existingMenuItem = currentMenuDishes.find(m => m.ma_mon_an === item.dish.id);
          if (existingMenuItem) {
            const newServings = existingMenuItem.boi_so + item.servings;
            const newNotes = existingMenuItem.ghi_chu 
              ? `${existingMenuItem.ghi_chu}; ${item.notes}`.replace(/^; /, '').replace(/; $/, '')
              : item.notes;
            await updateDish(existingMenuItem.id, { servings: newServings, notes: newNotes });
            results.push({ dish: item.dish, result: { action: 'updated', servings: newServings, originalServings: existingMenuItem.boi_so } });
            updatedDishes.push({ name: item.dish.ten_mon_an, newServings, addedServings: item.servings });
          } else {
            toInsert.push({ dishId: item.dish.id, servings: item.servings, notes: item.notes });
          }
        }

        if (toInsert.length > 0) {
          // Use context's selectedDate-aware batch add to avoid wrong date
          await addDishesBatch(toInsert);
          for (const item of dishesToAdd) {
            const exists = currentMenuDishes.find(m => m.ma_mon_an === item.dish.id);
            if (!exists) {
              results.push({ dish: item.dish, result: { action: 'added', servings: item.servings } });
              addedDishes.push(item.dish.ten_mon_an);
            }
          }
        }

        // Deduct inventory for all just-added servings (run in background using batch)
        consumeIngredientsForDishesBatch(dishesToAdd.map(it => ({ dishId: it.dish.id, servings: it.servings })))
          .catch(err => logger.error("Error deducting inventory:", err));
      });

      
      // Create success message
      let successMsg = "";
      if (addedDishes.length > 0) {
        successMsg += `${addedDishes.length} món mới đã được thêm: ${addedDishes.join(", ")}`;
      }
      if (updatedDishes.length > 0) {
        const updateMsg = updatedDishes.map(d => 
          `${d.name} (${d.addedServings} khẩu phần → ${d.newServings} khẩu phần)`
        ).join(", ");
        if (successMsg) successMsg += "\n";
        successMsg += `${updatedDishes.length} món đã được cập nhật: ${updateMsg}`;
      }
      
      // Clear selection immediately but keep loading state
      setSelectedDishes([]);
      
      // Show success message
      setSuccessMessage(successMsg);
      setShowSuccess(true);
      
      // Notify parent component to switch tab first
      onDishAdded?.();
      
      // Close popup only after tab switch is complete
      setTimeout(() => {
        setIsOverviewOpen(false);
        setIsDishListExpanded(false);
      }, 100); // Very short delay just for tab switch animation
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      logger.error("Error adding dishes to menu:", error);
      // Keep selection and popup open on error so user can retry
      // setSelectedDishes(dishesToAdd); // Don't restore, keep current state
    } finally {
      // Only stop loading after the popup is closed
      setTimeout(() => {
        setIsAdding(false);
      }, 200); // Just enough time for popup to close after tab switch
    }
  };


  const totalCalories = selectedDishes.reduce((total, item) => {
    const perDishCals = dishCalories[item.dish.id] != null ? dishCalories[item.dish.id] : 0;
    return total + perDishCals * item.servings;
  }, 0);
  const hasAnyCalories = selectedDishes.some(item => dishCalories[item.dish.id] && dishCalories[item.dish.id] > 0);

  // When selection changes, fetch recipe calories for new dishes and cache
  useEffect(() => {
    const fetchMissingCalories = async () => {
      const missing = selectedDishes
        .map(it => it.dish.id)
        .filter(id => dishCalories[id] == null);
      if (missing.length === 0) return;

      const entries: Array<[string, number]> = [];
      await Promise.all(missing.map(async (dishId) => {
        try {
          const recipe = await getRecipeForDish(dishId);
          const sum = recipe.reduce((acc, r) => acc + (Number(r.luong_calo) || 0), 0);
          entries.push([dishId, sum]);
        } catch {
          entries.push([dishId, 0]);
        }
      }));
      setDishCalories(prev => ({ ...prev, ...Object.fromEntries(entries) }));
    };
    fetchMissingCalories();
  }, [selectedDishes, dishCalories]);

  // Filter dishes based on search query
  const filteredDishes = availableDishes.filter(dish =>
    dish.ten_mon_an.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 px-4 pb-24">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Hôm nay ăn gì
        </h2>
        <p className="text-muted-foreground">
          {"Chọn món và tùy chỉnh cho thực đơn hôm nay"}
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <p className="text-green-800 dark:text-green-200 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md mx-auto mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-blue-500" />
        </div>
        <input
          type="text"
          placeholder="Tìm kiếm món ăn..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-12 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-foreground placeholder-gray-400 shadow-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      
      {/* Search Results Count */}
      {searchQuery && (
        <p className="text-sm text-muted-foreground text-center mb-4">
          Tìm thấy {filteredDishes.length} món ăn
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:gap-6">
        {/* Dish Selection */}
        <div className="space-y-4">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center space-x-2">
              <ChefHat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Chọn món</span>
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Đang tải món ăn...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredDishes.length === 0 && searchQuery ? (
                <div className="p-8 text-center">
                  <Search className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Không tìm thấy món ăn nào phù hợp với &quot;{searchQuery}&quot;
                  </p>
                  <button
                    onClick={handleClearSearch}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium mt-2 transition-colors"
                  >
                    Xóa bộ lọc tìm kiếm
                  </button>
                </div>
              ) : (
                filteredDishes.map((dish) => {
                const isSelected = selectedDishes.some(item => item.dish.id === dish.id);
                
                return (
                  <div
                    key={dish.id}
                    onClick={() => handleDishSelect(dish)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 backdrop-blur-xl border border-gray-300 dark:border-gray-700/30
                      ${isSelected
                        ? "bg-blue-500/25 border-blue-500/50 ring-1 ring-blue-600/30 shadow-[0_8px_30px_rgba(31,38,135,0.18)]"
                        : "bg-white/5 hover:bg-white/10 hover:border-gray-400 dark:hover:border-gray-600/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.15)]"}
                    `}
                  >
                    <div className="flex items-center">
                      <h4 className="font-medium text-foreground drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
                        {dish.ten_mon_an}
                      </h4>
                      {isSelected && (
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400 ml-2 animate-in zoom-in duration-200" />
                      )}
                    </div>
                  </div>
                );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Overview Button */}
      <div className="fixed bottom-32 right-4 sm:bottom-5 sm:right-5 z-50">
        <button
          onClick={() => setIsOverviewOpen(true)}
          className="relative flex items-center justify-center h-14 w-14 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:bg-white/20 transition-colors"
          aria-label="Mở tổng quan menu"
        >
          <ChefHat className="h-6 w-6 text-blue-400" />
          {selectedDishes.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
              {selectedDishes.length}
            </span>
          )}
        </button>
      </div>

      {/* Overview Modal */}
      <Modal
        isOpen={isOverviewOpen}
        onClose={() => setIsOverviewOpen(false)}
        title="Tổng quan menu"
        size="lg"
      >
        {selectedDishes.length > 0 ? (
          <div className="space-y-6">
            {/* Compact summary cards on mobile to leave more room for dish list */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 sm:gap-4">
              <div className="bg-muted rounded-lg p-3 sm:rounded-xl sm:p-4 border border-border">
                <p className="text-[12px] sm:text-sm text-muted-foreground">Số món</p>
                <p className="text-xl sm:text-2xl font-semibold text-foreground">{selectedDishes.length}</p>
              </div>
              <div className="bg-muted rounded-lg p-3 sm:rounded-xl sm:p-4 border border-border">
                <p className="text-[12px] sm:text-sm text-muted-foreground">Khẩu phần</p>
                <p className="text-xl sm:text-2xl font-semibold text-foreground">{selectedDishes.reduce((total, item) => total + item.servings, 0)}</p>
              </div>
              <div className="bg-muted rounded-lg p-3 sm:rounded-xl sm:p-4 border border-border">
                <p className="text-[12px] sm:text-sm text-muted-foreground">Calories</p>
                {hasAnyCalories ? (
                  <p className="text-xl sm:text-2xl font-semibold text-orange-600 dark:text-orange-400">{totalCalories.toLocaleString()}</p>
                ) : (
                  <p className="text-xl sm:text-2xl font-semibold text-muted-foreground">—</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Danh sách món</h4>
                {selectedDishes.length > 3 && (
                  <button
                    onClick={() => setIsDishListExpanded(!isDishListExpanded)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>{isDishListExpanded ? 'Thu gọn' : `Xem tất cả (${selectedDishes.length})`}</span>
                    {isDishListExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {(isDishListExpanded ? selectedDishes : selectedDishes.slice(0, 3)).map((item, index) => (
                  <div key={`${item.dish.id}-${index}`} className="flex justify-between text-sm bg-background/50 border border-border rounded-lg p-2">
                    <span className="text-foreground">{item.dish.ten_mon_an}</span>
                    <span className="text-muted-foreground">x{item.servings}</span>
                  </div>
                ))}
                {!isDishListExpanded && selectedDishes.length > 3 && (
                  <div className="py-2">
                    <button
                      onClick={() => setIsDishListExpanded(true)}
                      className="text-xs text-blue-600 dark:text-blue-400 font-medium hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                    >
                      +{selectedDishes.length - 3} món khác
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleAddToMenu}
                disabled={isAdding}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium"
              >
                {isAdding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Đang thêm món...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Thêm {selectedDishes.length} món vào menu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <ChefHat className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Chọn món từ danh sách để xem tổng quan và thêm vào menu</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
