from fastapi import FastAPI, HTTPException, Request, Body
from fastapi import UploadFile, File
from fastapi.responses import HTMLResponse
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from dotenv import load_dotenv
from base64 import b64encode
from fastapi import Form
from typing import List
from pathlib import Path
from datetime import datetime
import google.generativeai as genai
import os
import re
import glob
import hashlib
import json
import shutil


# API 金鑰
load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI()

# 啟用 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
app.mount("/個人資訊", StaticFiles(directory=BASE_DIR / "個人資訊"), name="myself")
app.mount("/main", StaticFiles(directory=BASE_DIR / "主頁頁面"), name="main")
app.mount("/回報頁面", StaticFiles(directory=BASE_DIR / "回報頁面"), name="feedback")
app.mount("/assets", StaticFiles(directory=BASE_DIR / "assets"), name="assets")
app.mount("/js", StaticFiles(directory=BASE_DIR / "js"), name="js")
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
app.mount("/plan", StaticFiles(directory=BASE_DIR / "plan"), name="plan")
templates = Jinja2Templates(directory=BASE_DIR / "templates")
templates = Jinja2Templates(directory=[BASE_DIR / "templates", BASE_DIR / "主頁頁面", BASE_DIR / "介紹頁面", BASE_DIR / "登入註冊", BASE_DIR / "個人資訊", BASE_DIR / "回報頁面"])
# 資料模型 
class StudyRequest(BaseModel):
    goal: str
    time_available_per_week: int
    duration_in_weeks: int

#分批送出請求
class NotesRequest(BaseModel):
    notes_chunks: List[str]
    count: int = 10

class ChatRequest(BaseModel):
    message: str
    plan: list = None

class Score(BaseModel):
    week: str
    score: int

class SavePlanRequest(BaseModel):
    plan: list
    mode: str = "new"   
    filename: str | None = None 

class MessageRequest(BaseModel):
    uid1: str
    uid2: str
    sender: str
    text: str

class Account(BaseModel):
    currentUser: str
    password: str
    displayName: str | None = None
    stage: str | None = None
    avatar: str | None = None   # 存檔案路徑或 base64

class UpdateTagsRequest(BaseModel):
    uid: str
    tags: list[str]

