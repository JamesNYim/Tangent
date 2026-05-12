from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    func,
    UniqueConstraint,
);

from sqlalchemy.orm import relationship
from app.db.session import Base

class UserAPIKeys(Base):
    __tablename__ = "user_api_keys"
    
    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    provider = Column(String, nullable=False)

    encrypted_api_key = Column(String, nullable=False)

    init_vector = Column(String, nullable=False)

    auth_tag = Column(String, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="api_keys")

    __tableargs__ = (UniqueConstraint("user_id", "provider", name="unique_user_provider"))
