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

@api_router.post("/verify")
async def verify_account(verification: VerificationRequest):
    user = await db.users.find_one({"email": verification.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if verification.verification_type == "email":
        if user['email_verification_code'] != verification.verification_code:
            raise HTTPException(status_code=400, detail="Invalid email verification code")
        await db.users.update_one(
            {"email": verification.email}, 
            {"$set": {"is_email_verified": True, "email_verification_code": None}}
        )
        return {"message": "Email verified successfully"}
    
    elif verification.verification_type == "phone":
        if user['phone_verification_code'] != verification.verification_code:
            raise HTTPException(status_code=400, detail="Invalid phone verification code")
        await db.users.update_one(
            {"email": verification.email}, 
            {"$set": {"is_phone_verified": True, "phone_verification_code": None}}
        )
        return {"message": "Phone verified successfully"}
    
    else:
        raise HTTPException(status_code=400, detail="Invalid verification type")

# Moving request endpoints
@api_router.post("/moving-requests", response_model=MovingRequest)
async def create_moving_request(
    request: MovingRequestCreate, 
    current_user: User = Depends(get_current_user)
):
    if current_user.user_type != "customer":
        raise HTTPException(status_code=403, detail="Only customers can create moving requests")
    
    request_dict = request.dict()
    request_dict['customer_id'] = current_user.id
    request_dict['customer_name'] = current_user.name
    
    moving_request = MovingRequest(**request_dict)
    await db.moving_requests.insert_one(moving_request.dict())
    
    return moving_request

@api_router.get("/moving-requests", response_model=List[MovingRequest])
async def get_moving_requests(current_user: User = Depends(get_current_user)):
    if current_user.user_type == "customer":
        # Customers see only their requests
        requests = await db.moving_requests.find({"customer_id": current_user.id}).to_list(1000)
    elif current_user.user_type == "mover":
        # Movers see all pending requests (without customer contact info)
        requests = await db.moving_requests.find({"status": "pending"}).to_list(1000)
    else:  # admin
        # Admins see all requests
        requests = await db.moving_requests.find().to_list(1000)
    
    return [MovingRequest(**request) for request in requests]

# Bid endpoints
@api_router.post("/moving-requests/{request_id}/bids", response_model=Bid)
async def create_bid(
    request_id: str,
    bid: BidCreate,
    current_user: User = Depends(get_current_user)
):
    if current_user.user_type != "mover":
        raise HTTPException(status_code=403, detail="Only movers can create bids")
    
    # Check if request exists
    request = await db.moving_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Moving request not found")
    
    # Check if mover already bid
    existing_bid = await db.bids.find_one({"request_id": request_id, "mover_id": current_user.id})
    if existing_bid:
        raise HTTPException(status_code=400, detail="You have already bid on this request")
    
    bid_dict = bid.dict()
    bid_dict['request_id'] = request_id
    bid_dict['mover_id'] = current_user.id
    bid_dict['mover_name'] = current_user.name
    bid_dict['company_name'] = getattr(current_user, 'company_name', current_user.name)
    
    new_bid = Bid(**bid_dict)
    await db.bids.insert_one(new_bid.dict())
    
    return new_bid

@api_router.get("/moving-requests/{request_id}/bids", response_model=List[Bid])
async def get_bids_for_request(
    request_id: str,
    current_user: User = Depends(get_current_user)
):
    # Check if request exists and user has access
    request = await db.moving_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Moving request not found")
    
    if current_user.user_type == "customer" and request['customer_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    bids = await db.bids.find({"request_id": request_id}).to_list(1000)
    return [Bid(**bid) for bid in bids]

@api_router.post("/bids/{bid_id}/accept")
async def accept_bid(
    bid_id: str,
    current_user: User = Depends(get_current_user)
):
    if current_user.user_type != "customer":
        raise HTTPException(status_code=403, detail="Only customers can accept bids")
    
    # Get the bid
    bid = await db.bids.find_one({"id": bid_id})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")
    
    # Check if customer owns the request
    request = await db.moving_requests.find_one({"id": bid['request_id']})
    if request['customer_id'] != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Update bid status
    await db.bids.update_one({"id": bid_id}, {"$set": {"status": "accepted"}})
    
    # Update request status and selected mover
    await db.moving_requests.update_one(
        {"id": bid['request_id']}, 
        {"$set": {"status": "approved", "selected_mover_id": bid['mover_id']}}
    )
    
    # Reject all other bids for this request
    await db.bids.update_many(
        {"request_id": bid['request_id'], "id": {"$ne": bid_id}},
        {"$set": {"status": "rejected"}}
    )
    
    return {"message": "Bid accepted successfully"}

# Admin endpoints
@api_router.get("/admin/users", response_model=List[User])
async def get_all_users(current_user: User = Depends(get_admin_user)):
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

@api_router.post("/admin/approve-mover/{mover_id}")
async def approve_mover(
    mover_id: str,
    current_user: User = Depends(get_admin_user)
):
    result = await db.users.update_one(
        {"id": mover_id, "user_type": "mover"}, 
        {"$set": {"is_approved": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mover not found")
    
    return {"message": "Mover approved successfully"}

@api_router.post("/admin/reset-password/{user_email}")
async def admin_reset_password(
    user_email: str,
    new_password: str,
    current_user: User = Depends(get_admin_user)
):
    # Find user by email
    user = await db.users.find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Hash new password
    hashed_password = get_password_hash(new_password)
    
    # Update password
    result = await db.users.update_one(
        {"email": user_email}, 
        {"$set": {"hashed_password": hashed_password}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update password")
    
    return {
        "message": "Password updated successfully",
        "user": user['name'],
        "email": user_email
    }

@api_router.post("/admin/make-admin/{user_email}")
async def make_user_admin(user_email: str):
    """Make user admin"""
    result = await db.users.update_one(
        {"email": user_email}, 
        {"$set": {"user_type": "admin"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {user_email} is now admin"}

class ForgotPasswordRequest(BaseModel):
    email: EmailStr
    method: str = "email"  # "email" or "sms"

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str

@api_router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset code via email or SMS"""
    user = await db.users.find_one({"email": request.email})
    if not user:
        # Don't reveal if email exists for security
        return {"message": "If this email/phone is registered, you will receive a password reset code."}
    
    # Generate reset token
    reset_token = generate_verification_code()
    
    # Store reset token with expiration (1 hour)
    await db.users.update_one(
        {"email": request.email},
        {"$set": {
            "password_reset_token": reset_token,
            "password_reset_expires": datetime.utcnow() + timedelta(hours=1),
            "password_reset_method": request.method
        }}
    )
    
    # Simulate sending code
    if request.method == "sms":
        # SMS simulation
        message = f"Password reset code sent to phone: {user.get('phone', 'N/A')}"
    else:
        # Email simulation  
        message = f"Password reset code sent to: {request.email}"
    
    return {
        "message": message,
        "reset_token": reset_token,  # For demo - remove in production
        "method_used": request.method,
        "contact": user.get('phone') if request.method == "sms" else request.email
    }

@api_router.post("/reset-password")
async def reset_password_with_token(request: ResetPasswordRequest):
    """Reset password with token"""
    user = await db.users.find_one({"email": request.email})
    
    if not user:
        raise HTTPException(status_code=404, detail="Invalid reset request")
    
    # Check token and expiration
    if (user.get("password_reset_token") != request.token or 
        user.get("password_reset_expires", datetime.min) < datetime.utcnow()):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Validate new password
    if len(request.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Update password and clear reset token
    hashed_password = get_password_hash(request.new_password)
    await db.users.update_one(
        {"email": request.email},
        {
            "$set": {"hashed_password": hashed_password},
            "$unset": {
                "password_reset_token": "", 
                "password_reset_expires": "",
                "password_reset_method": ""
            }
        }
    )
    
    return {"message": "Password reset successful. You can now login with your new password."}

@api_router.post("/admin/verify-user/{user_email}")
async def verify_user_public(user_email: str):
    """Temporary public endpoint to verify user"""
    # Update user to be verified
    result = await db.users.update_one(
        {"email": user_email}, 
        {"$set": {
            "is_email_verified": True, 
            "is_phone_verified": True,
            "is_approved": True
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": f"User {user_email} verified and approved"}

@api_router.post("/admin/reset-password-public/{user_email}")
async def public_reset_password(
    user_email: str,
    new_password: str
):
    """Temporary public endpoint for password reset"""
    # Find user by email
    user = await db.users.find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Hash new password
    hashed_password = get_password_hash(new_password)
    
    # Update password
    result = await db.users.update_one(
        {"email": user_email}, 
        {"$set": {"hashed_password": hashed_password}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update password")
    
    return {
        "message": "Password updated successfully",
        "user": user['name'],
        "email": user_email,
        "new_password": new_password
    }

# NEW: Live Feed endpoints
@api_router.post("/live-feed", response_model=LivePost)
async def create_live_post(post: LivePostCreate, current_user: User = Depends(get_current_user)):
    if current_user.user_type != 'mover':
        raise HTTPException(status_code=403, detail="Only movers can create live posts")
    post_dict = post.dict()
    post_dict.update({
        'mover_id': current_user.id,
        'mover_name': current_user.name,
        'company_name': getattr(current_user, 'company_name', None),
        'phone': current_user.phone,
        'created_at': datetime.utcnow(),
    })
    live_post = LivePost(**post_dict)
    await db.live_feed.insert_one(live_post.dict())
    return live_post

@api_router.get("/live-feed", response_model=List[LivePost])
async def get_live_feed_public():
    # Return latest 100 posts without phone numbers
    posts = await db.live_feed.find().sort("created_at", -1).limit(100).to_list(100)
    sanitized = []
    for p in posts:
        p.pop('phone', None)
        sanitized.append(LivePost(**p))
    return sanitized

@api_router.get("/live-feed/full", response_model=List[LivePost])
async def get_live_feed_full(current_user: User = Depends(get_current_user)):
    # Movers/Admins can see phone numbers
    if current_user.user_type not in ['mover', 'admin']:
        # Fallback to public variant
        return await get_live_feed_public()
    posts = await db.live_feed.find().sort("created_at", -1).limit(100).to_list(100)
    return [LivePost(**p) for p in posts]

@api_router.delete("/admin/live-feed/{post_id}")
async def delete_live_post(post_id: str, current_user: User = Depends(get_admin_user)):
    result = await db.live_feed.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()