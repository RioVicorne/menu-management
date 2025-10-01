"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Loader2,
  Search,
  X,
  Settings,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import AddIngredientModal from "@/components/add-ingredient-modal";

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

export default function StoragePage() {
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [manageItem, setManageItem] = useState<Ingredient | null>(null);
  const [manageSource, setManageSource] = useState<string>("");
  const [manageCustomSource, setManageCustomSource] = useState<string>("");
  const [editQty, setEditQty] = useState<number>(0);
  const [editWgt, setEditWgt] = useState<number>(0);
  const [savingManage, setSavingManage] = useState(false);
  const [activeTab, setActiveTab] = useState<'manage' | 'sources'>('manage');
  // Fixed thresholds for warnings (design: just warn low/out-of-stock)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [showAllSources, setShowAllSources] = useState(false);

  // Helpers to avoid duplicate sources due to casing/spacing differences
  const collapseSpaces = (value: string) =>
    String(value || "")
      .normalize("NFC")
      .replace(/\s+/g, " ")
      .trim();
  const normalizeSourceName = (value: string) =>
    collapseSpaces(value).toLocaleLowerCase("vi");

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
          logger.error("Supabase query error:", queryError);
          throw new Error(`Database error: ${queryError.message || 'Unknown database error'}`);
        }

        if (!data) {
          throw new Error("No data returned from database");
        }

        // Transform data to match our interface
        const transformedData: Ingredient[] = (data || []).map((item: Record<string, unknown>) => {
          // Kiểm tra trường nào có dữ liệu thực tế (không NULL và không undefined)
          const hasQuantityData = item.ton_kho_so_luong !== null && item.ton_kho_so_luong !== undefined;
          const hasWeightData = item.ton_kho_khoi_luong !== null && item.ton_kho_khoi_luong !== undefined;
          
          // Debug log for specific ingredient
          if (String(item.ten_nguyen_lieu).includes('cá nục') || String(item.ten_nguyen_lieu).includes('Cá nục')) {
            logger.debug(`Storage Transform: ${item.ten_nguyen_lieu}: hasQuantity=${hasQuantityData}, hasWeight=${hasWeightData}, qty=${item.ton_kho_so_luong}, wgt=${item.ton_kho_khoi_luong}`);
          }
          
          return {
            id: String(item.id || ""),
            name: String(item.ten_nguyen_lieu || "Unknown"),
            source: String(item.nguon_nhap || "Nguồn chưa rõ"),
            // Chỉ gán giá trị cho trường có dữ liệu thực tế trong database
            quantityInStock: hasQuantityData ? Number(item.ton_kho_so_luong) : -1,
            quantityNeeded: hasQuantityData ? Number(item.ton_kho_so_luong) : -1,
            weightInStock: hasWeightData ? Number(item.ton_kho_khoi_luong) : -1,
            weightNeeded: hasWeightData ? Number(item.ton_kho_khoi_luong) : -1,
            unit: "kg", // Default unit
            weightUnit: "kg", // Default weight unit
          };
        });

        setIngredients(transformedData);
      } catch (err) {
        logger.error("Error fetching ingredients:", err);
        logger.error("Error details:", {
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
    // Dùng giá trị tồn kho thực tế: ưu tiên số lượng, nếu không có thì dùng khối lượng
    const stockValue = Math.max(
      Number(ingredient.quantityInStock || 0),
      Number(ingredient.weightInStock || 0)
    );

    if (stockValue === 0) return "out-of-stock"; // hết hàng
    if (stockValue >= 1 && stockValue <= 5) return "low"; // cần chú ý
    return "in-stock"; // còn hàng
  };

  // Get ingredients that need restocking
  const getIngredientsNeedingRestock = () => {
    return ingredients.filter(ingredient => {
      const status = getStockStatus(ingredient);
      return status === 'out-of-stock' || status === 'low';
    });
  };

  // Group all ingredients by a normalized source key
  const groupedSources = useMemo(() => {
    const map = new Map<string, { display: string; items: Ingredient[] }>();
    ingredients.forEach((ing) => {
      const key = normalizeSourceName(ing.source);
      const display = collapseSpaces(ing.source) || "Nguồn chưa rõ";
      const entry = map.get(key) || { display, items: [] };
      entry.items.push(ing);
      map.set(key, entry);
    });
    return map;
  }, [ingredients]);

  // Group ingredients needing restock by normalized source key
  const getRestockBySource = () => {
    const result: { [display: string]: Ingredient[] } = {};
    groupedSources.forEach(({ display, items }) => {
      const restock = items.filter((i) => {
        const status = getStockStatus(i);
        return status === 'out-of-stock' || status === 'low';
      });
      if (restock.length > 0) {
        result[display] = restock;
      }
    });
    return result;
  };

  // Get month name in Vietnamese
  const getMonthName = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const monthNames = [
      'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  // Toggle source expansion
  const toggleSourceExpansion = (source: string) => {
    setExpandedSources(prev => {
      const newSet = new Set(prev);
      if (newSet.has(source)) {
        newSet.delete(source);
      } else {
        newSet.add(source);
      }
      return newSet;
    });
  };

  // Filter ingredients based on search query and low stock filter
  const filteredIngredients = ingredients.filter((ingredient) => {
    // Apply search filter
    const matchesSearch = searchQuery === "" || 
      ingredient.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply low stock filter
    if (showLowOnly) {
      const status = getStockStatus(ingredient);
      return matchesSearch && (status === "low" || status === "out-of-stock");
    }
    
    return matchesSearch;
  });

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleAddIngredientSuccess = () => {
    // Refresh the ingredients list
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
          logger.error("Supabase query error:", queryError);
          throw new Error(`Database error: ${queryError.message || 'Unknown database error'}`);
        }

        if (!data) {
          throw new Error("No data returned from database");
        }

        // Transform data to match our interface
        const transformedData: Ingredient[] = (data || []).map((item: Record<string, unknown>) => {
          // Kiểm tra trường nào có dữ liệu thực tế (không NULL và không undefined)
          const hasQuantityData = item.ton_kho_so_luong !== null && item.ton_kho_so_luong !== undefined;
          const hasWeightData = item.ton_kho_khoi_luong !== null && item.ton_kho_khoi_luong !== undefined;
          
          return {
            id: String(item.id || ""),
            name: String(item.ten_nguyen_lieu || "Unknown"),
            source: String(item.nguon_nhap || "Nguồn chưa rõ"),
            // Chỉ gán giá trị cho trường có dữ liệu thực tế trong database
            quantityInStock: hasQuantityData ? Number(item.ton_kho_so_luong) : -1,
            quantityNeeded: hasQuantityData ? Number(item.ton_kho_so_luong) : -1,
            weightInStock: hasWeightData ? Number(item.ton_kho_khoi_luong) : -1,
            weightNeeded: hasWeightData ? Number(item.ton_kho_khoi_luong) : -1,
            unit: "kg", // Default unit
            weightUnit: "kg", // Default weight unit
          };
        });

        setIngredients(transformedData);
      } catch (err) {
        logger.error("Error fetching ingredients:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch ingredients";
        setError(errorMessage);
        setIngredients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchIngredients();
  };

  const alertCount = ingredients.filter((ingredient) => {
    const status = getStockStatus(ingredient);
    return status === "low" || status === "out-of-stock";
  }).length;

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    groupedSources.forEach(({ display, items }) => {
      counts[display] = items.length;
    });
    return counts;
  }, [groupedSources]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600 dark:text-gray-400">Đang tải dữ liệu...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Quản lý kho
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Quản lý nguyên liệu và tồn kho
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm nguyên liệu</span>
            </button>
          </div>

          {/* Tabs - placed at top under header */}
          <div className="mt-2">
            <div className="bg-gray-100 dark:bg-gray-800/40 rounded-xl p-1 inline-flex">
              <button
                onClick={() => setActiveTab('manage')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'manage'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Quản lý
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={`ml-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === 'sources'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Nguồn nhập
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Package className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tổng nguyên liệu
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {ingredients.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Cần chú ý
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {alertCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Hết hàng
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {ingredients.filter(ing => getStockStatus(ing) === "out-of-stock").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {activeTab === 'manage' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Nguyên liệu trong kho
                </h2>
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

            {/* Search Bar */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Tìm kiếm nguyên liệu..."
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
              
              {searchQuery && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredIngredients.length === 0 ? (
                    <span className="text-red-600 dark:text-red-400">
                      Không tìm thấy kết quả
                    </span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">
                      {filteredIngredients.length} kết quả
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          )}

          {activeTab === 'manage' && alertCount > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <span className="font-medium text-orange-800 dark:text-orange-200">
                  {alertCount} nguyên liệu cần chú ý
                </span>
              </div>
            </div>
          )}

          {/* Ingredients List */}
          {activeTab === 'manage' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            {filteredIngredients.length === 0 ? (
              <div className="p-8 text-center">
                {searchQuery ? (
                  <>
                    <Search className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      Không tìm thấy nguyên liệu nào phù hợp với &quot;{searchQuery}&quot;
                    </p>
                    <button
                      onClick={handleClearSearch}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                    >
                      Xóa bộ lọc tìm kiếm
                    </button>
                  </>
                ) : (
                  <>
                    <Package className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Không có nguyên liệu nào.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredIngredients.map((ingredient) => {
                  // Progress bar shows current stock status
                  // 0 stock = 0%, any stock > 0 = 100%
                  const quantityRatio = ingredient.quantityInStock > 0 ? 1 : 0;
                  const weightRatio = ingredient.weightInStock > 0 ? 1 : 0;

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
                          </div>

                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Nguồn: {ingredient.source || "Nguồn chưa rõ"}
                          </div>

                          <div className="space-y-4">
                            {/* Show quantity progress bar ONLY if ton_kho_so_luong has data (>= 0) */}
                            {ingredient.quantityInStock >= 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    Số lượng
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Tồn kho: {ingredient.quantityInStock} {ingredient.unit} ({ingredient.quantityInStock > 0 ? '100%' : '0%'})
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 relative">
                                  <div
                                    className={`h-3 rounded-full transition-all duration-300 ${
                                      ingredient.quantityInStock === 0
                                        ? "bg-red-500"
                                        : ingredient.quantityInStock <= 5
                                          ? "bg-yellow-500"
                                          : "bg-green-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(quantityRatio * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Show weight progress bar ONLY if ton_kho_khoi_luong has data (>= 0) AND no quantity data */}
                            {ingredient.weightInStock >= 0 && ingredient.quantityInStock < 0 && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium text-gray-700 dark:text-gray-300">
                                    Khối lượng
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    Tồn kho: {ingredient.weightInStock} {ingredient.weightUnit} ({ingredient.weightInStock > 0 ? '100%' : '0%'})
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 relative">
                                  <div
                                    className={`h-3 rounded-full transition-all duration-300 ${
                                      ingredient.weightInStock === 0
                                        ? "bg-red-500"
                                        : ingredient.weightInStock <= 5
                                          ? "bg-yellow-500"
                                          : "bg-green-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(weightRatio * 100, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <div className="relative">
                            <button
                              aria-label="Cài đặt"
                              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                              onClick={() => {
                                setManageItem(ingredient);
                                const presets = ["Nhà bà nội", "Nhà bà ngoại", "Nhà anh Thơ"]; 
                                if (presets.includes(ingredient.source)) {
                                  setManageSource(ingredient.source);
                                  setManageCustomSource("");
                                } else if ((ingredient.source || "").trim().length > 0) {
                                  setManageSource("Khác");
                                  setManageCustomSource(ingredient.source);
                                } else {
                                  setManageSource("");
                                  setManageCustomSource("");
                                }
                                setEditQty(Math.max(0, Number(ingredient.quantityInStock || 0)));
                                setEditWgt(Math.max(0, Number(ingredient.weightInStock || 0)));
                              }}
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {activeTab === 'sources' && (
            <div className="space-y-6">
              {/* Month Selector */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Tổng hợp tồn kho {getMonthName(selectedMonth)}
                  </h3>
                  <div className="flex items-center space-x-3">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Chọn tháng:
                    </label>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-red-800 dark:text-red-200">Hết hàng</span>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                      {ingredients.filter(i => getStockStatus(i) === 'out-of-stock').length}
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <span className="font-medium text-yellow-800 dark:text-yellow-200">Sắp hết</span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                      {ingredients.filter(i => getStockStatus(i) === 'low').length}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-green-800 dark:text-green-200">Còn hàng</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                      {ingredients.filter(i => getStockStatus(i) === 'in-stock').length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Settings panel removed per request: Nguồn nhập chỉ cảnh báo */}

              {/* Restocking by Source */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Danh sách cần nhập hàng theo nguồn
                  </h3>
                  
                  {Object.keys(getRestockBySource()).length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">
                        Tất cả nguyên liệu đều đủ hàng! Không cần nhập thêm.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(getRestockBySource()).map(([source, sourceIngredients]) => {
                        const isExpanded = expandedSources.has(source);
                        const displayIngredients = isExpanded ? sourceIngredients : sourceIngredients.slice(0, 5);
                        const hasMore = sourceIngredients.length > 5;
                        
                        return (
                          <div key={source} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                📦 {source}
                              </h4>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {sourceIngredients.length} nguyên liệu cần nhập
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              {displayIngredients.map((ingredient) => {
                                return (
                                  <div key={ingredient.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {ingredient.name}
                                      </span>
                                    </div>
                                    
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {ingredient.quantityInStock > 0 ? (
                                        <span>Còn {ingredient.quantityInStock} {ingredient.unit}</span>
                                      ) : (
                                        <span>Còn {ingredient.weightInStock} {ingredient.weightUnit}</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {hasMore && (
                              <div className="mt-3 text-center">
                                <button
                                  onClick={() => toggleSourceExpansion(source)}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                                >
                                  {isExpanded ? 'Thu gọn' : `Xem thêm ${sourceIngredients.length - 5} nguyên liệu`}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* All Sources Overview */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Tổng quan tất cả nguồn nhập
                  </h3>
                  
                  {Object.keys(sourceCounts).length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Chưa có dữ liệu nguồn nhập.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(sourceCounts)
                          .slice(0, showAllSources ? undefined : 5)
                          .map(([src, count]) => {
                            const sourceIngredients = ingredients.filter(i => normalizeSourceName(i.source) === normalizeSourceName(src));
                            const restockCount = sourceIngredients.filter(i => {
                              const status = getStockStatus(i);
                              return status === 'out-of-stock' || status === 'low';
                            }).length;
                            
                            return (
                              <div key={src} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                    {src}
                                  </h4>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {count} nguyên liệu
                                  </span>
                                </div>
                                
                                {restockCount > 0 && (
                                  <div className="flex items-center space-x-2 text-sm">
                                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                                    <span className="text-orange-600 dark:text-orange-400">
                                      {restockCount} cần nhập hàng
                                    </span>
                                  </div>
                                )}
                                
                                {restockCount === 0 && (
                                  <div className="flex items-center space-x-2 text-sm">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span className="text-green-600 dark:text-green-400">
                                      Đủ hàng
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                      
                      {Object.keys(sourceCounts).length > 5 && (
                        <div className="mt-4 text-center">
                          <button
                            onClick={() => setShowAllSources(!showAllSources)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium transition-colors"
                          >
                            {showAllSources 
                              ? 'Thu gọn' 
                              : `Xem thêm ${Object.keys(sourceCounts).length - 5} nguồn nhập`
                            }
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Ingredient Modal */}
      <AddIngredientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddIngredientSuccess}
      />
      {/* Manage Ingredient Modal */}
      {manageItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-[92%] max-w-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quản lý nguyên liệu</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{manageItem.name}</p>
              </div>
              <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" onClick={() => setManageItem(null)}>✕</button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nguồn nhập</label>
                <select
                  value={manageSource}
                  onChange={(e) => setManageSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Chọn nguồn nhập...</option>
                  <option value="Nhà bà nội">Nhà bà nội</option>
                  <option value="Nhà bà ngoại">Nhà bà ngoại</option>
                  <option value="Nhà anh Thơ">Nhà anh Thơ</option>
                  <option value="Khác">Khác</option>
                </select>
                {manageSource === 'Khác' && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nhập nguồn nhập khác</label>
                    <input
                      type="text"
                      value={manageCustomSource}
                      onChange={(e) => setManageCustomSource(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Nhập nguồn..."
                    />
                  </div>
                )}
              </div>

              {(manageItem.quantityInStock > 0) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Số lượng</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Hiện có: {manageItem.quantityInStock} {manageItem.unit}</span>
                  </div>
                  <div className="inline-flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden w-full max-w-md">
                    <button className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setEditQty(Math.max(0, editQty - 1))}>−</button>
                    <input type="number" className="flex-1 text-center px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none" value={editQty} onChange={(e) => setEditQty(Math.max(0, Number(e.target.value || 0)))} />
                    <button className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setEditQty(editQty + 1)}>+</button>
                  </div>
                </div>
              )}

              {(manageItem.weightInStock > 0) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Khối lượng</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Hiện có: {manageItem.weightInStock} {manageItem.weightUnit}</span>
                  </div>
                  <div className="inline-flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden w-full max-w-md">
                    <button className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setEditWgt(Math.max(0, editWgt - 1))}>−</button>
                    <input type="number" className="flex-1 text-center px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none" value={editWgt} onChange={(e) => setEditWgt(Math.max(0, Number(e.target.value || 0)))} />
                    <button className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setEditWgt(editWgt + 1)}>+</button>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2">
                <button className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700" onClick={() => { setManageItem(null); setConfirmDeleteId(manageItem.id); }}>Xóa</button>
                <button className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" disabled={savingManage} onClick={async () => {
                  try {
                    setSavingManage(true);
                    const finalSource = manageSource === 'Khác' ? (manageCustomSource || '').trim() : manageSource;
                    if (finalSource !== (manageItem.source || '')) {
                      const resSrc = await fetch(`/api/ingredients/${manageItem.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: finalSource }) });
                      const dataSrc = await resSrc.json().catch(() => ({}));
                      if (!resSrc.ok) throw new Error(dataSrc.error || 'Cập nhật nguồn thất bại');
                    }
                    // Debug log before update
                    logger.debug(`Before update: ${manageItem.name}, qtyStock=${manageItem.quantityInStock}, wgtStock=${manageItem.weightInStock}, editQty=${editQty}, editWgt=${editWgt}`);
                    logger.debug(`Modal state: manageItem.quantityInStock=${manageItem.quantityInStock}, editQty=${editQty}`);
                    
                    // Only update quantity if it has real data (not -1)
                    if (manageItem.quantityInStock >= 0) {
                      const qtyDiff = Math.max(0, editQty) - Math.max(0, Number(manageItem.quantityInStock || 0));
                      logger.debug(`Calculated qtyDiff: ${editQty} - ${manageItem.quantityInStock} = ${qtyDiff}`);
                      if (qtyDiff !== 0) {
                        logger.debug(`Updating QUANTITY: ${manageItem.name}, diff=${qtyDiff}, mode=quantity`);
                        const resQty = await fetch(`/api/ingredients/${manageItem.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Math.abs(qtyDiff), mode: 'quantity', op: qtyDiff > 0 ? 'increase' : 'decrease' }) });
                        const dataQty = await resQty.json().catch(() => ({}));
                        if (!resQty.ok) throw new Error(dataQty.error || 'Cập nhật số lượng thất bại');
                        logger.debug(`QUANTITY update completed`);
                      }
                    }
                    // Only update weight if it has real data (not -1)
                    if (manageItem.weightInStock >= 0) {
                      const wgtDiff = Math.max(0, editWgt) - Math.max(0, Number(manageItem.weightInStock || 0));
                      if (wgtDiff !== 0) {
                        logger.debug(`Updating WEIGHT: ${manageItem.name}, diff=${wgtDiff}, mode=weight`);
                        const resWgt = await fetch(`/api/ingredients/${manageItem.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Math.abs(wgtDiff), mode: 'weight', op: wgtDiff > 0 ? 'increase' : 'decrease' }) });
                        const dataWgt = await resWgt.json().catch(() => ({}));
                        if (!resWgt.ok) throw new Error(dataWgt.error || 'Cập nhật khối lượng thất bại');
                      }
                    }
                    handleAddIngredientSuccess();
                    setManageItem(null);
                  } catch (e) {
                    logger.error('Save manage error', e);
                  } finally {
                    setSavingManage(false);
                  }
                }}>Lưu</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Xác nhận xóa</h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Bạn có chắc chắn muốn xóa nguyên liệu này? Hành động này không thể hoàn tác.</p>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                disabled={deleting}
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  try {
                    setDeleting(true);
                    const res = await fetch(`/api/ingredients/${confirmDeleteId}`, { method: 'DELETE' });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || 'Xóa thất bại');
                    setConfirmDeleteId(null);
                    handleAddIngredientSuccess();
                  } catch (e) {
                    logger.error('Delete ingredient error:', e);
                    setConfirmDeleteId(null);
                  } finally {
                    setDeleting(false);
                  }
                }}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}