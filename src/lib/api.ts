import { supabase } from "./supabase";
import { logger } from "./logger";

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
    logger.error("Error fetching dishes:", error);
    throw error;
  }

  return data || [];
}

// Get all ingredients (for pickers)
export async function getAllIngredients(): Promise<Ingredient[]> {
  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase
    .from("nguyen_lieu")
    .select("id, ten_nguyen_lieu, ton_kho_khoi_luong, ton_kho_so_luong, nguon_nhap, created_at")
    .order("ten_nguyen_lieu");
  if (error) {
    logger.error("Error fetching ingredients:", error);
    throw error;
  }
  return (data || []) as Ingredient[];
}

// Get recipe components for a dish, joined with ingredient names
export interface DishRecipeItem extends RecipeComponent {
  ten_nguyen_lieu?: string;
}

export async function getRecipeForDish(dishId: string): Promise<DishRecipeItem[]> {
  if (!supabase) {
    return [];
  }

  // First, try reading recipe from mon_an.cong_thuc_nau (text/JSON)
  try {
    const { data: monAnRow, error: monAnErr } = await supabase
      .from("mon_an")
      .select("cong_thuc_nau")
      .eq("id", dishId)
      .single();

    if (!monAnErr && monAnRow && monAnRow.cong_thuc_nau) {
      let parsed: any[] = [];
      try {
        parsed = typeof monAnRow.cong_thuc_nau === "string"
          ? JSON.parse(monAnRow.cong_thuc_nau)
          : monAnRow.cong_thuc_nau;
      } catch (e) {
        logger.warn("cong_thuc_nau is not valid JSON; showing empty recipe");
        parsed = [];
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        // Collect ingredient ids to resolve names
        const ids = parsed
          .map((it) => it.ma_nguyen_lieu)
          .filter((v) => typeof v === "string" && v.length > 0);

        let idToName: Record<string, string> = {};
        if (ids.length > 0) {
          const { data: ingRows } = await supabase
            .from("nguyen_lieu")
            .select("id, ten_nguyen_lieu")
            .in("id", ids);
          (ingRows || []).forEach((r: any) => {
            idToName[r.id] = r.ten_nguyen_lieu;
          });
        }

        const items: DishRecipeItem[] = parsed.map((it, idx) => ({
          id: String(idx + 1),
          ma_mon_an: dishId,
          ma_nguyen_lieu: String(it.ma_nguyen_lieu || ""),
          so_nguoi_an: Number(it.so_nguoi_an || 1),
          khoi_luong_nguyen_lieu: it.khoi_luong_nguyen_lieu != null ? Number(it.khoi_luong_nguyen_lieu) : undefined,
          so_luong_nguyen_lieu: it.so_luong_nguyen_lieu != null ? Number(it.so_luong_nguyen_lieu) : undefined,
          created_at: new Date().toISOString(),
          luong_calo: 0,
          ten_nguyen_lieu: idToName[String(it.ma_nguyen_lieu || "")] || undefined,
        }));
        return items;
      }
    }
  } catch (e) {
    // fall through to legacy path
  }

  // Fallback: fetch from thanh_phan, then resolve ingredient names separately (no FK required)
  const { data: comps, error: compsErr } = await supabase
    .from("thanh_phan")
    .select(
      "id, ma_mon_an, ma_nguyen_lieu, so_nguoi_an, khoi_luong_nguyen_lieu, so_luong_nguyen_lieu, created_at"
    )
    .eq("ma_mon_an", dishId);

  if (compsErr) {
    logger.error("Error fetching recipe for dish:", compsErr);
    throw compsErr;
  }

  const ids = (comps || []).map((r: any) => r.ma_nguyen_lieu).filter(Boolean);
  let idToName: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: ingRows, error: ingErr } = await supabase
      .from("nguyen_lieu")
      .select("id, ten_nguyen_lieu")
      .in("id", ids);
    if (!ingErr) {
      (ingRows || []).forEach((r: any) => {
        idToName[r.id] = r.ten_nguyen_lieu;
      });
    }
  }

  const items: DishRecipeItem[] = (comps || []).map((row: any) => ({
    id: row.id,
    ma_mon_an: row.ma_mon_an,
    ma_nguyen_lieu: row.ma_nguyen_lieu,
    so_nguoi_an: row.so_nguoi_an,
    khoi_luong_nguyen_lieu: row.khoi_luong_nguyen_lieu,
    so_luong_nguyen_lieu: row.so_luong_nguyen_lieu,
    created_at: row.created_at,
    luong_calo: 0,
    ten_nguyen_lieu: idToName[row.ma_nguyen_lieu],
  }));

  return items;
}

