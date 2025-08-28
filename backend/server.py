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
        if v not in ['customer', 'mover', 'admin']:
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

@api_router.post("/admin/create-test-data")
async def create_test_data():
    """Create test data for demonstration"""
    
    # Create 3 test mover companies
    test_movers = [
        {
            "name": "Ahmet Taşımacılık",
            "email": "ahmet@tasima.com", 
            "phone": "05321234567",
            "password": "123456",
            "user_type": "mover",
            "company_name": "Ahmet Taşımacılık Ltd.",
            "company_description": "İstanbul genelinde 15 yıllık deneyimle güvenilir nakliyat hizmeti. Sigortalı taşımacılık, ambalajlama ve kurulum dahil."
        },
        {
            "name": "Mehmet Nakliyat", 
            "email": "mehmet@nakliyat.com",
            "phone": "05339876543", 
            "password": "123456",
            "user_type": "mover",
            "company_name": "Mehmet Express Nakliyat",
            "company_description": "Avrupa yakası uzmanı nakliyat firması. Hızlı, güvenli ve uygun fiyatlı ev taşıma hizmetleri. 7/24 destek."
        },
        {
            "name": "Özkan Lojistik",
            "email": "ozkan@lojistik.com", 
            "phone": "05367891234",
            "password": "123456", 
            "user_type": "mover",
            "company_name": "Özkan Premium Lojistik",
            "company_description": "Lüks ev eşyalarında uzman nakliyeci. Antika, piano, tablo taşımacılığında özel ekipman kullanırız."
        }
    ]
    
    # Create movers
    created_movers = []
    for mover_data in test_movers:
        # Check if already exists
        existing = await db.users.find_one({"email": mover_data["email"]})
        if not existing:
            user_dict = mover_data.copy()
            password = user_dict.pop('password')
            user_dict['hashed_password'] = get_password_hash(password)
            user_dict['id'] = str(uuid.uuid4())
            user_dict['is_active'] = True
            user_dict['is_email_verified'] = True
            user_dict['is_phone_verified'] = True
            user_dict['is_approved'] = True
            user_dict['created_at'] = datetime.utcnow()
            user_dict['updated_at'] = datetime.utcnow()
            
            await db.users.insert_one(user_dict)
            created_movers.append(user_dict)
    
    # Create 5 test moving requests
    test_customers = [
        {
            "name": "Ayşe Yılmaz",
            "email": "ayse@gmail.com",
            "phone": "05301111111"
        },
        {
            "name": "Can Demir", 
            "email": "can@hotmail.com",
            "phone": "05302222222"
        },
        {
            "name": "Elif Kaya",
            "email": "elif@yahoo.com", 
            "phone": "05303333333"
        },
        {
            "name": "Murat Şahin",
            "email": "murat@gmail.com",
            "phone": "05304444444"
        },
        {
            "name": "Zehra Öz",
            "email": "zehra@outlook.com",
            "phone": "05305555555"
        }
    ]
    
    test_requests = [
        {
            "customer": test_customers[0],
            "from_location": "Beşiktaş, İstanbul",
            "to_location": "Kadıköy, İstanbul", 
            "from_floor": 3,
            "to_floor": 2,
            "has_elevator_from": True,
            "has_elevator_to": False,
            "needs_mobile_elevator": True,
            "truck_distance": "Kapıya kadar çıkabilir",
            "packing_service": False,
            "moving_date": datetime(2024, 7, 15, 9, 0),
            "description": "2+1 daire, beyaz eşyalar dahil. Hassas eşyalar var (cam masalar)."
        },
        {
            "customer": test_customers[1],
            "from_location": "Şişli, İstanbul",
            "to_location": "Ataşehir, İstanbul",
            "from_floor": 1,
            "to_floor": 5,
            "has_elevator_from": False,
            "has_elevator_to": True,
            "needs_mobile_elevator": False,
            "truck_distance": "50 metre mesafe var",
            "packing_service": True,
            "moving_date": datetime(2024, 7, 20, 14, 0),
            "description": "3+1 büyük daire. Piyanom var, özel dikkat gerekiyor."
        },
        {
            "customer": test_customers[2],
            "from_location": "Bakırköy, İstanbul", 
            "to_location": "Pendik, İstanbul",
            "from_floor": 2,
            "to_floor": 1,
            "has_elevator_from": True,
            "has_elevator_to": False,
            "needs_mobile_elevator": False,
            "truck_distance": "Sokak dar, 100m taşıma",
            "packing_service": False,
            "moving_date": datetime(2024, 7, 25, 10, 0),
            "description": "Stüdyo daire, az eşya. Hızlı taşınma istiyorum."
        },
        {
            "customer": test_customers[3],
            "from_location": "Üsküdar, İstanbul",
            "to_location": "Beylikdüzü, İstanbul", 
            "from_floor": 4,
            "to_floor": 3,
            "has_elevator_from": False,
            "has_elevator_to": True,
            "needs_mobile_elevator": True,
            "truck_distance": "Kapının önüne park edilebilir",
            "packing_service": True,
            "moving_date": datetime(2024, 8, 1, 8, 0),
            "description": "4+1 dubleks ev. Çok eşya var, dikkatli ambalaj istiyorum."
        },
        {
            "customer": test_customers[4],
            "from_location": "Maltepe, İstanbul",
            "to_location": "Tuzla, İstanbul",
            "from_floor": 0,
            "to_floor": 2,  
            "has_elevator_from": False,
            "has_elevator_to": False,
            "needs_mobile_elevator": False,
            "truck_distance": "Bahçeli ev, kolay erişim",
            "packing_service": False,
            "moving_date": datetime(2024, 8, 5, 11, 0),
            "description": "Müstakil evden apartmana taşınma. Bahçe mobilyaları da var."
        }
    ]
    
    # Create customers and requests
    created_requests = []
    for i, req_data in enumerate(test_requests):
        customer_data = req_data["customer"]
        
        # Create customer if not exists
        customer = await db.users.find_one({"email": customer_data["email"]})
        if not customer:
            customer_dict = {
                "id": str(uuid.uuid4()),
                "name": customer_data["name"],
                "email": customer_data["email"], 
                "phone": customer_data["phone"],
                "user_type": "customer",
                "hashed_password": get_password_hash("123456"),
                "is_active": True,
                "is_email_verified": True,
                "is_phone_verified": True,
                "is_approved": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            await db.users.insert_one(customer_dict)
            customer = customer_dict
        
        # Create moving request
        request_dict = {
            "id": str(uuid.uuid4()),
            "customer_id": customer["id"],
            "customer_name": customer["name"],
            "from_location": req_data["from_location"],
            "to_location": req_data["to_location"],
            "from_floor": req_data["from_floor"],
            "to_floor": req_data["to_floor"],
            "has_elevator_from": req_data["has_elevator_from"],
            "has_elevator_to": req_data["has_elevator_to"],
            "needs_mobile_elevator": req_data["needs_mobile_elevator"],
            "truck_distance": req_data["truck_distance"],
            "packing_service": req_data["packing_service"],
            "moving_date": req_data["moving_date"],
            "description": req_data["description"],
            "status": "pending",
            "created_at": datetime.utcnow()
        }
        
        await db.moving_requests.insert_one(request_dict)
        created_requests.append(request_dict)
        
        # Create some bids for the first 3 requests
        if i < 3 and created_movers:
            for j, mover in enumerate(created_movers):
                if j <= i:  # Create varying numbers of bids
                    bid_dict = {
                        "id": str(uuid.uuid4()),
                        "request_id": request_dict["id"],
                        "mover_id": mover["id"],
                        "mover_name": mover["name"],
                        "company_name": mover["company_name"],
                        "price": 2000 + (j * 500) + (i * 200),
                        "message": f"Deneyimli ekibimizle güvenli taşıma garantisi. {mover['company_name']}",
                        "status": "pending",
                        "created_at": datetime.utcnow()
                    }
                    await db.bids.insert_one(bid_dict)
    
    return {
        "message": "Test verileri başarıyla oluşturuldu!",
        "created": {
            "movers": len(created_movers),
            "customers": len(test_customers), 
            "requests": len(created_requests),
            "bids": "Çeşitli teklifler oluşturuldu"
        }
    }

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@api_router.post("/admin/update-user-role/{user_email}")
async def update_user_role(user_email: str, request_data: dict, current_user: User = Depends(get_current_user)):
    """Update user role (admin only)"""
    
    # Check if current user is admin
    if current_user.user_type != 'admin':
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    # Find user
    user = await db.users.find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Update user role
    role = request_data.get('role')
    valid_roles = ['customer', 'mover', 'moderator', 'admin']
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail="Geçersiz rol")
    
    await db.users.update_one(
        {"email": user_email},
        {"$set": {"user_type": role, "updated_at": datetime.utcnow()}}
    )
    
    return {
        "message": f"Kullanıcı {user_email} rolü '{role}' olarak güncellendi",
        "user": user['name'],
        "new_role": role
    }

