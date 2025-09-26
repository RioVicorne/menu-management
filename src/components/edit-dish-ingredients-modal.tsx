"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "./ui/modal";
import { Loader2, Search, Check } from "lucide-react";
import { getAllIngredients, getRecipeForDish, updateDishIngredients } from "@/lib/api";

interface EditDishIngredientsModalProps {
  isOpen: boolean;
  dishId: string | null;
  dishName?: string;
  onClose: () => void;
  onSaved?: () => void;
}

export default function EditDishIngredientsModal({ isOpen, dishId, dishName, onClose, onSaved }: EditDishIngredientsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allIngredients, setAllIngredients] = useState<Array<{ id: string; ten_nguyen_lieu: string }>>([]);
  const [selected, setSelected] = useState<Record<string, true>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!isOpen || !dishId) return;
    setError(null);
    setLoading(true);
    Promise.all([
      getAllIngredients(),
      getRecipeForDish(dishId),
    ])
      .then(([ings, recipe]) => {
        setAllIngredients(ings.map(i => ({ id: i.id, ten_nguyen_lieu: i.ten_nguyen_lieu })));
        const init: Record<string, true> = {};
        (recipe as any[]).forEach((r) => { if (r.ma_nguyen_lieu) init[String(r.ma_nguyen_lieu)] = true; });
        setSelected(init);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Không tải được dữ liệu"))
      .finally(() => setLoading(false));
  }, [isOpen, dishId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return allIngredients;
    return allIngredients.filter(i => i.ten_nguyen_lieu.toLowerCase().includes(s));
  }, [q, allIngredients]);

  const handleSave = async () => {
    if (!dishId) return;
    try {
      setSaving(true);
      await updateDishIngredients(dishId, Object.keys(selected));
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu thay đổi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { if (!saving) onClose(); }} title={`${dishName || ""}`}>
      {loading ? (
        <div className="p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Đang tải...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm nguyên liệu..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 divide-y">
            {filtered.map((ing) => {
              const isSelected = Boolean(selected[ing.id]);
              return (
                <div key={ing.id} className="flex items-center justify-between p-3">
                  <span className="text-sm text-gray-800">{ing.ten_nguyen_lieu}</span>
                  <button
                    className={`h-7 w-7 rounded-full border flex items-center justify-center ${isSelected ? "border-emerald-500" : "border-gray-300 hover:bg-gray-50"}`}
                    onClick={() => {
                      if (isSelected) {
                        const { [ing.id]: _, ...rest } = selected; // eslint-disable-line @typescript-eslint/no-unused-vars
                        setSelected(rest);
                      } else {
                        setSelected(prev => ({ ...prev, [ing.id]: true }));
                      }
                    }}
                  >
                    {isSelected ? <Check className="h-4 w-4 text-emerald-500" /> : null}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={saving}
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70"
              disabled={saving}
            >
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

