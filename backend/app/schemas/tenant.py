from datetime import datetime
from pydantic import BaseModel, Field

class TenantBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=64)
    name: str = Field(..., min_length=1, max_length=128)

class TenantRegister(TenantBase):
    password: str = Field(..., min_length=6, max_length=128)

class TenantLogin(BaseModel):
    username: str
    password: str

class TenantOut(TenantBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant: TenantOut
