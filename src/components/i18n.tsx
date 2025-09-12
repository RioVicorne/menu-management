"use client";

import React from "react";

type Language = "en" | "vi";

type Dictionary = Record<string, { en: string; vi: string }>;

const dictionary: Dictionary = {
  appTitle: { en: "Menu Planner", vi: "Trình lập thực đơn" },
  calendar: { en: "Calendar", vi: "Lịch" },
  ingredients: { en: "Ingredients", vi: "Nguyên liệu" },
  storage: { en: "Storage", vi: "Kho" },
  recipes: { en: "Recipes", vi: "Công thức" },
  addToday: { en: "Add Today's Menu", vi: "Thêm thực đơn hôm nay" },
  daysWithMenu: { en: "Days with Menu", vi: "Ngày có thực đơn" },
  totalDishes: { en: "Total Dishes", vi: "Tổng món" },
  thisMonth: { en: "This Month", vi: "Tháng này" },
  menuCalendar: { en: "Menu Calendar", vi: "Lịch thực đơn" },
  planAndManage: { en: "Plan and manage your daily menus", vi: "Lập kế hoạch và quản lý thực đơn hằng ngày" },
  loadingCalendar: { en: "Loading calendar...", vi: "Đang tải lịch..." },
  emptyTitle: { en: "No menus planned yet", vi: "Chưa có thực đơn" },
  emptyDesc: { en: "Start planning your daily menus by clicking on a date or using the \"Add Today's Menu\" button.", vi: "Hãy bắt đầu bằng cách chọn ngày trên lịch hoặc nhấn nút \"Thêm thực đơn hôm nay\"." },
  legend: { en: "Legend", vi: "Chú thích" },
  legend12: { en: "1-2 dishes", vi: "1-2 món" },
  legend34: { en: "3-4 dishes", vi: "3-4 món" },
  legend5plus: { en: "5+ dishes", vi: "5+ món" },
  backToCalendar: { en: "Back to Calendar", vi: "Về lịch" },
  todaysMenuTab: { en: "Today’s Menu", vi: "Thực đơn hôm nay" },
  inventoryTab: { en: "Inventory Management", vi: "Quản lý kho" },
  addNewDishTab: { en: "Add New Dish", vi: "Thêm món" },
  dishes: { en: "Dishes", vi: "Món ăn" },
  addDish: { en: "+ Add Dish", vi: "+ Thêm món" },
  noDishesYet: { en: "No dishes yet.", vi: "Chưa có món." },
  unnamedDish: { en: "Unnamed dish", vi: "Món chưa đặt tên" },
  servingsLabel: { en: "Servings", vi: "Khẩu phần" },
  notesLabel: { en: "Notes", vi: "Ghi chú" },
  delete: { en: "Delete", vi: "Xóa" },
  totalDishesLabel: { en: "Total dishes", vi: "Tổng món" },
  totalServingsLabel: { en: "Total servings", vi: "Tổng khẩu phần" },
  totalCaloriesLabel: { en: "Total calories", vi: "Tổng calo" },
  ingredientsForDay: { en: "Ingredients for the day", vi: "Nguyên liệu trong ngày" },
  showLowOnly: { en: "Show Low/Out only", vi: "Chỉ hiển thị thiếu/hết" },
  unknownSource: { en: "Unknown source", vi: "Nguồn chưa rõ" },
  qtyWeightNeedStock: { en: "Qty need {need} / stock {stock} • Weight need {wneed} / stock {wstock}", vi: "SL cần {need} / tồn {stock} • KL cần {wneed} / tồn {wstock}" },
  inStock: { en: "In Stock", vi: "Đủ hàng" },
  low: { en: "Low", vi: "Sắp hết" },
  outOfStock: { en: "Out of Stock", vi: "Hết hàng" },
  noIngredients: { en: "No ingredients required.", vi: "Không cần nguyên liệu." },
  alerts: { en: "Alerts", vi: "Cảnh báo" },
  attentionNeeded: { en: "Attention needed", vi: "Cần chú ý" },
  allGood: { en: "All good", vi: "Ổn" },
  selectDish: { en: "Select a dish", vi: "Chọn món" },
  servingsMultiplier: { en: "Servings (multiplier)", vi: "Khẩu phần (hệ số)" },
  ingredientsPreview: { en: "Ingredient breakdown and calories preview", vi: "Thành phần và ước tính calo" },
  addToMenu: { en: "Add to Menu", vi: "Thêm vào thực đơn" },
  adding: { en: "Adding...", vi: "Đang thêm..." },
};

type I18nContextValue = {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: keyof typeof dictionary) => string;
};

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = React.useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    const saved = window.localStorage.getItem("lang");
    return (saved === "vi" || saved === "en") ? (saved as Language) : "en";
  });

  React.useEffect(() => {
    try { window.localStorage.setItem("lang", lang); } catch {}
  }, [lang]);

  const t = React.useCallback((key: keyof typeof dictionary) => {
    const entry = dictionary[key];
    return entry ? entry[lang] : String(key);
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}


