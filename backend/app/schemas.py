from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Bahan Pakan
class BahanPakanBase(BaseModel):
    nama_bahan: str
    stok_kg: float
    harga_per_kg: float
    max_persentase_penggunaan: float
    protein_persen: float
    energi_kcal: float
    kalsium_persen: float
    fosfor_persen: float

class BahanPakanCreate(BahanPakanBase):
    pass

class BahanPakanResponse(BahanPakanBase):
    id: int
    class Config:
        from_attributes = True

# Fase Ayam
class FaseAyamBase(BaseModel):
    nama_fase: str
    min_protein_persen: float
    max_protein_persen: float
    min_energi_kcal: float
    max_energi_kcal: float
    min_kalsium_persen: float
    max_kalsium_persen: float
    konsumsi_harian_kg: float

class FaseAyamCreate(FaseAyamBase):
    pass

class FaseAyamResponse(FaseAyamBase):
    id: int
    class Config:
        from_attributes = True

# Kalkulasi
class KalkulasiRequest(BaseModel):
    fase_id: int
    populasi_ekor: int

class DetailKalkulasiResponse(BaseModel):
    bahan_id: int
    nama_bahan: str
    jumlah_pakai_kg: float
    subtotal_harga: float

class KalkulasiResponse(BaseModel):
    status: str
    target_produksi_kg: float
    total_harga_produksi: float
    details: List[DetailKalkulasiResponse]
