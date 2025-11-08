"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Dish, DishRecipeItem, getDishById, getRecipeForDish } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Scale, Hash } from "lucide-react";
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
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          {dish?.ten_mon_an || "Công thức"}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href={`/recipes/${id}/edit`}>
            <Button variant="outline" className="flex-1 sm:flex-initial">
              Sửa
            </Button>
          </Link>
          <Button 
            onClick={() => router.push(`/planner?add=${id}`)}
            className="flex-1 sm:flex-initial"
          >
            Thêm vào kế hoạch
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">Khẩu phần</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={servings}
                onChange={(e) => setServings(Math.max(1, Number(e.target.value) || 1))}
                className="w-24 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 text-sm font-medium bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent transition-all"
              />
              <span className="text-sm font-medium text-foreground">
                {servings === 1 ? 'phần' : 'phần'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Định lượng nguyên liệu sẽ tự động điều chỉnh theo khẩu phần
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5 text-sage-600 dark:text-sage-400" />
            Thành phần
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scaled.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="p-4 rounded-full bg-sage-100 dark:bg-sage-900/30 w-fit mb-4">
                <Package className="w-8 h-8 text-sage-600 dark:text-sage-400" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2">
                Chưa có thành phần
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Hãy thêm các nguyên liệu cần thiết cho món ăn này
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scaled.map((it) => (
                <div
                  key={it.id}
                  className="group relative p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-sage-300 dark:hover:border-sage-600 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-sage-100 dark:bg-sage-900/30 flex-shrink-0">
                      {it.khoi_luong_nguyen_lieu != null ? (
                        <Scale className="w-4 h-4 text-sage-600 dark:text-sage-400" />
                      ) : (
                        <Hash className="w-4 h-4 text-sage-600 dark:text-sage-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground mb-1.5 line-clamp-2">
                        {it.ten_nguyen_lieu || it.ma_nguyen_lieu}
                      </h4>
                      {it.khoi_luong_nguyen_lieu != null ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Khối lượng:</span>
                          <span className="text-sm font-medium text-sage-700 dark:text-sage-300">
                            {it.khoi_luong_nguyen_lieu.toLocaleString('vi-VN')} g
                          </span>
                        </div>
                      ) : it.so_luong_nguyen_lieu != null ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">Số lượng:</span>
                          <span className="text-sm font-medium text-sage-700 dark:text-sage-300">
                            {it.so_luong_nguyen_lieu.toLocaleString('vi-VN')} cái
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




