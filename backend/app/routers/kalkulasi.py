from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..optimization_engine import run_least_cost_formulation
import json

router = APIRouter()

@router.post("/", response_model=schemas.KalkulasiResponse)
def calculate_feed(req: schemas.KalkulasiRequest, db: Session = Depends(get_db)):
    fase = db.query(models.FaseAyam).filter(models.FaseAyam.id == req.fase_id).first()
    if not fase:
        raise HTTPException(status_code=404, detail="Fase Ayam not found")

    bahan_list = db.query(models.BahanPakan).all()
    if not bahan_list:
        raise HTTPException(status_code=400, detail="No ingredients available in DB")

    try:
        result = run_least_cost_formulation(fase, bahan_list, req.populasi_ekor)
        
        # Save to DB as DRAFT
        db_riwayat = models.RiwayatKalkulasi(
            fase_id=req.fase_id,
            populasi_ekor=req.populasi_ekor,
            target_produksi_kg=result["target_produksi_kg"],
            total_harga_produksi=result["total_harga_produksi"],
            status="DRAFT"
        )
        db.add(db_riwayat)
        db.commit()
        db.refresh(db_riwayat)

        for detail in result["details"]:
            db_detail = models.DetailKalkulasi(
                kalkulasi_id=db_riwayat.id,
                bahan_id=detail["bahan_id"],
                jumlah_pakai_kg=detail["jumlah_pakai_kg"],
                subtotal_harga=detail["subtotal_harga"]
            )
            db.add(db_detail)
        db.commit()

        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/produce/{kalkulasi_id}")
async def produce_feed(kalkulasi_id: int, db: Session = Depends(get_db)):
    riwayat = db.query(models.RiwayatKalkulasi).filter(models.RiwayatKalkulasi.id == kalkulasi_id).first()
    if not riwayat:
        raise HTTPException(status_code=404, detail="Kalkulasi not found")
    if riwayat.status == "DIPRODUKSI":
        raise HTTPException(status_code=400, detail="Already produced")

    # Check stock first
    for detail in riwayat.details:
        if detail.bahan.stok_kg < detail.jumlah_pakai_kg:
            raise HTTPException(status_code=400, detail=f"Stock insufficient for {detail.bahan.nama_bahan}")

    # Deduct stock
    from .websockets import broadcast_stock_update
    for detail in riwayat.details:
        detail.bahan.stok_kg -= detail.jumlah_pakai_kg
        # Broadcast via websocket
        await broadcast_stock_update({
            "bahan_id": detail.bahan.id,
            "stok_kg": detail.bahan.stok_kg
        })

    riwayat.status = "DIPRODUKSI"
    db.commit()

    return {"message": "Produced successfully and stock updated"}
