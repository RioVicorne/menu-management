"use client";

import { useEffect, useState } from "react";
import Modal from "./ui/modal";
import { Loader2 } from "lucide-react";
import { getRecipeForDish } from "@/lib/api";

interface DishRecipeModalProps {
  isOpen: boolean;
  dishId: string | null;
  dishName?: string;
  onClose: () => void;
}

export default function DishRecipeModal({ isOpen, dishId, dishName, onClose }: DishRecipeModalProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !dishId) return;
    setLoading(true);
    getRecipeForDish(dishId)
      .then((res) => setItems(res as any))
      .finally(() => setLoading(false));
  }, [isOpen, dishId]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Nguyên liệu: ${dishName || ""}`}>
      {loading ? (
        <div className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Đang tải...</p>
        </div>
      ) : (
        <>
          {items.length === 0 ? (
            <div className="p-4 text-sm text-gray-600 dark:text-gray-400">Chưa có dữ liệu nguyên liệu.</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between p-3 gap-3">
                  <span className="text-gray-900 dark:text-gray-100 truncate">{it.ten_nguyen_lieu || it.ma_nguyen_lieu}</span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm">
                    {it.khoi_luong_nguyen_lieu ? `${it.khoi_luong_nguyen_lieu} kg` : it.so_luong_nguyen_lieu ? `${it.so_luong_nguyen_lieu} cái` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Modal>
  );
}


