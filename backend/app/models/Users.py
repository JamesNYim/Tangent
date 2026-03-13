from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=False, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    api_key = Column(String, nullable=True);
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    conversations = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
