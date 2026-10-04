# 🎓 SmartLearn 智慧學習輔助平台 
**(Adaptive AI Learning & Study Companion Platform)**

![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js&logoColor=white)
![Gemini API](https://img.shields.io/badge/AI-Google_Gemini-8E75B2?logo=google&logoColor=white)

---

## 💡 專案緣起與產品定位
> 本專案誕生於大學生最真實的痛點：「上課聽不懂、期中考怕被當，卻又不知從何複習」。有別於單純使用 ChatGPT 提問容易導致資訊碎片化，SmartLearn 是一款結合「結構化進度排程」、「AI 錯題與筆記解析」及「社群共學」的適性化學習平台。我們致力於消滅「盲目複習」的時間浪費，透過數據與 AI 雙驅動，打造專屬個人的數位> 陪讀教練。

---

## ⚡開發角色與核心貢獻 (Role & Contribution)
 * **團隊規模：** 6 人產學專題團隊
 * **我的核心負責項目：前後端開發連接與 AI 串接**
   * 負責 Python 網頁模組化架構設計（MVC/Flask）。
   * 串接 Google Gemini API 實現筆記分析、錯題解析與適性化排程演算法。
   * 使用者操作頁面UI/UX關聯性設計。

---

## ✨ 核心業務邏輯與 AI 技術深度 (Technical Highlights)

本系統不只是單純的 API 串接，更著重於學習行為的數據化與適性化推薦邏輯：

### 1. LLM 驅動之知識萃取與測驗生成 (AI Knowledge Extraction)
* **智慧筆記除錯與濃縮：** 使用者可上傳課程講義或過往筆記，系統透過 Google Gemini API 進行語意分析，自動抓出筆記中的錯誤觀念並進行糾正，產出「章節懶人包」。
* **動態測驗引擎：** AI 根據當日學習進度自動生成模擬考題，並內建錯題本機制。系統會針對答錯的專有名詞即時解說，避免學生一錯再錯。

### 2. 適性化進度演算法 (Adaptive Scheduling Algorithm)
* **目標導向拆解：** 將龐雜的學期課程轉化為條理分明的每日待辦事項（Task List）。系統會依據使用者的學習狀況（如：測驗答對率、落後天數），動態且自適應地調整後續的複習進度與行事曆排程。
* **防呆與督促機制：** 結合手機或 Email 推播，於特定時間提醒學習進度，並能根據使用者的「偷懶」或「臨時有事」指令，自動重新演算並重構後續的進度模板。

### 3. 前端開發與互動設計 (Frontend Development & UI Design)
* **敏捷與模組化開發：** 捨棄大型框架的包袱，運用 JavaScript 進行高效的動態 DOM 操作。作為小專案，打造輕量且易於迭代的前端架構，完美契合概念驗證 (PoC) 階段的敏捷開發需求。
* **數據視覺化與體驗優化：** 導入 Tailwind CSS 實現流暢的響應式介面 (RWD)，將複雜的學習數據轉化為直覺的「動態甘特圖」與「視覺化排程儀表板」，大幅降低使用者的認知負荷。

### 4. 預留生態系擴充：社群與教師端 (Ecosystem Scalability)
* **社群共學文化：** 系統底層架構支援筆記共享與匿名討論房機制。AI 能自動媒合並精選完整度高的筆記推薦給學弟妹，建立正向的學術社群循環。
* **數據驅動教學 (Teacher Dashboard)：** 系統 API 預留教師端擴充接口。未來教授可透過後台即時監控全班的學習軌跡、測驗答對率分佈，精準找出學生的「學習盲點」並動態派發作業，實現教與學的雙向數據回饋。

---

## 🛠️ 技術棧 (Tech Stack)

* **前端與介面 (Frontend)：** JavaScript, HTML5, Tailwind CSS, Figma (UI/UX 規劃)
* **後端與資料庫 (Backend & Database)：** Python, FastAPI, PostgreSQL
* **AI 應用與串接 (AI Integration)：** Google Gemini API (適性化學習排程運算)
* **專案管理與版控 (DevOps & PM)：** Azure DevOps (敏捷式開發管理), Git

---

## 📂 專案目錄結構 (Project Structure)

```text
SmartLearn/
├── app/                    核心應用程式邏輯
├── assets/                 專案靜態資源與圖片
├── js/                     前端 JavaScript 互動腳本
├── plan/                   專案企劃與時程規劃文件
├── src/                    原始程式碼與核心模組
├── static/                 CSS 與全域樣式檔
├── templates/              HTML 網頁模板
├── 主頁頁面/                系統首頁與儀表板介面
├── 介紹頁面/                平台功能導覽與說明
├── 個人資訊/                使用者檔案與學習歷程管理
├── 回報頁面/                使用者意見回饋與 Bug 回報機制
├── 登入註冊/                會員認證與帳號管理模組
├── requirements.txt        Python 依賴套件清單
└── README.md               專案說明文件
```

---

## 📊 敏捷式開發 (Azure DevOps) 工作清單畫面 
<a href="https://github.com/user-attachments/assets/5bc99646-c5ae-4bd3-b67d-9c457dbef340" target="_blank">
  <img width="1560" height="1008" alt="image" src="https://github.com/user-attachments/assets/0a6b7c44-591f-4db8-8c18-020ea5be56d9" />
</a>
