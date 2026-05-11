# To test ../api/encryption.py

from ..api.encryption import (
    encrypt_api_key,
    decrypt_api_key,
)


def test_encrypt_decrypt(plaintext: str):
    encrypted_data = encrypt_api_key(plaintext)

    decrypted_text = decrypt_api_key(
        encrypted_data["encrypted_api_key"],
        encrypted_data["init_vector"],
        encrypted_data["auth_tag"],
    )

    assert decrypted_text == plaintext


def test_encrypted_is_not_plaintext(plaintext: str):
    encrypted_data = encrypt_api_key(plaintext)

    assert encrypted_data["encrypted_api_key"] != plaintext


def test_same_key_encryption_twice_gives_diff_output(plaintext: str):
    e1_data = encrypt_api_key(plaintext)
    e2_data = encrypt_api_key(plaintext)

    assert e1_data["encrypted_api_key"] != e2_data["encrypted_api_key"]
    assert e1_data["init_vector"] != e2_data["init_vector"]


def run_test(name, test_func, *args):
    try:
        test_func(*args)
        print(f"✅ PASS: {name}")

    except AssertionError:
        print(f"❌ FAIL: {name}")

    except Exception as e:
        print(f"💥 ERROR: {name}")
        print(f"   {e}")


def main():
    print("---- Encryption Tests ----\n")

    run_test(
        "Encrypt → Decrypt returns original plaintext",
        test_encrypt_decrypt,
        "peepofinger",
    )

    run_test(
        "Encrypted output is not plaintext",
        test_encrypted_is_not_plaintext,
        "peepoFinger",
    )

    run_test(
        "Same plaintext encrypts differently twice",
        test_same_key_encryption_twice_gives_diff_output,
        "peepoFinger",
    )

    print("\n---- End Tests ----")


if __name__ == "__main__":
    main()