CHAT_DIR = BASE_DIR / "plan"
CHAT_DIR.mkdir(parents=True, exist_ok=True)
SCORE_FILE = Path(__file__).resolve().parent.parent / "plan" / "scores.json"
AVATAR_DIR = BASE_DIR / "static" / "avatars"
AVATAR_DIR.mkdir(parents=True, exist_ok=True)
ACCOUNT_FILE = BASE_DIR / "plan" / "account.json"
REVIEW_FILE = BASE_DIR / "plan" / "review.json"
#PLAN_FILE = Path(__file__).resolve().parent.parent / "plan" / "my_plan.json"

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def load_accounts():
    if not ACCOUNT_FILE.exists():
        return []
    try:
        with open(ACCOUNT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def save_accounts(accounts):
    with open(ACCOUNT_FILE, "w", encoding="utf-8") as f:
        json.dump(accounts, f, ensure_ascii=False, indent=2)

def chat_file(uid1: str, uid2: str) -> Path:
    """確保檔名一致：小的在前"""
    u1, u2 = sorted([uid1, uid2])
    return CHAT_DIR / f"{u1}_{u2}.json"

def fix_json_trailing_commas(file_path: Path):
    """修正 JSON 檔案中的尾逗號"""
    try:
        if not file_path.exists():
            return
        text = file_path.read_text(encoding="utf-8")
        fixed_text = re.sub(r",\s*([\]}])", r"\1", text)  # 移除尾逗號
        json.loads(fixed_text)  # 驗證 JSON 格式
        file_path.write_text(fixed_text, encoding="utf-8")
        print(f"✅ 已修正 {file_path.name} 尾逗號")
    except Exception as e:
        print(f"⚠ 無法修正 {file_path.name}：{e}")

@app.on_event("startup")
def startup_event():
    """伺服器啟動時自動修正 JSON 檔案並建立缺失的檔案"""
    PLAN_DIR = BASE_DIR / "plan"
    PLAN_DIR.mkdir(exist_ok=True)

    # 如果沒有 scores.json，就建立一個空陣列檔案
    if not SCORE_FILE.exists():
        SCORE_FILE.write_text("[]", encoding="utf-8")

    # 修正 scores.json 格式
    fix_json_trailing_commas(SCORE_FILE)

    # 修正 plan 資料夾的所有 json 格式
    for json_file in PLAN_DIR.glob("*.json"):
        fix_json_trailing_commas(json_file)


def load_scores():
    """安全讀取分數資料，錯誤時回空陣列"""
    try:
        if SCORE_FILE.exists():
            with open(SCORE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except json.JSONDecodeError:
        # 如果 JSON 格式壞掉就回空陣列
        return []
    return []

def save_scores(data):
    with open(SCORE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.get("/", response_class=HTMLResponse)
def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/main_ui", response_class=HTMLResponse)
def main_ui(request: Request):
    return templates.TemplateResponse("main.html", {"request": request})

@app.get("/chat_ui", response_class=HTMLResponse)
def chat_ui(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request})

@app.get("/quiz_ui", response_class=HTMLResponse)
def quiz_ui(request: Request):
    return templates.TemplateResponse("quiz.html", {"request": request})

@app.get("/qq_ui", response_class=HTMLResponse)
def qq_ui(request: Request):
    return templates.TemplateResponse("qq.html", {"request": request})

#推薦檔
@app.get("/ex_ui", response_class=HTMLResponse)
def ex_ui(request: Request):
    return templates.TemplateResponse("ex.html", {"request": request})

#靜態檔
@app.get("/test_ui")
def test_ui():
    return FileResponse(BASE_DIR / "static" / "test.html")

#前端用
@app.get("/tt_ui")
def tt_ui():
   return FileResponse(BASE_DIR / "static" / "tt.html")

@app.get("/introduce_ui", response_class=HTMLResponse)
def introduce_ui(request: Request):
    return templates.TemplateResponse("introduce.html", {"request": request})

@app.get("/myself_ui", response_class=HTMLResponse)
def myself_ui(request: Request):
    return templates.TemplateResponse("myself.html", {"request": request})

@app.get("/login_ui", response_class=HTMLResponse)
def login_ui(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/setup_ui", response_class=HTMLResponse)
def setup_ui(request: Request):
    return templates.TemplateResponse("setup.html", {"request": request})

@app.get("/interests_ui", response_class=HTMLResponse)
def interests_ui(request: Request):
    return templates.TemplateResponse("interests.html", {"request": request})

@app.get("/Notification_ui", response_class=HTMLResponse)
def Notification_ui(request: Request):
    return templates.TemplateResponse("Notification.html", {"request": request})

# 列出模型清單
@app.get("/list_models")
def list_models():
    try:
        models = genai.list_models()
        return {"models": models}
    except Exception as e:
        return {"error": str(e)}

# 學習計畫生成功能
@app.post("/generate_plan")
def generate_plan(req: StudyRequest):
    prompt = f"""
你是一位專業學習顧問，請根據以下條件，設計一份學習計畫：
學習目標：{req.goal}
每週可用時間：{req.time_available_per_week} 小時
總計畫週數：{req.duration_in_weeks} 週

請「只」以純 JSON 陣列回覆（不要任何說明，不要包 markdown，不要加文字），格式例如：
[
  {{
    "重點": "本週重點",
    "任務": [...],
    "開始日期": "mm-dd",
    "結束日期": "mm-dd"
  }},
  ...
]
「開始日期」為該週第一天，「結束日期」為該週最後一天。
    """
    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = model.generate_content(prompt)
        text = response.text
        # 只抓 JSON 區塊
        match = re.search(r"```json\s*([\s\S]*?)```", text)
        if match:
            text = match.group(1)
        # 如果有多餘前言，去掉
        text = text.strip()
        try:
            plan_json = json.loads(text)
            return {"plan": plan_json}
        except Exception as e:
            print("解析失敗，原始內容：", text)
            return {"plan": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 筆記產生選擇題功能
@app.post("/generate_questions")
def generate_questions(req: NotesRequest):
    count = min(max(req.count, 1), 20)  # 限制題數1~20
    combined_notes = "\n".join(req.notes_chunks) #字元控制在500
    prompt = f"""
根據以下筆記內容，請產生 {count} 題與主題有關的選擇題：
- 每題請有 4 個選項
- 標示正確答案
- 總分為100分，請平均分配配分給每一題，並將配分填入每題的 "配分" 欄位，例如 "配分": "10分"

請只回傳純 JSON 陣列，格式範例如下：
[
  {{
    "question": "問題內容？",
    "options": ["A", "B", "C", "D"],
    "answer": "B",
    "配分": "10分"
  }},
  ...
]

筆記如下：
{combined_notes}
    """
    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = model.generate_content(prompt)
        raw_text = response.text.strip()

        match = re.search(r"\[\s*{.*?}\s*\]", raw_text, re.DOTALL)
        if not match:
            raise HTTPException(status_code=500, detail="AI 回傳內容無法解析為 JSON")

        questions = json.loads(match.group())

        for q in questions:
            if not all(k in q for k in ("question", "options", "answer")):
                raise HTTPException(status_code=500, detail="部分題目缺少必要欄位")

        return {"questions": questions}

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI 回傳內容不是有效 JSON")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/chat")
def chat(req: ChatRequest):
    """
    AI 對話功能 - 學習計畫全自動 patch
    - 如果有 plan，AI 會自動理解 user 指令並回傳「純 JSON 陣列」的新 plan
    - 沒有 plan 時，AI 只回文字
    - 回傳的 JSON 直接套用到甘特圖
    """
    plan = req.plan if req.plan else []
    plan_json = json.dumps(plan, ensure_ascii=False, indent=2) if plan else None

    if plan_json:
     prompt = f"""你是一位專業的學習計畫助手，下方是目前的行程資料：
{plan_json}

使用者的指令如下：
{req.message}

請根據使用者的自然語言指令，**直接修改 plan 並「只回傳純 JSON 陣列」**（不要說明、不要 markdown、不要其他多餘內容）。
格式範例：
[
  {{
    "重點": "......",
    "任務": ["......"],
    "開始日期": "2025-07-28",
    "結束日期": "2025-08-03"
  }},
  ...
]
如果指令是查詢、閒聊或無需修改，請只回覆純文字，**回覆長度請務必限制在 20 字以內**。
"""
    else:
        prompt = f"""你是一位專業的學習計畫助手，使用者說：{req.message}
只需回覆純文字即可，**請務必將回答限制在 20 字以內**。"""

    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = model.generate_content(prompt)
        text = response.text.strip()
        try:
            plan = json.loads(text)
            if isinstance(plan, list):
                return {"plan": plan}
        except Exception:
            pass
        code_block_match = re.search(r"```json\s*([\s\S]+?)```", text)
        json_match = re.search(r"\[\s*{[\s\S]*}\s*\]", text)
        for match in [code_block_match, json_match]:
            if match:
                try:
                    plan = json.loads(match.group(1) if code_block_match else match.group())
                    if isinstance(plan, list):
                        return {"plan": plan}
                except Exception:
                    continue
        return {"reply": text}
    except Exception as e:
        return {"reply": f"Internal Server Error：{e}"}

# 取得所有分數資料
@app.get("/scores")
def get_scores():
    data = load_scores()
    return {"data": data}


# 新增一筆分數資料
@app.post("/add_score")
def add_score(score: Score):
    data = load_scores()
    data.append(score.dict())
    save_scores(data)
    return {"message": "分數已新增", "data": data}

#甘特圖存json
@app.post("/save_plan")
def save_plan(data: SavePlanRequest):
    """
    - new: 建立 my_plan_N.json 與 ai_plan_N.json
    - update: 只覆蓋指定的 my_plan_N.json
    """
    try:
        PLAN_DIR = BASE_DIR / "plan"
        PLAN_DIR.mkdir(parents=True, exist_ok=True)

        if data.mode == "new":
            # 找最大編號 +1
            existing = sorted(PLAN_DIR.glob("my_plan_*.json"))
            if existing:
                nums = [int(f.stem.split('_')[-1]) for f in existing if f.stem.split('_')[-1].isdigit()]
                next_num = max(nums) + 1 if nums else 1
            else:
                next_num = 1

            # 存 my_plan_X.json
            filename = PLAN_DIR / f"my_plan_{next_num}.json"
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(data.plan, f, ensure_ascii=False, indent=2)

            # 同步更新 ai_plan_X.json
            ai_filename = PLAN_DIR / f"ai_plan_{next_num}.json"
            with open(ai_filename, "w", encoding="utf-8") as f:
                json.dump(data.plan, f, ensure_ascii=False, indent=2)

            return {"message": f"新計畫已儲存 {filename.name}", "filename": filename.name}

        elif data.mode == "update" and data.filename:
            # 只覆蓋指定的 my_plan_X.json
            filename = PLAN_DIR / data.filename
            if not filename.exists():
                raise HTTPException(status_code=404, detail="指定的計畫不存在")

            with open(filename, "w", encoding="utf-8") as f:
                json.dump(data.plan, f, ensure_ascii=False, indent=2)

            return {"message": f"計畫已更新 {filename.name}", "filename": filename.name}

        else:
            raise HTTPException(status_code=400, detail="缺少必要參數")

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/latest_my_plan")
def latest_my_plan():
    """
    讀取最新的 my_plan_N.json
    """
    PLAN_DIR = BASE_DIR / "plan"
    files = sorted(PLAN_DIR.glob("my_plan_*.json"))
    if not files:
        return {"plan": [], "filename": None}
    
    latest_file = max(files, key=lambda f: int(f.stem.split('_')[-1]))
    try:
        with open(latest_file, "r", encoding="utf-8") as f:
            plan = json.load(f)
        return {"plan": plan, "filename": latest_file.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"讀取失敗: {e}")

@app.get("/latest_ai_plan")
def latest_ai_plan():
    """
    讀取最新的 ai_plan_N.json
    """
    PLAN_DIR = BASE_DIR / "plan"
    files = sorted(PLAN_DIR.glob("ai_plan_*.json"))
    if not files:
        return {"plan": []}
    
    latest_file = max(files, key=lambda f: int(f.stem.split('_')[-1]))
    try:
        with open(latest_file, "r", encoding="utf-8") as f:
            plan = json.load(f)
        return {"plan": plan, "filename": latest_file.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"讀取失敗: {e}")
    
@app.get("/chat_history/{uid1}/{uid2}")
def get_chat_history(uid1: str, uid2: str):
    file_path = chat_file(uid1, uid2)
    if not file_path.exists():
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

@app.post("/send_message")        
def send_message(req: MessageRequest):
    uid1, uid2, sender, text = req.uid1, req.uid2, req.sender, req.text
    file_path = chat_file(uid1, uid2)
    history = []
    if file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            history = []

    new_msg = {
        "sender": sender,
        "text": text,
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    history.append(new_msg)

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

    return {"ok": True, "message": new_msg}

@app.post("/accept_friend")
def accept_friend(data: dict = Body(...)):
    """
    接受好友請求：
    - 確保對應的聊天室檔案存在 (例如 1000_1004.json)
    - 若檔案不存在就建立一個空的 []
    """
    me_uid = str(data.get("me_uid", "")).strip()
    friend_uid = str(data.get("friend_uid", "")).strip()

    if not me_uid or not friend_uid:
        raise HTTPException(status_code=400, detail="缺少 me_uid 或 friend_uid")

    try:
        file_path = chat_file(me_uid, friend_uid)
        if not file_path.exists():
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump([], f, ensure_ascii=False, indent=2)
        return {"ok": True, "file": file_path.name}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"建立聊天室失敗: {e}")

@app.post("/update_friends")
def update_friends(data: dict = Body(...)):
    file_path = BASE_DIR / "plan" / "1000_friends.json"
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新好友失敗: {e}")

@app.post("/send_friend_request")
def send_friend_request(data: dict = Body(...)):
    from_uid = str(data.get("from_uid", "")).strip()
    to_uid = str(data.get("to_uid", "")).strip()

    if not from_uid or not to_uid:
        raise HTTPException(status_code=400, detail="缺少 UID")

    file_path = BASE_DIR / "plan" / f"{to_uid}_requests.json"
    requests = []
    if file_path.exists():
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                requests = json.load(f)
        except:
            requests = []

    # 避免重複送
    if not any(r["from_uid"] == from_uid for r in requests):
        requests.append({"from_uid": from_uid})
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(requests, f, ensure_ascii=False, indent=2)

    return {"ok": True, "to": to_uid}

@app.post("/api/register")
def register(data: Account):
    accounts = load_accounts()

    # ✅ 檢查帳號重複
    if any(acc["currentUser"] == data.currentUser for acc in accounts):
        raise HTTPException(status_code=400, detail="帳號已存在")

    # ✅ 產生唯一 UID（4 位數字）
    import random
    existing_uids = {str(acc.get("uid")) for acc in accounts if "uid" in acc}
    uid = str(random.randint(1000, 9999))
    while uid in existing_uids:
        uid = str(random.randint(1000, 9999))

    # ✅ 預設欄位完整格式
    new_user = {
        "currentUser": data.currentUser,
        "uid": uid,
        "displayName": data.displayName or f"{data.currentUser} 是 SmartLearn 第一人",
        "name": data.displayName or data.currentUser,
        "avatar": data.avatar or "/static/default_avatar.png",
        "bio": "這個人很神秘，還沒有填寫自我介紹!",
        "stage": data.stage or "未設定",
        "status": "offline",
        "statusText": "離線",
        "location": "未設定",
        "tags": [],
        "github": "",
        "password": hash_password(data.password),
        "createdAt": datetime.utcnow().isoformat(),
        "lastLogin": None,
    }

    # ✅ 儲存帳號
    accounts.append(new_user)
    save_accounts(accounts)

    return {
        "ok": True,
        "message": "註冊成功",
        "user": new_user
    }

@app.post("/api/login")
def login(data: Account):
    accounts = load_accounts()
    hashed = hash_password(data.password)

    for acc in accounts:
        if acc["currentUser"] == data.currentUser and acc["password"] == hashed:
            # ✅ 更新最後登入時間
            acc["lastLogin"] = datetime.utcnow().isoformat()

            # ✅ 若目前是 hidden，就維持不動
            if acc.get("status") == "hidden":
                print(f"🔒 {data.currentUser} 維持隱藏模式登入")
            else:
                # 否則登入時預設改為 offline（交給前端再決定是否上線）
                acc["status"] = "offline"
                acc["statusText"] = "離線"

            save_accounts(accounts)
            return {"ok": True, "message": "登入成功", "user": acc}

    raise HTTPException(status_code=401, detail="帳號或密碼錯誤")

@app.get("/api/me")
def get_me(currentUser: str):
    accounts = load_accounts()
    user = next((acc for acc in accounts if acc["currentUser"] == currentUser), None)
    if not user:
        raise HTTPException(status_code=404, detail="找不到帳號")
    return user

@app.post("/api/upload_avatar")
async def upload_avatar(
    avatar: UploadFile = File(...),
    currentUser: str = Form(...)
):
    try:
        # 取得副檔名
        ext = os.path.splitext(avatar.filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".gif"]:
            raise HTTPException(status_code=400, detail="不支援的圖片格式")

        # 建立儲存資料夾
        AVATAR_DIR.mkdir(parents=True, exist_ok=True)

        # 儲存檔案路徑 (例如: static/avatars/AAAA2222_1739600000000.png)
        filename = f"{currentUser}_{int(datetime.now().timestamp())}{ext}"
        save_path = AVATAR_DIR / filename

        with open(save_path, "wb") as f:
            f.write(await avatar.read())

        # 建立可供前端使用的 URL
        avatar_url = f"/static/avatars/{filename}"

        # 更新 account.json
        accounts = load_accounts()
        for acc in accounts:
            if acc["currentUser"] == currentUser:
                acc["avatar"] = avatar_url
                break
        save_accounts(accounts)

        return {"ok": True, "avatar": avatar_url}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"頭像上傳失敗: {e}")
    
@app.post("/api/update_profile")
def update_profile(data: dict = Body(...)):
    currentUser = data.get("currentUser")
    if not currentUser:
        raise HTTPException(status_code=400, detail="缺少 currentUser")

    accounts = load_accounts()
    updated = False

    for acc in accounts:
        if acc["currentUser"] == currentUser:
            # 🚫 如果現在是 hidden，不允許被強制改 online
            if acc.get("status") == "hidden" and data.get("status") == "online":
                print(f"🔒 {currentUser} 處於隱藏模式，拒絕自動上線請求")
                continue

            # 只更新有提供的欄位
            for key in [
                "displayName", "location", "bio", "tags", "github",
                "avatar", "status", "statusText", "password",
                "stage", "isHidden"
            ]:
                if key in data and data[key] is not None:
                    acc[key] = data[key]

            if data.get("status") == "online":
                acc["lastLogin"] = datetime.utcnow().isoformat()

            updated = True
            break

    if not updated:
        raise HTTPException(status_code=404, detail="帳號不存在")

    save_accounts(accounts)
    return {"ok": True, "message": "更新成功"}

@app.get("/debug_routes")
def debug_routes():
    return [route.path for route in app.routes]

@app.post("/update_tags")
def update_tags(data: UpdateTagsRequest):
    print("🟦 收到 update_tags 請求：", data)
    accounts = load_accounts()
    updated = False
    for acc in accounts:
        if str(acc.get("uid")) == str(data.uid):
            acc["tags"] = data.tags
            updated = True
            break
    if updated:
        save_accounts(accounts)
        return {"success": True, "message": "興趣標籤已更新"}
    else:
        raise HTTPException(status_code=404, detail="找不到使用者")

@app.post("/api/report_issue")
async def report_issue(data: dict = Body(...)):
    uid = data.get("uid")
    message = data.get("message")

    if not uid or not message:
        raise HTTPException(status_code=400, detail="缺少 UID 或 message")

    entry = {
        "uid": uid,
        "message": message,
        "time": datetime.now().isoformat()
    }

    # 若 review.json 不存在則建立空陣列
    if not REVIEW_FILE.exists():
        with open(REVIEW_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)

    # 讀取、更新、覆寫
    with open(REVIEW_FILE, "r", encoding="utf-8") as f:
        data_list = json.load(f)

    data_list.append(entry)

    with open(REVIEW_FILE, "w", encoding="utf-8") as f:
        json.dump(data_list, f, ensure_ascii=False, indent=2)

    return {"message": "回報已記錄"}

