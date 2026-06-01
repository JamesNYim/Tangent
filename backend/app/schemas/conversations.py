from pydantic import BaseModel
from datetime import datetime

class ConversationCreate(BaseModel):
    title: str | None = None

class ConversationUpdate(BaseModel):
    title: str | None = None

class ConversationOut(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime
    main_leaf_id: int | None = None

    class Config:
        from_attributes = True
