"use client";

import { useEffect, useState } from "react";
import { ChefHat, Plus, Search, Trash2, Loader2, Eye, Pencil } from "lucide-react";
import { getDishes, type Dish, deleteDish } from "@/lib/api";
import AddDishModal from "@/components/add-dish-modal";
import DishRecipeModal from "@/components/dish-recipe-modal";
import Modal from "@/components/ui/modal";
import EditDishIngredientsModal from "@/components/edit-dish-ingredients-modal";

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
  const [editDishId, setEditDishId] = useState<string | null>(null);
  const [editDishName, setEditDishName] = useState<string>("");

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
    <div className="space-y-6">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 gradient-primary rounded-2xl shadow-lg">
                <ChefHat className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                  Quản lý món ăn
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                  Thêm và chỉnh sửa thông tin món ăn
                </p>
              </div>
            </div>
            <button
              className="btn-primary inline-flex items-center space-x-2"
              onClick={() => setIsAddOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span>Thêm món ăn</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card-modern p-6 hover-lift">
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
        <div className="card-modern">
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
                <div key={dish.id} className="p-6 hover:bg-white/50 dark:hover:bg-white/5 transition-all duration-300 hover-lift">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white whitespace-normal break-words leading-snug">
                        {dish.ten_mon_an}
                      </h3>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Tạo: {new Date(dish.created_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        className="p-3 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all duration-300 hover:scale-110"
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
                        className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-300 hover:scale-110"
                        onClick={() => { setEditDishId(dish.id); setEditDishName(dish.ten_mon_an); }}
                        title="Chỉnh sửa nguyên liệu món"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-300 hover:scale-110"
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

      {/* Edit ingredients modal */}
      <EditDishIngredientsModal
        isOpen={Boolean(editDishId)}
        dishId={editDishId}
        dishName={editDishName}
        onClose={() => { setEditDishId(null); setEditDishName(""); }}
        onSaved={async () => {
          try { const data = await getDishes(); setDishes(data); } catch {}
        }}
      />
    </div>
  );
}


