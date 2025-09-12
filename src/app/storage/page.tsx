"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Ingredient = {
  id: string;
  ten_nguyen_lieu: string | null;
  nguon_nhap: string | null;
  ton_kho_so_luong: number | null;
  ton_kho_khoi_luong: number | null;
  don_gia?: number | null;
};

export default function StoragePage() {
  const [rows, setRows] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("nguyen_lieu")
        .select("id, ten_nguyen_lieu, nguon_nhap, ton_kho_so_luong, ton_kho_khoi_luong, don_gia")
        .order("ten_nguyen_lieu", { ascending: true });
      if (error) {
        console.warn('Load nguyen_lieu failed:', (error as any)?.message ?? error);
        setRows([]);
      } else {
        setRows(((data as Ingredient[] | null) ?? []) as Ingredient[]);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r => (r.ten_nguyen_lieu ?? "").toLowerCase().includes(s) || String(r.id).toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold">Kho nguyên liệu</h2>
        <input
          className="rounded-lg border border-border px-3 py-2 bg-background w-64"
          placeholder="Tìm nguyên liệu..."
          value={q}
          onChange={(e)=>setQ(e.target.value)}
        />
      </div>

      <div className="rounded-xl border border-border bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Đang tải...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-muted/50">
                  <th className="py-2 px-3">ID</th>
                  <th className="py-2 px-3">Tên nguyên liệu</th>
                  <th className="py-2 px-3">Nhà cung cấp</th>
                  <th className="py-2 px-3">Tồn SL</th>
                  <th className="py-2 px-3">Tồn KL</th>
                  <th className="py-2 px-3">Đơn giá</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={r.id} className={idx % 2 ? "bg-muted/30" : ""}>
                    <td className="py-2 px-3">{r.id}</td>
                    <td className="py-2 px-3">{r.ten_nguyen_lieu ?? "—"}</td>
                    <td className="py-2 px-3">{r.nguon_nhap ?? "—"}</td>
                    <td className="py-2 px-3">{Number(r.ton_kho_so_luong ?? 0)}</td>
                    <td className="py-2 px-3">{Number(r.ton_kho_khoi_luong ?? 0)}</td>
                    <td className="py-2 px-3">{r.don_gia ? Number(r.don_gia).toLocaleString() : "Chưa nhập/cố định đơn giá"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground">Không có nguyên liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
