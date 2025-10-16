"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Dish, DishRecipeItem, getDishById, getRecipeForDish } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");

  const [dish, setDish] = useState<Dish | null>(null);
  const [recipe, setRecipe] = useState<DishRecipeItem[]>([]);
  const [servings, setServings] = useState<number>(1);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    (async () => {
      const d = await getDishById(id);
      const r = await getRecipeForDish(id);
      if (!cancelled) {
        setDish(d);
        setRecipe(r);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const scaled = useMemo(() => {
    return recipe.map((it) => ({
      ...it,
      khoi_luong_nguyen_lieu: it.khoi_luong_nguyen_lieu ? it.khoi_luong_nguyen_lieu * servings : undefined,
      so_luong_nguyen_lieu: it.so_luong_nguyen_lieu ? it.so_luong_nguyen_lieu * servings : undefined,
    }));
  }, [recipe, servings]);

  if (!id) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{dish?.ten_mon_an || "Công thức"}</h1>
        <div className="flex items-center gap-2">
          <Link href={`/recipes/${id}/edit`}><Button variant="outline">Sửa</Button></Link>
          <Button onClick={() => router.push(`/planner?add=${id}`)}>Thêm vào kế hoạch</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Khẩu phần</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            value={servings}
            onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))}
            className="w-24 border rounded-xl px-3 py-2"
          />
          <span className="text-sm text-muted-foreground">Tự động nhân định lượng nguyên liệu</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Thành phần</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {scaled.length === 0 ? (
            <div className="text-sm text-muted-foreground">Chưa có thành phần</div>
          ) : (
            <ul className="list-disc pl-6 text-sm">
              {scaled.map((it) => (
                <li key={it.id}>
                  <span className="font-medium">{it.ten_nguyen_lieu || it.ma_nguyen_lieu}</span>
                  {" "}
                  {it.khoi_luong_nguyen_lieu != null ? (
                    <span>— {it.khoi_luong_nguyen_lieu} g</span>
                  ) : it.so_luong_nguyen_lieu != null ? (
                    <span>— {it.so_luong_nguyen_lieu} cái</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




