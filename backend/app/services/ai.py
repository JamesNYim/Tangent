import os
from openai import OpenAI

DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
AI_DESCRIPTION = "You are Tangent, a helpful AI assistant."
def resolve_api_key(user):
    if user.api_key:
        return user.api_key
    return None
    #return OPENAI_API_KEY

def build_chat_msgs(db_messages):
    formatted = []
    for msg in db_messages:
        formatted.append({
            "role": msg.role,
            "content": msg.content,
        })
    return formatted

def generate_ai_msg(context, user) -> str:
    api_key = resolve_api_key(user)
    if not api_key:
        raise ValueError("No API Key Available")

    client = OpenAI(api_key=api_key)

    response = client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages = [
            {
                "role": "system",
                "content": AI_DESCRIPTION
            },
            *context
        ],
    )

    return (response.choices[0].message.content or "")
