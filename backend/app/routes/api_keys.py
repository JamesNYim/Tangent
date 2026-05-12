from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db

from app.models.user_api_keys import UserAPIKeys
from app.schema.user_api_keys import APIKeySaveRequest, APIKeyDeleteRequest
from app.api.encryption import encrypt_api_key, decrypt_api_key

from app.api.auth import get_current_user

router = APIRouter(prefix="/api-keys", tags=["API Keys"])

@router.post("")
def save_api_key(
    body: APIKeySaveRequest, 
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user),
    ):

    user_id = current_user["id"]

    encrypted = encrypt_api_key(body.api_key)

    query = db.query(UserAPIKeys)
    filtered_query = query.filter(UserAPIKeys.user_id == user_id, UserAPIKeys.provider == body.provider)
    existing_key = filtered_query.first()

    if existing_key:
        existing_key.encrypted_api_key = encrypted["encrypted_api_key"]
        existing_key.init_vector = encrypted["init_vector"]
        existing_key.auth_tag = encrypted["auth_tag"]

    else:
        new_key = UserAPIKeys(
            user_id = user_id,
            provider = body.provider,
            encrypted_api_key = encrypted["encrypted_api_key"],
            init_vector = encrypted["init_vector"],
            auth_tag = encrypted["auth_tag"],
        )
        db.add(new_key)

    db.commit()

    return { "success": True, "message": "API Key saved", "provider": body.provider }

@router.get("")
def list_api_key_providers(
    db: Session = Depends(get_db), 
    current_user: dict = Depends(get_current_user),
    ):

    user_id = current_user["id"]
    query = db.query(UserAPIKeys)
    filtered_query = query.filter(UserAPIKeys.user_id == user_id)
    keys = filtered_query.all()

    api_keys: list[dict] = []
    for key in keys:
        key_info = {
            "provider": key.provider,
            "created_at": key.created_at,
            "last_used_at": key.last_used_at,
        }
        api_keys.append(key_info)

    return { "api_keys": api_keys }

@router.get("/{provider}/exists")
def api_key_exists(
    provider: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    ):
    
    user_id = current_user["id"]
    query = db.query(UserAPIKeys)
    filtered_query = query.filter(UserAPIKeys.user_id == user_id, UserAPIKeys.provider == provider)
    key = filtered_query.first()

    return {"provider": provider, "exists": key is not None}

@router.delete("")
def delete_api_key(
    body: APIKeyDeleteRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    ):
    
    user_id = current_user["id"]
    query = db.query(UserAPIKeys)
    filtered_query = query.filter(UserAPIKeys.user_id == user_id, UserAPIKeys.provider == body.provider)
    key = filtered_query.first()

    if not key:
        raise HTTPException(status_code=404, detail="Key not found")

    db.delete(key)
    db.commit()

    return { "success": True, "message": "API key deleted", "provider": body.provider }

def get_decrypted_key(
    provider: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    ) -> str:

    user_id = current_user["id"]
    query = db.query(UserAPIKeys)
    filtered_query = query.filter(UserAPIKeys.user_id == user_id, UserAPIKeys.provider == provider)
    key = filtered_query.first()

    if not key:
        raise HTTPException(status_code=404, detail="Key not found")

    decrypted_key = decrypt_api_key(key.encrypted_api_key, key.init_vector, key.auth_tag)
    key.last_used_at = func.now()
    db.commit()

    return decrypted_key
