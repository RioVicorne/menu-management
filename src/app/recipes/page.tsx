"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChefHat, Grid, LayoutGrid, List, Plus, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Link from "next/link";
import { Dish, getDishes } from "@/lib/api";

type ViewMode = "table" | "grid";

export default function RecipesPage() {
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ViewMode>("table");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getDishes();
        if (!cancelled) setDishes(data);
      } catch {
        if (!cancelled) setDishes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!dishes) return [] as Dish[];
    const q = query.trim().toLowerCase();
    if (!q) return dishes;
    return dishes.filter((d) => d.ten_mon_an.toLowerCase().includes(q));
  }, [dishes, query]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 gradient-primary rounded-2xl shadow-soft">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-sage-600 to-wood-600 bg-clip-text text-transparent">
              Công thức nấu ăn
            </h1>
            <p className="text-muted-foreground text-sm">Danh sách món ăn và công thức</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm món..."
              className="pl-9 w-56"
            />
          </div>
          <Button variant={mode === "table" ? "secondary" : "outline"} size="icon" onClick={() => setMode("table")} aria-label="Bảng">
            <List className="h-5 w-5" />
          </Button>
          <Button variant={mode === "grid" ? "secondary" : "outline"} size="icon" onClick={() => setMode("grid")} aria-label="Lưới">
            <LayoutGrid className="h-5 w-5" />
          </Button>
          <Link href="/recipes/new">
            <Button variant="culinary">
              <Plus className="h-4 w-4 mr-2" /> Thêm món
            </Button>
          </Link>
        </div>
      </div>

      {dishes === null ? (
        <div className="flex justify-center py-16"><LoadingSpinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Chưa có công thức"
          description={query ? "Không tìm thấy món phù hợp" : "Hãy thêm món mới để bắt đầu"}
          actionLabel="Thêm món"
          actionHref="/recipes/new"
          icon={<ChefHat className="h-10 w-10 text-sage-600" />}
        />
      ) : mode === "table" ? (
        <Card variant="modern">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên món</TableHead>
                  <TableHead>Thành phần</TableHead>
                  <TableHead className="w-24">Chi tiết</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.ten_mon_an}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.ingredients?.slice(0, 4).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/recipes/${d.id}`} className="text-sage-700 hover:underline">Xem</Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((d) => (
            <Card key={d.id} variant="culinary" className="hover-lift">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Grid className="h-4 w-4 text-wood-600" /> {d.ten_mon_an}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="line-clamp-2">{d.ingredients?.join(", ") || "Chưa có thành phần"}</div>
                <div className="pt-3">
                  <Link href={`/recipes/${d.id}`}>
                    <Button size="sm" variant="outline">Xem chi tiết</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