// Deduct ingredients from storage for a dish based on its recipe
export async function consumeIngredientsForDish(
  dishId: string,
  servingsMultiplier: number = 1
): Promise<void> {
  const recipe = await getRecipeForDish(dishId);
  if (!recipe || recipe.length === 0) return;

  // For each component, call our API PATCH to decrease stock
  await Promise.all(
    recipe.map(async (item) => {
      // Prefer weight if specified, otherwise quantity
      if (item.khoi_luong_nguyen_lieu && item.khoi_luong_nguyen_lieu > 0) {
        const amount = item.khoi_luong_nguyen_lieu * servingsMultiplier;
        await fetch(`/api/ingredients/${item.ma_nguyen_lieu}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ op: "decrease", mode: "weight", amount }),
        });
      } else if (item.so_luong_nguyen_lieu && item.so_luong_nguyen_lieu > 0) {
        const amount = item.so_luong_nguyen_lieu * servingsMultiplier;
        await fetch(`/api/ingredients/${item.ma_nguyen_lieu}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ op: "decrease", mode: "quantity", amount }),
        });
      }
    })
  );
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
      logger.warn(
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
    logger.warn("Database connection failed (running in mock mode):", err);
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
    logger.error("Error adding dish to menu:", error);
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
    logger.error("Error updating menu item:", error);
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
    logger.error("Error deleting menu item:", error);
    throw error;
  }
}

// Delete a dish from mon_an
export async function deleteDish(id: string): Promise<void> {
  if (!supabase) {
    // In mock mode, do nothing
    return;
  }

  const { error } = await supabase.from("mon_an").delete().eq("id", id);
  if (error) {
    logger.error("Error deleting dish:", error);
    throw error;
  }
}

// Create a new dish
export async function createDish(ten_mon_an: string, cong_thuc?: Array<Record<string, unknown>>): Promise<Dish> {
  if (!ten_mon_an || !ten_mon_an.trim()) {
    throw new Error("Tên món ăn không được để trống");
  }

  if (!supabase) {
    // Mock new dish
    return {
      id: Date.now().toString(),
      ten_mon_an,
      created_at: new Date().toISOString(),
    };
  }

  const payload: Record<string, unknown> = {
    ten_mon_an,
    cong_thuc_nau: cong_thuc && cong_thuc.length > 0 ? JSON.stringify(cong_thuc) : null,
  };

  const { data, error } = await supabase
    .from("mon_an")
    .upsert(payload, { onConflict: "ten_mon_an", ignoreDuplicates: false })
    .select("*")
    .single();

  if (error) {
    logger.error("Error creating dish:", error);
    const message = (error as any)?.message || (typeof error === 'string' ? error : 'Unknown database error');
    throw new Error(message);
  }

  return data as Dish;
}

// Get ingredients for a specific date
export async function getIngredientsForDate(date: string): Promise<Record<string, unknown>[]> {
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
    logger.error("Error fetching ingredients:", error);
    throw error;
  }

  return data || [];
}

// Get menu data for calendar (count of dishes per date)
export async function getCalendarData(
  startDate: string,
  endDate: string,
): Promise<Record<string, unknown>[]> {
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
      logger.warn(
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
    logger.warn("Database connection failed (running in mock mode):", err);
    // Return empty array instead of throwing error in mock mode
    return [];
  }
}
