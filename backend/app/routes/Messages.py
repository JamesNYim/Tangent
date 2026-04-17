from typing import List
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

def get_conversation_for_user(db: Session, conversation_id: int, user_id: int) -> Conversation | None:
    query = db.query(Conversation)
    filtered_query = query.filter(Conversation.id == conversation_id, Conversation.user_id == user_id)
    conversation = filtered_query.first()
    return conversation

def get_msg_path_to_root(db: Session, message_id: int) -> List[Message]:
    path: List[Message] = []
    current_node = db.query(Message).filter(Message.id == message_id).first()

    while current_node is not None:
        path.append(current_node)
        if current_node.parent_msg_id == None:
            break
        current_node = db.query(Message).filter(Message.id == current_node.parent_msg_id).first()
    path.reverse()
    return path


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(conversation_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    convo = get_conversation_for_user(db, conversation_id, user_id)

    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    query = db.query(Message)
    filtered_query = query.filter(Message.conversation_id == conversation_id)
    ordered_query = filtered_query.order_by(Message.created_at.asc(), Message.id.asc())
    messages = ordered_query.all()
    
    return messages

@router.post("/conversations/{conversation_id}/messages", response_model=SendMessageResponse)
def send_message(conversation_id: int, payload: MessageCreate, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):

    user_id = current_user["id"]
    convo = get_conversation_for_user(db, conversation_id, user_id)

    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")
 
    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    user = db.query(User).filter(User.id == current_user["id"]).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    parent_message = None

    if payload.parent_msg_id is not None:
        parent_message = (db.query(Message).filter(Message.id == payload.parent_msg_id, Message.conversation_id == conversation_id).first())
        if parent_message is None:
            raise HTTPException(status_code=400, detail="Cannot find parent msg in current conversation")

    else: 
        existing_msg = (db.query(Message).filter(Message.conversation_id == conversation_id).first())
        if existing_msg is not None:
            raise HTTPException(status_code=400, detail="Parent_msg_id required for non-root messages")
            
    if payload.branch_from_message_id is not None:
        query = db.query(Message)
        filtered_query = query.filter(Message.id == payload.branch_from_message_id, Message.conversation_id == conversation_id)
        branch_source = filtered_query.first()

        if branch_source is None:
            raise HTTPException(status_code=400, detail="Cannot find branch source message in current conversation")

    user_message = Message(
        conversation_id = conversation_id,
        role = "user",
        content = content,
        parent_msg_id = payload.parent_msg_id,
        branch_from_message_id = payload.branch_from_message_id,
        branch_from_text = payload.branch_from_text
    )
    db.add(user_message)
    db.flush()


    # get full history after saving user message
    context_messages = get_msg_path_to_root(db, user_message.id)

    try:
        ai_text = generate_ai_msg(
            context=build_chat_msgs(context_messages),
            user=user
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    ai_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=ai_text,
        parent_msg_id = user_message.id
    )
    db.add(ai_message)
    db.flush()
    is_branch_msg = payload.branch_from_message_id is not None
    if not is_branch_msg:
        convo.main_leaf_id = ai_message.id

    # optional: auto-title the conversation from first message
    if convo.title == "New Chat":
        convo.title = content[:40]
        db.add(convo)

    db.commit()
    db.refresh(user_message)
    db.refresh(ai_message)

    return SendMessageResponse(
        user_message=user_message,
        ai_message=ai_message,
    )
