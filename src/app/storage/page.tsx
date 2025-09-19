"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/components/i18n";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Input,
  LoadingSpinner,
  EmptyState,
} from "@/components/ui";
import { Search, Package, DollarSign, Scale, Hash } from "lucide-react";

interface Ingredient {
  id: string;
  ten_nguyen_lieu: string;
  nguon_nhap: string;
  ton_kho_so_luong: number;
  ton_kho_khoi_luong: number;
  don_gia: number | null;
}

export default function StoragePage() {
  const [rows, setRows] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (!supabase) {
        console.warn("Supabase client not available. Using mock data mode.");
        // Mock data for development when Supabase is not configured
        setRows([
          {
            id: "1",
            ten_nguyen_lieu: "Thịt bò",
            nguon_nhap: "Nhà cung cấp A",
            ton_kho_so_luong: 50,
            ton_kho_khoi_luong: 25.5,
            don_gia: 150000,
          },
          {
            id: "2",
            ten_nguyen_lieu: "Rau xanh",
            nguon_nhap: "Nhà cung cấp B",
            ton_kho_so_luong: 100,
            ton_kho_khoi_luong: 15.2,
            don_gia: 25000,
          },
        ]);
        return;
      }

      const { data, error } = await supabase
        .from("nguyen_lieu")
        .select(
          "id, ten_nguyen_lieu, nguon_nhap, ton_kho_so_luong, ton_kho_khoi_luong, don_gia",
        );

      if (error) {
        console.error("Error fetching ingredients:", error);
        setRows([]);
      } else {
        setRows(((data as Ingredient[] | null) ?? []) as Ingredient[]);
      }
    } catch (error) {
      console.error("Error:", error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.ten_nguyen_lieu.toLowerCase().includes(q.toLowerCase()) ||
        row.nguon_nhap.toLowerCase().includes(q.toLowerCase()),
    );
  }, [rows, q]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center space-x-2">
          <Package className="h-8 w-8" />
          <span>{t("storage.title")}</span>
        </h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder={t("storage.search")}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("storage.ingredient")}</TableHead>
                  <TableHead>{t("storage.supplier")}</TableHead>
                  <TableHead className="text-right">
                    {t("storage.quantity")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("storage.weight")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("storage.price")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.ten_nguyen_lieu}
                    </TableCell>
                    <TableCell>{row.nguon_nhap}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span>{row.ton_kho_so_luong}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        <span>{row.ton_kho_khoi_luong}kg</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {row.don_gia
                            ? `${row.don_gia.toLocaleString()}đ`
                            : t("storage.noPrice")}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title={q ? t("storage.noResults") : t("storage.empty")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
