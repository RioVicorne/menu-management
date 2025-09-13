'use client';

import React, { useState, useEffect } from 'react';
import { ChefHat, Users, StickyNote, Plus, Zap, Package, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { useMenu } from '@/contexts/menu-context';
import { getDishes, Dish } from '@/lib/api';

interface AddDishTabProps {
  onDishAdded?: () => void;
}

export default function AddDishTab({ onDishAdded }: AddDishTabProps) {
  const { t } = useI18n();
  const { addDish } = useMenu();
  const [availableDishes, setAvailableDishes] = useState<Dish[]>([]);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [servings, setServings] = useState(1);
  const [notes, setNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load available dishes from database
  useEffect(() => {
    const loadDishes = async () => {
      try {
        setLoading(true);
        const dishes = await getDishes();
        setAvailableDishes(dishes);
      } catch (error) {
        console.error('Error loading dishes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDishes();
  }, []);

  const handleDishSelect = (dish: Dish) => {
    setSelectedDish(dish);
  };

  const handleAddToMenu = async () => {
    if (!selectedDish) return;
    
    setIsAdding(true);
    
    try {
      await addDish(selectedDish.id, servings, notes);
      onDishAdded?.();
      
      // Reset form
      setSelectedDish(null);
      setServings(1);
      setNotes('');
    } catch (error) {
      console.error('Error adding dish to menu:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const totalCalories = selectedDish ? selectedDish.calories * servings : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t("whatToEatToday")}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Select a dish and customize it for today's menu
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Dish Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <ChefHat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span>{t("selectDish")}</span>
          </h3>
          
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading dishes...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableDishes.map((dish) => (
                <div
                  key={dish.id}
                  onClick={() => handleDishSelect(dish)}
                  className={`
                    p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                    ${selectedDish?.id === dish.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white">{dish.ten_mon_an}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Vietnamese dish
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customization & Preview */}
        <div className="space-y-6">
          {selectedDish ? (
            <>
              {/* Customization Form */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Customize Your Dish
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Users className="h-4 w-4 inline mr-2" />
                      {t("servingsMultiplier")}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={servings}
                      onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <StickyNote className="h-4 w-4 inline mr-2" />
                      {t("notesLabel")}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any special notes or modifications..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {t("ingredientsPreview")}
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dish</span>
                    <span className="text-sm text-gray-900 dark:text-white">{selectedDish.ten_mon_an}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Servings</span>
                    <span className="text-sm text-gray-900 dark:text-white">{servings}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Calories</span>
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{totalCalories.toLocaleString()}</span>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Ingredients needed:</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedDish.ingredients?.map((ingredient, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                        >
                          {ingredient}
                        </span>
                      )) || (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          No ingredients available
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {notes && (
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Notes:</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Add Button */}
              <button
                onClick={handleAddToMenu}
                disabled={isAdding}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium"
              >
                {isAdding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>{t("adding")}</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>{t("addToMenu")}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-8 text-center">
              <ChefHat className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Select a dish from the list to customize and add to your menu
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
