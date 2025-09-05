from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional
from datetime import datetime, timedelta
from pathlib import Path
import os
import uuid
import random
import string

# Load env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# DB
MONGO_URL = os.environ['MONGO_URL']
client = AsyncIOMotorClient(MONGO_URL)
db = client['moving_platform']

# Auth/JWT
# IMPORTANT: use pbkdf2_sha256 to avoid bcrypt runtime issues in this environment
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# App
app = FastAPI(title='Moving Platform API')
api = APIRouter(prefix='/api')

# Helpers

def get_password_hash(pw: str) -> str:
    return pwd_context.hash(pw)

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False

def jwt_create(data: dict, minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=minutes)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def code6() -> str:
    return ''.join(random.choices(string.digits, k=6))

# Models
USER_CUSTOMER = 'customer'
USER_MOVER = 'mover'
USER_ADMIN = 'admin'

class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    user_type: str

    @validator('user_type')
    def _v_role(cls, v):
        if v not in ['customer', 'mover', 'admin', 'moderator']:
            raise ValueError('Invalid user type')
        return v

class UserRegister(UserBase):
    password: str
    company_name: Optional[str] = None
    company_description: Optional[str] = None
    company_images: Optional[List[str]] = []

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    is_active: bool = True
    is_email_verified: bool = False
    is_phone_verified: bool = False
    is_approved: bool = False
    email_verification_code: Optional[str] = None
    phone_verification_code: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    hashed_password: str
    company_description: Optional[str] = None
    company_images: Optional[List[str]] = []
    company_name: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class VerificationRequest(BaseModel):
    email: EmailStr
    verification_code: str
    verification_type: str

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
    truck_distance: str
    packing_service: bool
    moving_date: datetime
    description: Optional[str] = None
    status: str = 'pending'
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
    status: str = 'pending'
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BidCreate(BaseModel):
    price: float
    message: Optional[str] = None

# Live feed
class LivePost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    mover_id: str
    mover_name: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    title: str
    from_location: Optional[str] = None
    to_location: Optional[str] = None
    when: Optional[str] = None
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

# Auth dependencies
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        uid = payload.get('sub')
        if not uid:
            raise HTTPException(status_code=401, detail='Invalid token')
    except JWTError:
        raise HTTPException(status_code=401, detail='Invalid token')
    user = await db.users.find_one({'id': uid})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return User(**user)

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.user_type != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    return current_user

# Seed helpers
DEFAULT_SAMPLE_MOVER_EMAIL = 'demo@demo.com'
DEFAULT_SAMPLE_MOVER_PASSWORD = '123456**'
DEFAULT_SAMPLE_CUSTOMER_EMAIL = 'demo.musteri@demo.com'
DEFAULT_SAMPLE_CUSTOMER_PASSWORD = '123456**'

def _build_user_doc(name: str, email: str, phone: str, role: str, password: str, company: Optional[str] = None):
    now = datetime.utcnow()
    doc = {
        'id': str(uuid.uuid4()),
        'name': name,
        'email': email,
        'phone': phone,
        'user_type': role,
        'is_active': True,
        'is_email_verified': True,
        'is_phone_verified': True,
        'is_approved': True if role != 'mover' else True,
        'email_verification_code': None,
        'phone_verification_code': None,
        'created_at': now,
        'updated_at': now,
        'hashed_password': get_password_hash(password),
        'company_description': 'Demo nakliyeci firması' if role == 'mover' else None,
        'company_images': [],
        'company_name': company if role == 'mover' else None,
    }
    return doc

async def seed_sample_mover_if_missing():
    existing = await db.users.find_one({'email': DEFAULT_SAMPLE_MOVER_EMAIL})
    if existing:
        await db.users.update_one({'email': DEFAULT_SAMPLE_MOVER_EMAIL}, {'$set': {
            'user_type': 'mover', 'is_active': True, 'is_email_verified': True, 'is_phone_verified': True,
            'is_approved': True, 'hashed_password': get_password_hash(DEFAULT_SAMPLE_MOVER_PASSWORD), 'updated_at': datetime.utcnow(),
            'name': 'Demo Nakliyeci', 'phone': '+90 555 000 00 00', 'company_name': 'Demo Lojistik'
        }})
        return
    await db.users.insert_one(_build_user_doc('Demo Nakliyeci', DEFAULT_SAMPLE_MOVER_EMAIL, '+90 555 000 00 00', 'mover', DEFAULT_SAMPLE_MOVER_PASSWORD, 'Demo Lojistik'))

