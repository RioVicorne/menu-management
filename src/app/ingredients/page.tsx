"use client";

import { useState } from "react";
import { ChefHat, Plus, Search, Edit, Trash2 } from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  unit: string;
  weightUnit: string;
  description?: string;
  createdAt: string;
}

export default function IngredientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [ingredients] = useState<Ingredient[]>([
    {
      id: "1",
      name: "Thịt bò",
      category: "Thịt",
      unit: "kg",
      weightUnit: "kg",
      description: "Thịt bò tươi chất lượng cao",
      createdAt: "2024-01-15",
    },
    {
      id: "2",
      name: "Bún tươi",
      category: "Tinh bột",
      unit: "gói",
      weightUnit: "kg",
      description: "Bún tươi làm từ gạo",
      createdAt: "2024-01-16",
    },
    {
      id: "3",
      name: "Bánh tráng",
      category: "Tinh bột",
      unit: "gói",
      weightUnit: "kg",
      description: "Bánh tráng cuốn nem",
      createdAt: "2024-01-17",
    },
    {
      id: "4",
      name: "Rau xanh",
      category: "Rau củ",
      unit: "kg",
      weightUnit: "kg",
      description: "Các loại rau xanh tươi",
      createdAt: "2024-01-18",
    },
    {
      id: "5",
      name: "Nước tương",
      category: "Gia vị",
      unit: "chai",
      weightUnit: "L",
      description: "Nước tương đậu nành",
      createdAt: "2024-01-19",
    },
  ]);

  const categories = ["all", "Thịt", "Tinh bột", "Rau củ", "Gia vị"];

  const filteredIngredients = ingredients.filter((ingredient) => {
    const matchesSearch = ingredient.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || ingredient.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ChefHat className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Quản lý nguyên liệu
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Thêm và chỉnh sửa thông tin nguyên liệu
                </p>
              </div>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" />
              <span>Thêm nguyên liệu</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ChefHat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <ChefHat className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Thịt
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {ingredients.filter(ing => ing.category === "Thịt").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <ChefHat className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tinh bột
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {ingredients.filter(ing => ing.category === "Tinh bột").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <ChefHat className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Rau củ
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {ingredients.filter(ing => ing.category === "Rau củ").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm nguyên liệu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category === "all" ? "Tất cả" : category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ingredients List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {filteredIngredients.length === 0 ? (
            <div className="p-8 text-center">
              <ChefHat className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Không tìm thấy nguyên liệu nào.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredIngredients.map((ingredient) => (
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
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                          {ingredient.category}
                        </span>
                      </div>

                      {ingredient.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {ingredient.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>Đơn vị: {ingredient.unit}</span>
                        <span>Khối lượng: {ingredient.weightUnit}</span>
                        <span>Tạo: {new Date(ingredient.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
