from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import hashlib
import secrets
import re
import json

app = FastAPI()

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

users_db = {}  # {username: {password_hash, session_token}}
meetups_db = {}  # {meetup_id: meetup_data}
participants_db = {}  # {meetup_id: [user_ids]}
chat_rooms_db = {}  # {meetup_id: [messages]}
meetup_counter = 0

security = HTTPBearer()

class UserLogin(BaseModel):
    name: str
    password: str

class UserRegister(BaseModel):
    name: str
    password: str

class MeetupCreate(BaseModel):
    content: str
    datetime: Optional[str] = None

class MeetupResponse(BaseModel):
    id: int
    title: str
    content: str
    structured_data: Dict[str, Any]
    hashtags: List[str]
    creator: str
    created_at: str
    datetime: Optional[str] = None

class ChatMessage(BaseModel):
    message: str

class ChatMessageResponse(BaseModel):
    id: int
    user: str
    message: str
    timestamp: str

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_session_token() -> str:
    return secrets.token_urlsafe(32)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    for username, user_data in users_db.items():
        if user_data.get("session_token") == token:
            return username
    raise HTTPException(status_code=401, detail="Invalid authentication token")

def extract_structured_data(content: str) -> Dict[str, Any]:
    """Extract structured data from Japanese free-form text"""
    structured = {
        "food_genre": None,
        "specific_menu": None,
        "location": None,
        "budget": None,
        "other_requirements": []
    }
    
    if "焼肉" in content:
        structured["food_genre"] = "焼肉"
    elif "ラーメン" in content:
        structured["food_genre"] = "ラーメン"
    elif "寿司" in content:
        structured["food_genre"] = "寿司"
    elif "イタリアン" in content:
        structured["food_genre"] = "イタリアン"
    elif "中華" in content:
        structured["food_genre"] = "中華"
    
    locations = ["渋谷", "新宿", "池袋", "銀座", "六本木", "恵比寿", "表参道", "原宿"]
    for loc in locations:
        if loc in content:
            structured["location"] = loc
            break
    
    budget_match = re.search(r'(\d+)円', content)
    if budget_match:
        structured["budget"] = f"{budget_match.group(1)}円"
    
    if "個室" in content:
        structured["other_requirements"].append("個室希望")
    if "サクッと" in content:
        structured["other_requirements"].append("サクッと食べたい")
    if "奢り" in content:
        structured["other_requirements"].append("奢り")
    
    return structured

def generate_hashtags(content: str, structured_data: Dict[str, Any]) -> List[str]:
    """Generate hashtags based on content and structured data"""
    hashtags = []
    
    if structured_data.get("food_genre"):
        hashtags.append(f"#{structured_data['food_genre']}")
    
    if structured_data.get("location"):
        hashtags.append(f"#{structured_data['location']}")
    
    if "ランチ" in content or "お昼" in content:
        hashtags.append("#ランチ")
    elif "ディナー" in content or "夜" in content:
        hashtags.append("#ディナー")
    
    if "今日" in content:
        hashtags.append("#今日")
    elif "明日" in content:
        hashtags.append("#明日")
    
    if structured_data.get("other_requirements"):
        if "個室希望" in structured_data["other_requirements"]:
            hashtags.append("#個室")
    
    return hashtags[:5]  # Limit to 5 hashtags

def generate_title_and_description(content: str, structured_data: Dict[str, Any]) -> tuple:
    """Generate title and description from content and structured data"""
    title_parts = []
    
    if structured_data.get("food_genre"):
        title_parts.append(f"【{structured_data['food_genre']}募集")
        if structured_data.get("location"):
            title_parts.append(f"@{structured_data['location']}")
        title_parts.append("】")
    else:
        title_parts.append("【食事募集】")
    
    if structured_data.get("budget"):
        title_parts.append(f"予算{structured_data['budget']}")
    
    title = "".join(title_parts)
    if len(title) > 20:
        title = title[:17] + "..."
    
    description = content[:97] + "..." if len(content) > 100 else content
    
    return title, description

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/register")
async def register(user: UserRegister):
    if user.name in users_db:
        raise HTTPException(status_code=400, detail="User already exists")
    
    password_hash = hash_password(user.password)
    session_token = generate_session_token()
    
    users_db[user.name] = {
        "password_hash": password_hash,
        "session_token": session_token
    }
    
    return {"message": "User registered successfully", "token": session_token}

@app.post("/api/login")
async def login(user: UserLogin):
    if user.name not in users_db:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    password_hash = hash_password(user.password)
    if users_db[user.name]["password_hash"] != password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    session_token = generate_session_token()
    users_db[user.name]["session_token"] = session_token
    
    return {"message": "Login successful", "token": session_token}

