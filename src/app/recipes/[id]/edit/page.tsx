"use client";

import RecipeForm from "@/components/recipe-form";
import { useParams, useRouter } from "next/navigation";

export default function EditRecipePage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  if (!id) return null;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chỉnh sửa món</h1>
      <RecipeForm dishId={id} onSaved={(dish) => router.push(`/recipes/${dish.id}`)} />
    </div>
  );
}




