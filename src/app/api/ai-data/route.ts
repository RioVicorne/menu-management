import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

interface Ingredient {
  id: string;
  ten_nguyen_lieu: string;
  ton_kho_so_luong?: number | string;
  ton_kho_khoi_luong?: number | string;
}

interface MenuItem {
  id: string;
  ngay: string;
  boi_so?: number;
  ghi_chu?: string;
  mon_an: Array<{
    id: string;
    ten_mon_an: string;
    loai_mon_an?: string;
  }>;
}

interface Recipe {
  id: string;
  so_luong?: number;
  don_vi_tinh?: string;
  mon_an: Array<{
    id: string;
    ten_mon_an: string;
    loai_mon_an?: string;
  }>;
  nguyen_lieu: Array<{
    id: string;
    ten_nguyen_lieu: string;
  }>;
}

interface Dish {
  id: string;
  ten_mon_an: string;
  loai_mon_an?: string;
  mo_ta?: string;
}

// API để lấy dữ liệu cho AI suggestions
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      // Return mock data when Supabase is not configured
      return getMockData(request);
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    switch (type) {
      case 'ingredients':
        return await getIngredientsData();
      case 'dishes':
        return await getDishesData();
      case 'menu':
        return await getMenuData();
      case 'recipes':
        return await getRecipesData();
      default:
        return NextResponse.json(
          { error: 'Invalid type parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('AI Data API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Không thể lấy dữ liệu cho AI'
      },
      { status: 500 }
    );
  }
}

// Lấy dữ liệu nguyên liệu
async function getIngredientsData() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data: ingredients, error } = await supabase
    .from("nguyen_lieu")
    .select("id, ten_nguyen_lieu, nguon_nhap, ton_kho_so_luong, ton_kho_khoi_luong")
    .order("ten_nguyen_lieu", { ascending: true });

  if (error) throw error;

  // Phân loại nguyên liệu
  const availableIngredients = (ingredients || []).filter((ing: Ingredient) => {
    const qty = Number(ing.ton_kho_so_luong || 0);
    const wgt = Number(ing.ton_kho_khoi_luong || 0);
    const value = Math.max(qty, wgt);
    return value > 5; // Đủ dùng
  });

  const lowStockIngredients = (ingredients || []).filter((ing: Ingredient) => {
    const qty = Number(ing.ton_kho_so_luong || 0);
    const wgt = Number(ing.ton_kho_khoi_luong || 0);
    const value = Math.max(qty, wgt);
    return value >= 1 && value <= 5; // Sắp hết
  });

  const outOfStockIngredients = (ingredients || []).filter((ing: Ingredient) => {
    const qty = Number(ing.ton_kho_so_luong || 0);
    const wgt = Number(ing.ton_kho_khoi_luong || 0);
    const value = Math.max(qty, wgt);
    return value === 0; // Hết
  });

  return NextResponse.json({
    total: ingredients?.length || 0,
    available: availableIngredients.length,
    lowStock: lowStockIngredients.length,
    outOfStock: outOfStockIngredients.length,
    availableIngredients: availableIngredients.map((ing: Ingredient) => ing.ten_nguyen_lieu),
    lowStockIngredients: lowStockIngredients.map((ing: Ingredient) => ing.ten_nguyen_lieu),
    outOfStockIngredients: outOfStockIngredients.map((ing: Ingredient) => ing.ten_nguyen_lieu),
    allIngredients: ingredients || []
  });
}

// Lấy dữ liệu món ăn
async function getDishesData() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data: dishes, error } = await supabase
    .from("mon_an")
    .select("id, ten_mon_an, mo_ta, loai_mon_an")
    .order("ten_mon_an", { ascending: true });

  if (error) throw error;

  // Phân loại món ăn
  const categories = (dishes || []).reduce((acc: Record<string, Dish[]>, dish: Dish) => {
    const category = dish.loai_mon_an || 'Khác';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(dish);
    return acc;
  }, {});

  return NextResponse.json({
    total: dishes?.length || 0,
    categories: Object.keys(categories),
    dishesByCategory: categories,
    allDishes: dishes || []
  });
}

