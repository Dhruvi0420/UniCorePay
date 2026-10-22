from fastapi import APIRouter, HTTPException, status
from app.models import Wallet, WalletTopupRequest, WalletSetBalanceRequest
from app import db

router = APIRouter(prefix="/wallet", tags=["Campus Wallet"])


@router.get("/{student_id}", response_model=Wallet)
async def get_student_wallet(student_id: str = "STU-2026-001"):
    """Get the current wallet balance and transaction ledger for a student."""
    return db.get_wallet(student_id)


@router.post("/{student_id}/topup", response_model=Wallet)
async def topup_student_wallet(student_id: str, payload: WalletTopupRequest):
    """Admin tops up a student's campus wallet balance."""
    if payload.amount <= 0:
        raise HTTPException(status_code=400, detail="Topup amount must be greater than zero")
    return db.topup_wallet(student_id, payload.amount, payload.note or "Admin Top-up")


@router.post("/{student_id}/set-balance", response_model=Wallet)
async def set_student_wallet_balance(student_id: str, payload: WalletSetBalanceRequest):
    """Admin sets exact balance for a student's campus wallet."""
    if payload.balance < 0:
        raise HTTPException(status_code=400, detail="Wallet balance cannot be negative")
    return db.set_wallet_balance(student_id, payload.balance, payload.note or "Admin Balance Update")
