/*
  Import menu.csv into Supabase tables.
  - Parses the provided CSV file path
  - For each weekday row with numbered dishes, inserts rows into mon_an (if missing) and thuc_don for a chosen month/week pattern
  Usage:
    npx tsx scripts/import-menu.ts ../../menu.csv 2025-07-01
*/

import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const csvPath = process.argv[2];
const baseDateISO = process.argv[3]; // e.g. 2025-07-01 (Monday optional)

if (!csvPath || !baseDateISO) {
  console.error("Usage: tsx scripts/import-menu.ts <csvPath> <baseDateISO>");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type DayMap = { [label: string]: number };
const dayIndex: DayMap = {
  "Thứ 2": 1,
  "Thứ 3": 2,
  "Thứ 4": 3,
  "Thứ 5": 4,
  "Thứ 6": 5,
  "Thứ 7": 6,
}; // skipping CN

function nextDate(base: Date, offsetDays: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function ensureDish(name: string): Promise<string> {
  // Try find by name
  const { data: found, error: findErr } = await supabase
    .from("mon_an")
    .select("id")
    .eq("ten_mon_an", name)
    .limit(1)
    .maybeSingle();
  if (findErr) throw findErr;
  if (found?.id) return found.id as string;
  const { data: created, error: insErr } = await supabase
    .from("mon_an")
    .insert({ ten_mon_an: name })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return created!.id as string;
}

async function insertMenu(dateISO: string, dishName: string) {
  const dishId = await ensureDish(dishName);
  const { error } = await supabase
    .from("thuc_don")
    .insert({ ngay: dateISO, ma_mon_an: dishId, boi_so: 1 });
  if (error) throw error;
}

async function main() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    throw new Error(
      "Missing env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  const abs = path.resolve(csvPath);
  const text = fs.readFileSync(abs, "utf8");
  const lines = text.split(/\r?\n/);
  const base = new Date(baseDateISO);

  let currentWeekOffset = 0;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("Tuần")) {
      // each new week moves by 7 days
      if (line.includes("Tuần 1")) currentWeekOffset = 0;
      else if (line.includes("Tuần 2")) currentWeekOffset = 7;
      else if (line.includes("Tuần 3")) currentWeekOffset = 14;
      else if (line.includes("Tuần 4")) currentWeekOffset = 21;
      continue;
    }
    const dayKey = Object.keys(dayIndex).find((k) => line.startsWith(k));
    if (!dayKey) continue;
    const dayOffset = dayIndex[dayKey];
    const dateISO = nextDate(base, currentWeekOffset + (dayOffset - 1));
    // collect subsequent cells joined by commas after the first column
    const cells = line.split(",");
    // dish list usually in column 2: extract numbered entries like "1. ..."
    const numbered =
      cells[1]
        ?.split(/\n/)
        .map((s) => s.trim())
        .filter(Boolean) || [];
    for (const n of numbered) {
      const m = n.match(/\d+\.\s*(.+)/);
      const dishName = (m ? m[1] : n).trim();
      if (!dishName) continue;
      // ignore shopping list rows
      if (/Cần đi chợ|Những thứ cần|Mua/.test(dishName)) continue;
      await insertMenu(dateISO, dishName);
      console.log("Inserted", dateISO, dishName);
    }
  }
  console.log("Done import");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