// Lấy dữ liệu menu
async function getMenuData() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data: menuItems, error } = await supabase
    .from("thuc_don")
    .select(`
      id,
      ngay,
      boi_so,
      ghi_chu,
      mon_an:ma_mon_an (
        id,
        ten_mon_an,
        loai_mon_an
      )
    `)
    .order("ngay", { ascending: false })
    .limit(30); // Lấy 30 ngày gần nhất

  if (error) throw error;

  // Nhóm theo ngày
  const menuByDate = (menuItems || []).reduce((acc: Record<string, MenuItem[]>, item: MenuItem) => {
    const date = item.ngay;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(item);
    return acc;
  }, {});

  return NextResponse.json({
    total: menuItems?.length || 0,
    days: Object.keys(menuByDate).length,
    menuByDate,
    recentMenu: menuItems?.slice(0, 10) || []
  });
}

// Lấy dữ liệu công thức
async function getRecipesData() {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  const { data: recipes, error } = await supabase
    .from("cong_thuc_mon_an")
    .select(`
      id,
      so_luong,
      don_vi_tinh,
      mon_an:ma_mon_an (
        id,
        ten_mon_an,
        loai_mon_an
      ),
      nguyen_lieu:ma_nguyen_lieu (
        id,
        ten_nguyen_lieu
      )
    `)
    .order("ma_mon_an", { ascending: true });

  if (error) throw error;

  // Nhóm công thức theo món ăn
  const recipesByDish = (recipes || []).reduce((acc: Record<string, { dishName: string; ingredients: Array<{ name: string; quantity: number; unit: string }> }>, recipe: Recipe) => {
    const dishId = recipe.mon_an?.[0]?.id;
    const dishName = recipe.mon_an?.[0]?.ten_mon_an;
    
    if (!acc[dishId]) {
      acc[dishId] = {
        dishName,
        ingredients: []
      };
    }
    
    acc[dishId].ingredients.push({
      name: recipe.nguyen_lieu?.[0]?.ten_nguyen_lieu || 'Unknown',
      quantity: recipe.so_luong || 1,
      unit: recipe.don_vi_tinh || 'cái'
    });
    
    return acc;
  }, {});

  return NextResponse.json({
    total: recipes?.length || 0,
    dishes: Object.keys(recipesByDish).length,
    recipesByDish,
    allRecipes: recipes || []
  });
}

