"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Copy, Download, ShoppingCart, Package, Store, Plus, Minus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    // Optional aliases to collapse common variants to a preferred display label
    const SOURCE_ALIASES: Record<string, string> = {
      // keys must be normalized by normalizeSourceKey
      [normalizeSourceKey("Co.opmart")]: "Co.opmart",
      [normalizeSourceKey("Coopmart")]: "Co.opmart",
      [normalizeSourceKey("Co.op mart")]: "Co.opmart",
    };
    
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
    } catch {
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
    // Always return 1 as requested
    return 1;
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
      // Remove from selected but keep in purchased for visual feedback
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
    if (list.length === 0) return;
    
    try {
      // Mark all items as purchasing
      setPurchasingIds(prev => {
        const next = new Set(prev);
        list.forEach(ing => next.add(ing.id));
        return next;
      });

      // Prepare all purchase requests
      const purchasePromises = list.map(async (ing) => {
        const amount = Math.max(1, Number(qtyById[ing.id] ?? getDefaultSuggestion(ing)) || 1);
        const mode = getMode(ing);
        
        const res = await fetch(`/api/ingredients/${ing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, mode, op: 'increase' })
        });
        
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Cập nhật thất bại');
        
        return { ing, amount, mode };
      });

      // Execute all purchases simultaneously
      const results = await Promise.all(purchasePromises);

      // Update ingredients state with all results
      setIngredients(prev => prev.map(i => {
        const result = results.find(r => r.ing.id === i.id);
        if (!result) return i;
        
        if (result.mode === 'quantity') {
          const cur = Number(i.ton_kho_so_luong || 0);
          return { ...i, ton_kho_so_luong: cur + result.amount } as Ingredient;
        } else {
          const cur = Number(i.ton_kho_khoi_luong || 0);
          return { ...i, ton_kho_khoi_luong: cur + result.amount } as Ingredient;
        }
      }));

      // Remove from selected and mark as purchased
      setSelectedIds(prev => {
        const next = new Set(prev);
        list.forEach(ing => next.delete(ing.id));
        return next;
      });
      
      setPurchasedIds(prev => {
        const next = new Set(prev);
        list.forEach(ing => next.add(ing.id));
        return next;
      });

    } catch (e) {
      logger.error('purchaseSource error', e);
      alert(e instanceof Error ? e.message : 'Cập nhật thất bại');
    } finally {
      // Clear purchasing state
      setPurchasingIds(prev => {
        const next = new Set(prev);
        list.forEach(ing => next.delete(ing.id));
        return next;
      });
    }
  };

  const totalBySource = useMemo(() => {
    return Object.entries(groupedBySource).map(([src, list]) => ({ src, count: list.length }));
  }, [groupedBySource]);

  return (
    <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-4">
            <div className="p-4 gradient-primary rounded-3xl shadow-soft">
              <ShoppingCart className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-sage-600 to-wood-600 bg-clip-text text-transparent">
                Danh sách mua sắm
              </h1>
              <p className="text-muted-foreground">
                Tự động tổng hợp theo tồn kho và nguồn nhập
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="culinary" className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Nguồn nhập</p>
                  <p className="text-2xl font-bold text-foreground">{totalBySource.length}</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-sage-500 to-sage-600 shadow-soft">
                  <Store className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="culinary" className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Nguyên liệu</p>
                  <p className="text-2xl font-bold text-foreground">{needBuy.length}</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-mint-500 to-mint-600 shadow-soft">
                  <Package className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="culinary" className="hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Đã chọn</p>
                  <p className="text-2xl font-bold text-foreground">{Array.from(selectedIds).length}</p>
                </div>
                <div className="p-3 rounded-2xl bg-gradient-to-br from-wood-500 to-wood-600 shadow-soft">
                  <Check className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 justify-center">
          <Button variant="outline" onClick={selectAll} size="sm">
            Chọn tất cả
          </Button>
          <Button variant="outline" onClick={clearAll} size="sm">
            Bỏ chọn
          </Button>
          <Button variant="default" onClick={handleCopy} size="sm" className="inline-flex items-center gap-2">
            <Copy className="h-4 w-4" />
            Sao chép
          </Button>
          <Button variant="secondary" onClick={handleExportCsv} size="sm" className="inline-flex items-center gap-2">
            <Download className="h-4 w-4" />
            Xuất CSV
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sage-600 mx-auto mb-4" />
            <p className="text-muted-foreground">Đang tải dữ liệu...</p>
          </div>
        ) : error ? (
          <Card variant="modern" className="border-red-200 dark:border-red-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : needBuy.length === 0 ? (
          <Card variant="modern" className="border-green-200 dark:border-green-800">
            <CardContent className="p-12 text-center">
              <div className="p-4 rounded-full bg-green-100 dark:bg-green-900/30 w-fit mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Kho đủ nguyên liệu</h3>
              <p className="text-muted-foreground">Hiện tại không cần mua thêm nguyên liệu nào.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedBySource).map(([src, list]) => {
              const isExpanded = expandedSources.has(src);
              const display = isExpanded ? list : list.slice(0, 5);
              const allSelected = list.every((i) => selectedIds.has(i.id));

              return (
                <Card key={src} variant="modern" className="hover-lift">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-sage-100 dark:bg-sage-900/30">
                          <Store className="h-4 w-4 text-sage-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{src}</CardTitle>
                          <p className="text-sm text-muted-foreground">{list.length} nguyên liệu</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-muted-foreground flex items-center gap-2 select-none cursor-pointer">
                          <input className="scale-110" type="checkbox" checked={allSelected} onChange={() => toggleSourceAll(src)} />
                          Chọn tất cả
                        </label>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => purchaseSource(src)}
                          disabled={(groupedBySource[src] || []).every(i => !selectedIds.has(i.id))}
                        >
                          Mua nguồn này
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    {display.map((ing) => {
                      const qty = Number(ing.ton_kho_so_luong || 0);
                      const wgt = Number(ing.ton_kho_khoi_luong || 0);
                      const value = Math.max(qty, wgt);
                      const checked = selectedIds.has(ing.id);
                      const currentQty = qtyById[ing.id] ?? getDefaultSuggestion(ing);
                      
                      return (
                        <div key={ing.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-sage-200/50 dark:border-sage-700/50 hover:bg-sage-50/50 dark:hover:bg-sage-900/20 transition-all duration-300">
                          <label className="flex items-center gap-3 cursor-pointer min-w-0 flex-1">
                            <input 
                              className="scale-110 accent-sage-600" 
                              type="checkbox" 
                              checked={checked} 
                              onChange={() => toggleItem(ing.id)} 
                            />
                            <div>
                              <span className="font-medium text-foreground whitespace-normal break-words leading-snug">
                                {ing.ten_nguyen_lieu}
                              </span>
                              <div className="text-xs text-muted-foreground mt-1">
                                Tồn kho: {value}
                              </div>
                            </div>
                          </label>
                          
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="flex items-center gap-2 bg-sage-100 dark:bg-sage-900/30 rounded-xl p-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setQtyById((prev) => ({ ...prev, [ing.id]: Math.max(1, currentQty - 1) }))}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium text-foreground min-w-[2rem] text-center">
                                {currentQty}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setQtyById((prev) => ({ ...prev, [ing.id]: Math.min(25, currentQty + 1) }))}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <Button
                              variant={purchasedIds.has(ing.id) ? "secondary" : "default"}
                              size="sm"
                              onClick={() => purchaseOne(ing)}
                              disabled={purchasingIds.has(ing.id) || purchasedIds.has(ing.id)}
                              className="min-w-[80px]"
                            >
                              {purchasingIds.has(ing.id) ? 'Đang cập nhật...' : purchasedIds.has(ing.id) ? 'Đã mua' : 'Mua'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    
                    {list.length > 5 && (
                      <div className="pt-3 text-center">
                        <Button variant="ghost" onClick={() => toggleSource(src)} size="sm">
                          {isExpanded ? "Thu gọn" : `Xem thêm ${list.length - 5} nguyên liệu`}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

      {/* Copy Modal */}
      {copiedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sage-900/30 backdrop-blur-md">
          <div className="glass-card rounded-3xl shadow-glass w-[90%] max-w-sm p-6 text-center animate-scale-in">
            <div className={`mx-auto mb-4 h-16 w-16 rounded-full bg-mint-100 dark:bg-mint-900/30 flex items-center justify-center ${copyZooming ? 'animate-pulse' : ''}`}>
              <Check className="h-8 w-8 text-mint-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Đã sao chép danh sách</h3>
            <p className="text-sm text-muted-foreground mb-6">Bạn có thể dán vào Zalo/Notes/Email.</p>
            <Button
              variant="default"
              className="w-full"
              onClick={() => setCopiedModal(false)}
            >
              Hoàn thành
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}