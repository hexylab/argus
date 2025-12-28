#!/usr/bin/env python3
"""Generate Supabase anon key (JWT) for local development."""

import sys

import jwt
from datetime import datetime, timedelta, UTC


def generate_anon_key(secret: str) -> str:
    """Generate a JWT anon key using the provided secret."""
    payload = {
        "role": "anon",
        "iss": "supabase",
        "iat": datetime.now(UTC),
        "exp": datetime.now(UTC) + timedelta(days=365),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        secret = sys.argv[1]
    else:
        secret = "super-secret-jwt-token-for-local-development-only"
    
    print(generate_anon_key(secret))
