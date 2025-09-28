"use client";

import React, { useState, useEffect } from "react";
import { Save, X, Plus, Minus } from "lucide-react";
import Modal from "@/components/ui/modal";
import { logger } from "@/lib/logger";

interface EditDishModalProps {
  isOpen: boolean;
  onClose: () => void;
  dish: {
    id: string;
    ten_mon_an: string;
    boi_so: number;
    ghi_chu?: string;
  } | null;
  onSave: (dishId: string, data: { servings: number; notes: string }) => Promise<void>;
}

export default function EditDishModal({ isOpen, onClose, dish, onSave }: EditDishModalProps) {
  const [servings, setServings] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Update form when dish changes
  useEffect(() => {
    if (dish) {
      setServings(dish.boi_so || 1);
      setNotes(dish.ghi_chu || "");
    }
  }, [dish]);

  const handleSave = async () => {
    if (!dish) return;
    
    try {
      setSaving(true);
      await onSave(dish.id, { servings, notes });
      onClose();
    } catch (error) {
      logger.error("Error saving dish:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      onClose();
    }
  };

  if (!dish) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={`Chỉnh sửa: ${dish.ten_mon_an}`}
      className="max-w-md"
    >
      <div className="space-y-6">
        {/* Dish Info */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {dish.ten_mon_an}
            </h3>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
              {servings} Khẩu phần
            </span>
          </div>
          <div className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400">
            <span>⚡</span>
            <span>{servings * 300} cal total</span>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Số khẩu phần
            </label>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setServings(Math.max(1, servings - 1))}
                disabled={saving || servings <= 1}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
              
              <div className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-center font-medium text-gray-900 dark:text-white min-w-[60px]">
                {servings}
              </div>
              
              <button
                type="button"
                onClick={() => setServings(servings + 1)}
                disabled={saving}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ghi chú
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Thêm ghi chú cho món ăn..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
              rows={3}
              disabled={saving}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-4 w-4 inline mr-2" />
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Đang lưu...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 inline mr-2" />
                Lưu thay đổi
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