async def seed_sample_customer_if_missing():
    existing = await db.users.find_one({'email': DEFAULT_SAMPLE_CUSTOMER_EMAIL})
    if existing:
        await db.users.update_one({'email': DEFAULT_SAMPLE_CUSTOMER_EMAIL}, {'$set': {
            'user_type': 'customer', 'is_active': True, 'is_email_verified': True, 'is_phone_verified': True,
            'hashed_password': get_password_hash(DEFAULT_SAMPLE_CUSTOMER_PASSWORD), 'updated_at': datetime.utcnow(),
            'name': 'Demo Müşteri', 'phone': '+90 531 000 00 00'
        }})
        return
    await db.users.insert_one(_build_user_doc('Demo Müşteri', DEFAULT_SAMPLE_CUSTOMER_EMAIL, '+90 531 000 00 00', 'customer', DEFAULT_SAMPLE_CUSTOMER_PASSWORD))

async def seed_live_feed_if_empty():
    try:
        count = await db.live_feed.count_documents({})
    except Exception:
        return
    if count and count > 0:
        return
    samples = [
        {'title': '2+1 Ev Taşıma', 'from_location': 'Beşiktaş', 'to_location': 'Kadıköy', 'when': 'Yarın sabah', 'vehicle': '3.5 Ton Kamyonet', 'price_note': 'Asansör gerekebilir', 'extra': 'Paketleme kısmen hazır'},
        {'title': 'Parça Eşya (Beyaz Eşya)', 'from_location': 'Şişli', 'to_location': 'Ataşehir', 'when': 'Bugün 17:00', 'vehicle': 'Panelvan', 'price_note': 'Tek kat, kolay erişim', 'extra': ''},
        {'title': 'Ofis Taşıma (4 oda)', 'from_location': 'Maslak', 'to_location': 'Kozyatağı', 'when': 'Cuma', 'vehicle': '7.5 Ton Kamyon', 'price_note': 'Ambalaj dahil', 'extra': 'Kablolama hassas'},
        {'title': 'Piyano Taşıma', 'from_location': 'Üsküdar', 'to_location': 'Beylikdüzü', 'when': 'Hafta sonu', 'vehicle': 'Özel ekip', 'price_note': 'Sigortalı taşıma', 'extra': ''},
        {'title': 'Stüdyo Daire', 'from_location': 'Bakırköy', 'to_location': 'Pendik', 'when': 'Bugün', 'vehicle': 'Kamyonet', 'price_note': 'Hızlı teslim', 'extra': ''},
    ]
    docs = []
    for s in samples:
        docs.append({
            'id': str(uuid.uuid4()),
            'mover_id': str(uuid.uuid4()),
            'mover_name': 'Demo Nakliyeci',
            'company_name': 'Demo Lojistik',
            'phone': '+90 532 000 00 00',
            **s,
            'created_at': datetime.utcnow(),
        })
    try:
        await db.live_feed.insert_many(docs)
    except Exception:
        pass

# Endpoints
@api.post('/register', response_model=dict)
async def register(user: UserRegister):
    if await db.users.find_one({'email': user.email}):
        raise HTTPException(status_code=400, detail='Email already registered')
    doc = user.dict(); pw = doc.pop('password')
    doc['hashed_password'] = get_password_hash(pw)
    doc['email_verification_code'] = code6()
    doc['phone_verification_code'] = code6()
    doc['is_approved'] = user.user_type != 'mover'
    await db.users.insert_one(User(**doc).dict())
    return {'message': 'User registered successfully'}

