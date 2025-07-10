from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from datetime import datetime, timedelta, UTC
from typing import Optional, List
import jwt
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import uvicorn
from contextlib import asynccontextmanager
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "PannuGoodgirl")  # Default for local dev
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb+srv://PavaniKadari:PavaniK%40123%23@infoverse.ohwzygb.mongodb.net/?retryWrites=true&w=majority")
DATABASE_NAME = os.getenv("DATABASE_NAME", "notes_app")

# Database client
client = None
database = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global client, database
    try:
        logger.info("Connecting to MongoDB...")
        client = AsyncIOMotorClient(MONGODB_URL, serverSelectionTimeoutMS=30000)
        database = client[DATABASE_NAME]
        # Test connection
        await client.admin.command('ping')
        logger.info("MongoDB connection successful")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        raise
    yield
    if client:
        client.close()
        logger.info("MongoDB connection closed")

app = FastAPI(lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the root directory at /static
app.mount("/static", StaticFiles(directory=".", html=True), name="static")

# Serve index.html at root
@app.get("/")
async def root():
    return FileResponse("landing.html")

@app.get("/styles.css")
async def styles():
    return FileResponse("styles.css")

@app.get("/script.js")
async def script():
    return FileResponse("script.js")

# Security
security = HTTPBearer()

# Pydantic models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    username: str
    email: str

class NoteCreate(BaseModel):
    title: str
    content: str

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class Note(BaseModel):
    id: str
    title: str
    content: str
    created_at: datetime
    updated_at: datetime
    user_id: str

# Helper functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user_id
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

# Auth routes
@app.post("/api/auth/register")
async def register(user: UserCreate):
    existing_user = await database.users.find_one({"$or": [{"username": user.username}, {"email": user.email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    hashed_password = hash_password(user.password)
    user_doc = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
        "created_at": datetime.now(UTC)
    }
    
    result = await database.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_id}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": user_id,
        "username": user.username
    }

@app.post("/api/auth/login")
async def login(user: UserLogin):
    db_user = await database.users.find_one({"$or": [{"username": user.username}, {"email": user.username}]})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(db_user["_id"])}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(db_user["_id"]),
        "username": db_user["username"]
    }

@app.get("/api/users/me", response_model=UserResponse)
async def get_current_user(user_id: str = Depends(verify_token)):
    user = await database.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "username": user["username"],
        "email": user["email"]
    }

# Notes routes
@app.get("/api/notes")
async def get_notes(user_id: str = Depends(verify_token)):
    notes = []
    async for note in database.notes.find({"user_id": user_id}):
        notes.append({
            "id": str(note["_id"]),
            "title": note["title"],
            "content": note["content"],
            "created_at": note["created_at"],
            "updated_at": note["updated_at"],
            "user_id": note["user_id"]
        })
    return notes

@app.post("/api/notes")
async def create_note(note: NoteCreate, user_id: str = Depends(verify_token)):
    note_doc = {
        "title": note.title,
        "content": note.content,
        "user_id": user_id,
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC)
    }
    
    result = await database.notes.insert_one(note_doc)
    note_doc["id"] = str(result.inserted_id)
    note_doc.pop("_id", None)
    
    return note_doc

@app.get("/api/notes/{note_id}")
async def get_note(note_id: str, user_id: str = Depends(verify_token)):
    note = await database.notes.find_one({"_id": ObjectId(note_id), "user_id": user_id})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {
        "id": str(note["_id"]),
        "title": note["title"],
        "content": note["content"],
        "created_at": note["created_at"],
        "updated_at": note["updated_at"],
        "user_id": note["user_id"]
    }

@app.put("/api/notes/{note_id}")
async def update_note(note_id: str, note_update: NoteUpdate, user_id: str = Depends(verify_token)):
    update_data = {}
    if note_update.title is not None:
        update_data["title"] = note_update.title
    if note_update.content is not None:
        update_data["content"] = note_update.content
    
    if update_data:
        update_data["updated_at"] = datetime.now(UTC)
        result = await database.notes.update_one(
            {"_id": ObjectId(note_id), "user_id": user_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Note not found")
    
    note = await database.notes.find_one({"_id": ObjectId(note_id), "user_id": user_id})
    return {
        "id": str(note["_id"]),
        "title": note["title"],
        "content": note["content"],
        "created_at": note["created_at"],
        "updated_at": note["updated_at"],
        "user_id": note["user_id"]
    }

@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str, user_id: str = Depends(verify_token)):
    result = await database.notes.delete_one({"_id": ObjectId(note_id), "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted successfully"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))  # Use Render's PORT or default to 8000
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)