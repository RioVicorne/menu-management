import { supabase } from "./supabase";

/**
 * Upload an image file to Supabase Storage and return its public URL.
 * Expects a storage bucket named "dish-images" to exist and be public.
 */
export async function uploadDishImage(file: File, opts?: { dishId?: string }): Promise<string> {
  if (!supabase) {
    throw new Error("Supabase is not configured. Cannot upload images in mock mode.");
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Chỉ hỗ trợ file ảnh: JPEG, PNG, WebP, GIF");
  }

  // Validate file size (10MB max)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("File quá lớn. Kích thước tối đa: 10MB");
  }

  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = opts?.dishId ? `${opts.dishId}/${fileName}` : `unassigned/${fileName}`;

  try {
    const { error: uploadError } = await supabase
      .storage
      .from("dish-images")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Lỗi upload: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase
      .storage
      .from("dish-images")
      .getPublicUrl(path);

    if (!publicUrlData?.publicUrl) {
      throw new Error("Không lấy được public URL cho ảnh đã upload");
    }

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Storage upload error:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Có lỗi xảy ra khi upload ảnh");
  }
}