@api_router.post("/admin/ban-user/{user_email}")
async def ban_user(user_email: str, request_data: dict, current_user: User = Depends(get_current_user)):
    """Ban user for specified days (admin only)"""
    
    # Check if current user is admin
    if current_user.user_type != 'admin':
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    # Find user
    user = await db.users.find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Calculate ban expiry date
    ban_days = request_data.get('ban_days', 3)
    reason = request_data.get('reason', 'Kullanıcı davranış kurallarını ihlal etti')
    ban_until = datetime.utcnow() + timedelta(days=ban_days)
    
    # Update user with ban info
    await db.users.update_one(
        {"email": user_email},
        {"$set": {
            "is_active": False,
            "ban_until": ban_until,
            "ban_reason": reason,
            "banned_by": current_user.email,
            "updated_at": datetime.utcnow()
        }}
    )
    
    return {
        "message": f"Kullanıcı {user_email} {ban_days} gün boyunca yasaklandı",
        "user": user['name'],
        "ban_until": ban_until.isoformat(),
        "reason": reason
    }

@api_router.post("/admin/unban-user/{user_email}")
async def unban_user(user_email: str, current_user: User = Depends(get_current_user)):
    """Unban user (admin only)"""
    
    # Check if current user is admin
    if current_user.user_type != 'admin':
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    # Find user
    user = await db.users.find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Remove ban
    await db.users.update_one(
        {"email": user_email},
        {"$set": {
            "is_active": True,
            "updated_at": datetime.utcnow()
        },
        "$unset": {
            "ban_until": "",
            "ban_reason": "",
            "banned_by": ""
        }}
    )
    
    return {
        "message": f"Kullanıcı {user_email} yasağı kaldırıldı",
        "user": user['name']
    }

@api_router.delete("/admin/delete-request/{request_id}")
async def delete_request(request_id: str, current_user: User = Depends(get_current_user)):
    """Delete moving request (admin only)"""
    
    # Check if current user is admin
    if current_user.user_type != 'admin':
        raise HTTPException(status_code=403, detail="Admin yetkisi gerekiyor")
    
    # Find and delete request
    request = await db.moving_requests.find_one({"id": request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Talep bulunamadı")
    
    # Delete related bids first
    await db.bids.delete_many({"request_id": request_id})
    
    # Delete the request
    await db.moving_requests.delete_one({"id": request_id})
    
    return {
        "message": f"Talep başarıyla silindi",
        "request_id": request_id,
        "customer": request.get('customer_name')
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)