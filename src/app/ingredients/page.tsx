"use client";

import { useEffect, useState } from "react";
import { ChefHat, Plus, Search, Trash2, Loader2, Eye } from "lucide-react";
import { getDishes, type Dish, getRecipeForDish, deleteDish, createDish } from "@/lib/api";
import AddDishModal from "@/components/add-dish-modal";
import DishRecipeModal from "@/components/dish-recipe-modal";
import Modal from "@/components/ui/modal";

export default function IngredientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);
  const [selectedDishName, setSelectedDishName] = useState<string>("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [deleteDishId, setDeleteDishId] = useState<string | null>(null);
  const [deleteDishName, setDeleteDishName] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getDishes();
        setDishes(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được danh sách món ăn");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = dishes.filter((d) =>
    (d.ten_mon_an || "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
                  Quản lý món ăn
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Thêm và chỉnh sửa thông tin món ăn
                </p>
              </div>
            </div>
            <button
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span>Thêm món ăn</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ChefHat className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tổng món ăn</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{dishes.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="flex">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm món ăn..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <ChefHat className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Không tìm thấy món ăn nào.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filtered.map((dish) => (
                <div key={dish.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{dish.ten_mon_an}</h3>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Tạo: {new Date(dish.created_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                        onClick={async () => {
                          setSelectedDishId(dish.id);
                          setSelectedDishName(dish.ten_mon_an);
                          setIsRecipeOpen(true);
                        }}
                        title="Xem nguyên liệu món"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        onClick={() => {
                          setDeleteDishId(dish.id);
                          setDeleteDishName(dish.ten_mon_an);
                        }}
                        title="Xóa món ăn"
                      >
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

      {/* Add Dish Modal */}
      <AddDishModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={async () => {
          try {
            const data = await getDishes();
            setDishes(data);
          } catch {}
        }}
      />

      {/* Recipe Modal */}
      <DishRecipeModal
        isOpen={isRecipeOpen}
        dishId={selectedDishId}
        dishName={selectedDishName}
        onClose={() => setIsRecipeOpen(false)}
      />

      {/* Delete confirmation modal */}
      <Modal
        isOpen={Boolean(deleteDishId)}
        onClose={() => (deleting ? null : (setDeleteDishId(null), setDeleteDishName("")))}
        title="Xác nhận xóa"
      >
        <div className="space-y-6">
          <p className="text-gray-700 dark:text-gray-300">
            Bạn có chắc chắn muốn xóa món
            <span className="font-semibold"> {deleteDishName} </span>
            ? Hành động này không thể hoàn tác.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => { if (!deleting) { setDeleteDishId(null); setDeleteDishName(""); } }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={deleting}
            >
              Hủy
            </button>
            <button
              onClick={async () => {
                if (!deleteDishId) return;
                try {
                  setDeleting(true);
                  await deleteDish(deleteDishId);
                  setDishes(prev => prev.filter(d => d.id !== deleteDishId));
                  if (selectedDishId === deleteDishId) {
                    setSelectedDishId(null);
                    setIsRecipeOpen(false);
                  }
                  setDeleteDishId(null);
                  setDeleteDishName("");
                } catch (e) {
                  alert(e instanceof Error ? e.message : "Không thể xóa món ăn");
                } finally {
                  setDeleting(false);
                }
              }}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-70"
              disabled={deleting}
            >
              {deleting ? "Đang xóa..." : "Xóa"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


