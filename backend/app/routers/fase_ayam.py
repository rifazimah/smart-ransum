from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db

router = APIRouter()

@router.post("/", response_model=schemas.FaseAyamResponse)
def create_fase_ayam(fase: schemas.FaseAyamCreate, db: Session = Depends(get_db)):
    db_fase = models.FaseAyam(**fase.model_dump())
    db.add(db_fase)
    db.commit()
    db.refresh(db_fase)
    return db_fase

@router.get("/", response_model=List[schemas.FaseAyamResponse])
def read_fase_ayam(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.FaseAyam).offset(skip).limit(limit).all()
