from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.conversations import Conversation
from app.models.messages import Message
from app.models.users import User
from app.schemas.messages import MessageCreate, MessageOut, SendMessageResponse
from app.services.ai import build_chat_msgs, generate_ai_msg
from app.api.auth import get_current_user

router = APIRouter(tags=["messages"])

@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(conversation_id: int, db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    query = db.query(Conversation)
    filtered_query = query.filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
    convo = filtered_query.first()

    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    query = db.query(Message)
    filtered_query = query.filter(Message.conversation_id == conversation_id)
    ordered_query = filtered_query.order_by(Message.created_at.asc(), Message.id.asc())
    messages = ordered_query.all()
    
    return messages

@router.post("/conversations/{conversation_id}/messages", response_model=SendMessageResponse)
def send_message(conversation_id: int, payload: MessageCreate, db: Session = Depends(get_db), user_id: int = Depends(get_current_user)):
    query = db.query(Conversation)
    filtered_query = query.filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
    convo = filtered_query.first()

    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
 
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    # save user message
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=content,
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    # get full history after saving user message
    query = db.query(Message)
    filtered_query = query.filter(Message.conversation_id == conversation_id)
    ordered_query = filtered_query.order_by(Message.created_at.asc(), Message.id.asc())
    context_messages = ordered_query.all()

    user = db.query(User).filter(User.id == user_id).first()
    user_api_key = user.api_key if user else None

    try:
        ai_text = generate_ai_reply(
            context=build_chat_messages(context_messages),
            user_api_key=user_api_key,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    ai_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=ai_text,
    )
    db.add(ai_message)
    db.commit()
    db.refresh(ai_message)

    # optional: auto-title the conversation from first message
    if convo.title == "New Chat":
        convo.title = content[:40]
        db.add(convo)
        db.commit()

    return SendMessageResponse(
        user_message=user_message,
        ai_message=ai_message,
    )
