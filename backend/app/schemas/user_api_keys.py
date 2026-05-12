from pydantic import BaseModel

class APIKeySaveRequest(BaseModel):
    provider: str
    api_key: str

class APIKeyDeleteRequest(BaseModel):
    provider: str
