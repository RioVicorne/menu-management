import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    // Admin password removed per request; endpoint is public (still server-side)

    const { id } = await context.params;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const { error } = await supabaseAdmin.from("nguyen_lieu").delete().eq("id", id);
    if (error) {
      logger.error("Admin delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    logger.error("API DELETE /api/ingredients/[id] error:", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount || 0);
    const op: 'increase' | 'decrease' = body.op === 'increase' ? 'increase' : 'decrease';
    const mode: 'quantity' | 'weight' = body.mode === 'weight' ? 'weight' : 'quantity';

    if (!id || amount <= 0) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    // Fetch current stock
    const { data, error: selErr } = await supabaseAdmin
      .from('nguyen_lieu')
      .select('ton_kho_so_luong, ton_kho_khoi_luong')
      .eq('id', id)
      .single();
    if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

    const currentQty = Number(data?.ton_kho_so_luong || 0);
    const currentWgt = Number(data?.ton_kho_khoi_luong || 0);

    // Debug log
    logger.debug(`API PATCH: id=${id}, mode=${mode}, op=${op}, amount=${amount}, currentQty=${currentQty}, currentWgt=${currentWgt}`);
    logger.debug(`Request body:`, JSON.stringify(body));

    if (mode === 'quantity') {
      const newQty = op === 'increase' ? currentQty + amount : Math.max(0, currentQty - amount);
      logger.debug(`Updating quantity: ${currentQty} -> ${newQty}`);
      const { error } = await supabaseAdmin
        .from('nguyen_lieu')
        .update({ ton_kho_so_luong: newQty })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const newWgt = op === 'increase' ? currentWgt + amount : Math.max(0, currentWgt - amount);
      logger.debug(`Updating weight: ${currentWgt} -> ${newWgt}`);
      const { error } = await supabaseAdmin
        .from('nguyen_lieu')
        .update({ ton_kho_khoi_luong: newWgt })
        .eq('id', id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unexpected error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


