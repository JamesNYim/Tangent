import os

from openai import OpenAI

from app.models.user_api_keys import UserAPIKeys
from app.api.encryption import decrypt_api_key

DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")

AI_DESCRIPTION = "You are Tangent, a helpful AI assistant."


def resolve_api_key(db, user, provider="openai"):
    saved_key = (
        db.query(UserAPIKeys)
        .filter(
            UserAPIKeys.user_id == user.id,
            UserAPIKeys.provider == provider,
        )
        .first()
    )

    if not saved_key:
        raise ValueError(f"No saved API key for provider: {provider}")

    return decrypt_api_key(
        saved_key.encrypted_api_key,
        saved_key.init_vector,
        saved_key.auth_tag,
    )


def build_chat_msgs(db_messages):
    formatted = []

    for msg in db_messages:
        formatted.append({
            "role": msg.role,
            "content": msg.content,
        })

    return formatted


def generate_ai_msg(db, context, user) -> str:
    api_key = resolve_api_key(db, user)

    if not api_key:
        raise ValueError("No API Key Available")

    client = OpenAI(api_key=api_key)

    response = client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=[
            {
                "role": "system",
                "content": AI_DESCRIPTION,
            },
            *context,
        ],
    )

    return response.choices[0].message.content or ""
