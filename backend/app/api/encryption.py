import os
from base64 import b64encode, b64decode 
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


# Private function
def get_encryption_key() -> bytes:
    key = os.getenv("API_KEY_ENCRYPTION_KEY")

    if not key:
        raise RuntimeError("API_KEY_ENCRYPTION_KEY is not set")

    return b64decode(key) # Translates text to bytes

def encrypt_api_key(api_key: str) -> dict:
    key = get_encryption_key()
    aesgcm = AESGCM(key)
    init_vector = os.urandom(12)
    encrypted = aesgcm.encrypt(init_vector, api_key.encode("utf-8"), None) # None param symbolized data we dont wanna encrypt (headers etc)

    ciphertext = encrypted[:-16]
    auth_tag = encrypted[-16:]

    return {
        "encrypted_api_key": b64encode(ciphertext).decode("utf-8"),
        "init_vector": b64encode(init_vector).decode("utf-8"),
        "auth_tag": b64encode(auth_tag).decode("utf-8"),
    }

def decrypt_api_key(encrypted_api_key: str, init_vector: str, auth_tag: str) -> str:
    key = get_encryption_key()
    aesgcm = AESGCM(key)

    ciphertext = b64decode(encrypted_api_key)
    iv = b64decode(init_vector)
    tag = b64decode(auth_tag)

    encrypted = ciphertext + tag 

    decrypted = aesgcm.decrypt(iv, encrypted, None) # None param symbolized data we didnt want to encrypt (headers etc)

    return decrypted.decode("utf-8")




