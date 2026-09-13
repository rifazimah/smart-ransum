import os
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Base, BahanPakan, FaseAyam

def seed_db():
    print("Creating tables if not exists...")
    Base.metadata.create_all(bind=engine)
    
    db: Session = SessionLocal()

    # Seed Fase Ayam
    if db.query(FaseAyam).count() == 0:
        print("Seeding Fase Ayam...")
        fases = [
            FaseAyam(
                nama_fase="Starter (0-4 minggu)",
                min_protein_persen=21.0, max_protein_persen=23.0,
                min_energi_kcal=2900, max_energi_kcal=3000,
                min_kalsium_persen=0.9, max_kalsium_persen=1.0,
                konsumsi_harian_kg=0.05
            ),
            FaseAyam(
                nama_fase="Grower (4-8 minggu)",
                min_protein_persen=18.0, max_protein_persen=19.0,
                min_energi_kcal=2800, max_energi_kcal=2900,
                min_kalsium_persen=0.9, max_kalsium_persen=1.0,
                konsumsi_harian_kg=0.08
            ),
            FaseAyam(
                nama_fase="Layer (18+ minggu)",
                min_protein_persen=16.0, max_protein_persen=17.0,
                min_energi_kcal=2700, max_energi_kcal=2800,
                min_kalsium_persen=3.5, max_kalsium_persen=4.0,
                konsumsi_harian_kg=0.11
            )
        ]
        db.add_all(fases)
        db.commit()

    # Seed Bahan Pakan
    if db.query(BahanPakan).count() == 0:
        print("Seeding Bahan Pakan...")
        bahans = [
            BahanPakan(
                nama_bahan="Jagung Kuning", stok_kg=1000.0, harga_per_kg=5000,
                max_persentase_penggunaan=60.0, protein_persen=8.5, energi_kcal=3300,
                kalsium_persen=0.02, fosfor_persen=0.25
            ),
            BahanPakan(
                nama_bahan="Bungkil Kedelai", stok_kg=500.0, harga_per_kg=11000,
                max_persentase_penggunaan=35.0, protein_persen=44.0, energi_kcal=2230,
                kalsium_persen=0.2, fosfor_persen=0.6
            ),
            BahanPakan(
                nama_bahan="Dedak Padi", stok_kg=800.0, harga_per_kg=3500,
                max_persentase_penggunaan=20.0, protein_persen=12.0, energi_kcal=2100,
                kalsium_persen=0.1, fosfor_persen=1.5
            ),
            BahanPakan(
                nama_bahan="Tepung Ikan", stok_kg=200.0, harga_per_kg=15000,
                max_persentase_penggunaan=10.0, protein_persen=55.0, energi_kcal=2800,
                kalsium_persen=5.0, fosfor_persen=2.5
            ),
            BahanPakan(
                nama_bahan="Tepung Batu (Limestone)", stok_kg=300.0, harga_per_kg=800,
                max_persentase_penggunaan=8.0, protein_persen=0.0, energi_kcal=0.0,
                kalsium_persen=38.0, fosfor_persen=0.0
            )
        ]
        db.add_all(bahans)
        db.commit()

    print("Seeding complete!")
    db.close()

if __name__ == "__main__":
    seed_db()
