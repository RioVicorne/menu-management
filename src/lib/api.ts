import { supabase } from "./supabase";
import { logger } from "./logger";

// Types based on your Supabase schema
export interface Dish {
  id: string;
  ten_mon_an: string;
  created_at: string;
  ingredients?: string[];
  calories?: number;
  image_url?: string;
  tags?: string[];
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

  // Parse tags from JSON string if they exist
  const dishes = (data || []).map((dish: any) => ({
    ...dish,
    tags: dish.tags ? (typeof dish.tags === 'string' ? JSON.parse(dish.tags) : dish.tags) : undefined,
  }));

  return dishes;
}

// Get single dish by id
export async function getDishById(id: string): Promise<Dish | null> {
  if (!supabase) {
    const all = await getDishes();
    return all.find((d) => d.id === id) || null;
  }

  const { data, error } = await supabase
    .from("mon_an")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    logger.error("Error fetching dish by id:", error);
    return null;
  }

  if (!data) return null;

  // Parse tags from JSON string if they exist
  const dish = {
    ...data,
    tags: data.tags ? (typeof data.tags === 'string' ? JSON.parse(data.tags) : data.tags) : undefined,
  };

  return dish as Dish;
}

// Get all ingredients (for pickers)
export async function getAllIngredients(): Promise<Ingredient[]> {
  if (!supabase) {
    return [];
  }
  try {
    const { data, error } = await supabase
      .from("nguyen_lieu")
      .select("id, ten_nguyen_lieu, ton_kho_khoi_luong, ton_kho_so_luong, nguon_nhap, created_at")
      .order("ten_nguyen_lieu");
    if (error) {
      logger.error("Error fetching ingredients:", error);
      return [];
    }
    return (data || []) as Ingredient[];
  } catch (error) {
    logger.error("Error fetching ingredients (network error):", error);
    return [];
  }
}

// Get recipe components for a dish, joined with ingredient names
export interface DishRecipeItem extends RecipeComponent {
  ten_nguyen_lieu?: string;
}

