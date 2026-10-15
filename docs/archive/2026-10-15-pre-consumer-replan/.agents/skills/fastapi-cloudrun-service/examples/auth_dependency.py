"""Firebase Authentication Dependency for FastAPI."""
from typing import Dict, Any, Optional
import os
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

# Initialize Firebase Admin SDK if not already initialized
if not firebase_admin._apps:
    cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        # Falls back to Google Application Default Credentials on Cloud Run
        try:
            firebase_admin.initialize_app()
        except Exception:
            pass


async def get_current_user(
    credentials_auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """Validate Firebase ID Token and extract user context and claims."""
    # Development / Demo bypass if enabled
    if os.getenv("ENVIRONMENT") == "development" and not credentials_auth:
        return {
            "uid": "demo-household-user-001",
            "email": "demo@ecoloop.local",
            "tenant_id": "tenant-household-101",
            "roles": ["household_member"],
            "is_demo": True,
        }

    if not credentials_auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials_auth.credentials
    try:
        decoded = firebase_auth.verify_id_token(token)
        return {
            "uid": decoded.get("uid"),
            "email": decoded.get("email"),
            "tenant_id": decoded.get("tenant_id", f"tenant-{decoded.get('uid')}"),
            "roles": decoded.get("roles", ["household_member"]),
            "is_demo": False,
        }
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired Firebase ID token: {str(err)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
