"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getAllIngredients, getDishById, updateDish, createDish, Dish } from "@/lib/api";

interface RecipeFormProps {
  dishId?: string;
  onSaved?: (dish: Dish) => void;
}

export default function RecipeForm({ dishId, onSaved }: RecipeFormProps) {
  const [name, setName] = useState("");
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(!!dishId);
  const [saving, setSaving] = useState<boolean>(false);
  const [ingredients, setIngredients] = useState<{ id: string; ten_nguyen_lieu: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ing = await getAllIngredients();
      if (!cancelled) setIngredients(ing.map(i => ({ id: i.id, ten_nguyen_lieu: i.ten_nguyen_lieu })));
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!dishId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const dish = await getDishById(dishId);
        if (!cancelled && dish) {
          setName(dish.ten_mon_an || "");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dishId]);

  const selectedNames = useMemo(() => {
    const set = new Set(ingredientIds);
    return ingredients.filter(i => set.has(i.id)).map(i => i.ten_nguyen_lieu);
  }, [ingredients, ingredientIds]);

  async function handleSave() {
    if (!name.trim()) return;
    try {
      setSaving(true);
      const recipe = ingredientIds.map((id) => ({ ma_nguyen_lieu: id }));
      const saved = dishId
        ? await updateDish(dishId, { ten_mon_an: name.trim(), cong_thuc_nau: recipe })
        : await createDish(name.trim(), recipe);
      onSaved?.(saved);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner /></div>
        ) : (
          <>
            <div className="space-y-1">
              <label className="text-sm font-medium">Tên món</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Phở bò" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nguyên liệu</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-auto p-2 border rounded-xl">
                {ingredients.map((i) => {
                  const checked = ingredientIds.includes(i.id);
                  return (
                    <label key={i.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setIngredientIds((prev) => {
                            if (e.target.checked) return [...prev, i.id];
                            return prev.filter((x) => x !== i.id);
                          });
                        }}
                      />
                      <span>{i.ten_nguyen_lieu}</span>
                    </label>
                  );
                })}
              </div>
              {selectedNames.length > 0 && (
                <div className="text-xs text-muted-foreground">Đã chọn: {selectedNames.join(", ")}</div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => { setName(""); setIngredientIds([]); }}>Làm mới</Button>
              <Button onClick={handleSave} disabled={saving || !name.trim()}>{saving ? "Đang lưu..." : "Lưu"}</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}



