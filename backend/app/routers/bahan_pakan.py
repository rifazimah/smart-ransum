from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.BahanPakanResponse)
def create_bahan_pakan(bahan: schemas.BahanPakanCreate, db: Session = Depends(get_db)):
    db_bahan = models.BahanPakan(**bahan.model_dump())
    db.add(db_bahan)
    db.commit()
    db.refresh(db_bahan)
    return db_bahan

@router.get("/", response_model=List[schemas.BahanPakanResponse])
def read_bahan_pakan(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.BahanPakan).offset(skip).limit(limit).all()

@router.get("/{bahan_id}", response_model=schemas.BahanPakanResponse)
def read_bahan(bahan_id: int, db: Session = Depends(get_db)):
    bahan = db.query(models.BahanPakan).filter(models.BahanPakan.id == bahan_id).first()
    if bahan is None:
        raise HTTPException(status_code=404, detail="Bahan Pakan not found")
    return bahan
