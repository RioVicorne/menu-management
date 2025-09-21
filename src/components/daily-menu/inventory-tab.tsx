"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch ingredients from Supabase
  useEffect(() => {
    const fetchIngredients = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!supabase) {
          throw new Error("Supabase client not available");
        }

        // Query ingredients from Supabase
        const { data, error: queryError } = await supabase
          .from("nguyen_lieu")
          .select("*")
          .order("ten_nguyen_lieu", { ascending: true });

        if (queryError) {
          console.error("Supabase query error:", queryError);
          throw new Error(`Database error: ${queryError.message || 'Unknown database error'}`);
        }

        if (!data) {
          throw new Error("No data returned from database");
        }

        // Transform data to match our interface
        const transformedData: Ingredient[] = (data || []).map((item: any) => ({
          id: item.id,
          name: item.ten_nguyen_lieu || "Unknown",
          source: item.nguon_nhap || "Nguồn chưa rõ",
          quantityNeeded: item.so_luong_nguyen_lieu || 0,
          quantityInStock: item.ton_kho_so_luong || 0,
          weightNeeded: item.khoi_luong_nguyen_lieu || 0,
          weightInStock: item.ton_kho_khoi_luong || 0,
          unit: "kg", // Default unit
          weightUnit: "kg", // Default weight unit
        }));

        setIngredients(transformedData);
      } catch (err) {
        console.error("Error fetching ingredients:", err);
        console.error("Error details:", {
          message: err instanceof Error ? err.message : 'Unknown error',
          name: err instanceof Error ? err.name : 'Unknown',
          stack: err instanceof Error ? err.stack : undefined,
          error: err
        });
        
        // Check if it's a database connection error
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch ingredients";
        const isConnectionError = errorMessage.includes("Database error") || 
                                 errorMessage.includes("Supabase client not available");
        
        if (isConnectionError) {
          setError("Không thể kết nối đến cơ sở dữ liệu. Vui lòng kiểm tra kết nối mạng.");
        } else {
          setError(errorMessage);
        }
        
        // Fallback to empty array
        setIngredients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIngredients();
  }, []);

  const getStockStatus = (ingredient: Ingredient) => {
    // Use default values if needed quantities are 0
    const quantityNeeded = ingredient.quantityNeeded || 1;
    const weightNeeded = ingredient.weightNeeded || 1;
    
    const quantityRatio = ingredient.quantityInStock / quantityNeeded;
    const weightRatio = ingredient.weightInStock / weightNeeded;
    const minRatio = Math.min(quantityRatio, weightRatio);

    if (minRatio >= 1) return "in-stock";
    if (minRatio >= 0.5) return "low";
    return "out-of-stock";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-stock":
        return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30";
      case "low":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30";
      case "out-of-stock":
        return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30";
      default:
        return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "in-stock":
        return <CheckCircle className="h-4 w-4" />;
      case "low":
        return <AlertTriangle className="h-4 w-4" />;
      case "out-of-stock":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "in-stock":
        return "Đủ hàng";
      case "low":
        return "Sắp hết";
      case "out-of-stock":
        return "Hết hàng";
      default:
        return "Unknown";
    }
  };

  const filteredIngredients = showLowOnly
    ? ingredients.filter((ingredient) => {
        const status = getStockStatus(ingredient);
        return status === "low" || status === "out-of-stock";
      })
    : ingredients;

  const alertCount = ingredients.filter((ingredient) => {
    const status = getStockStatus(ingredient);
    return status === "low" || status === "out-of-stock";
  }).length;

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600 dark:text-gray-400">Đang tải dữ liệu...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="font-medium text-red-800 dark:text-red-200">
                Lỗi tải dữ liệu
              </h3>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Nguyên liệu trong ngày
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {`${filteredIngredients.length} nguyên liệu cần cho thực đơn hôm nay`}
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
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Chỉ hiển thị thiếu/hết
            </span>
          </label>
        </div>
      </div>

      {/* Alert Summary */}
      {alertCount > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <span className="font-medium text-orange-800 dark:text-orange-200">
              {alertCount} ingredient{alertCount !== 1 ? "s" : ""} need
              {alertCount === 1 ? "s" : ""} attention
            </span>
          </div>
        </div>
      )}

      {/* Ingredients List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {filteredIngredients.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Không cần nguyên liệu.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredIngredients.map((ingredient) => {
              const status = getStockStatus(ingredient);
              const quantityNeeded = ingredient.quantityNeeded || 1;
              const weightNeeded = ingredient.weightNeeded || 1;
              const quantityRatio = ingredient.quantityInStock / quantityNeeded;
              const weightRatio = ingredient.weightInStock / weightNeeded;

              return (
                <div
                  key={ingredient.id}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {ingredient.name}
                        </h3>
                        <span
                          className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}
                        >
                          {getStatusIcon(status)}
                          <span>{getStatusText(status)}</span>
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Source: {ingredient.source || "Nguồn chưa rõ"}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Quantity */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Số lượng
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                              SL cần {quantityNeeded} {ingredient.unit} / tồn {ingredient.quantityInStock} {ingredient.unit} • KL cần {weightNeeded} {ingredient.weightUnit} / tồn {ingredient.weightInStock} {ingredient.weightUnit}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                quantityRatio >= 1
                                  ? "bg-green-500"
                                  : quantityRatio >= 0.5
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{
                                width: `${Math.min(quantityRatio * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Weight */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Weight
                            </span>
                            <span className="text-gray-600 dark:text-gray-400">
                              {weightNeeded} {ingredient.weightUnit}{" "}
                              needed / {ingredient.weightInStock}{" "}
                              {ingredient.weightUnit} in stock
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                weightRatio >= 1
                                  ? "bg-green-500"
                                  : weightRatio >= 0.5
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                              }`}
                              style={{
                                width: `${Math.min(weightRatio * 100, 100)}%`,
                              }}
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
