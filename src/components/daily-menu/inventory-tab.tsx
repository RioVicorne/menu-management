'use client';

import React, { useState } from 'react';
import { Package, AlertTriangle, CheckCircle, XCircle, Filter } from 'lucide-react';
import { useI18n } from '../i18n';

interface Ingredient {
  id: string;
  name: string;
  source: string;
  quantityNeeded: number;
  quantityInStock: number;
  weightNeeded: number;
  weightInStock: number;
  unit: string;
  weightUnit: string;
}

export default function InventoryTab() {
  const { t } = useI18n();
  const [showLowOnly, setShowLowOnly] = useState(false);

  const [ingredients] = useState<Ingredient[]>([
    {
      id: '1',
      name: 'Beef',
      source: 'Local Butcher',
      quantityNeeded: 2,
      quantityInStock: 5,
      weightNeeded: 1.5,
      weightInStock: 3.2,
      unit: 'kg',
      weightUnit: 'kg'
    },
    {
      id: '2',
      name: 'Rice Noodles',
      source: 'Asian Market',
      quantityNeeded: 4,
      quantityInStock: 2,
      weightNeeded: 0.8,
      weightInStock: 0.4,
      unit: 'packages',
      weightUnit: 'kg'
    },
    {
      id: '3',
      name: 'Spring Roll Wrappers',
      source: 'Unknown source',
      quantityNeeded: 1,
      quantityInStock: 0,
      weightNeeded: 0.2,
      weightInStock: 0,
      unit: 'packages',
      weightUnit: 'kg'
    },
    {
      id: '4',
      name: 'Fresh Vegetables',
      source: 'Farmers Market',
      quantityNeeded: 3,
      quantityInStock: 8,
      weightNeeded: 2.0,
      weightInStock: 5.5,
      unit: 'kg',
      weightUnit: 'kg'
    },
    {
      id: '5',
      name: 'Soy Sauce',
      source: 'Grocery Store',
      quantityNeeded: 1,
      quantityInStock: 1,
      weightNeeded: 0.5,
      weightInStock: 0.3,
      unit: 'bottles',
      weightUnit: 'L'
    }
  ]);

  const getStockStatus = (ingredient: Ingredient) => {
    const quantityRatio = ingredient.quantityInStock / ingredient.quantityNeeded;
    const weightRatio = ingredient.weightInStock / ingredient.weightNeeded;
    const minRatio = Math.min(quantityRatio, weightRatio);

    if (minRatio >= 1) return 'in-stock';
    if (minRatio >= 0.5) return 'low';
    return 'out-of-stock';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'low':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      case 'out-of-stock':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in-stock':
        return <CheckCircle className="h-4 w-4" />;
      case 'low':
        return <AlertTriangle className="h-4 w-4" />;
      case 'out-of-stock':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'in-stock':
        return t("inStock");
      case 'low':
        return t("low");
      case 'out-of-stock':
        return t("outOfStock");
      default:
        return 'Unknown';
    }
  };

  const filteredIngredients = showLowOnly 
    ? ingredients.filter(ingredient => {
        const status = getStockStatus(ingredient);
        return status === 'low' || status === 'out-of-stock';
      })
    : ingredients;

  const alertCount = ingredients.filter(ingredient => {
    const status = getStockStatus(ingredient);
    return status === 'low' || status === 'out-of-stock';
  }).length;

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t("ingredientsForDay")}</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {filteredIngredients.length} ingredients required for today's menu
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showLowOnly}
              onChange={(e) => setShowLowOnly(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{t("showLowOnly")}</span>
          </label>
        </div>
      </div>

      {/* Alert Summary */}
      {alertCount > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <span className="font-medium text-orange-800 dark:text-orange-200">
              {alertCount} ingredient{alertCount !== 1 ? 's' : ''} need{alertCount === 1 ? 's' : ''} attention
            </span>
          </div>
        </div>
      )}

      {/* Ingredients List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {filteredIngredients.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t("noIngredients")}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredIngredients.map((ingredient) => {
              const status = getStockStatus(ingredient);
              const quantityRatio = ingredient.quantityInStock / ingredient.quantityNeeded;
              const weightRatio = ingredient.weightInStock / ingredient.weightNeeded;

              return (
                <div key={ingredient.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {ingredient.name}
                        </h3>
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {getStatusIcon(status)}
                          <span>{getStatusText(status)}</span>
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Source: {ingredient.source || t("unknownSource")}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Quantity */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Quantity</span>
                            <span className="text-gray-600 dark:text-gray-400">
                              {t("qtyWeightNeedStock", {
                                need: `${ingredient.quantityNeeded} ${ingredient.unit}`,
                                stock: `${ingredient.quantityInStock} ${ingredient.unit}`,
                                wneed: `${ingredient.weightNeeded} ${ingredient.weightUnit}`,
                                wstock: `${ingredient.weightInStock} ${ingredient.weightUnit}`
                              })}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                quantityRatio >= 1 ? 'bg-green-500' : 
                                quantityRatio >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(quantityRatio * 100, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Weight */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Weight</span>
                            <span className="text-gray-600 dark:text-gray-400">
                              {ingredient.weightNeeded} {ingredient.weightUnit} needed / {ingredient.weightInStock} {ingredient.weightUnit} in stock
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                weightRatio >= 1 ? 'bg-green-500' : 
                                weightRatio >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(weightRatio * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
