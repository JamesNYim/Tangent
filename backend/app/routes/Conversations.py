from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.conversations import Conversation
from app.schemas.conversations import ConversationCreate, ConversationOut
from app.api.auth import get_current_user

router = APIRouter(prefix="/conversations", tags=["conversations"])

@router.post("", response_model=ConversationOut)
def create_conversation(payload: ConversationCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    if (payload.title and payload.title.strip()):
        title = payload.title.strip()
    else:
        title = "New Chat"

    convo = Conversation(
        user_id=current_user["id"],
        title=title,
    )

    db.add(convo)
    db.commit()
    db.refresh(convo)

    return convo

@router.get("", response_model=list[ConversationOut])
def list_conversations(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    query = db.query(Conversation)
    filtered_query = query.filter(Conversation.user_id == current_user["id"])
    ordered_query = filtered_query.order_by(Conversation.created_at.desc(), Conversation.id.desc())
    conversations = ordered_query.all()
    return conversations
