from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversation.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    parent_msg_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=True, index=True)
    branch_from_message_id = Column(Integer, ForeignKey("messages.id"), nullable=True, index=True)
    branch_from_text = Column(Text, nullable=True)

    conversation = relationship("Conversation", back_populates="messages")
    parent = relationship("Message", remote_side=[id], back_populates="children")
    children = relationship("Message", back_populates="parent", cascade="all, delete-orphan")
    branch_from_message = relationship("Message", foreign_keys=[branch_from_message_id], remote_side=[id])
    
