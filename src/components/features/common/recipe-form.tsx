"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { getAllIngredients, getDishById, updateDish, createDish, Dish, getRecipeForDish } from "@/lib/api";
import { uploadDishImage } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { 
  ChefHat, 
  Upload, 
  X, 
  Image as ImageIcon, 
  Search, 
  Tag, 
  Package, 
  CheckCircle2, 
  Loader2,
  Trash2
} from "lucide-react";

interface RecipeFormProps {
  dishId?: string;
  onSaved?: (dish: Dish) => void;
}

export default function RecipeForm({ dishId, onSaved }: RecipeFormProps) {
  const [name, setName] = useState("");
  const [ingredientIds, setIngredientIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [tags, setTags] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState<boolean>(!!dishId);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<{ id: string; ten_nguyen_lieu: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ing = await getAllIngredients();
      if (!cancelled) setIngredients(ing.map(i => ({ id: i.id, ten_nguyen_lieu: i.ten_nguyen_lieu })));
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!dishId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [dish, recipe] = await Promise.all([
          getDishById(dishId),
          getRecipeForDish(dishId)
        ]);
        if (!cancelled && dish) {
          setName(dish.ten_mon_an || "");
          setImageUrl(dish.image_url || "");
          setTags((dish.tags || []).join(", "));
          // Load existing ingredients from recipe
          if (recipe && recipe.length > 0) {
            const existingIngredientIds = recipe
              .map(item => item.ma_nguyen_lieu)
              .filter((id): id is string => Boolean(id));
            setIngredientIds(existingIngredientIds);
          }
        }
      } catch (err) {
        logger.error("Error loading dish data:", err);
        if (!cancelled) {
          setError("Không thể tải thông tin món ăn. Vui lòng thử lại.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [dishId]);

  const selectedNames = useMemo(() => {
    const set = new Set(ingredientIds);
    return ingredients.filter(i => set.has(i.id)).map(i => i.ten_nguyen_lieu);
  }, [ingredients, ingredientIds]);

  const filteredIngredients = useMemo(() => {
    if (!searchQuery.trim()) return ingredients;
    const query = searchQuery.toLowerCase();
    return ingredients.filter(i => 
      i.ten_nguyen_lieu.toLowerCase().includes(query)
    );
  }, [ingredients, searchQuery]);

  const tagList = useMemo(() => {
    return tags.split(",").map(t => t.trim()).filter(t => t.length > 0);
  }, [tags]);

  const handleImageSelect = (file: File | null) => {
    if (!file) {
      setImageUrl("");
      setSelectedImageFile(null);
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      return;
    }

    setSelectedImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0] || null;
    handleImageSelect(file);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = tagList.filter(t => t !== tagToRemove).join(", ");
    setTags(newTags);
  };

  async function handleSave() {
    if (!name.trim()) {
      setError("Vui lòng nhập tên món ăn");
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      let finalImageUrl: string | undefined | null = imageUrl.trim() || undefined;
      if (selectedImageFile) {
        // Upload image to storage first
        try {
          const publicUrl = await uploadDishImage(selectedImageFile, { dishId });
          finalImageUrl = publicUrl;
        } catch (imageError) {
          logger.error("Error uploading image:", imageError);
          setError("Không thể tải ảnh lên. Vui lòng thử lại.");
          return;
        }
      }
      
      const recipe = ingredientIds.map((id) => ({ ma_nguyen_lieu: id }));
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
      
      const saved = dishId
        ? await updateDish(dishId, { 
            ten_mon_an: name.trim(), 
            cong_thuc_nau: recipe,
            image_url: finalImageUrl ?? null,
            tags: parsedTags.length > 0 ? parsedTags : null
          })
        : await createDish(name.trim(), recipe, finalImageUrl || undefined, parsedTags.length > 0 ? parsedTags : undefined);
      
      onSaved?.(saved);
    } catch (err) {
      logger.error("Error saving dish:", err);
      const errorMessage = err instanceof Error ? err.message : "Có lỗi xảy ra khi lưu công thức";
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card variant="modern" className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-sage-50 to-cream-50 dark:from-sage-900/20 dark:to-cream-900/20 border-b">
        <CardTitle className="flex items-center gap-2 text-xl">
          <ChefHat className="w-5 h-5 text-sage-600 dark:text-sage-400" />
          {dishId ? "Chỉnh sửa công thức" : "Thêm công thức mới"}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-6 lg:p-8">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <LoadingSpinner />
            <p className="mt-4 text-sm text-muted-foreground">Đang tải thông tin...</p>
          </div>
        ) : (
          <div className="space-y-6 lg:space-y-8">
            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                      Lỗi
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="flex-shrink-0 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Tên món */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="text-red-500">*</span>
                Tên món
              </label>
              <Input
                variant="modern"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Phở bò, Bún bò Huế, Cơm gà..."
                className="text-base"
              />
              {!name.trim() && (
                <p className="text-xs text-muted-foreground">Vui lòng nhập tên món ăn</p>
              )}
            </div>

            {/* Ảnh món */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sage-600" />
                Ảnh món ăn <span className="text-xs font-normal text-muted-foreground">(tùy chọn)</span>
              </label>
              
              <div
                ref={dropZoneRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-xl p-6 lg:p-8 transition-all duration-200
                  ${isDragging 
                    ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/20' 
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30 hover:border-sage-400 dark:hover:border-sage-500'
                  }
                  ${imageUrl ? 'border-solid' : ''}
                `}
              >
                {imageUrl ? (
                  <div className="relative">
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                      <img 
                        src={imageUrl} 
                        alt="Xem trước" 
                        className="w-full h-48 lg:h-64 object-cover" 
                      />
                      <button
                        onClick={() => handleImageSelect(null)}
                        className="absolute top-2 right-2 p-2 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg transition-colors"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="p-4 rounded-full bg-sage-100 dark:bg-sage-900/30 mb-4">
                      <Upload className="w-8 h-8 text-sage-600 dark:text-sage-400" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-2">
                      Kéo thả ảnh vào đây hoặc click để chọn
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      PNG, JPG, WEBP tối đa 10MB
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Chọn ảnh
                    </Button>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Tag className="w-4 h-4 text-sage-600" />
                Tags <span className="text-xs font-normal text-muted-foreground">(tùy chọn)</span>
              </label>
              
              <Input
                variant="modern"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Nhập tags phân cách bởi dấu phẩy (VD: nhanh, chay, cay)"
                className="text-sm"
              />
              
              {tagList.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {tagList.map((tag, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300 text-sm font-medium"
                    >
                      <Tag className="w-3 h-3" />
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Phân cách nhiều tags bằng dấu phẩy hoặc nhấn Enter sau mỗi tag
              </p>
            </div>

            {/* Nguyên liệu */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-sage-600" />
                  Nguyên liệu
                </label>
                {selectedNames.length > 0 && (
                  <span className="text-xs font-medium text-sage-600 dark:text-sage-400">
                    Đã chọn {selectedNames.length} nguyên liệu
                  </span>
                )}
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  variant="modern"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm nguyên liệu..."
                  className="pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Ingredients List */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800/50">
                <div className="max-h-64 lg:max-h-80 overflow-y-auto p-3 lg:p-4">
                  {filteredIngredients.length === 0 ? (
                    <div className="py-8 text-center">
                      <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                      <p className="text-sm text-muted-foreground">
                        {searchQuery ? "Không tìm thấy nguyên liệu" : "Chưa có nguyên liệu nào"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {filteredIngredients.map((i) => {
                        const checked = ingredientIds.includes(i.id);
                        return (
                          <label
                            key={i.id}
                            className={`
                              flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-200
                              ${checked
                                ? 'bg-sage-100 dark:bg-sage-900/30 border-2 border-sage-500 dark:border-sage-600'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-700'
                              }
                            `}
                          >
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setIngredientIds((prev) => {
                                    if (e.target.checked) return [...prev, i.id];
                                    return prev.filter((x) => x !== i.id);
                                  });
                                }}
                                className="sr-only"
                              />
                              <div className={`
                                w-5 h-5 rounded border-2 flex items-center justify-center transition-all
                                ${checked
                                  ? 'bg-sage-500 border-sage-500 dark:bg-sage-600 dark:border-sage-600'
                                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                                }
                              `}>
                                {checked && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                )}
                              </div>
                            </div>
                            <span className={`text-sm flex-1 ${checked ? 'font-medium text-sage-900 dark:text-sage-100' : 'text-foreground'}`}>
                              {i.ten_nguyen_lieu}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setName("");
                  setIngredientIds([]);
                  setImageUrl("");
                  setSelectedImageFile(null);
                  setTags("");
                  setSearchQuery("");
                }}
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Làm mới
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="gap-2 min-w-[120px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {dishId ? "Cập nhật" : "Lưu"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



