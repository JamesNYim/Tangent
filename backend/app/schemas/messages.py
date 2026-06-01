from pydantic import BaseModel
from datetime import datetime

class MessageCreate(BaseModel):
    content: str
    parent_msg_id: int | None = None
    branch_from_message_id: int | None = None
    branch_from_text: str | None = None


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    created_at: datetime
    parent_msg_id: int | None = None
    branch_from_message_id: int | None = None
    branch_from_text: str | None = None

    class Config:
        from_attributes = True


class SendMessageResponse(BaseModel):
    user_message: MessageOut
    ai_message: MessageOut
