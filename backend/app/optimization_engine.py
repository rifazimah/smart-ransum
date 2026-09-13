import pulp
from typing import List, Dict, Any
from .models import FaseAyam, BahanPakan

def run_least_cost_formulation(fase: FaseAyam, bahan_list: List[BahanPakan], populasi_ekor: int) -> Dict[str, Any]:
    target_produksi_kg = populasi_ekor * fase.konsumsi_harian_kg

    prob = pulp.LpProblem("Least_Cost_Feed_Formulation", pulp.LpMinimize)

    bahan_vars = {}
    for b in bahan_list:
        if b.stok_kg > 0:
            max_qty_by_percentage = target_produksi_kg * (b.max_persentase_penggunaan / 100.0)
            max_bound = min(b.stok_kg, max_qty_by_percentage)
            bahan_vars[b.id] = pulp.LpVariable(f"bahan_{b.id}", lowBound=0, upBound=max_bound)

    if not bahan_vars:
        raise ValueError("Tidak ada bahan pakan yang tersedia dengan stok positif.")

    prob += pulp.lpSum([bahan_vars[b.id] * b.harga_per_kg for b in bahan_list if b.id in bahan_vars])

    prob += pulp.lpSum([bahan_vars[b.id] for b in bahan_list if b.id in bahan_vars]) == target_produksi_kg, "TotalWeight"

    prob += pulp.lpSum([bahan_vars[b.id] * b.protein_persen for b in bahan_list if b.id in bahan_vars]) >= fase.min_protein_persen * target_produksi_kg, "MinProtein"
    prob += pulp.lpSum([bahan_vars[b.id] * b.protein_persen for b in bahan_list if b.id in bahan_vars]) <= fase.max_protein_persen * target_produksi_kg, "MaxProtein"
    
    prob += pulp.lpSum([bahan_vars[b.id] * b.energi_kcal for b in bahan_list if b.id in bahan_vars]) >= fase.min_energi_kcal * target_produksi_kg, "MinEnergi"
    prob += pulp.lpSum([bahan_vars[b.id] * b.energi_kcal for b in bahan_list if b.id in bahan_vars]) <= fase.max_energi_kcal * target_produksi_kg, "MaxEnergi"

    prob += pulp.lpSum([bahan_vars[b.id] * b.kalsium_persen for b in bahan_list if b.id in bahan_vars]) >= fase.min_kalsium_persen * target_produksi_kg, "MinKalsium"
    prob += pulp.lpSum([bahan_vars[b.id] * b.kalsium_persen for b in bahan_list if b.id in bahan_vars]) <= fase.max_kalsium_persen * target_produksi_kg, "MaxKalsium"

    # Hardcoded limits for Fosfor since it's not in FaseAyam model
    prob += pulp.lpSum([bahan_vars[b.id] * b.fosfor_persen for b in bahan_list if b.id in bahan_vars]) >= 0.45 * target_produksi_kg, "MinFosfor"
    prob += pulp.lpSum([bahan_vars[b.id] * b.fosfor_persen for b in bahan_list if b.id in bahan_vars]) <= 0.6 * target_produksi_kg, "MaxFosfor"

    prob.solve(pulp.PULP_CBC_CMD(msg=0))

    if pulp.LpStatus[prob.status] != 'Optimal':
        raise ValueError(f"Tidak ditemukan formulasi optimal. Status: {pulp.LpStatus[prob.status]}")

    results = []
    total_cost = pulp.value(prob.objective)
    
    for b in bahan_list:
        if b.id in bahan_vars:
            qty = bahan_vars[b.id].varValue
            if qty > 0:
                results.append({
                    "bahan_id": b.id,
                    "nama_bahan": b.nama_bahan,
                    "jumlah_pakai_kg": qty,
                    "subtotal_harga": qty * b.harga_per_kg
                })

    return {
        "status": "Optimal",
        "target_produksi_kg": target_produksi_kg,
        "total_harga_produksi": total_cost,
        "details": results
    }