@app.post("/api/meetups", response_model=MeetupResponse)
async def create_meetup(meetup: MeetupCreate, current_user: str = Depends(get_current_user)):
    global meetup_counter
    meetup_counter += 1
    
    structured_data = extract_structured_data(meetup.content)
    hashtags = generate_hashtags(meetup.content, structured_data)
    title, description = generate_title_and_description(meetup.content, structured_data)
    
    meetup_data = {
        "id": meetup_counter,
        "title": title,
        "content": description,
        "original_content": meetup.content,
        "structured_data": structured_data,
        "hashtags": hashtags,
        "creator": current_user,
        "created_at": datetime.now().isoformat(),
        "datetime": meetup.datetime
    }
    
    meetups_db[meetup_counter] = meetup_data
    participants_db[meetup_counter] = []
    chat_rooms_db[meetup_counter] = []
    
    return meetup_data

@app.get("/api/meetups", response_model=List[MeetupResponse])
async def get_meetups(search: Optional[str] = None, date_filter: Optional[str] = None):
    meetups = list(meetups_db.values())
    
    if search:
        filtered_meetups = []
        for meetup in meetups:
            if (search.lower() in meetup["title"].lower() or 
                search.lower() in meetup["content"].lower() or
                any(search.lower() in tag.lower() for tag in meetup["hashtags"])):
                filtered_meetups.append(meetup)
        meetups = filtered_meetups
    
    if date_filter:
        filtered_meetups = []
        for meetup in meetups:
            if meetup.get("datetime") and date_filter in meetup["datetime"]:
                filtered_meetups.append(meetup)
        meetups = filtered_meetups
    
    meetups.sort(key=lambda x: x["created_at"], reverse=True)
    
    return meetups

@app.get("/api/meetups/{meetup_id}", response_model=MeetupResponse)
async def get_meetup(meetup_id: int):
    if meetup_id not in meetups_db:
        raise HTTPException(status_code=404, detail="Meetup not found")
    return meetups_db[meetup_id]

@app.post("/api/meetups/{meetup_id}/join")
async def join_meetup(meetup_id: int, current_user: str = Depends(get_current_user)):
    if meetup_id not in meetups_db:
        raise HTTPException(status_code=404, detail="Meetup not found")
    
    if current_user not in participants_db[meetup_id]:
        participants_db[meetup_id].append(current_user)
    
    return {"message": "Successfully joined meetup"}

@app.get("/api/meetups/{meetup_id}/participants")
async def get_participants(meetup_id: int):
    if meetup_id not in meetups_db:
        raise HTTPException(status_code=404, detail="Meetup not found")
    
    return {"participants": participants_db.get(meetup_id, [])}

@app.post("/api/meetups/{meetup_id}/chat", response_model=ChatMessageResponse)
async def send_message(meetup_id: int, message: ChatMessage, current_user: str = Depends(get_current_user)):
    if meetup_id not in meetups_db:
        raise HTTPException(status_code=404, detail="Meetup not found")
    
    if (current_user not in participants_db[meetup_id] and 
        current_user != meetups_db[meetup_id]["creator"]):
        raise HTTPException(status_code=403, detail="Not authorized to chat in this meetup")
    
    message_id = len(chat_rooms_db[meetup_id]) + 1
    chat_message = {
        "id": message_id,
        "user": current_user,
        "message": message.message,
        "timestamp": datetime.now().isoformat()
    }
    
    chat_rooms_db[meetup_id].append(chat_message)
    
    return chat_message

@app.get("/api/meetups/{meetup_id}/chat", response_model=List[ChatMessageResponse])
async def get_messages(meetup_id: int, current_user: str = Depends(get_current_user)):
    if meetup_id not in meetups_db:
        raise HTTPException(status_code=404, detail="Meetup not found")
    
    if (current_user not in participants_db[meetup_id] and 
        current_user != meetups_db[meetup_id]["creator"]):
        raise HTTPException(status_code=403, detail="Not authorized to view chat in this meetup")
    
    return chat_rooms_db.get(meetup_id, [])

@app.delete("/api/meetups/{meetup_id}")
async def delete_meetup(meetup_id: int, current_user: str = Depends(get_current_user)):
    if meetup_id not in meetups_db:
        raise HTTPException(status_code=404, detail="Meetup not found")
    
    if meetups_db[meetup_id]["creator"] != current_user:
        raise HTTPException(status_code=403, detail="Not authorized to delete this meetup")
    
    del meetups_db[meetup_id]
    del participants_db[meetup_id]
    del chat_rooms_db[meetup_id]
    
    return {"message": "Meetup deleted successfully"}