@api.post('/login', response_model=Token)
async def login(body: LoginRequest):
    # Fast path for demo mover
    if body.email.lower() == DEFAULT_SAMPLE_MOVER_EMAIL and body.password == DEFAULT_SAMPLE_MOVER_PASSWORD:
        existing = await db.users.find_one({'email': DEFAULT_SAMPLE_MOVER_EMAIL})
        if not existing:
            await seed_sample_mover_if_missing()
            existing = await db.users.find_one({'email': DEFAULT_SAMPLE_MOVER_EMAIL})
        token = jwt_create({'sub': existing['id']})
        return {'access_token': token, 'token_type': 'bearer'}
    # Fast path for demo customer
    if body.email.lower() == DEFAULT_SAMPLE_CUSTOMER_EMAIL and body.password == DEFAULT_SAMPLE_CUSTOMER_PASSWORD:
        existing = await db.users.find_one({'email': DEFAULT_SAMPLE_CUSTOMER_EMAIL})
        if not existing:
            await seed_sample_customer_if_missing()
            existing = await db.users.find_one({'email': DEFAULT_SAMPLE_CUSTOMER_EMAIL})
        token = jwt_create({'sub': existing['id']})
        return {'access_token': token, 'token_type': 'bearer'}

    user = await db.users.find_one({'email': body.email})
    if not user:
        raise HTTPException(status_code=401, detail='Invalid credentials')
    if not verify_password(body.password, user['hashed_password']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    if not user.get('is_email_verified') or not user.get('is_phone_verified'):
        raise HTTPException(status_code=401, detail='Please verify your email and phone first')
    if user.get('user_type') == 'mover' and not user.get('is_approved'):
        raise HTTPException(status_code=401, detail='Your account is pending admin approval')
    token = jwt_create({'sub': user['id']})
    return {'access_token': token, 'token_type': 'bearer'}

@api.get('/me', response_model=User)
async def me(current_user: User = Depends(get_current_user)):
    return current_user

# Live feed endpoints
@api.post('/live-feed', response_model=LivePost)
async def create_live_post(post: LivePostCreate, current_user: User = Depends(get_current_user)):
    if current_user.user_type != 'mover':
        raise HTTPException(status_code=403, detail='Only movers can create live posts')
    d = post.dict(); d.update({'mover_id': current_user.id, 'mover_name': current_user.name, 'company_name': getattr(current_user, 'company_name', None), 'phone': current_user.phone, 'created_at': datetime.utcnow()})
    lp = LivePost(**d)
    await db.live_feed.insert_one(lp.dict())
    return lp

@api.get('/live-feed', response_model=List[LivePost])
async def get_live_feed_public():
    await seed_live_feed_if_empty()
    posts = await db.live_feed.find().sort('created_at', -1).limit(100).to_list(100)
    sanitized = []
    for p in posts:
        p.pop('phone', None)
        sanitized.append(LivePost(**p))
    return sanitized

@api.get('/live-feed/full', response_model=List[LivePost])
async def get_live_feed_full(current_user: User = Depends(get_current_user)):
    if current_user.user_type not in ['mover', 'admin']:
        return await get_live_feed_public()
    posts = await db.live_feed.find().sort('created_at', -1).limit(100).to_list(100)
    return [LivePost(**p) for p in posts]

@api.delete('/admin/live-feed/{post_id}')
async def delete_live_post(post_id: str, current_user: User = Depends(get_admin_user)):
    res = await db.live_feed.delete_one({'id': post_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Post not found')
    return {'message': 'Post deleted'}

# Admin endpoints
class UpdateRoleBody(BaseModel):
    role: str

class BanBody(BaseModel):
    ban_days: int

@api.get('/admin/users', response_model=List[User])
async def admin_users(current_user: User = Depends(get_admin_user)):
    items = await db.users.find().to_list(1000)
    return [User(**i) for i in items]

@api.post('/admin/update-user-role/{user_email}')
async def update_user_role(user_email: str, body: UpdateRoleBody, current_user: User = Depends(get_admin_user)):
    if body.role not in ['customer', 'mover', 'admin', 'moderator']:
        raise HTTPException(status_code=400, detail='Invalid role')
    res = await db.users.update_one({'email': user_email}, {'$set': {'user_type': body.role}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
    return {'message': 'Role updated'}

@api.post('/admin/ban-user/{user_email}')
async def ban_user(user_email: str, body: BanBody, current_user: User = Depends(get_admin_user)):
    until = datetime.utcnow() + timedelta(days=body.ban_days)
    res = await db.users.update_one({'email': user_email}, {'$set': {'is_active': False, 'banned_until': until}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
    return {'message': f'Banned {body.ban_days} days'}

@api.post('/admin/unban-user/{user_email}')
async def unban_user(user_email: str, current_user: User = Depends(get_admin_user)):
    res = await db.users.update_one({'email': user_email}, {'$set': {'is_active': True}, '$unset': {'banned_until': ''}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
    return {'message': 'Unbanned'}

@api.post('/admin/approve-mover/{mover_id}')
async def approve_mover(mover_id: str, current_user: User = Depends(get_admin_user)):
    res = await db.users.update_one({'id': mover_id, 'user_type': 'mover'}, {'$set': {'is_approved': True}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail='Mover not found')
    return {'message': 'Mover approved'}

# Mount router
app.include_router(api)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*'],
    allow_credentials=True,
)

@app.on_event('startup')
async def startup_seed():
    await seed_sample_mover_if_missing()
    await seed_sample_customer_if_missing()
    await seed_live_feed_if_empty()

@app.on_event('shutdown')
async def shutdown_db():
    client.close()