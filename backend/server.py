from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import os
import logging
import random
import string
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional
from bson import ObjectId
import uuid


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client['moving_platform']

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Create the main app
app = FastAPI(title="Moving Platform API")
api_router = APIRouter(prefix="/api")

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_verification_code():
    return ''.join(random.choices(string.digits, k=6))

# Models - User type constants
USER_CUSTOMER = "customer"
USER_MOVER = "mover"
USER_ADMIN = "admin"

class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    user_type: str  # customer, mover, admin
    
    @validator('user_type')
    def validate_user_type(cls, v):
        if v not in ['customer', 'mover', 'admin', 'moderator']:
            raise ValueError('Invalid user type')
        return v

class UserRegister(UserBase):
    password: str
    company_name: Optional[str] = None  # For movers
    company_description: Optional[str] = None  # For movers
    company_images: Optional[List[str]] = []  # For movers - base64 images
    
class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    is_email_verified: bool = False
    is_phone_verified: bool = False
    is_approved: bool = False  # For movers, needs admin approval
    email_verification_code: Optional[str] = None
    phone_verification_code: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    hashed_password: str
    company_description: Optional[str] = None  # For movers
    company_images: Optional[List[str]] = []  # For movers - base64 images

class MovingRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    customer_name: str
    from_location: str
    to_location: str
    from_floor: int
    to_floor: int
    has_elevator_from: bool
    has_elevator_to: bool
    needs_mobile_elevator: bool
    truck_distance: str  # Description of truck access
    packing_service: bool  # True if customer packs, False if mover packs
    moving_date: datetime
    description: Optional[str] = None
    status: str = "pending"  # pending, approved, completed, cancelled
    selected_mover_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class MovingRequestCreate(BaseModel):
    from_location: str
    to_location: str
    from_floor: int
    to_floor: int
    has_elevator_from: bool
    has_elevator_to: bool
    needs_mobile_elevator: bool
    truck_distance: str
    packing_service: bool
    moving_date: datetime
    description: Optional[str] = None

class Bid(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_id: str
    mover_id: str
    mover_name: str
    company_name: str
    price: float
    message: Optional[str] = None
    status: str = "pending"  # pending, accepted, rejected
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BidCreate(BaseModel):
    price: float
    message: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class VerificationRequest(BaseModel):
    email: EmailStr
    verification_code: str
    verification_type: str  # email or phone

# NEW: Live Feed models
class LivePost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mover_id: str
    mover_name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    title: str
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    when: Optional[str] = None  # text-based time info
    vehicle: Optional[str] = None
    price_note: Optional[str] = None
    extra: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LivePostCreate(BaseModel):
    title: str
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    when: Optional[str] = None
    vehicle: Optional[str] = None
    price_note: Optional[str] = None
    extra: Optional[str] = None

# Helper functions
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.user_type != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# NEW: Me endpoint (returns current user)
@api_router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# Auth endpoints
@api_router.post("/register", response_model=dict)
async def register(user: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user.password)
    email_code = generate_verification_code()
    phone_code = generate_verification_code()
    
    user_dict = user.dict()
    del user_dict['password']
    user_dict['hashed_password'] = hashed_password
    user_dict['email_verification_code'] = email_code
    user_dict['phone_verification_code'] = phone_code
    user_dict['is_approved'] = user.user_type != "mover"  # Auto-approve customers and admins
    
    new_user = User(**user_dict)
    await db.users.insert_one(new_user.dict())
    
    # TODO: Send verification codes via email/SMS
    
    return {
        "message": "User registered successfully. Please verify your email and phone.",
        "email_code": email_code,  # Remove in production
        "phone_code": phone_code   # Remove in production
    }

@api_router.post("/login", response_model=Token)
async def login(login_data: LoginRequest):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user['hashed_password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user['is_email_verified'] or not user['is_phone_verified']:
        raise HTTPException(status_code=401, detail="Please verify your email and phone first")
    
    if user['user_type'] == "mover" and not user['is_approved']:
        raise HTTPException(status_code=401, detail="Your account is pending admin approval")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['id']}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# ... (rest of file remains unchanged)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_seed():
  # Seed live posts and a sample mover for quick demo
  await seed_live_feed_if_empty()
  await seed_sample_mover_if_missing()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()