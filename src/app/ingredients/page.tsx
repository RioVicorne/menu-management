"use client";

import { useEffect, useState } from "react";
import { ChefHat, Plus, Search, Trash2, Loader2, Eye, Pencil, Calendar, Sparkles } from "lucide-react";
import { getDishes, type Dish, deleteDish } from "@/lib/api";
import AddDishModal from "@/components/add-dish-modal";
import DishRecipeModal from "@/components/dish-recipe-modal";
import Modal from "@/components/ui/modal";
import EditDishIngredientsModal from "@/components/edit-dish-ingredients-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="space-y-8 animate-fade-in">
        {/* Header Section */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4">
            <div className="p-4 gradient-primary rounded-3xl shadow-soft">
              <ChefHat className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-sage-600 to-wood-600 bg-clip-text text-transparent">
                Quản lý món ăn
              </h1>
              <p className="text-muted-foreground">
                Thêm và chỉnh sửa thông tin món ăn
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="culinary" className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Tổng món ăn</p>
                  <p className="text-2xl font-bold text-foreground">{dishes.length}</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-wood-500 to-wood-600 shadow-soft">
                  <ChefHat className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="culinary" className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Đã tìm thấy</p>
                  <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-sage-500 to-sage-600 shadow-soft">
                  <Search className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="culinary" className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Món mới nhất</p>
                  <p className="text-sm font-semibold text-foreground">
                    {dishes.length > 0 ? new Date(dishes[0].created_at).toLocaleDateString('vi-VN') : '—'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-mint-500 to-mint-600 shadow-soft">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              variant="modern"
              type="text"
              placeholder="Tìm kiếm món ăn..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant="default"
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm món ăn</span>
          </Button>
        </div>

        {/* List */}
        <Card variant="modern" className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-sage-600" />
              Danh sách món ăn
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-12 text-center">
                <div className="space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-sage-600 mx-auto" />
                  <p className="text-muted-foreground">Đang tải dữ liệu...</p>
                </div>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="space-y-4">
                  <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30 w-fit mx-auto">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <div className="space-y-4">
                  <div className="p-4 rounded-full bg-sage-100 dark:bg-sage-900/30 w-fit mx-auto">
                    <ChefHat className="h-12 w-12 text-sage-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Không tìm thấy món ăn</h3>
                    <p className="text-muted-foreground">
                      {searchTerm ? 'Thử tìm kiếm với từ khóa khác' : 'Hãy thêm món ăn đầu tiên của bạn'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {filtered.map((dish, index) => (
                  <div key={dish.id} 
                       className="p-4 rounded-2xl border border-sage-200/50 dark:border-sage-700/50 hover:bg-sage-50/50 dark:hover:bg-sage-900/20 transition-all duration-300 hover-lift"
                       style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground whitespace-normal break-words leading-snug mb-2">
                          {dish.ten_mon_an}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Tạo: {new Date(dish.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-sage-600 hover:text-sage-700 hover:bg-sage-100 dark:hover:bg-sage-900/30"
                          onClick={async () => {
                            setSelectedDishId(dish.id);
                            setSelectedDishName(dish.ten_mon_an);
                            setIsRecipeOpen(true);
                          }}
                          title="Xem nguyên liệu món"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-wood-600 hover:text-wood-700 hover:bg-wood-100 dark:hover:bg-wood-900/30"
                          onClick={() => { setEditDishId(dish.id); setEditDishName(dish.ten_mon_an); }}
                          title="Chỉnh sửa nguyên liệu món"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                          onClick={() => {
                            setDeleteDishId(dish.id);
                            setDeleteDishName(dish.ten_mon_an);
                          }}
                          title="Xóa món ăn"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

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
          <div className="text-center space-y-4">
            <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30 w-fit mx-auto">
              <Trash2 className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Xóa món ăn</h3>
              <p className="text-muted-foreground">
                Bạn có chắc chắn muốn xóa món
                <span className="font-semibold text-foreground"> {deleteDishName} </span>
                ? Hành động này không thể hoàn tác.
              </p>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => { if (!deleting) { setDeleteDishId(null); setDeleteDishName(""); } }}
              disabled={deleting}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
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
              disabled={deleting}
            >
              {deleting ? "Đang xóa..." : "Xóa"}
            </Button>
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


