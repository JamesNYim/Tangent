from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.auth import get_current_user
from app.models.users import User
from app.schemas.users import APIKeyInput

router = APIRouter(tags=["users"])


@router.post("/users/api-key")
def set_api_key(
    data: APIKeyInput,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user["id"]).first()

    user.api_key = data.api_key

    db.commit()
    db.refresh(user)

    return {"message": "API key saved"}
