from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.entities import Tenant
from app.schemas.tenant import TenantRegister, TenantLogin, TokenResponse, TenantOut
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.deps import get_current_tenant

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
def register_tenant(data: TenantRegister, db: Session = Depends(get_db)):
    existing = db.query(Tenant).filter(Tenant.username == data.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已被注册，请更换用户名",
        )
    
    tenant = Tenant(
        username=data.username,
        name=data.name,
        password_hash=get_password_hash(data.password),
        is_active=True,
    )
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    
    token = create_access_token(tenant.id)
    return TokenResponse(
        access_token=token,
        tenant=TenantOut.model_validate(tenant)
    )

@router.post("/login", response_model=TokenResponse)
def login_tenant(data: TenantLogin, db: Session = Depends(get_db)):
    tenant = db.query(Tenant).filter(Tenant.username == data.username).first()
    if not tenant or not verify_password(data.password, tenant.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    
    if not tenant.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="该租户账号已被停用",
        )
    
    token = create_access_token(tenant.id)
    return TokenResponse(
        access_token=token,
        tenant=TenantOut.model_validate(tenant)
    )

@router.get("/me", response_model=TenantOut)
def get_current_tenant_profile(current_tenant: Tenant = Depends(get_current_tenant)):
    return TenantOut.model_validate(current_tenant)
