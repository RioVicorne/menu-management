"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

function parseDate(param: string) {
	const [y, m, d] = param.split("-").map(Number);
	return new Date(y, (m || 1) - 1, d || 1);
}

export default function DailyPage({ params }: { params: { date: string } }) {
	const date = useMemo(() => parseDate(params.date), [params.date]);
	const [tab, setTab] = useState<"menu" | "inventory" | "add">("menu");

	const label = date.toLocaleDateString(undefined, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	// Load today's menu (thuc_don joined with mon_an)
	type DishRow = { id: string; boi_so: number; ghi_chu: string | null; ma_mon_an: string | null; ten_mon_an: string | null };
	const [dishes, setDishes] = useState<DishRow[]>([]);
	const iso = params.date;
	async function refresh() {
		const { data, error } = await supabase
			.from("thuc_don")
			.select("id, boi_so, ghi_chu, ma_mon_an, mon_an:ma_mon_an(ten_mon_an)")
			.eq("ngay", iso);
		if (error) {
			console.error(error);
			setDishes([]);
			return;
		}
		const mapped = (data ?? []).map((r: any) => ({
			id: r.id,
			boi_so: r.boi_so,
			ghi_chu: r.ghi_chu,
			ma_mon_an: r.ma_mon_an,
			ten_mon_an: r.mon_an?.ten_mon_an ?? null,
		})) as DishRow[];
		setDishes(mapped);
	}
	useEffect(() => { refresh(); }, [iso]);

	// Add dish flow
	type MonAn = { id: string; ten_mon_an: string | null };
	const [options, setOptions] = useState<MonAn[]>([]);
	const [selected, setSelected] = useState<string>("");
	const [multiplier, setMultiplier] = useState<number>(1);
	const [note, setNote] = useState<string>("");
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		(async () => {
			const { data, error } = await supabase.from("mon_an").select("id, ten_mon_an").order("ten_mon_an", { ascending: true });
			if (error) {
				console.error(error);
				setOptions([]);
				return;
			}
			setOptions((data ?? []) as MonAn[]);
		})();
	}, []);

	async function handleAdd() {
		if (!selected || multiplier <= 0) return;
		setSaving(true);
		try {
			const { error } = await supabase
				.from("thuc_don")
				.insert({ ngay: iso, ma_mon_an: selected, boi_so: multiplier, ghi_chu: note });
			if (error) throw error;
			await refresh();
			setSelected("");
			setMultiplier(1);
			setNote("");
			setTab("menu");
		} catch (e) {
			console.error(e);
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete(id: string) {
		const prev = dishes;
		setDishes((d) => d.filter((x) => x.id !== id));
		const { error } = await supabase.from("thuc_don").delete().eq("id", id);
		if (error) {
			console.error(error);
			setDishes(prev);
		}
	}

	async function handleEdit(id: string, updates: Partial<Pick<DishRow, "boi_so" | "ghi_chu">>) {
		const prev = dishes;
		setDishes((d) => d.map((x) => (x.id === id ? { ...x, ...updates } : x)));
		const { error } = await supabase.from("thuc_don").update(updates).eq("id", id);
		if (error) {
			console.error(error);
			setDishes(prev);
		}
	}

	// Inventory calculations
	type InventoryRow = {
		ma_nguyen_lieu: string;
		ten_nguyen_lieu: string | null;
		nguon_nhap: string | null;
		need_qty: number; // count-based
		need_weight: number; // kg or unit weight based on schema
		stock_qty: number; // nguyen_lieu.ton_kho_so_luong
		stock_weight: number; // nguyen_lieu.ton_kho_khoi_luong
		status: "in" | "low" | "out";
	};
	const [filterLowOnly, setFilterLowOnly] = useState(false);
	const [inventory, setInventory] = useState<InventoryRow[]>([]);

	useEffect(() => {
		(async () => {
			if (dishes.length === 0) { setInventory([]); return; }
			const dishIds = dishes.map(d => d.ma_mon_an).filter(Boolean) as string[];
			const { data: comps, error: compErr } = await supabase
				.from("thanh_phan")
				.select("ma_mon_an, ma_nguyen_lieu, so_nguoi_an, khoi_luong_nguyen_lieu, so_luong_nguyen_lieu")
				.in("ma_mon_an", dishIds);
			if (compErr) { console.error(compErr); setInventory([]); return; }

			// Sum requirements scaled by servings
			const needByIngredient = new Map<string, { need_qty: number; need_weight: number }>();
			for (const comp of comps ?? []) {
				const forDish = dishes.find(d => d.ma_mon_an === comp.ma_mon_an);
				const basePeople = comp.so_nguoi_an ?? 1;
				const factor = (forDish?.boi_so ?? 1) / (basePeople || 1);
				const addQty = (comp.so_luong_nguyen_lieu ?? 0) * factor;
				const addWeight = (comp.khoi_luong_nguyen_lieu ?? 0) * factor;
				const prev = needByIngredient.get(comp.ma_nguyen_lieu) ?? { need_qty: 0, need_weight: 0 };
				needByIngredient.set(comp.ma_nguyen_lieu, {
					need_qty: prev.need_qty + addQty,
					need_weight: prev.need_weight + addWeight,
				});
			}

			const ids = Array.from(needByIngredient.keys());
			if (ids.length === 0) { setInventory([]); return; }
			const { data: ings, error: ingErr } = await supabase
				.from("nguyen_lieu")
				.select("id, ten_nguyen_lieu, nguon_nhap, ton_kho_so_luong, ton_kho_khoi_luong")
				.in("id", ids);
			if (ingErr) { console.error(ingErr); setInventory([]); return; }

			const rows: InventoryRow[] = (ings ?? []).map((ing: any) => {
				const need = needByIngredient.get(ing.id)!;
				const stockQty = Number(ing.ton_kho_so_luong ?? 0);
				const stockWeight = Number(ing.ton_kho_khoi_luong ?? 0);
				const qtyOk = stockQty - need.need_qty;
				const weightOk = stockWeight - need.need_weight;
				let status: InventoryRow["status"] = "in";
				if (qtyOk < 0 || weightOk < 0) status = "out";
				else if (qtyOk < 1 && weightOk < 0.1) status = "low"; // heuristic threshold
				return {
					ma_nguyen_lieu: ing.id,
					ten_nguyen_lieu: ing.ten_nguyen_lieu,
					nguon_nhap: ing.nguon_nhap,
					need_qty: Number(need.need_qty.toFixed(2)),
					need_weight: Number(need.need_weight.toFixed(2)),
					stock_qty: stockQty,
					stock_weight: stockWeight,
					status,
				};
			});
			setInventory(rows);
		})();
	}, [dishes]);

	return (
		<div className="py-6 space-y-6">
			<div className="flex items-center justify-between gap-3">
				<h1 className="text-xl font-semibold">{label}</h1>
				<Link href="/app" className="px-3 py-1 rounded border">Back to Calendar</Link>
			</div>

			<div className="flex gap-2">
				<button className={`px-3 py-1 rounded border ${tab==='menu'?'bg-muted':''}`} onClick={() => setTab('menu')}>Today’s Menu</button>
				<button className={`px-3 py-1 rounded border ${tab==='inventory'?'bg-muted':''}`} onClick={() => setTab('inventory')}>Inventory Management</button>
				<button className={`px-3 py-1 rounded border ${tab==='add'?'bg-muted':''}`} onClick={() => setTab('add')}>Add New Dish</button>
			</div>

			{tab === 'menu' && (
				<section className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="font-medium">Dishes</h2>
						<button className="px-3 py-1 rounded border" onClick={() => setTab('add')}>+ Add Dish</button>
					</div>
					<div className="grid gap-3">
						{dishes.length === 0 && (
							<div className="rounded border p-3 text-sm text-muted-foreground">No dishes yet.</div>
						)}
						{dishes.map((d) => (
							<div key={d.id} className="rounded border p-3">
								<div className="font-medium">{d.ten_mon_an ?? "Unnamed dish"}</div>
								<div className="text-sm text-muted-foreground">Servings: {d.boi_so} • Notes: {d.ghi_chu ?? "-"}</div>
								<div className="flex gap-2 mt-2 items-center">
									<input type="number" min={1} className="rounded border px-2 py-1 w-24" value={d.boi_so} onChange={(e)=>handleEdit(d.id,{boi_so:Number(e.target.value)||1})} />
									<input className="rounded border px-2 py-1" placeholder="Notes" value={d.ghi_chu ?? ''} onChange={(e)=>handleEdit(d.id,{ghi_chu:e.target.value})} />
									<button className="px-2 py-1 rounded border" onClick={()=>handleDelete(d.id)}>Delete</button>
								</div>
							</div>
						))}
					</div>
					<div className="rounded border p-3 flex items-center justify-between">
						<div className="text-sm">Total dishes: {dishes.length}</div>
						<div className="text-sm">Total servings: {dishes.reduce((a,b)=>a+(b.boi_so||0),0)}</div>
						<div className="text-sm">Total calories: 0</div>
					</div>
				</section>
			)}

			{tab === 'inventory' && (
				<section className="space-y-4">
					<div className="flex items-center justify-between">
						<h2 className="font-medium">Ingredients for the day</h2>
						<div className="flex gap-2 items-center">
							<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filterLowOnly} onChange={(e)=>setFilterLowOnly(e.target.checked)} /> Show Low/Out only</label>
						</div>
					</div>
					<div className="grid gap-3">
						{inventory.filter(r=>!filterLowOnly || r.status!=='in').map((row) => (
							<div key={row.ma_nguyen_lieu} className="rounded border p-3 flex items-center justify-between">
								<div>
									<div className="font-medium">{row.ten_nguyen_lieu ?? row.ma_nguyen_lieu}</div>
									<div className="text-xs text-muted-foreground">{row.nguon_nhap ?? 'Unknown source'}</div>
									<div className="text-xs text-muted-foreground">Qty need {row.need_qty} / stock {row.stock_qty} • Weight need {row.need_weight} / stock {row.stock_weight}</div>
								</div>
								<div className={`text-xs px-2 py-1 rounded ${row.status==='out' ? 'bg-red-500/20 text-red-700 dark:text-red-300' : row.status==='low' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' : 'bg-green-500/20 text-green-700 dark:text-green-300'}`}>
									{row.status === 'in' ? 'In Stock' : row.status === 'low' ? 'Low' : 'Out of Stock'}
								</div>
							</div>
						))}
						{inventory.length===0 && (<div className="rounded border p-3 text-sm text-muted-foreground">No ingredients required.</div>)}
					</div>
					<div className="rounded border p-3 text-sm">Alerts: {inventory.some(i=>i.status!=='in')? 'Attention needed' : 'All good'}</div>
				</section>
			)}

			{tab === 'add' && (
				<section className="space-y-4">
					<h2 className="font-medium">Add New Dish</h2>
					<div className="grid gap-3 max-w-md">
						<select className="rounded border p-2" value={selected} onChange={(e)=>setSelected(e.target.value)}>
							<option value="">Select a dish</option>
							{options.map(o => (
								<option key={o.id} value={o.id}>{o.ten_mon_an ?? o.id}</option>
							))}
						</select>
						<input type="number" min={1} className="rounded border p-2" placeholder="Servings (multiplier)" value={multiplier} onChange={(e)=>setMultiplier(Number(e.target.value)||1)} />
						<input className="rounded border p-2" placeholder="Notes" value={note} onChange={(e)=>setNote(e.target.value)} />
						<div className="rounded border p-3 text-sm text-muted-foreground">Ingredient breakdown and calories preview</div>
						<button className="px-3 py-1 rounded border" disabled={saving || !selected} onClick={handleAdd}>{saving?"Adding...":"Add to Menu"}</button>
					</div>
				</section>
			)}
		</div>
	);
}


