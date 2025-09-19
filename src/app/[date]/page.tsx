"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n";

function parseDate(param: string) {
  // Handle invalid date parameters
  if (!param || param === "app" || !param.includes("-")) {
    return new Date(); // Return today's date as fallback
  }

  const [y, m, d] = param.split("-").map(Number);

  // Validate the parsed numbers
  if (
    isNaN(y) ||
    isNaN(m) ||
    isNaN(d) ||
    y < 1900 ||
    y > 2100 ||
    m < 1 ||
    m > 12 ||
    d < 1 ||
    d > 31
  ) {
    return new Date(); // Return today's date as fallback
  }

  return new Date(y, (m || 1) - 1, d || 1);
}

export default function DailyPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  // Next.js 15: params is a Promise in Client Components
  const { date: dateParam } = use(params);
  const date = useMemo(() => parseDate(dateParam), [dateParam]);

  const [tab, setTab] = useState<"menu" | "inventory" | "add">("menu");
  const { t } = useI18n();
  const [showCalories, setShowCalories] = useState(false);
  const [showShopping, setShowShopping] = useState(false);
  const [showRestock, setShowRestock] = useState(false);
  const [monthPlanLoading, setMonthPlanLoading] = useState(false);
  const [monthPlan, setMonthPlan] = useState<
    Array<{
      supplier: string;
      total: number;
      items: Array<{
        id: string;
        name: string | null;
        need_qty: number;
        need_weight: number;
        unit_price: number;
        cost: number;
      }>;
    }>
  >([]);

  // Avoid hydration mismatch: render ISO on server, localize after mount
  const [label, setLabel] = useState(() => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  });
  useEffect(() => {
    setLabel(
      date.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
  }, [date]);

  // Load today's menu (thuc_don joined with mon_an)
  type DishRow = {
    id: string;
    boi_so: number;
    ghi_chu: string | null;
    ma_mon_an: string | null;
    ten_mon_an: string | null;
  };
  const [dishes, setDishes] = useState<DishRow[]>([]);
  const iso = date.toISOString().slice(0, 10); // Convert date to YYYY-MM-DD format
  const refresh = useCallback(async () => {
    if (!supabase) {
      // Mock mode - return empty array since we're not persisting data
      setDishes([]);
      return;
    }

    try {
      // Fetch day menu rows
      const { data, error } = await supabase
        .from("thuc_don")
        .select("id, boi_so, ghi_chu, ma_mon_an")
        .eq("ngay", iso);
      if (error) {
        console.error("Load thuc_don failed:", error.message);
        setDishes([]);
        return;
      }
      const rows = (data ?? []) as Array<{
        id: string;
        boi_so: number;
        ghi_chu: string | null;
        ma_mon_an: string | null;
      }>;
      // Fetch dish names separately to avoid FK embedding issues
      const ids = Array.from(
        new Set(rows.map((r) => r.ma_mon_an).filter(Boolean)),
      ) as string[];
      const nameMap = new Map<string, string | null>();
      if (ids.length) {
        const { data: dishData, error: dishErr } = await supabase
          .from("mon_an")
          .select("id, ten_mon_an")
          .in("id", ids);
        if (dishErr) {
          console.error("Load mon_an failed:", dishErr.message);
        } else {
          type MonAnName = { id: string; ten_mon_an: string | null };
          for (const r of (dishData as MonAnName[] | null) ?? []) {
            nameMap.set(r.id, r.ten_mon_an ?? null);
          }
        }
      }
      const mapped: DishRow[] = rows.map((r) => ({
        id: r.id,
        boi_so: r.boi_so,
        ghi_chu: r.ghi_chu,
        ma_mon_an: r.ma_mon_an,
        ten_mon_an: r.ma_mon_an ? (nameMap.get(r.ma_mon_an) ?? null) : null,
      }));
      setDishes(mapped);
    } catch (err) {
      console.warn("Database connection failed (running in mock mode):", err);
      setDishes([]);
    }
  }, [date]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Add dish flow
  type MonAn = { id: string; ten_mon_an: string | null };
  const [options, setOptions] = useState<MonAn[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [multiplier, setMultiplier] = useState<number>(1);
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!supabase) {
        // Mock mode - use mock dishes
        const mockDishes = [
          { id: "1", ten_mon_an: "Cơm tấm sườn nướng" },
          { id: "2", ten_mon_an: "Phở bò" },
          { id: "3", ten_mon_an: "Bún bò Huế" },
          { id: "4", ten_mon_an: "Bánh mì pate" },
          { id: "5", ten_mon_an: "Chả cá Lã Vọng" },
        ];
        setOptions(mockDishes);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("mon_an")
          .select("id, ten_mon_an")
          .order("ten_mon_an", { ascending: true });
        if (error) {
          console.error("Load mon_an list failed:", error.message);
          setOptions([]);
          return;
        }
        setOptions((data ?? []) as MonAn[]);
      } catch (err) {
        console.warn("Database connection failed (running in mock mode):", err);
        setOptions([]);
      }
    })();
  }, []);

  async function handleAdd() {
    if (!selected || multiplier <= 0) return;
    setSaving(true);
    try {
      if (!supabase) {
        // Mock mode - add to local state
        const selectedDish = options.find((opt) => opt.id === selected);
        const newDish: DishRow = {
          id: Date.now().toString(),
          boi_so: multiplier,
          ghi_chu: note || null,
          ma_mon_an: selected,
          ten_mon_an: selectedDish?.ten_mon_an || "Unknown dish",
        };
        setDishes((prev) => [...prev, newDish]);
      } else {
        const { error } = await supabase
          .from("thuc_don")
          .insert({
            ngay: iso,
            ma_mon_an: selected,
            boi_so: multiplier,
            ghi_chu: note,
          });
        if (error) throw error;
        await refresh();
      }
      setSelected("");
      setMultiplier(1);
      setNote("");
      setTab("menu");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!supabase) {
      // Mock mode - just update local state
      setDishes((d) => d.filter((x) => x.id !== id));
      return;
    }

    const prev = dishes;
    setDishes((d) => d.filter((x) => x.id !== id));
    const { error } = await supabase.from("thuc_don").delete().eq("id", id);
    if (error) {
      console.error(error);
      setDishes(prev);
    }
  }

  async function handleEdit(
    id: string,
    updates: Partial<Pick<DishRow, "boi_so" | "ghi_chu">>,
  ) {
    if (!supabase) {
      // Mock mode - just update local state
      setDishes((d) => d.map((x) => (x.id === id ? { ...x, ...updates } : x)));
      return;
    }

    const prev = dishes;
    setDishes((d) => d.map((x) => (x.id === id ? { ...x, ...updates } : x)));
    const { error } = await supabase
      .from("thuc_don")
      .update(updates)
      .eq("id", id);
    if (error) {
      console.error(error);
      setDishes(prev);
    }
  }

  // Inventory calculations
  type InventoryRow = {
    ma_nguyen_lieu: string;
    ten_nguyen_lieu: string | null;
    nguon_nhap: string | null;
    need_qty: number; // count-based
    need_weight: number; // kg or unit weight based on schema
    stock_qty: number; // nguyen_lieu.ton_kho_so_luong
    stock_weight: number; // nguyen_lieu.ton_kho_khoi_luong
    unit_price: number; // best-effort extracted
    status: "in" | "low" | "out";
  };
  const [filterLowOnly, setFilterLowOnly] = useState(false);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [totalCalories, setTotalCalories] = useState<number>(0);

  useEffect(() => {
    (async () => {
      if (dishes.length === 0) {
        setInventory([]);
        return;
      }
      if (!supabase) {
        setInventory([]);
        return;
      }

      const dishIds = dishes
        .map((d) => d.ma_mon_an)
        .filter(Boolean) as string[];
      const { data: comps, error: compErr } = await supabase
        .from("thanh_phan")
        .select(
          "ma_mon_an, ma_nguyen_lieu, so_nguoi_an, khoi_luong_nguyen_lieu, so_luong_nguyen_lieu, luong_calo",
        )
        .in("ma_mon_an", dishIds);
      if (compErr) {
        console.error(compErr);
        setInventory([]);
        return;
      }

      // Sum requirements scaled by servings
      const needByIngredient = new Map<
        string,
        { need_qty: number; need_weight: number }
      >();
      let caloriesTotal = 0;
      type CompRow = {
        ma_mon_an: string | null;
        ma_nguyen_lieu: string | null;
        so_nguoi_an: number | null;
        khoi_luong_nguyen_lieu: number | null;
        so_luong_nguyen_lieu: number | null;
        luong_calo?: number | null;
      };
      for (const comp of (comps as CompRow[] | null) ?? []) {
        if (!comp.ma_nguyen_lieu) {
          continue;
        }
        const forDish = dishes.find((d) => d.ma_mon_an === comp.ma_mon_an);
        const basePeople = comp.so_nguoi_an ?? 1;
        const factor = (forDish?.boi_so ?? 1) / (basePeople || 1);
        const addQty = (comp.so_luong_nguyen_lieu ?? 0) * factor;
        const addWeight = (comp.khoi_luong_nguyen_lieu ?? 0) * factor;
        const prev = needByIngredient.get(comp.ma_nguyen_lieu) ?? {
          need_qty: 0,
          need_weight: 0,
        };
        needByIngredient.set(comp.ma_nguyen_lieu, {
          need_qty: prev.need_qty + addQty,
          need_weight: prev.need_weight + addWeight,
        });
        const calo = Number(comp.luong_calo ?? 0);
        if (!Number.isNaN(calo)) caloriesTotal += calo * factor;
      }

      const ids = Array.from(needByIngredient.keys()).filter(Boolean);
      if (ids.length === 0) {
        setInventory([]);
        return;
      }
      const { data: ings, error: ingErr } = await supabase!
        .from("nguyen_lieu")
        .select(
          "id, ten_nguyen_lieu, nguon_nhap, ton_kho_so_luong, ton_kho_khoi_luong, don_gia",
        )
        .in("id", ids);
      if (ingErr) {
        const maybe = ingErr as { message?: string } | undefined;
        console.warn(
          "Load nguyen_lieu failed:",
          maybe?.message ?? String(ingErr),
        );
        // Fallback: still render needs with unknown price and no stock info
        const rowsFallback: InventoryRow[] = ids.map((id) => {
          const need = needByIngredient.get(id)!;
          return {
            ma_nguyen_lieu: id,
            ten_nguyen_lieu: null,
            nguon_nhap: null,
            need_qty: Number(need.need_qty.toFixed(2)),
            need_weight: Number(need.need_weight.toFixed(2)),
            stock_qty: 0,
            stock_weight: 0,
            unit_price: 0,
            status: "in",
          };
        });
        setInventory(rowsFallback);
        setTotalCalories(Math.round(caloriesTotal));
        return;
      }

      type NguyenLieu = {
        id: string;
        ten_nguyen_lieu: string | null;
        nguon_nhap: string | null;
        ton_kho_so_luong: number | null;
        ton_kho_khoi_luong: number | null;
        don_gia?: number | null;
      };
      const rows: InventoryRow[] = ((ings as NguyenLieu[] | null) ?? []).map(
        (ing) => {
          const need = needByIngredient.get(ing.id)!;
          const stockQty = Number(ing.ton_kho_so_luong ?? 0);
          const stockWeight = Number(ing.ton_kho_khoi_luong ?? 0);
          const qtyOk = stockQty - need.need_qty;
          const weightOk = stockWeight - need.need_weight;
          let status: InventoryRow["status"] = "in";
          if (qtyOk < 0 || weightOk < 0) status = "out";
          else if (qtyOk < 1 && weightOk < 0.1) status = "low"; // heuristic threshold
          const unitPrice = Number(ing.don_gia ?? 0);
          return {
            ma_nguyen_lieu: ing.id,
            ten_nguyen_lieu: ing.ten_nguyen_lieu,
            nguon_nhap: ing.nguon_nhap,
            need_qty: Number(need.need_qty.toFixed(2)),
            need_weight: Number(need.need_weight.toFixed(2)),
            stock_qty: stockQty,
            stock_weight: stockWeight,
            unit_price: unitPrice,
            status,
          };
        },
      );
      setInventory(rows);
      setTotalCalories(Math.round(caloriesTotal));
    })();
  }, [dishes]);

  // Calculate today's total calories if available on mon_an table
  useEffect(() => {
    (async () => {
      if (dishes.length === 0) {
        setTotalCalories(0);
        return;
      }
      if (!supabase) {
        setTotalCalories(0);
        return;
      }

      const ids = dishes.map((d) => d.ma_mon_an).filter(Boolean) as string[];
      if (ids.length === 0) {
        setTotalCalories(0);
        return;
      }
      const { data } = await supabase
        .from("mon_an")
        .select("id, calo, calories, kcal")
        .in("id", ids);
      const map = new Map<string, number>();
      type CaloriesRow = {
        id: string;
        calo?: number | null;
        calories?: number | null;
        kcal?: number | null;
      };
      for (const r of (data as CaloriesRow[] | null) ?? []) {
        const val = Number(r.calo ?? r.calories ?? r.kcal ?? 0);
        map.set(r.id, Number.isNaN(val) ? 0 : val);
      }
      let total = 0;
      for (const d of dishes) {
        const per = map.get(d.ma_mon_an || "") ?? 0;
        total += per * (d.boi_so || 1);
      }
      setTotalCalories(Math.round(total));
    })();
  }, [dishes]);

  return (
    <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold" suppressHydrationWarning>
          {label}
        </h1>
        <Link
          href="/app"
          className="inline-flex items-center px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
        >
          {t("backToCalendar")}
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 hover:bg-muted shadow-sm transition"
          onClick={() => setShowCalories((v) => !v)}
        >
          {t("whatToEatToday")}
        </button>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 hover:bg-muted shadow-sm transition"
          onClick={() => setShowShopping((v) => !v)}
        >
          {t("shoppingListToday")}
        </button>
        <button
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-white dark:bg-slate-800 hover:bg-muted shadow-sm transition"
          onClick={async () => {
            setShowRestock(true);
            setMonthPlanLoading(true);
            try {
              if (!supabase) {
                setMonthPlan([]);
                return;
              }

              // Calculate first/last day of current month
              const start = new Date(date.getFullYear(), date.getMonth(), 1);
              const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
              const from = start.toISOString().slice(0, 10);
              const to = end.toISOString().slice(0, 10);
              // Load all thuc_don in month
              const { data: td } = await supabase
                .from("thuc_don")
                .select("ngay, ma_mon_an, boi_so")
                .gte("ngay", from)
                .lte("ngay", to);
              const byDish = new Map<string, number>();
              type TDRow = { ma_mon_an: string | null; boi_so: number | null };
              for (const r of (td as TDRow[] | null) ?? []) {
                const key = String(r.ma_mon_an);
                byDish.set(key, (byDish.get(key) ?? 0) + Number(r.boi_so ?? 1));
              }
              const dishIds = Array.from(byDish.keys());
              if (dishIds.length === 0) {
                setMonthPlan([]);
                return;
              }
              // Fetch components for all dishes
              const { data: comps } = await supabase!
                .from("thanh_phan")
                .select(
                  "ma_mon_an, ma_nguyen_lieu, so_nguoi_an, so_luong_nguyen_lieu, khoi_luong_nguyen_lieu",
                )
                .in("ma_mon_an", dishIds);
              const needByIng = new Map<
                string,
                { qty: number; weight: number }
              >();
              type CompAllRow = {
                ma_mon_an: string | null;
                ma_nguyen_lieu: string | null;
                so_nguoi_an: number | null;
                so_luong_nguyen_lieu: number | null;
                khoi_luong_nguyen_lieu: number | null;
              };
              for (const c of (comps as CompAllRow[] | null) ?? []) {
                const servings = byDish.get(String(c.ma_mon_an)) ?? 0;
                const base = Number(c.so_nguoi_an ?? 1) || 1;
                const factor = servings / base;
                const addQty =
                  (Number(c.so_luong_nguyen_lieu ?? 0) || 0) * factor;
                const addWeight =
                  (Number(c.khoi_luong_nguyen_lieu ?? 0) || 0) * factor;
                const prev = needByIng.get(String(c.ma_nguyen_lieu)) ?? {
                  qty: 0,
                  weight: 0,
                };
                needByIng.set(String(c.ma_nguyen_lieu), {
                  qty: prev.qty + addQty,
                  weight: prev.weight + addWeight,
                });
              }
              const ingIds = Array.from(needByIng.keys());
              const { data: ings } = await supabase!
                .from("nguyen_lieu")
                .select("id, ten_nguyen_lieu, nguon_nhap, don_gia")
                .in("id", ingIds);
              const groups = new Map<
                string,
                {
                  total: number;
                  items: Array<{
                    id: string;
                    name: string | null;
                    need_qty: number;
                    need_weight: number;
                    unit_price: number;
                    cost: number;
                  }>;
                }
              >();
              type IngRow = {
                id: string;
                ten_nguyen_lieu: string | null;
                nguon_nhap: string | null;
                don_gia?: number | null;
              };
              for (const ing of (ings as IngRow[] | null) ?? []) {
                const need = needByIng.get(String(ing.id)) ?? {
                  qty: 0,
                  weight: 0,
                };
                const unit = Number(ing.don_gia ?? 0);
                const cost = unit * (need.weight > 0 ? need.weight : need.qty);
                const sup = String(ing.nguon_nhap ?? "Khác");
                const g = groups.get(sup) ?? { total: 0, items: [] };
                g.items.push({
                  id: String(ing.id),
                  name: ing.ten_nguyen_lieu ?? null,
                  need_qty: Number(need.qty.toFixed(2)),
                  need_weight: Number(need.weight.toFixed(2)),
                  unit_price: unit,
                  cost,
                });
                g.total += cost;
                groups.set(sup, g);
              }
              setMonthPlan(
                Array.from(groups.entries()).map(([supplier, g]) => ({
                  supplier,
                  total: g.total,
                  items: g.items,
                })),
              );
            } finally {
              setMonthPlanLoading(false);
            }
          }}
        >
          {t("restockPlanMonth")}
        </button>
      </div>

      {showCalories && (
        <div className="rounded-xl border border-border p-4 bg-white dark:bg-slate-800 shadow-sm">
          <div className="font-semibold mb-1">{t("todayCalories")}</div>
          <div className="text-3xl font-bold">
            {totalCalories.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            (Tính theo luong_calo trong bảng thanh_phan)
          </div>
        </div>
      )}

      {showShopping && (
        <div className="rounded-xl border border-border p-4 bg-white dark:bg-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold mb-3">
            {t("shoppingListToday")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-muted/50">
                  <th className="py-1 pr-3">{t("ingredientsForDay")}</th>
                  <th className="py-1 pr-3">{t("quantity")}</th>
                  <th className="py-1 pr-3">{t("weight")}</th>
                  <th className="py-1 pr-3">{t("price")}</th>
                  <th className="py-1 pr-3">{t("total")}</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((row, idx) => {
                  const unit = row.unit_price || 0;
                  const cost =
                    unit *
                    (row.need_weight > 0 ? row.need_weight : row.need_qty);
                  return (
                    <tr
                      key={row.ma_nguyen_lieu}
                      className={idx % 2 ? "bg-muted/30" : ""}
                    >
                      <td className="py-1 pr-3">
                        {row.ten_nguyen_lieu ?? row.ma_nguyen_lieu}
                      </td>
                      <td className="py-1 pr-3">{row.need_qty}</td>
                      <td className="py-1 pr-3">{row.need_weight}</td>
                      <td className="py-1 pr-3">
                        {unit
                          ? unit.toLocaleString()
                          : "Chưa nhập/cố định đơn giá"}
                      </td>
                      <td className="py-1 pr-3">{cost.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-right font-semibold mt-3">
            {t("total")}:{" "}
            {inventory
              .reduce(
                (s, r) =>
                  s +
                  (r.unit_price || 0) *
                    (r.need_weight > 0 ? r.need_weight : r.need_qty),
                0,
              )
              .toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            (Đơn giá lấy từ nguyen_lieu.don_gia)
          </div>
        </div>
      )}

      {showRestock && (
        <div className="rounded-xl border border-border p-4 bg-white dark:bg-slate-800 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">
            {t("restockPlanMonth")}
          </h3>
          <div className="text-sm mb-2">
            Báo cáo tổng hợp cho toàn bộ tháng hiện tại, nhóm theo nhà cung cấp.
          </div>
          {monthPlanLoading ? (
            <div className="text-sm text-muted-foreground">
              Đang tổng hợp...
            </div>
          ) : monthPlan.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Chưa có dữ liệu trong tháng.
            </div>
          ) : (
            <div className="space-y-4">
              {monthPlan.map((group) => (
                <div
                  key={group.supplier}
                  className="rounded-lg border border-border"
                >
                  <div className="px-3 py-2 border-b border-border font-semibold flex items-center justify-between">
                    <span>{group.supplier}</span>
                    <span>
                      {t("total")}: {group.total.toLocaleString()}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left bg-muted/50">
                          <th className="py-1 pr-3">
                            {t("ingredientsForDay")}
                          </th>
                          <th className="py-1 pr-3">{t("quantity")}</th>
                          <th className="py-1 pr-3">{t("weight")}</th>
                          <th className="py-1 pr-3">{t("price")}</th>
                          <th className="py-1 pr-3">{t("total")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((it, idx) => (
                          <tr
                            key={it.id}
                            className={idx % 2 ? "bg-muted/30" : ""}
                          >
                            <td className="py-1 pr-3">{it.name ?? it.id}</td>
                            <td className="py-1 pr-3">{it.need_qty}</td>
                            <td className="py-1 pr-3">{it.need_weight}</td>
                            <td className="py-1 pr-3">
                              {it.unit_price
                                ? it.unit_price.toLocaleString()
                                : "Chưa nhập/cố định đơn giá"}
                            </td>
                            <td className="py-1 pr-3">
                              {it.cost.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              <div className="text-right font-semibold">
                Tổng cộng:{" "}
                {monthPlan.reduce((s, g) => s + g.total, 0).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          className={`inline-flex items-center px-3 py-2 rounded-lg border border-border hover:bg-muted transition ${tab === "menu" ? "bg-muted" : ""}`}
          onClick={() => setTab("menu")}
        >
          {t("todaysMenuTab")}
        </button>
        <button
          className={`inline-flex items-center px-3 py-2 rounded-lg border border-border hover:bg-muted transition ${tab === "inventory" ? "bg-muted" : ""}`}
          onClick={() => setTab("inventory")}
        >
          {t("inventoryTab")}
        </button>
        <button
          className={`inline-flex items-center px-3 py-2 rounded-lg border border-border hover:bg-muted transition ${tab === "add" ? "bg-muted" : ""}`}
          onClick={() => setTab("add")}
        >
          {t("addNewDishTab")}
        </button>
      </div>

      {tab === "menu" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{t("dishes")}</h2>
            <button
              className="px-3 py-1 rounded border"
              onClick={() => setTab("add")}
            >
              {t("addDish")}
            </button>
          </div>
          <div className="grid gap-3">
            {dishes.length === 0 && (
              <div className="rounded-xl border border-border p-3 text-sm text-muted-foreground bg-white dark:bg-slate-800 shadow-sm">
                {t("noDishesYet")}
              </div>
            )}
            {dishes.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border border-border p-4 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition"
              >
                <div className="font-medium">
                  {d.ten_mon_an ?? t("unnamedDish")}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("servingsLabel")}: {d.boi_so} • {t("notesLabel")}:{" "}
                  {d.ghi_chu ?? "-"}
                </div>
                <div className="flex gap-2 mt-2 items-center">
                  <input
                    type="number"
                    min={1}
                    className="rounded-lg border border-border px-3 py-2 w-24 bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={d.boi_so}
                    onChange={(e) =>
                      handleEdit(d.id, { boi_so: Number(e.target.value) || 1 })
                    }
                  />
                  <input
                    className="rounded-lg border border-border px-3 py-2 bg-background flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={t("notesLabel")}
                    value={d.ghi_chu ?? ""}
                    onChange={(e) =>
                      handleEdit(d.id, { ghi_chu: e.target.value })
                    }
                  />
                  <button
                    className="inline-flex items-center px-3 py-2 rounded-lg border border-border hover:bg-muted transition"
                    onClick={() => handleDelete(d.id)}
                  >
                    {t("delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-white dark:bg-slate-800 shadow-sm p-3 flex items-center justify-between">
            <div className="text-sm">
              {t("totalDishesLabel")}: {dishes.length}
            </div>
            <div className="text-sm">
              {t("totalServingsLabel")}:{" "}
              {dishes.reduce((a, b) => a + (b.boi_so || 0), 0)}
            </div>
            <div className="text-sm">
              {t("totalCaloriesLabel")}: {totalCalories.toLocaleString()}
            </div>
          </div>
        </section>
      )}

      {tab === "inventory" && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{t("ingredientsForDay")}</h2>
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filterLowOnly}
                  onChange={(e) => setFilterLowOnly(e.target.checked)}
                />{" "}
                {t("showLowOnly")}
              </label>
            </div>
          </div>
          <div className="grid gap-3">
            {inventory
              .filter((r) => !filterLowOnly || r.status !== "in")
              .map((row) => (
                <div
                  key={row.ma_nguyen_lieu}
                  className="rounded border p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">
                      {row.ten_nguyen_lieu ?? row.ma_nguyen_lieu}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {row.nguon_nhap ?? t("unknownSource")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("qtyWeightNeedStock")
                        .replace("{need}", String(row.need_qty))
                        .replace("{stock}", String(row.stock_qty))
                        .replace("{wneed}", String(row.need_weight))
                        .replace("{wstock}", String(row.stock_weight))}
                    </div>
                  </div>
                  <div
                    className={`text-xs px-2 py-1 rounded ${row.status === "out" ? "bg-red-500/20 text-red-700 dark:text-red-300" : row.status === "low" ? "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300" : "bg-green-500/20 text-green-700 dark:text-green-300"}`}
                  >
                    {row.status === "in"
                      ? t("inStock")
                      : row.status === "low"
                        ? t("low")
                        : t("outOfStock")}
                  </div>
                </div>
              ))}
            {inventory.length === 0 && (
              <div className="rounded border p-3 text-sm text-muted-foreground">
                {t("noIngredients")}
              </div>
            )}
          </div>
          <div className="rounded border p-3 text-sm">
            {t("alerts")}:{" "}
            {inventory.some((i) => i.status !== "in")
              ? t("attentionNeeded")
              : t("allGood")}
          </div>
        </section>
      )}

      {tab === "add" && (
        <section className="space-y-4">
          <h2 className="font-medium">{t("addNewDishTab")}</h2>
          <div className="grid gap-3 max-w-md">
            <select
              className="rounded border p-2"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">{t("selectDish")}</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.ten_mon_an ?? o.id}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              className="rounded border p-2"
              placeholder={t("servingsMultiplier")}
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value) || 1)}
            />
            <input
              className="rounded border p-2"
              placeholder={t("notesLabel")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="rounded border p-3 text-sm text-muted-foreground">
              {t("ingredientsPreview")}
            </div>
            <button
              className="px-3 py-1 rounded border"
              disabled={saving || !selected}
              onClick={handleAdd}
            >
              {saving ? t("adding") : t("addToMenu")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
