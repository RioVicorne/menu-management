import { supabase } from "./supabase";

// Types based on your Supabase schema
export interface Dish {
  id: string;
  ten_mon_an: string;
  created_at: string;
  ingredients?: string[];
  calories?: number;
}

export interface MenuItem {
  id: string;
  ma_mon_an: string;
  ngay: string;
  boi_so: number;
  ghi_chu?: string;
  created_at: string;
  ten_mon_an?: string; // Added to include dish name
}

export interface Ingredient {
  id: string;
  ten_nguyen_lieu: string;
  ton_kho_khoi_luong?: number;
  ton_kho_so_luong?: number;
  nguon_nhap?: string;
  created_at: string;
}

export interface RecipeComponent {
  id: string;
  ma_mon_an: string;
  ma_nguyen_lieu: string;
  luong_calo: number;
  so_nguoi_an: number;
  khoi_luong_nguyen_lieu?: number;
  so_luong_nguyen_lieu?: number;
  don_gia?: number;
  created_at: string;
}

// API Functions

// Get all dishes
export async function getDishes(): Promise<Dish[]> {
  if (!supabase) {
    // Return mock data when Supabase is not configured
    return [
      {
        id: "1",
        ten_mon_an: "Cơm tấm sườn nướng",
        created_at: new Date().toISOString(),
        ingredients: ["Cơm tấm", "Sườn nướng", "Bì", "Chả", "Trứng", "Dưa leo"],
        calories: 650,
      },
      {
        id: "2",
        ten_mon_an: "Phở bò",
        created_at: new Date().toISOString(),
        ingredients: ["Bánh phở", "Thịt bò", "Hành tây", "Hành lá", "Rau thơm"],
        calories: 500,
      },
      {
        id: "3",
        ten_mon_an: "Bún bò Huế",
        created_at: new Date().toISOString(),
        ingredients: ["Bún", "Thịt bò", "Chả cua", "Hành tây", "Rau thơm"],
        calories: 600,
      },
      {
        id: "4",
        ten_mon_an: "Bánh mì pate",
        created_at: new Date().toISOString(),
        ingredients: ["Bánh mì", "Pate", "Thịt nguội", "Dưa leo", "Rau thơm"],
        calories: 350,
      },
      {
        id: "5",
        ten_mon_an: "Chả cá Lã Vọng",
        created_at: new Date().toISOString(),
        ingredients: ["Cá", "Nghệ", "Hành tây", "Rau thơm", "Bún"],
        calories: 450,
      },
    ];
  }

  const { data, error } = await supabase
    .from("mon_an")
    .select("*")
    .order("ten_mon_an");

  if (error) {
    console.error("Error fetching dishes:", error);
    throw error;
  }

  return data || [];
}

// Get menu items for a specific date
export async function getMenuItems(date: string): Promise<MenuItem[]> {
  if (!supabase) {
    // Return empty array when Supabase is not configured
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("thuc_don")
      .select("*")
      .eq("ngay", date)
      .order("created_at");

    if (error) {
      console.warn(
        "Error fetching menu items (running in mock mode):",
        error.message,
      );
      // Return empty array instead of throwing error in mock mode
      return [];
    }

    // If we have data, try to enrich it with dish names
    if (data && data.length > 0) {
      const dishes = await getDishes();
      return data.map((item) => ({
        ...item,
        ten_mon_an:
          dishes.find((d) => d.id === item.ma_mon_an)?.ten_mon_an ||
          "Unknown dish",
      }));
    }

    return data || [];
  } catch (err) {
    console.warn("Database connection failed (running in mock mode):", err);
    // Return empty array instead of throwing error in mock mode
    return [];
  }
}

// Add a dish to menu for a specific date
export async function addDishToMenu(
  dishId: string,
  date: string,
  servings: number,
  notes?: string,
): Promise<MenuItem> {
  if (!supabase) {
    // Get dish details to include name in mock mode
    const dishes = await getDishes();
    const selectedDish = dishes.find((d) => d.id === dishId);

    // Return mock data when Supabase is not configured
    return {
      id: Date.now().toString(),
      ma_mon_an: dishId,
      ngay: date,
      boi_so: servings,
      ghi_chu: notes,
      created_at: new Date().toISOString(),
      ten_mon_an: selectedDish?.ten_mon_an || "Unknown dish",
    };
  }

  const { data, error } = await supabase
    .from("thuc_don")
    .insert({
      ma_mon_an: dishId,
      ngay: date,
      boi_so: servings,
      ghi_chu: notes,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding dish to menu:", error);
    throw error;
  }

  return data;
}

// Update a menu item
export async function updateMenuItem(
  id: string,
  updates: Partial<Pick<MenuItem, "boi_so" | "ghi_chu">>,
): Promise<MenuItem> {
  if (!supabase) {
    // Return mock data when Supabase is not configured
    return {
      id,
      ma_mon_an: "mock-dish-id",
      ngay: new Date().toISOString().split("T")[0],
      boi_so: updates.boi_so || 1,
      ghi_chu: updates.ghi_chu,
      created_at: new Date().toISOString(),
      ten_mon_an: "Mock dish",
    };
  }

  const { data, error } = await supabase
    .from("thuc_don")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating menu item:", error);
    throw error;
  }

  return data;
}

// Delete a menu item
export async function deleteMenuItem(id: string): Promise<void> {
  if (!supabase) {
    // Mock success when Supabase is not configured
    return;
  }

  const { error } = await supabase.from("thuc_don").delete().eq("id", id);

  if (error) {
    console.error("Error deleting menu item:", error);
    throw error;
  }
}

// Get ingredients for a specific date
export async function getIngredientsForDate(date: string): Promise<any[]> {
  if (!supabase) {
    // Return mock data when Supabase is not configured
    return [];
  }

  const { data, error } = await supabase
    .from("thuc_don")
    .select(
      `
      *,
      thanh_phan:ma_mon_an (
        *,
        nguyen_lieu:ma_nguyen_lieu (
          *
        )
      )
    `,
    )
    .eq("ngay", date);

  if (error) {
    console.error("Error fetching ingredients:", error);
    throw error;
  }

  return data || [];
}

// Get menu data for calendar (count of dishes per date)
export async function getCalendarData(
  startDate: string,
  endDate: string,
): Promise<any[]> {
  if (!supabase) {
    // Return mock data when Supabase is not configured
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("thuc_don")
      .select("ngay")
      .gte("ngay", startDate)
      .lte("ngay", endDate);

    if (error) {
      console.warn(
        "Error fetching calendar data (running in mock mode):",
        error.message,
      );
      // Return empty array instead of throwing error in mock mode
      return [];
    }

    // Count dishes per date
    const dateCounts =
      data?.reduce(
        (acc, item) => {
          const date = item.ngay;
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    return Object.entries(dateCounts).map(([date, count]) => ({
      date,
      dishCount: count,
      totalCalories: count * 300, // Mock calories - you can calculate real ones
      totalServings: count * 2, // Mock servings - you can calculate real ones
    }));
  } catch (err) {
    console.warn("Database connection failed (running in mock mode):", err);
    // Return empty array instead of throwing error in mock mode
    return [];
  }
}
