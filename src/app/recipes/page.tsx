"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  ChefHat, 
  Clock, 
  Heart, 
  MoreVertical, 
  Plus, 
  Search, 
  Users,
  Zap,
  BookOpen,
  Sparkles,
  BarChart3
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Modal from "@/components/ui/modal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import Link from "next/link";
import { Dish, getDishes, getRecipeForDish } from "@/lib/api";
import NutritionAnalysis from "@/components/features/ai/nutrition-analysis";

type FilterType = "all" | "favorites" | "quick" | "vegetarian";

export default function RecipesPage() {
  const [dishes, setDishes] = useState<Dish[] | null>(null);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dishImages, setDishImages] = useState<Record<string, string>>({});
  const [dishTags, setDishTags] = useState<Record<string, string[]>>({});
  const [imageModalDishId, setImageModalDishId] = useState<string | null>(null);
  const [tagsModalDishId, setTagsModalDishId] = useState<string | null>(null);
  const [nutritionModalDishId, setNutritionModalDishId] = useState<string | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [tempTags, setTempTags] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getDishes();
        if (!cancelled) setDishes(data);
      } catch {
        if (!cancelled) setDishes([]);
      }
    })();
    // Load stored images and tags
    try {
      const storedImages = localStorage.getItem("recipeImages");
      const storedTags = localStorage.getItem("recipeTags");
      if (storedImages) setDishImages(JSON.parse(storedImages));
      if (storedTags) setDishTags(JSON.parse(storedTags));
    } catch {}
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!dishes) return [] as Dish[];
    let filteredDishes = dishes;

    // Apply search filter
    const q = query.trim().toLowerCase();
    if (q) {
      filteredDishes = filteredDishes.filter((d) => 
        d.ten_mon_an.toLowerCase().includes(q) ||
        d.ingredients?.some(ingredient => ingredient.toLowerCase().includes(q))
      );
    }

    // Apply category filter
    switch (activeFilter) {
      case "favorites":
        return filteredDishes.filter(d => favorites.has(d.id));
      case "quick":
        return filteredDishes.filter(d => d.ingredients && d.ingredients.length <= 5);
      case "vegetarian":
        return filteredDishes.filter(d => 
          d.ingredients?.every(ingredient => 
            !ingredient.toLowerCase().includes("thịt") &&
            !ingredient.toLowerCase().includes("cá") &&
            !ingredient.toLowerCase().includes("tôm") &&
            !ingredient.toLowerCase().includes("gà")
          )
        );
      default:
        return filteredDishes;
    }
  }, [dishes, query, activeFilter, favorites]);

  const toggleFavorite = (dishId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(dishId)) {
        newFavorites.delete(dishId);
      } else {
        newFavorites.add(dishId);
      }
      return newFavorites;
    });
  };

  const getRecipeComplexity = (ingredients: string[] | undefined) => {
    if (!ingredients) return { level: "Đơn giản", color: "text-green-600 dark:text-green-400", icon: Zap };
    if (ingredients.length <= 3) return { level: "Đơn giản", color: "text-green-600 dark:text-green-400", icon: Zap };
    if (ingredients.length <= 6) return { level: "Trung bình", color: "text-yellow-600 dark:text-yellow-400", icon: Clock };
    return { level: "Phức tạp", color: "text-red-600 dark:text-red-400", icon: Users };
  };

  const getRecipeTime = (ingredients: string[] | undefined) => {
    if (!ingredients) return "15 phút";
    if (ingredients.length <= 3) return "15 phút";
    if (ingredients.length <= 6) return "30 phút";
    return "45 phút";
  };

  const openImageEditor = (dishId: string) => {
    setTempImageUrl(dishImages[dishId] || "");
    setImageModalDishId(dishId);
    setOpenMenuId(null);
  };

  const openTagsEditor = (dishId: string) => {
    setTempTags((dishTags[dishId] || []).join(", "));
    setTagsModalDishId(dishId);
    setOpenMenuId(null);
  };

  const saveImage = () => {
    if (!imageModalDishId) return;
    const next = { ...dishImages, [imageModalDishId]: tempImageUrl.trim() };
    setDishImages(next);
    try { localStorage.setItem("recipeImages", JSON.stringify(next)); } catch {}
    setImageModalDishId(null);
  };

  const saveTags = () => {
    if (!tagsModalDishId) return;
    const parsed = tempTags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const next = { ...dishTags, [tagsModalDishId]: parsed };
    setDishTags(next);
    try { localStorage.setItem("recipeTags", JSON.stringify(next)); } catch {}
    setTagsModalDishId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:hero-gradient">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 dark:bg-white/10 backdrop-blur-sm rounded-2xl mb-6">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
              <span className="bg-gradient-to-r from-white to-blue-100 dark:from-white dark:to-purple-200 bg-clip-text text-transparent">
                Bộ sưu tập công thức
              </span>
            </h1>
            
            <p className="text-xl text-blue-100 dark:text-purple-100 mb-8 max-w-2xl mx-auto">
              Khám phá những món ăn ngon từ bộ sưu tập công thức đa dạng của chúng tôi
            </p>

            {/* Search Bar */}
            <div className="max-w-md mx-auto relative">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-300" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm kiếm món ăn hoặc nguyên liệu..."
                  className="pl-12 pr-4 py-4 rounded-2xl border-0 bg-white/90 dark:search-input-dark backdrop-blur-sm text-lg placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:bg-white dark:focus:bg-gray-800 focus:ring-2 focus:ring-white/50 dark:focus:ring-purple-500/50"
                />
              </div>
      </div>

      {/* Image Modal */}
      <Modal
        isOpen={!!imageModalDishId}
        onClose={() => setImageModalDishId(null)}
        title="Thêm/Sửa ảnh món ăn"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">URL ảnh</label>
            <Input
              placeholder="https://..."
              value={tempImageUrl}
              onChange={(e) => setTempImageUrl(e.target.value)}
              className="w-full"
            />
          </div>
          {tempImageUrl && (
            <div className="rounded-xl overflow-hidden border border-sage-200 dark:border-gray-700">
              <img src={tempImageUrl} alt="Xem trước" className="w-full h-48 object-cover" />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setImageModalDishId(null)} size="sm">Hủy</Button>
            <Button onClick={saveImage} size="sm">Lưu</Button>
          </div>
        </div>
      </Modal>

      {/* Tags Modal */}
      <Modal
        isOpen={!!tagsModalDishId}
        onClose={() => setTagsModalDishId(null)}
        title="Sửa tags"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-foreground">Tags (phân cách bởi dấu phẩy)</label>
            <Input
              placeholder="nhanh, chay, cay"
              value={tempTags}
              onChange={(e) => setTempTags(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setTagsModalDishId(null)} size="sm">Hủy</Button>
            <Button onClick={saveTags} size="sm">Lưu</Button>
          </div>
        </div>
      </Modal>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          {[
            { id: "all", label: "Tất cả", icon: ChefHat },
            { id: "favorites", label: "Yêu thích", icon: Heart },
            { id: "quick", label: "Nhanh", icon: Zap },
            { id: "vegetarian", label: "Chay", icon: Sparkles },
          ].map((filter) => {
            const Icon = filter.icon;
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id as FilterType)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 filter-button-active text-white shadow-lg shadow-indigo-500/25"
                    : "bg-white filter-button-glass text-gray-600 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white shadow-sm border border-gray-200 dark:border-gray-600"
                }`}
              >
                <Icon className="h-4 w-4 text-gray-600 dark:text-gray-200" />
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Add Recipe Button */}
        <div className="flex justify-end mb-8">
          <Link href="/recipes/new">
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 dark:from-emerald-600 dark:to-teal-600 dark:hover:from-emerald-700 dark:hover:to-teal-700 text-white px-8 py-3 rounded-full shadow-lg shadow-emerald-500/25 dark:shadow-emerald-600/25 transition-all duration-200 hover:scale-105">
              <Plus className="h-5 w-5 mr-2" />
              Thêm công thức mới
            </Button>
          </Link>
        </div>

        {/* Content */}
        {dishes === null ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <LoadingSpinner />
              <p className="text-gray-500 dark:text-gray-400">Đang tải công thức...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full mb-6">
              <ChefHat className="h-10 w-10 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {query ? "Không tìm thấy công thức" : "Chưa có công thức nào"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {query 
                ? "Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc" 
                : "Hãy bắt đầu bằng cách thêm công thức đầu tiên của bạn"
              }
            </p>
            {!query && (
              <Link href="/recipes/new">
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 dark:from-indigo-600 dark:to-purple-600 dark:hover:from-indigo-700 dark:hover:to-purple-700 text-white px-8 py-3 rounded-full">
                  <Plus className="h-5 w-5 mr-2" />
                  Thêm công thức đầu tiên
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((dish) => {
              const complexity = getRecipeComplexity(dish.ingredients);
              const time = getRecipeTime(dish.ingredients);
              const ComplexityIcon = complexity.icon;
              const isFavorite = favorites.has(dish.id);

              return (
                <Card
                  key={dish.id}
                  className="group relative overflow-hidden recipe-card-glass border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl"
                  onMouseLeave={() => setOpenMenuId((prev) => (prev === dish.id ? null : prev))}
                >
                  {/* Recipe Image Placeholder */}
                  <div className="relative h-48 bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 dark:recipe-image-dark overflow-hidden recipe-image">
                    {/* Real image if available */}
                    {dishImages[dish.id] ? (
                      <>
                        <img src={dishImages[dish.id]} alt={dish.ten_mon_an} className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 dark:bg-black/30"></div>
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-pink-500/20 dark:from-transparent dark:via-transparent dark:to-transparent"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ChefHat className="h-16 w-16 text-white/60 dark:text-white/40" />
                        </div>
                      </>
                    )}
                    
                    {/* Favorite Button */}
                    <button
                      onClick={() => toggleFavorite(dish.id)}
                      className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 action-button-dark backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 text-gray-600 dark:text-gray-300"
                    >
                      <Heart className={`h-4 w-4 ${isFavorite ? 'text-red-500 dark:text-red-400 fill-current' : ''}`} />
                    </button>

                    {/* Quick Actions */}
                    <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === dish.id ? null : dish.id)}
                          className="z-10 p-2 rounded-full bg-white/80 action-button-dark backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 text-gray-600 dark:text-gray-300"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        <div
                          className={`absolute mt-2 left-0 z-20 w-48 rounded-xl border border-sage-200/60 bg-white dark:bg-slate-900/90 dark:border-gray-700 shadow-lg backdrop-blur-md transition-all duration-150 ${openMenuId === dish.id ? 'block pointer-events-auto' : 'hidden pointer-events-none'}`}
                        >
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-t-xl"
                            onClick={() => openImageEditor(dish.id)}
                          >
                            Thêm/Sửa ảnh...
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={() => openTagsEditor(dish.id)}
                          >
                            Sửa tags...
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-b-xl"
                            onClick={() => setNutritionModalDishId(dish.id)}
                          >
                            <BarChart3 className="w-4 h-4 inline mr-2" />
                            Phân tích dinh dưỡng
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Complexity Badge */}
                    <div className="absolute bottom-3 left-3">
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full bg-white/90 dark:complexity-badge-dark backdrop-blur-sm ${complexity.color}`}>
                        <ComplexityIcon className="h-3 w-3" />
                        <span className="text-xs font-medium">{complexity.level}</span>
                      </div>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                        {dish.ten_mon_an}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                        {dish.ingredients?.join(", ") || "Chưa có thông tin nguyên liệu"}
                      </p>
                      {/* Tags */}
                      {dishTags[dish.id] && dishTags[dish.id].length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {dishTags[dish.id].map((tag) => (
                            <span key={tag} className="px-2.5 py-1 rounded-full text-xs font-medium bg-sage-100 text-sage-700 dark:bg-gray-800 dark:text-gray-200 border border-sage-200 dark:border-gray-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recipe Stats */}
                    <div className="flex items-center justify-between mb-4 text-xs text-gray-500 dark:text-gray-300">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500 dark:text-gray-300" />
                        <span>{time}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-gray-500 dark:text-gray-300" />
                        <span>{dish.ingredients?.length || 0} nguyên liệu</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link href={`/recipes/${dish.id}`} className="block">
                      <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl py-2 transition-all duration-200 hover:scale-105">
                        Xem công thức
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Nutrition Analysis Modal */}
      {nutritionModalDishId && (
        <Modal
          isOpen={true}
          onClose={() => setNutritionModalDishId(null)}
          title="Phân tích dinh dưỡng"
          size="xl"
        >
          <NutritionAnalysis
            dishId={nutritionModalDishId}
            dishName={dishes?.find(d => d.id === nutritionModalDishId)?.ten_mon_an}
            recipe={dishes?.find(d => d.id === nutritionModalDishId)?.ingredients?.map(ingredient => ({
              ingredientName: ingredient,
              quantity: 1,
              unit: 'cái'
            }))}
          />
        </Modal>
      )}
    </div>
  );
}