// Mock data function when Supabase is not configured
async function getMockData(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  // Mock ingredients data
  const mockIngredients = [
    { id: '1', ten_nguyen_lieu: 'Thịt ba chỉ', ton_kho_so_luong: 10, ton_kho_khoi_luong: 0 },
    { id: '2', ten_nguyen_lieu: 'Cá basa', ton_kho_so_luong: 5, ton_kho_khoi_luong: 0 },
    { id: '3', ten_nguyen_lieu: 'Rau muống', ton_kho_so_luong: 0, ton_kho_khoi_luong: 2 },
    { id: '4', ten_nguyen_lieu: 'Cà chua', ton_kho_so_luong: 8, ton_kho_khoi_luong: 0 },
    { id: '5', ten_nguyen_lieu: 'Hành tây', ton_kho_so_luong: 12, ton_kho_khoi_luong: 0 },
    { id: '6', ten_nguyen_lieu: 'Tỏi', ton_kho_so_luong: 20, ton_kho_khoi_luong: 0 },
    { id: '7', ten_nguyen_lieu: 'Nước mắm', ton_kho_so_luong: 3, ton_kho_khoi_luong: 0 },
    { id: '8', ten_nguyen_lieu: 'Đường', ton_kho_so_luong: 0, ton_kho_khoi_luong: 1 },
    { id: '9', ten_nguyen_lieu: 'Gạo', ton_kho_so_luong: 0, ton_kho_khoi_luong: 5 },
    { id: '10', ten_nguyen_lieu: 'Trứng', ton_kho_so_luong: 30, ton_kho_khoi_luong: 0 }
  ];

  // Mock dishes data
  const mockDishes = [
    { id: '1', ten_mon_an: 'Thịt kho tàu', mo_ta: 'Món thịt kho đậm đà', loai_mon_an: 'Món chính' },
    { id: '2', ten_mon_an: 'Canh chua cá', mo_ta: 'Canh chua cá ngon', loai_mon_an: 'Canh' },
    { id: '3', ten_mon_an: 'Rau muống xào tỏi', mo_ta: 'Rau xào giòn', loai_mon_an: 'Rau xào' },
    { id: '4', ten_mon_an: 'Cơm tấm', mo_ta: 'Cơm tấm truyền thống', loai_mon_an: 'Cơm' },
    { id: '5', ten_mon_an: 'Phở bò', mo_ta: 'Phở bò thơm ngon', loai_mon_an: 'Phở' }
  ];

  // Mock recipes data
  const mockRecipes = [
    { id: '1', so_luong: 500, don_vi_tinh: 'g', mon_an: [{ id: '1', ten_mon_an: 'Thịt kho tàu', loai_mon_an: 'Món chính' }], nguyen_lieu: [{ id: '1', ten_nguyen_lieu: 'Thịt ba chỉ' }] },
    { id: '2', so_luong: 1, don_vi_tinh: 'kg', mon_an: [{ id: '2', ten_mon_an: 'Canh chua cá', loai_mon_an: 'Canh' }], nguyen_lieu: [{ id: '2', ten_nguyen_lieu: 'Cá basa' }] },
    { id: '3', so_luong: 300, don_vi_tinh: 'g', mon_an: [{ id: '3', ten_mon_an: 'Rau muống xào tỏi', loai_mon_an: 'Rau xào' }], nguyen_lieu: [{ id: '3', ten_nguyen_lieu: 'Rau muống' }] }
  ];

  switch (type) {
    case 'ingredients':
      const availableIngredients = mockIngredients.filter(ing => Number(ing.ton_kho_so_luong || 0) > 5 || Number(ing.ton_kho_khoi_luong || 0) > 0);
      const lowStockIngredients = mockIngredients.filter(ing => {
        const qty = Number(ing.ton_kho_so_luong || 0);
        const wgt = Number(ing.ton_kho_khoi_luong || 0);
        const value = Math.max(qty, wgt);
        return value >= 1 && value <= 5;
      });
      const outOfStockIngredients = mockIngredients.filter(ing => {
        const qty = Number(ing.ton_kho_so_luong || 0);
        const wgt = Number(ing.ton_kho_khoi_luong || 0);
        const value = Math.max(qty, wgt);
        return value === 0;
      });

      return NextResponse.json({
        total: mockIngredients.length,
        available: availableIngredients.length,
        lowStock: lowStockIngredients.length,
        outOfStock: outOfStockIngredients.length,
        availableIngredients: availableIngredients.map(ing => ing.ten_nguyen_lieu),
        lowStockIngredients: lowStockIngredients.map(ing => ing.ten_nguyen_lieu),
        outOfStockIngredients: outOfStockIngredients.map(ing => ing.ten_nguyen_lieu),
        allIngredients: mockIngredients
      });

    case 'dishes':
      const categories = mockDishes.reduce((acc: Record<string, any[]>, dish: any) => {
        const category = dish.loai_mon_an || 'Khác';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(dish);
        return acc;
      }, {});

      return NextResponse.json({
        total: mockDishes.length,
        categories: Object.keys(categories),
        dishesByCategory: categories,
        allDishes: mockDishes
      });

    case 'menu':
      return NextResponse.json({
        total: 0,
        days: 0,
        menuByDate: {},
        recentMenu: []
      });

    case 'recipes':
      const recipesByDish = mockRecipes.reduce((acc: Record<string, { dishName: string; ingredients: Array<{ name: string; quantity: number; unit: string }> }>, recipe: any) => {
        const dishId = recipe.mon_an?.[0]?.id;
        const dishName = recipe.mon_an?.[0]?.ten_mon_an;
        
        if (!acc[dishId]) {
          acc[dishId] = {
            dishName,
            ingredients: []
          };
        }
        
        acc[dishId].ingredients.push({
          name: recipe.nguyen_lieu?.[0]?.ten_nguyen_lieu || 'Unknown',
          quantity: recipe.so_luong || 1,
          unit: recipe.don_vi_tinh || 'cái'
        });
        
        return acc;
      }, {});

      return NextResponse.json({
        total: mockRecipes.length,
        dishes: Object.keys(recipesByDish).length,
        recipesByDish,
        allRecipes: mockRecipes
      });

    default:
      return NextResponse.json(
        { error: 'Invalid type parameter' },
        { status: 400 }
      );
  }
}
