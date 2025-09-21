"use client";

import React, { useState, useEffect } from "react";
import {
  ChefHat,
  Plus,
  Loader2,
  CheckCircle,
  Search,
  X,
} from "lucide-react";
import { useMenu } from "@/contexts/menu-context";
import { getDishes, Dish } from "@/lib/api";
import { logger } from "@/lib/logger";

interface SelectedDishItem {
  dish: Dish;
  servings: number;
  notes: string;
}

interface AddDishTabProps {
  onDishAdded?: () => void;
}

export default function AddDishTab({ onDishAdded }: AddDishTabProps) {
  const { addDish, dishes: currentMenuDishes, updateDish } = useMenu();
  const [availableDishes, setAvailableDishes] = useState<Dish[]>([]);
  const [selectedDishes, setSelectedDishes] = useState<SelectedDishItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showAllDishes, setShowAllDishes] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load available dishes from database
  useEffect(() => {
    const loadDishes = async () => {
      try {
        setLoading(true);
        const dishes = await getDishes();
        setAvailableDishes(dishes);
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

    try {
      // Process all selected dishes
      const results = [];
      const addedDishes = [];
      const updatedDishes = [];
      
      for (const item of selectedDishes) {
        const result = await addOrUpdateDishInMenu(item.dish.id, item.servings, item.notes);
        results.push({ dish: item.dish, result });
        
        if (result.action === 'added') {
          addedDishes.push(item.dish.ten_mon_an);
        } else {
          updatedDishes.push({
            name: item.dish.ten_mon_an,
            newServings: result.servings,
            addedServings: item.servings
          });
        }
      }
      
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
      
      setSuccessMessage(successMsg);
      setShowSuccess(true);
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 5000);

      // Clear selection and notify parent component
      setSelectedDishes([]);
      onDishAdded?.();
    } catch (error) {
      logger.error("Error adding dishes to menu:", error);
    } finally {
      setIsAdding(false);
    }
  };


  const totalCalories = selectedDishes.reduce((total, item) => {
    return total + ((item.dish.calories || 0) * item.servings);
  }, 0);

  // Filter dishes based on search query
  const filteredDishes = availableDishes.filter(dish =>
    dish.ten_mon_an.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Hôm nay ăn gì
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Customization & Preview - Show first on mobile */}
        <div className="space-y-4 order-1 lg:order-2 lg:col-span-1 lg:fixed lg:top-1/2 lg:right-4 lg:-translate-y-1/2 lg:w-96 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          {selectedDishes.length > 0 ? (
            <>
              {/* Preview - Moved to top */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border-2 border-black dark:border-white">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Tổng quan menu
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Số món đã chọn
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {selectedDishes.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tổng khẩu phần
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {selectedDishes.reduce((total, item) => total + item.servings, 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Tổng calories
                    </span>
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {totalCalories.toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
                      Danh sách món:
                    </span>
                    <div className="space-y-1">
                      {(showAllDishes ? selectedDishes : selectedDishes.slice(0, 4)).map((item, index) => (
                        <div key={`${item.dish.id}-${index}`} className="flex justify-between text-sm">
                          <span className="text-gray-900 dark:text-white">
                            {item.dish.ten_mon_an}
                          </span>
                          <span className="text-gray-600 dark:text-gray-400">
                            x{item.servings}
                          </span>
                        </div>
                      ))}
                      {selectedDishes.length > 4 && (
                        <button
                          onClick={() => setShowAllDishes(!showAllDishes)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium mt-2 transition-colors"
                        >
                          {showAllDishes 
                            ? `Thu gọn (hiện ${selectedDishes.length} món)` 
                            : `Xem thêm ${selectedDishes.length - 4} món nữa...`
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>


              {/* Add Button */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToMenu}
                  disabled={isAdding}
                  className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium"
                >
                  {isAdding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Đang thêm {selectedDishes.length} món...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Thêm {selectedDishes.length} món vào menu</span>
                    </>
                  )}
                </button>
                
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  💡 Nhấn vào món để chọn/bỏ chọn. Mỗi món chỉ có thể chọn một lần
                </p>
              </div>
            </>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-8 text-center">
              <ChefHat className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Chọn các món từ danh sách bên phải để tùy chỉnh và thêm vào menu
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Bạn có thể chọn nhiều món cùng lúc. Nhấn vào món để chọn/bỏ chọn
              </p>
            </div>
          )}
        </div>

        {/* Dish Selection - Show second on mobile */}
        <div className="space-y-4 order-2 lg:order-1 lg:col-span-1 lg:max-w-96">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
              <ChefHat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Chọn món</span>
            </h3>
            
            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Tìm kiếm món ăn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            {/* Search Results Count */}
            {searchQuery && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tìm thấy {filteredDishes.length} món ăn
              </p>
            )}
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
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
                    className={`
                      p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                      ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {dish.ten_mon_an}
                        </h4>
                        {isSelected && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                            Đã chọn
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
