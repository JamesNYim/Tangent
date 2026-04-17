from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Conversation(Base):
    __tablename__ = "conversation"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String, nullable=False, default="New Chat")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    main_leaf_id = Column(Integer, ForeignKey("messages.id"), nullable=True)

    user = relationship("User", back_populates="conversations")
    messages = relationship("Message", foreign_keys="Message.conversation_id", back_populates="conversation", cascade="all, delete-orphan")
    main_leaf = relationship("Message", foreign_keys=[main_leaf_id], post_update=True)
