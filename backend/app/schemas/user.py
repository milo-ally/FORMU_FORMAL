from pydantic import BaseModel
from pydantic import ConfigDict
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(UserBase):
    id: int
    status: str
    created_at: datetime
    last_login: Optional[datetime] = None

    # Pydantic v2 style config to support ORM objects
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer" 