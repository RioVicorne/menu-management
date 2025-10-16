"use client";

import { RecipeForm } from "@/components/features";
import { useRouter } from "next/navigation";

export default function NewRecipePage() {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Thêm món mới</h1>
      <RecipeForm onSaved={(dish) => router.push(`/recipes/${dish.id}`)} />
    </div>
  );
}




