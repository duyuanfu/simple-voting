import time
from collections import defaultdict
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import decode_access_token
from app.models.entities import Tenant

security_scheme = HTTPBearer(auto_error=False)

def get_current_tenant(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
) -> Tenant:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    tenant_id = payload.get("sub")
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject",
        )
    
    tenant = db.query(Tenant).filter(Tenant.id == int(tenant_id)).first()
    if not tenant or not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant not found or inactive",
        )
    
    return tenant


def get_client_ip(request: Request) -> str:
    # Handle reverse proxies (Cloudflare, Nginx, etc.)
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()
    
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        # First IP in X-Forwarded-For is client
        return xff.split(",")[0].strip()
    
    if request.client and request.client.host:
        return request.client.host
    
    return "127.0.0.1"


# Sliding window in-memory rate limiter for burst protection
_ip_request_timestamps = defaultdict(list)

def check_ip_rate_limit(request: Request, burst_limit: int = 10, window_seconds: int = 10):
    client_ip = get_client_ip(request)
    now = time.time()
    
    # Prune old timestamps
    timestamps = [t for t in _ip_request_timestamps[client_ip] if now - t < window_seconds]
    if len(timestamps) >= burst_limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="投票请求过于频繁，请稍后再试",
        )
    
    timestamps.append(now)
    _ip_request_timestamps[client_ip] = timestamps
