import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

type Payload = {
  name: string;
  source: string;
  quantity: number;
  unit: string;
};

const countableUnits = ["cái", "gói", "chai", "lon", "hộp", "túi"];
const weightOrVolumeUnits = ["kg", "g", "l", "ml"]; // float column

export async function POST(req: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    // Admin password removed per request; endpoint is public (still server-side)

    const body = (await req.json()) as Partial<Payload>;
    const name = (body.name || "").trim();
    const source = (body.source || "").trim();
    const quantity = Number(body.quantity || 0);
    const unit = (body.unit || "").trim();

    if (!name) return NextResponse.json({ error: "Tên nguyên liệu bắt buộc" }, { status: 400 });
    if (!source) return NextResponse.json({ error: "Nguồn nhập bắt buộc" }, { status: 400 });
    if (!quantity || quantity <= 0) return NextResponse.json({ error: "Số lượng/khối lượng phải > 0" }, { status: 400 });

    // Duplicate check
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("nguyen_lieu")
      .select("id")
      .eq("ten_nguyen_lieu", name)
      .limit(1);

    if (selErr) {
      logger.error("Admin select error:", selErr);
      return NextResponse.json({ error: selErr.message }, { status: 500 });
    }
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "Nguyên liệu này đã tồn tại trong kho" }, { status: 409 });
    }

    const insertData: Record<string, unknown> = {
      ten_nguyen_lieu: name,
      nguon_nhap: source
    };

    if (countableUnits.includes(unit)) {
      insertData.ton_kho_so_luong = quantity;
    } else if (weightOrVolumeUnits.includes(unit)) {
      insertData.ton_kho_khoi_luong = quantity;
    } else {
      insertData.ton_kho_so_luong = quantity;
    }

    const { error: insErr } = await supabaseAdmin.from("nguyen_lieu").insert(insertData);
    if (insErr) {
      logger.error("Admin insert error:", insErr);
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    logger.error("API /api/ingredients error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


