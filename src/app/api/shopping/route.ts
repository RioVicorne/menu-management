import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

interface Ingredient {
  id: string;
  ten_nguyen_lieu: string;
  ton_kho_so_luong?: number | string;
  ton_kho_khoi_luong?: number | string;
}

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Supabase chưa được cấu hình' },
        { status: 500 }
      );
    }

    // Lấy danh sách nguyên liệu cần mua
    const { data: ingredients, error } = await supabase
      .from("nguyen_lieu")
      .select("id, ten_nguyen_lieu, nguon_nhap, ton_kho_so_luong, ton_kho_khoi_luong")
      .order("ten_nguyen_lieu", { ascending: true });

    if (error) {
      throw error;
    }

    // Lọc nguyên liệu cần mua (tồn kho <= 5 hoặc = 0)
    const needBuy = (ingredients || []).filter((ing: Ingredient) => {
      const qty = Number(ing.ton_kho_so_luong || 0);
      const wgt = Number(ing.ton_kho_khoi_luong || 0);
      const value = Math.max(qty, wgt);
      return value === 0 || (value >= 1 && value <= 5);
    });

    // Nhóm theo nguồn nhập
    const normalizeSourceKey = (src: string) =>
      (src || "")
        .normalize("NFC")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[\u0300-\u036f]/g, "");

    const SOURCE_ALIASES: Record<string, string> = {
      [normalizeSourceKey("Co.opmart")]: "Co.opmart",
      [normalizeSourceKey("Coopmart")]: "Co.opmart",
      [normalizeSourceKey("Co.op mart")]: "Co.opmart",
    };

    const groupedBySource: Record<string, Ingredient[]> = {};
    
    for (const ing of needBuy) {
      const original = (ing.nguon_nhap || "Nguồn chưa rõ");
      const labelCandidate = original.trim() || "Nguồn chưa rõ";
      const key = normalizeSourceKey(labelCandidate);
      const displayLabel = SOURCE_ALIASES[key] || labelCandidate;
      
      if (!groupedBySource[displayLabel]) {
        groupedBySource[displayLabel] = [];
      }
      groupedBySource[displayLabel].push(ing);
    }

    // Tính toán thống kê
    const stats = {
      totalSources: Object.keys(groupedBySource).length,
      totalIngredients: needBuy.length,
      groupedBySource,
      ingredients: needBuy
    };

    return NextResponse.json(stats);
  } catch (error) {
    logger.error('Shopping API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Không thể lấy dữ liệu danh sách mua sắm'
      },
      { status: 500 }
    );
  }
}
