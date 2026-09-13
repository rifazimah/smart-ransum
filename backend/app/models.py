from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class BahanPakan(Base):
    __tablename__ = "bahan_pakan"
    id = Column(Integer, primary_key=True, index=True)
    nama_bahan = Column(String, index=True)
    stok_kg = Column(Float, default=0.0)
    harga_per_kg = Column(Float, default=0.0)
    max_persentase_penggunaan = Column(Float, default=100.0)
    protein_persen = Column(Float, default=0.0)
    energi_kcal = Column(Float, default=0.0)
    kalsium_persen = Column(Float, default=0.0)
    fosfor_persen = Column(Float, default=0.0)

class FaseAyam(Base):
    __tablename__ = "fase_ayam"
    id = Column(Integer, primary_key=True, index=True)
    nama_fase = Column(String, unique=True, index=True)
    min_protein_persen = Column(Float, default=0.0)
    max_protein_persen = Column(Float, default=100.0)
    min_energi_kcal = Column(Float, default=0.0)
    max_energi_kcal = Column(Float, default=10000.0)
    min_kalsium_persen = Column(Float, default=0.0)
    max_kalsium_persen = Column(Float, default=100.0)
    konsumsi_harian_kg = Column(Float, default=0.1)

class RiwayatKalkulasi(Base):
    __tablename__ = "riwayat_kalkulasi"
    id = Column(Integer, primary_key=True, index=True)
    fase_id = Column(Integer, ForeignKey("fase_ayam.id"))
    tanggal_kalkulasi = Column(DateTime, default=datetime.utcnow)
    populasi_ekor = Column(Integer)
    target_produksi_kg = Column(Float)
    total_harga_produksi = Column(Float)
    status = Column(String, default="DRAFT")  # 'DRAFT' or 'DIPRODUKSI'
    
    fase = relationship("FaseAyam")
    details = relationship("DetailKalkulasi", back_populates="kalkulasi")

class DetailKalkulasi(Base):
    __tablename__ = "detail_kalkulasi"
    id = Column(Integer, primary_key=True, index=True)
    kalkulasi_id = Column(Integer, ForeignKey("riwayat_kalkulasi.id"))
    bahan_id = Column(Integer, ForeignKey("bahan_pakan.id"))
    jumlah_pakai_kg = Column(Float)
    subtotal_harga = Column(Float)
    
    kalkulasi = relationship("RiwayatKalkulasi", back_populates="details")
    bahan = relationship("BahanPakan")
