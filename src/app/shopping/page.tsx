"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Download, ShoppingCart } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";

type Ingredient = {
  id: string;
  ten_nguyen_lieu: string;
  nguon_nhap?: string | null;
  ton_kho_so_luong?: number | null;
  ton_kho_khoi_luong?: number | null;
};

type Grouped = Record<string, Ingredient[]>;

export default function ShoppingPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [purchasingIds, setPurchasingIds] = useState<Set<string>>(new Set());
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [copiedModal, setCopiedModal] = useState(false);
  const [copyZooming, setCopyZooming] = useState(false);

  // Normalize source key to avoid duplicate groups due to casing/spacing/diacritics variations
  const normalizeSourceKey = (src: string) =>
    (src || "")
      .normalize("NFC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[\u0300-\u036f]/g, "");

  // Optional aliases to collapse common variants to a preferred display label
  const SOURCE_ALIASES: Record<string, string> = {
    // keys must be normalized by normalizeSourceKey
    [normalizeSourceKey("Co.opmart")]: "Co.opmart",
    [normalizeSourceKey("Coopmart")]: "Co.opmart",
    [normalizeSourceKey("Co.op mart")]: "Co.opmart",
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!supabase) {
          throw new Error("Supabase chưa được cấu hình. Vui lòng thiết lập biến môi trường.");
        }
        const { data, error } = await supabase
          .from("nguyen_lieu")
          .select("id, ten_nguyen_lieu, nguon_nhap, ton_kho_so_luong, ton_kho_khoi_luong")
          .order("ten_nguyen_lieu", { ascending: true });
        if (error) throw error;
        setIngredients((data || []) as Ingredient[]);
      } catch (e) {
        logger.error("Fetch shopping data error", e);
        setError(e instanceof Error ? e.message : "Lỗi không xác định");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const needBuy = useMemo(() => {
    return ingredients.filter((ing) => {
      const qty = Number(ing.ton_kho_so_luong || 0);
      const wgt = Number(ing.ton_kho_khoi_luong || 0);
      const value = Math.max(qty, wgt);
      // Đồng bộ với trang Kho: 0 = hết, 1..5 = sắp hết
      return value === 0 || (value >= 1 && value <= 5);
    });
  }, [ingredients]);

  const groupedBySource: Grouped = useMemo(() => {
    // Group by normalized key, but keep a nice display label for UI
    const byKey: Record<string, { label: string; items: Ingredient[] }> = {};
    for (const ing of needBuy) {
      const original = (ing.nguon_nhap || "Nguồn chưa rõ");
      const labelCandidate = original.trim() || "Nguồn chưa rõ";
      const key = normalizeSourceKey(labelCandidate);
      const displayLabel = SOURCE_ALIASES[key] || labelCandidate;
      if (!byKey[key]) byKey[key] = { label: displayLabel, items: [] };
      byKey[key].items.push(ing);
    }
    // Collapse into Record<label, items>
    const result: Grouped = {};
    for (const bucket of Object.values(byKey)) {
      if (!result[bucket.label]) result[bucket.label] = [];
      result[bucket.label].push(...bucket.items);
    }
    return result;
  }, [needBuy]);

  const allIds = useMemo(() => new Set(needBuy.map((i) => i.id)), [needBuy]);

  const toggleSource = (src: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(src)) next.delete(src);
      else next.add(src);
      return next;
    });
  };

  const toggleItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSourceAll = (src: string) => {
    const ids = (groupedBySource[src] || []).map((i) => i.id);
    const allSelected = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(allIds));
  const clearAll = () => setSelectedIds(new Set());

  const toPlainList = () => {
    const lines: string[] = [];
    for (const [src, list] of Object.entries(groupedBySource)) {
      const chosen = list.filter((i) => selectedIds.has(i.id));
      if (chosen.length === 0) continue;
      lines.push(`# ${src}`);
      for (const ing of chosen) {
        lines.push(`- ${ing.ten_nguyen_lieu}`);
      }
      lines.push("");
    }
    return lines.join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toPlainList());
      setCopiedModal(true);
      setCopyZooming(true);
      window.setTimeout(() => setCopyZooming(false), 800);
    } catch (_) {
      alert("Sao chép thất bại");
    }
  };

  const handleExportCsv = () => {
    const rows: string[] = ["Nguồn,Nguyên liệu"];
    for (const [src, list] of Object.entries(groupedBySource)) {
      for (const ing of list) {
        if (!selectedIds.has(ing.id)) continue;
        rows.push(`${src},${ing.ten_nguyen_lieu}`);
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shopping-list.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // removed print feature per request

  const getDefaultSuggestion = (ing: Ingredient) => {
    const qty = Number(ing.ton_kho_so_luong || 0);
    const wgt = Number(ing.ton_kho_khoi_luong || 0);
    const value = Math.max(qty, wgt);
    // Fixed target for suggestion to keep storage page simple
    const targetLevel = 3;
    return value === 0 ? 1 : Math.max(1, targetLevel - value);
  };

  const getMode = (ing: Ingredient): "quantity" | "weight" => {
    const hasQtyCol = ing.ton_kho_so_luong !== null && ing.ton_kho_so_luong !== undefined;
    return hasQtyCol ? "quantity" : "weight";
  };

  const purchaseOne = async (ing: Ingredient) => {
    try {
      setPurchasingIds(prev => new Set(prev).add(ing.id));
      const amount = Math.max(1, Number(qtyById[ing.id] ?? getDefaultSuggestion(ing)) || 1);
      const mode = getMode(ing);
      const res = await fetch(`/api/ingredients/${ing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, mode, op: 'increase' })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại');

      setIngredients(prev => prev.map(i => {
        if (i.id !== ing.id) return i;
        if (mode === 'quantity') {
          const cur = Number(i.ton_kho_so_luong || 0);
          return { ...i, ton_kho_so_luong: cur + amount } as Ingredient;
        } else {
          const cur = Number(i.ton_kho_khoi_luong || 0);
          return { ...i, ton_kho_khoi_luong: cur + amount } as Ingredient;
        }
      }));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(ing.id); return n; });
      setPurchasedIds(prev => new Set(prev).add(ing.id));
    } catch (e) {
      logger.error('purchaseOne error', e);
      alert(e instanceof Error ? e.message : 'Cập nhật thất bại');
    } finally {
      setPurchasingIds(prev => { const n = new Set(prev); n.delete(ing.id); return n; });
    }
  };

  const purchaseSource = async (src: string) => {
    const list = (groupedBySource[src] || []).filter(i => selectedIds.has(i.id));
    for (const ing of list) {
      // eslint-disable-next-line no-await-in-loop
      await purchaseOne(ing);
    }
  };

  const totalBySource = useMemo(() => {
    return Object.entries(groupedBySource).map(([src, list]) => ({ src, count: list.length }));
  }, [groupedBySource]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="py-8 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Danh sách mua sắm</h1>
              <p className="text-gray-600 mt-1">Tự động tổng hợp theo tồn kho và nguồn nhập</p>
            </div>
          </div>

          {/* Summary + Actions */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xs text-gray-500">Nguồn</div>
                  <div className="text-lg font-semibold text-gray-900">{totalBySource.length}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Nguyên liệu</div>
                  <div className="text-lg font-semibold text-gray-900">{needBuy.length}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Đã chọn</div>
                  <div className="text-lg font-semibold text-blue-600">{Array.from(selectedIds).length}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-start md:justify-end">
              <button onClick={selectAll} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">Chọn tất cả</button>
              <button onClick={clearAll} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">Bỏ chọn</button>
              <button onClick={handleCopy} className="inline-flex items-center space-x-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
              <Copy className="h-4 w-4" /><span>Sao chép</span>
            </button>
              <button onClick={handleExportCsv} className="inline-flex items-center space-x-2 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
              <Download className="h-4 w-4" /><span>Xuất CSV</span>
            </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        ) : needBuy.length === 0 ? (
          <div className="p-12 text-center">
            <Check className="h-10 w-10 text-green-600 mx-auto mb-3" />
            <p className="text-gray-600">Kho hiện đủ, không cần mua thêm.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedBySource).map(([src, list]) => {
              const isExpanded = expandedSources.has(src);
              const display = isExpanded ? list : list.slice(0, 5);
              const allSelected = list.every((i) => selectedIds.has(i.id));

              return (
                <div key={src} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                  <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-700 rounded-t-xl bg-gray-50 dark:bg-slate-800/60">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{src}</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">{list.length} nguyên liệu</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 select-none">
                        <input className="scale-110" type="checkbox" checked={allSelected} onChange={() => toggleSourceAll(src)} />
                        Chọn nguồn này
                      </label>
                      <button
                        className="px-3 py-1.5 text-sm rounded-lg border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
                        onClick={() => purchaseSource(src)}
                        disabled={(groupedBySource[src] || []).every(i => !selectedIds.has(i.id))}
                      >
                        Đã mua tất cả đã chọn
                      </button>
                    </div>
                  </div>

                  <div className="px-2 sm:px-4 pb-2 divide-y divide-gray-100 dark:divide-slate-700/70">
                    {display.map((ing) => {
                      const qty = Number(ing.ton_kho_so_luong || 0);
                      const wgt = Number(ing.ton_kho_khoi_luong || 0);
                      const value = Math.max(qty, wgt);
                      const checked = selectedIds.has(ing.id);
                      return (
                        <div key={ing.id} className="py-2 sm:py-3 flex items-center justify-between gap-4 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 px-2 sm:px-3">
                          <label className="flex flex-wrap items-center gap-2 sm:gap-3 cursor-pointer min-w-0 flex-1">
                            <input className="scale-110" type="checkbox" checked={checked} onChange={() => toggleItem(ing.id)} />
                            <span className="font-medium text-gray-900 dark:text-white whitespace-normal break-words leading-snug min-w-0">
                              {ing.ten_nguyen_lieu}
                            </span>
                          </label>
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <span className="hidden sm:inline text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300">Tồn: {value}</span>
                            <div className="inline-flex items-center border border-gray-300 dark:border-gray-600 rounded overflow-hidden">
                              <button
                                type="button"
                                className="px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 select-none text-gray-700 dark:text-gray-200"
                                onClick={() => setQtyById((prev) => ({ ...prev, [ing.id]: Math.max(1, Number((prev[ing.id] ?? getDefaultSuggestion(ing))) - 1) }))}
                                aria-label="Giảm"
                              >
                                −
                              </button>
                              <span className="w-10 text-center text-sm text-gray-900 dark:text-white">
                                {qtyById[ing.id] ?? getDefaultSuggestion(ing)}
                              </span>
                              <button
                                type="button"
                                className="px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 select-none text-gray-700 dark:text-gray-200"
                                onClick={() => setQtyById((prev) => ({ ...prev, [ing.id]: Math.max(1, Number((prev[ing.id] ?? getDefaultSuggestion(ing))) + 1) }))}
                                aria-label="Tăng"
                              >
                                +
                              </button>
                            </div>
                            <button
                              className={`px-2.5 py-1.5 sm:px-3 text-sm rounded-lg text-white hover:opacity-90 disabled:opacity-50 ${
                                purchasingIds.has(ing.id) 
                                  ? 'bg-gray-500' 
                                  : purchasedIds.has(ing.id) 
                                    ? 'bg-green-600 hover:bg-green-700' 
                                    : 'bg-red-600 hover:bg-red-700'
                              }`}
                              onClick={() => purchaseOne(ing)}
                              disabled={purchasingIds.has(ing.id)}
                            >
                              {purchasingIds.has(ing.id) ? 'Đang cập nhật...' : purchasedIds.has(ing.id) ? 'Đã mua' : 'Mua'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {list.length > 5 && (
                      <div className="pt-3 text-center">
                        <button className="text-blue-600 text-sm" onClick={() => toggleSource(src)}>
                          {isExpanded ? "Thu gọn" : `Xem thêm ${list.length - 5}`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Copy Modal (mobile-friendly) */}
      {copiedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-sm p-6 text-center pop-in">
            <div className={`mx-auto mb-3 h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center ${copyZooming ? 'pulse-once' : ''}` }>
              <svg
                className="h-8 w-8 text-emerald-600"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900">Đã sao chép danh sách</h3>
            <p className="mt-1 text-sm text-gray-600">Bạn có thể dán vào Zalo/Notes/Email.</p>
            <div className="mt-5">
              <button
                className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => setCopiedModal(false)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


