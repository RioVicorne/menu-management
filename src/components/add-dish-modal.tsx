"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "./ui/modal";
import { Loader2, Plus, Search, Check } from "lucide-react";
import { createDish, getAllIngredients } from "@/lib/api";

interface AddDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (dishName: string) => void;
}

export default function AddDishModal({ isOpen, onClose, onCreated }: AddDishModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [allIngredients, setAllIngredients] = useState<Array<{ id: string; ten_nguyen_lieu: string; ton_kho_khoi_luong?: number; ton_kho_so_luong?: number }>>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, true>>({});

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const list = await getAllIngredients();
        setAllIngredients(list.map(i => ({ id: i.id, ten_nguyen_lieu: i.ten_nguyen_lieu, ton_kho_khoi_luong: Number(i.ton_kho_khoi_luong || 0), ton_kho_so_luong: Number(i.ton_kho_so_luong || 0) })));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Không tải được nguyên liệu");
      }
    })();
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allIngredients;
    return allIngredients.filter(i => i.ten_nguyen_lieu.toLowerCase().includes(q));
  }, [allIngredients, query]);

  const clear = () => {
    setName("");
    setQuery("");
    setSelected({});
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên món ăn");
      return;
    }
    try {
      setLoading(true);
      // Build recipe payload with ingredient ids only (no quantities for now)
      const recipe = Object.keys(selected).map((ingredientId) => ({
        ma_nguyen_lieu: ingredientId,
      }));

      const dish = await createDish(name.trim(), recipe);
      onCreated(dish.ten_mon_an);
      clear();
      onClose();
      // Note: linking selected ingredients to recipe requires a server API for inserting into 'thanh_phan'.
      // We'll add that in a follow-up if needed.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tạo món ăn");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!loading) { clear(); onClose(); } }} title="Thêm món ăn">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tên món *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nhập tên món..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nguyên liệu cần nấu</label>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm nguyên liệu..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((ing) => {
              const isSelected = Boolean(selected[ing.id]);
              const weightStock = Number(ing.ton_kho_khoi_luong || 0);
              const qtyStock = Number(ing.ton_kho_so_luong || 0);
              const outOfStock = weightStock <= 0 && qtyStock <= 0;

              return (
                <div key={ing.id} className={`flex items-center justify-between p-3 gap-3 ${outOfStock ? "opacity-60" : "hover:bg-gray-50 dark:hover:bg-gray-800/50"}`}>
                  <div className="min-w-0">
                    <div className="text-sm text-gray-800 dark:text-gray-200 truncate">{ing.ten_nguyen_lieu}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      Tồn: {weightStock > 0 ? `${weightStock} kg` : "0 kg"}
                      {" "}·{" "}
                      {qtyStock > 0 ? `${qtyStock} cái` : "0 cái"}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      className={`h-7 w-7 rounded-full border flex items-center justify-center transition ${isSelected ? "border-emerald-500" : "border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"} ${outOfStock ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => {
                        if (outOfStock) return;
                        if (isSelected) {
                          const { [ing.id]: _, ...rest } = selected; // eslint-disable-line @typescript-eslint/no-unused-vars
                          setSelected(rest);
                        } else {
                          setSelected(prev => ({ ...prev, [ing.id]: true }));
                        }
                      }}
                      title={outOfStock ? "Hết hàng" : isSelected ? "Bỏ chọn" : "Chọn"}
                      disabled={outOfStock || loading}
                    >
                      {isSelected ? <Check className="h-4 w-4 text-emerald-500" /> : null}
                    </button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">Không có nguyên liệu phù hợp</div>
            )}
          </div>
          
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={() => { clear(); onClose(); }}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            disabled={loading}
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-70"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>Tạo món</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}


