"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import Modal from "./ui/modal";
import { logger } from "@/lib/logger";

interface AddIngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  source: string;
  customSource: string;
  quantity: string;
  unit: string;
}

export default function AddIngredientModal({ isOpen, onClose, onSuccess }: AddIngredientModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    source: "",
    customSource: "",
    quantity: "",
    unit: "cái"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  // Unit classification helpers
  const countableUnits = ["cái", "gói", "chai", "lon", "hộp", "túi"];
  const weightOrVolumeUnits = ["kg", "g", "l", "ml"]; // stored in ton_kho_khoi_luong

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setError("Tên nguyên liệu không được để trống");
      return;
    }
    if (!formData.source) {
      setError("Vui lòng chọn nguồn nhập");
      return;
    }
    if (formData.source === "Khác" && !formData.customSource.trim()) {
      setError("Vui lòng nhập nguồn nhập khác");
      return;
    }
    if (!formData.quantity || isNaN(Number(formData.quantity)) || Number(formData.quantity) <= 0) {
      setError("Số lượng/khối lượng phải là số dương");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const finalSource = formData.source === "Khác" ? formData.customSource.trim() : formData.source;
      const quantity = Number(formData.quantity);
      const nameTrimmed = formData.name.trim();

      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameTrimmed,
          source: finalSource,
          quantity,
          unit: formData.unit
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Có lỗi xảy ra" }));
        throw new Error(data.error || "Có lỗi xảy ra");
      }

      // Reset form
      setFormData({
        name: "",
        source: "",
        customSource: "",
        quantity: "",
        unit: "cái"
      });

      // Close modal and refresh data
      onSuccess();
      onClose();
      
    } catch (err) {
      logger.error("Error adding ingredient:", err);
      const errorMessage = err instanceof Error ? err.message : "Có lỗi xảy ra khi thêm nguyên liệu";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: "",
        source: "",
        customSource: "",
        quantity: "",
        unit: "cái"
      });
      setError(null);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Thêm nguyên liệu mới">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Tên nguyên liệu */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tên nguyên liệu *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Nhập tên nguyên liệu..."
            disabled={isSubmitting}
          />
        </div>

        {/* Nguồn nhập */}
        <div>
          <label htmlFor="source" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nguồn nhập *
          </label>
          <select
            id="source"
            value={formData.source}
            onChange={(e) => handleInputChange("source", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            disabled={isSubmitting}
          >
            <option value="">Chọn nguồn nhập...</option>
            <option value="Nhà bà nội">Nhà bà nội</option>
            <option value="Nhà bà ngoại">Nhà bà ngoại</option>
            <option value="Nhà anh Thơ">Nhà anh Thơ</option>
            <option value="Khác">Khác</option>
          </select>
          
          {/* Custom source input - only show when "Khác" is selected */}
          {formData.source === "Khác" && (
            <div className="mt-3">
              <label htmlFor="customSource" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nhập nguồn nhập khác *
              </label>
              <input
                type="text"
                id="customSource"
                value={formData.customSource}
                onChange={(e) => handleInputChange("customSource", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Nhập nguồn nhập khác..."
                disabled={isSubmitting}
              />
            </div>
          )}
        </div>

        {/* Số lượng/khối lượng */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Số lượng/khối lượng *
          </label>
          <div className="flex">
            <input
              type="number"
              id="quantity"
              value={formData.quantity}
              onChange={(e) => handleInputChange("quantity", e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="0"
              min="0"
              step="0.01"
              disabled={isSubmitting}
            />
            <select
              value={formData.unit}
              onChange={(e) => handleInputChange("unit", e.target.value)}
              className="px-4 py-2 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors min-w-[80px]"
              disabled={isSubmitting}
            >
              <option value="cái">cái</option>
              <option value="gói">gói</option>
              <option value="chai">chai</option>
              <option value="lon">lon</option>
              <option value="hộp">hộp</option>
              <option value="túi">túi</option>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="l">l</option>
              <option value="ml">ml</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Đang thêm...</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Thêm nguyên liệu</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
