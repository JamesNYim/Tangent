from pydantic import BaseModel

class APIKeyInput(BaseModel):
    api_key: str
