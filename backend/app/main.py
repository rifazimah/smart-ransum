from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import bahan_pakan, fase_ayam, kalkulasi, websockets

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SmartRansum API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(bahan_pakan.router, prefix="/api/bahan-pakan", tags=["Bahan Pakan"])
app.include_router(fase_ayam.router, prefix="/api/fase-ayam", tags=["Fase Ayam"])
app.include_router(kalkulasi.router, prefix="/api/kalkulasi", tags=["Kalkulasi"])
app.include_router(websockets.router, prefix="/ws", tags=["WebSockets"])

@app.get("/")
def read_root():
    return {"message": "Welcome to SmartRansum API"}
