from fastapi import Header, HTTPException, status
from app.config import settings

def verify_service_key(x_service_key: str = Header(None, alias="X-Service-Key")):
    """
    Validates the X-Service-Key header against the configured secret key.
    Rejects missing or invalid keys with HTTP 401.
    """
    if not x_service_key or x_service_key != settings.service_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Service-Key header",
            headers={"WWW-Authenticate": "ApiKey"}
        )
    return x_service_key