// Simple in-memory cache for recipes to avoid duplicate queries
const recipeCache = new Map<string, { data: DishRecipeItem[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clear cache entry if expired
function getCachedRecipe(dishId: string): DishRecipeItem[] | null {
  const cached = recipeCache.get(dishId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedRecipe(dishId: string, data: DishRecipeItem[]) {
  recipeCache.set(dishId, { data, timestamp: Date.now() });
}

// Batch get recipes for multiple dishes - optimized version
export async function getRecipesForDishesBatch(dishIds: string[]): Promise<Map<string, DishRecipeItem[]>> {
  if (!supabase || dishIds.length === 0) {
    return new Map();
  }

  const result = new Map<string, DishRecipeItem[]>();
  const uncachedIds: string[] = [];

  // Check cache first
  for (const dishId of dishIds) {
    const cached = getCachedRecipe(dishId);
    if (cached) {
      result.set(dishId, cached);
    } else {
      uncachedIds.push(dishId);
    }
  }

  if (uncachedIds.length === 0) {
    return result;
  }

  // Batch fetch dishes with cong_thuc_nau
  type RawMonAnRow = {
    id: string | number | null;
    cong_thuc_nau: unknown;
  };

  const { data: monAnRows } = await supabase
    .from("mon_an")
    .select("id, cong_thuc_nau")
    .in("id", uncachedIds) as { data: RawMonAnRow[] | null };

  // Batch fetch thanh_phan for dishes without cong_thuc_nau
  type RawThanhPhanRow = {
    id: string | number | null;
    ma_mon_an: string | number | null;
    ma_nguyen_lieu: string | number | null;
    so_nguoi_an: number | null;
    khoi_luong_nguyen_lieu: number | null;
    so_luong_nguyen_lieu: number | null;
    luong_calo: number | null;
    created_at: string | null;
  };

  const { data: thanhPhanRows } = await supabase
    .from("thanh_phan")
    .select("id, ma_mon_an, ma_nguyen_lieu, so_nguoi_an, khoi_luong_nguyen_lieu, so_luong_nguyen_lieu, luong_calo, created_at")
    .in("ma_mon_an", uncachedIds) as { data: RawThanhPhanRow[] | null };

  // Collect all ingredient IDs needed
  const ingredientIds = new Set<string>();
  
  // From cong_thuc_nau
  (monAnRows || []).forEach((row) => {
    if (row.cong_thuc_nau) {
      try {
        const parsed = typeof row.cong_thuc_nau === "string" 
          ? JSON.parse(row.cong_thuc_nau) 
          : row.cong_thuc_nau;
        if (Array.isArray(parsed)) {
          parsed.forEach((it: { ma_nguyen_lieu?: string }) => {
            if (it.ma_nguyen_lieu) ingredientIds.add(String(it.ma_nguyen_lieu));
          });
        }
      } catch {}
    }
  });

  // From thanh_phan
  (thanhPhanRows || []).forEach((row) => {
    if (row.ma_nguyen_lieu) {
      ingredientIds.add(String(row.ma_nguyen_lieu));
    }
  });

  // Batch fetch all ingredient names
  const idToName: Record<string, string> = {};
  if (ingredientIds.size > 0) {
    const { data: ingRows } = await supabase
      .from("nguyen_lieu")
      .select("id, ten_nguyen_lieu")
      .in("id", Array.from(ingredientIds));
    
    (ingRows || []).forEach((r: Record<string, unknown>) => {
      idToName[String(r.id)] = String(r.ten_nguyen_lieu);
    });
  }

  // Process each dish
  const monAnMap = new Map((monAnRows || []).map(r => [String(r.id), r]));
  const thanhPhanByDish = new Map<string, RawThanhPhanRow[]>();
  (thanhPhanRows || []).forEach((row) => {
    const dishId = String(row.ma_mon_an);
    if (!thanhPhanByDish.has(dishId)) {
      thanhPhanByDish.set(dishId, []);
    }
    thanhPhanByDish.get(dishId)!.push(row);
  });

  for (const dishId of uncachedIds) {
    let items: DishRecipeItem[] = [];
    const monAnRow = monAnMap.get(dishId);

    // Try cong_thuc_nau first
    if (monAnRow?.cong_thuc_nau) {
      try {
        const parsed = typeof monAnRow.cong_thuc_nau === "string"
          ? JSON.parse(monAnRow.cong_thuc_nau)
          : monAnRow.cong_thuc_nau;
        
        if (Array.isArray(parsed) && parsed.length > 0) {
          items = parsed.map((it: any, idx: number) => ({
            id: String(idx + 1),
            ma_mon_an: dishId,
            ma_nguyen_lieu: String(it.ma_nguyen_lieu || ""),
            so_nguoi_an: Number(it.so_nguoi_an || 1),
            khoi_luong_nguyen_lieu: it.khoi_luong_nguyen_lieu != null ? Number(it.khoi_luong_nguyen_lieu) : undefined,
            so_luong_nguyen_lieu: it.so_luong_nguyen_lieu != null ? Number(it.so_luong_nguyen_lieu) : undefined,
            created_at: new Date().toISOString(),
            luong_calo: 0,
            ten_nguyen_lieu: idToName[String(it.ma_nguyen_lieu || "")],
          }));
        }
      } catch {}
    }

    // Fallback to thanh_phan
    if (items.length === 0) {
      const comps = thanhPhanByDish.get(dishId) || [];
      items = comps.map((row) => ({
        id: String(row.id ?? ""),
        ma_mon_an: String(row.ma_mon_an ?? ""),
        ma_nguyen_lieu: String(row.ma_nguyen_lieu ?? ""),
        so_nguoi_an: Number(row.so_nguoi_an ?? 0),
        khoi_luong_nguyen_lieu: row.khoi_luong_nguyen_lieu != null ? Number(row.khoi_luong_nguyen_lieu) : undefined,
        so_luong_nguyen_lieu: row.so_luong_nguyen_lieu != null ? Number(row.so_luong_nguyen_lieu) : undefined,
        created_at: row.created_at ? String(row.created_at) : new Date().toISOString(),
        luong_calo: row.luong_calo != null ? Number(row.luong_calo) : 0,
        ten_nguyen_lieu: idToName[String(row.ma_nguyen_lieu ?? "")],
      }));
    }

    setCachedRecipe(dishId, items);
    result.set(dishId, items);
  }

  return result;
}

export async function getRecipeForDish(dishId: string): Promise<DishRecipeItem[]> {
  if (!supabase) {
    return [];
  }

  // Check cache first
  const cached = getCachedRecipe(dishId);
  if (cached) {
    return cached;
  }

  // Use batch function for single dish (more efficient)
  const batchResult = await getRecipesForDishesBatch([dishId]);
  const result = batchResult.get(dishId);
  if (result) {
    return result;
  }

  // Fallback to original implementation if batch fails
  try {
    const { data: monAnRow, error: monAnErr } = await supabase
      .from("mon_an")
      .select("cong_thuc_nau")
      .eq("id", dishId)
      .single();

    if (!monAnErr && monAnRow && monAnRow.cong_thuc_nau) {
      let parsed: unknown[] = [];
      try {
        parsed = typeof monAnRow.cong_thuc_nau === "string"
          ? JSON.parse(monAnRow.cong_thuc_nau)
          : monAnRow.cong_thuc_nau;
      } catch {
        logger.warn("cong_thuc_nau is not valid JSON; showing empty recipe");
        parsed = [];
      }

      if (Array.isArray(parsed) && parsed.length > 0) {
        // Collect ingredient ids to resolve names
        const ids = parsed
          .map((it) => (it as { ma_nguyen_lieu?: string })?.ma_nguyen_lieu)
          .filter((v) => typeof v === "string" && v.length > 0);

        const idToName: Record<string, string> = {};
        if (ids.length > 0) {
          const { data: ingRows } = await supabase
            .from("nguyen_lieu")
            .select("id, ten_nguyen_lieu")
            .in("id", ids);
          (ingRows || []).forEach((r: Record<string, unknown>) => {
            idToName[String(r.id)] = String(r.ten_nguyen_lieu);
          });
        }

        const items: DishRecipeItem[] = parsed.map((it, idx) => {
          const item = it as { 
            ma_nguyen_lieu?: string; 
            so_nguoi_an?: number; 
            khoi_luong_nguyen_lieu?: number; 
            so_luong_nguyen_lieu?: number; 
          };
          return {
            id: String(idx + 1),
            ma_mon_an: dishId,
            ma_nguyen_lieu: String(item.ma_nguyen_lieu || ""),
            so_nguoi_an: Number(item.so_nguoi_an || 1),
            khoi_luong_nguyen_lieu: item.khoi_luong_nguyen_lieu != null ? Number(item.khoi_luong_nguyen_lieu) : undefined,
            so_luong_nguyen_lieu: item.so_luong_nguyen_lieu != null ? Number(item.so_luong_nguyen_lieu) : undefined,
            created_at: new Date().toISOString(),
            luong_calo: 0,
            ten_nguyen_lieu: idToName[String(item.ma_nguyen_lieu || "")] || undefined,
          };
        });
        return items;
      }
    }
  } catch {
    // fall through to legacy path
  }

  // Fallback: fetch from thanh_phan, then resolve ingredient names separately (no FK required)
  const { data: comps, error: compsErr } = await supabase
    .from("thanh_phan")
    .select(
      "id, ma_mon_an, ma_nguyen_lieu, so_nguoi_an, khoi_luong_nguyen_lieu, so_luong_nguyen_lieu, luong_calo, created_at"
    )
    .eq("ma_mon_an", dishId);

  if (compsErr) {
    logger.error("Error fetching recipe for dish:", compsErr);
    throw compsErr;
  }

  const ids = (comps || []).map((r: Record<string, unknown>) => r.ma_nguyen_lieu).filter(Boolean);
  const idToName: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: ingRows, error: ingErr } = await supabase
      .from("nguyen_lieu")
      .select("id, ten_nguyen_lieu")
      .in("id", ids);
    if (!ingErr) {
      (ingRows || []).forEach((r: Record<string, unknown>) => {
        idToName[String(r.id)] = String(r.ten_nguyen_lieu);
      });
    }
  }

  const items: DishRecipeItem[] = (comps || []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    ma_mon_an: String(row.ma_mon_an),
    ma_nguyen_lieu: String(row.ma_nguyen_lieu),
    so_nguoi_an: Number(row.so_nguoi_an),
    khoi_luong_nguyen_lieu: row.khoi_luong_nguyen_lieu != null ? Number(row.khoi_luong_nguyen_lieu) : undefined,
    so_luong_nguyen_lieu: row.so_luong_nguyen_lieu != null ? Number(row.so_luong_nguyen_lieu) : undefined,
    created_at: String(row.created_at),
    luong_calo: row.luong_calo != null ? Number(row.luong_calo) : 0,
    ten_nguyen_lieu: idToName[String(row.ma_nguyen_lieu)],
  }));

  // Cache the result
  setCachedRecipe(dishId, items);
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

// Batch consume ingredients for multiple dishes - more efficient
export async function consumeIngredientsForDishesBatch(
  dishes: Array<{ dishId: string; servings: number }>
): Promise<void> {
  if (dishes.length === 0) return;

  // Collect all ingredient changes first
  const ingredientChanges = new Map<string, { weight: number; quantity: number }>();

  for (const { dishId, servings } of dishes) {
    const recipe = await getRecipeForDish(dishId);
    if (!recipe || recipe.length === 0) continue;

    for (const item of recipe) {
      const ingredientId = item.ma_nguyen_lieu;
      const current = ingredientChanges.get(ingredientId) || { weight: 0, quantity: 0 };

      if (item.khoi_luong_nguyen_lieu && item.khoi_luong_nguyen_lieu > 0) {
        current.weight += item.khoi_luong_nguyen_lieu * servings;
      } else if (item.so_luong_nguyen_lieu && item.so_luong_nguyen_lieu > 0) {
        current.quantity += item.so_luong_nguyen_lieu * servings;
      }

      ingredientChanges.set(ingredientId, current);
    }
  }

  // Apply all changes in parallel
  await Promise.all(
    Array.from(ingredientChanges.entries()).map(async ([ingredientId, changes]) => {
      const promises = [];
      
      if (changes.weight > 0) {
        promises.push(
          fetch(`/api/ingredients/${ingredientId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ op: "decrease", mode: "weight", amount: changes.weight }),
          })
        );
      }
      
      if (changes.quantity > 0) {
        promises.push(
          fetch(`/api/ingredients/${ingredientId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ op: "decrease", mode: "quantity", amount: changes.quantity }),
          })
        );
      }

      await Promise.all(promises);
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

// Add multiple dishes to menu for a specific date in one request
export async function addMenuItemsBatch(
  date: string,
  items: Array<{ dishId: string; servings: number; notes?: string }>,
): Promise<MenuItem[]> {
  if (!supabase) {
    const dishes = await getDishes();
    return items.map((it, idx) => {
      const selectedDish = dishes.find((d) => d.id === it.dishId);
      return {
        id: (Date.now() + idx).toString(),
        ma_mon_an: it.dishId,
        ngay: date,
        boi_so: it.servings,
        ghi_chu: it.notes,
        created_at: new Date().toISOString(),
        ten_mon_an: selectedDish?.ten_mon_an || "Unknown dish",
      } as MenuItem;
    });
  }

  if (!items || items.length === 0) return [];

  const payload = items.map((it) => ({
    ma_mon_an: it.dishId,
    ngay: date,
    boi_so: it.servings,
    ghi_chu: it.notes,
  }));

  const { data, error } = await supabase
    .from("thuc_don")
    .insert(payload)
    .select("*");

  if (error) {
    logger.error("Error adding dishes batch to menu:", error);
    throw error;
  }

  return (data || []) as MenuItem[];
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
export async function createDish(
  ten_mon_an: string, 
  cong_thuc?: Array<Record<string, unknown>>,
  image_url?: string,
  tags?: string[]
): Promise<Dish> {
  if (!ten_mon_an || !ten_mon_an.trim()) {
    throw new Error("Tên món ăn không được để trống");
  }

  if (!supabase) {
    // Mock new dish
    return {
      id: Date.now().toString(),
      ten_mon_an,
      created_at: new Date().toISOString(),
      image_url,
      tags,
    };
  }

  const payload: Record<string, unknown> = {
    ten_mon_an,
    cong_thuc_nau: cong_thuc && cong_thuc.length > 0 ? JSON.stringify(cong_thuc) : null,
    image_url: image_url || null,
    tags: tags && tags.length > 0 ? JSON.stringify(tags) : null,
  };

  const { data, error } = await supabase
    .from("mon_an")
    .upsert(payload, { onConflict: "ten_mon_an", ignoreDuplicates: false })
    .select("*")
    .single();

  if (error) {
    logger.error("Error creating dish:", error);
    const message = (error as Error)?.message || (typeof error === 'string' ? error : 'Unknown database error');
    throw new Error(message);
  }

  return data as Dish;
}

// Update an existing dish
export async function updateDish(
  id: string,
  updates: Partial<{ 
    ten_mon_an: string; 
    cong_thuc_nau: Array<Record<string, unknown>> | null;
    image_url: string | null;
    tags: string[] | null;
  }>,
): Promise<Dish> {
  if (!id) throw new Error("Thiếu id món ăn");

  if (!supabase) {
    // Mock: merge with an existing or return a fabricated record
    const existing = await getDishById(id);
    return {
      id,
      ten_mon_an: updates.ten_mon_an ?? existing?.ten_mon_an ?? "Unnamed",
      created_at: existing?.created_at ?? new Date().toISOString(),
      image_url: updates.image_url ?? existing?.image_url,
      tags: updates.tags ?? existing?.tags,
    } as Dish;
  }

  const payload: Record<string, unknown> = {};
  if (typeof updates.ten_mon_an === "string") payload.ten_mon_an = updates.ten_mon_an;
  if (updates.cong_thuc_nau !== undefined) {
    payload.cong_thuc_nau = Array.isArray(updates.cong_thuc_nau)
      ? JSON.stringify(updates.cong_thuc_nau)
      : null;
  }
  if (updates.image_url !== undefined) {
    payload.image_url = updates.image_url;
  }
  if (updates.tags !== undefined) {
    payload.tags = Array.isArray(updates.tags) && updates.tags.length > 0
      ? JSON.stringify(updates.tags)
      : null;
  }

  const { data, error } = await supabase
    .from("mon_an")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    logger.error("Error updating dish:", error);
    const message = (error as Error)?.message || (typeof error === 'string' ? error : 'Unknown database error');
    throw new Error(message);
  }

  return data as Dish;
}

// Update dish image and tags
export async function updateDishImageAndTags(
  dishId: string,
  image_url: string | null,
  tags: string[] | null,
): Promise<Dish> {
  return updateDish(dishId, { image_url, tags });
}

// Update dish ingredients (store in cong_thuc_nau as JSON of { ma_nguyen_lieu })
export async function updateDishIngredients(
  dishId: string,
  ingredientIds: string[],
): Promise<void> {
  if (!supabase) return;
  const recipe = ingredientIds.map((id) => ({ ma_nguyen_lieu: id }));
  const congThucNau = recipe.length > 0 ? JSON.stringify(recipe) : null;
  const { error } = await supabase
    .from("mon_an")
    .update({ cong_thuc_nau: congThucNau })
    .eq("id", dishId);
  if (error) {
    logger.error("Error updating dish ingredients:", error);
    throw new Error(error.message);
  }
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
