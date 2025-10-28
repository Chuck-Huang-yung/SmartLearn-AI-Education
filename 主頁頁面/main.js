const MY_UID = "1000"; // 自己的 UID
const FRIENDS_JSON_URL = "/plan/1000_friends.json";
// 模擬任務資料
const tasksData = [
  {
    id: 1,
    name: "每日登入",
    description: "連續登入7天",
    progress: 85,
    maxProgress: 100,
    coins: 50,
    status: "in-progress",
  },
  {
    id: 2,
    name: "完成3堂課程",
    description: "學習任意3個課程單元",
    progress: 66,
    maxProgress: 100,
    coins: 100,
    status: "in-progress",
  },
  {
    id: 3,
    name: "測驗滿分",
    description: "在任一測驗中獲得滿分",
    progress: 100,
    maxProgress: 100,
    coins: 200,
    status: "completed",
  },
  {
    id: 4,
    name: "新增好友",
    description: "邀請一位朋友加入學習",
    progress: 0,
    maxProgress: 100,
    coins: 150,
    status: "available",
  },
  {
    id: 5,
    name: "學習時長",
    description: "累積學習時間達30分鐘",
    progress: 75,
    maxProgress: 100,
    coins: 80,
    status: "in-progress",
  },
];

// === 載入使用者 Profile 到右上角 ===
function loadProfile() {
  const raw = localStorage.getItem("smartlearn_profile");
  if (!raw) return;

  try {
    const profile = JSON.parse(raw);
    console.log("載入 profile:", profile);

    const topName = document.getElementById("topName");
    const topInitial = document.getElementById("topInitial");
    const topImg = document.getElementById("topImg");

    if (!topImg || !topInitial) {
      console.error(
        "❌ 找不到 topImg 或 topInitial，請檢查 main.html 有沒有加上這些元素"
      );
      return;
    }

    if (topName) topName.textContent = profile.name || "使用者";

    if (profile.avatar) {
      topImg.src = profile.avatar;
      topImg.classList.remove("hidden");
      topInitial.classList.add("hidden");
    } else {
      topImg.classList.add("hidden");
      topInitial.textContent = (profile.name?.trim()?.[0] || "U").toUpperCase();
      topInitial.classList.remove("hidden");
    }
  } catch (err) {
    console.error("❌ 讀取 profile 失敗", err);
  }
}

document.addEventListener("DOMContentLoaded", loadProfile);

// 渲染任務列表
function renderTasks() {
  const taskList = document.getElementById("taskList");
  taskList.innerHTML = "";

  tasksData.forEach((task) => {
    const taskElement = document.createElement("div");
    taskElement.className = `task-item ${task.status}`;
    taskElement.innerHTML = `
      <div class="task-name">${task.name}</div>
      <div class="task-description">${task.description}</div>
      <div class="task-progress">
        <div class="task-progress-bar">
          <div class="task-progress-fill" style="width: ${
            task.progress
          }%"></div>
        </div>
        <div class="task-progress-text">${task.progress}%</div>
      </div>
      <div class="task-reward">
        <div class="task-coins">
          <span>🪙</span>
          <span>+${task.coins}</span>
        </div>
        <div class="task-status ${task.status}">
          ${
            task.status === "completed"
              ? "已完成"
              : task.status === "in-progress"
              ? "進行中"
              : "可領取"
          }
        </div>
      </div>
    `;

    taskElement.addEventListener("click", () => {
      handleTaskClick(task);
    });

    taskList.appendChild(taskElement);
  });
}

// 處理任務點擊
function handleTaskClick(task) {
  if (task.status === "completed") {
    alert(`恭喜！您已完成「${task.name}」任務，獲得 ${task.coins} 金幣！`);
  } else if (task.status === "in-progress") {
    alert(`「${task.name}」任務進行中，當前進度：${task.progress}%`);
  } else {
    alert(`「${task.name}」任務可以開始執行了！`);
  }
}

// 用 JSON 取代寫死的 friendsData
let friendsData = []; // 由 /plan/user.json 生成

async function loadFriends() {
  try {
    const res = await fetch(FRIENDS_JSON_URL, { cache: "no-store" });
    const data = await res.json();
    friendsData = data.friends || [];
    friendsData.forEach((f) => {
      f.statusText = f.statusText || (f.status === "online" ? "線上" : "離線");
      f.bio = f.bio || "這個人很神秘，還沒有填寫自我介紹";
    });
    renderFriends();
  } catch (err) {
    console.error("讀取好友列表失敗:", err);
  }
}

function avatarHTML(avatar) {
  if (
    typeof avatar === "string" &&
    (avatar.startsWith("/") || avatar.startsWith("http"))
  ) {
    return `<img src="${avatar}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
  }
  return avatar || "👤";
}

async function initFriendsFromJSON() {
  const res = await fetch(USERS_JSON_URL, { cache: "no-store" });
  const data = await res.json();
  allUsers = data.users || [];
}

async function loadChatSummaries() {
  for (let f of friendsData) {
    try {
      const resp = await fetch(`${API_BASE}/chat_history/${MY_UID}/${f.uid}`);
      if (!resp.ok) continue;
      const history = await resp.json();

      if (history.length > 0) {
        const last = history[history.length - 1];
        // 更新 friends 陣列裡的 lastMsg / time
        const friend = friendsData.find((ff) => ff.name === f.name);
        if (friend) {
          friend.lastMsg = last.text;
          // 取時分顯示
          if (last.time) {
            friend.time = last.time; // 原始時間 (ISO)
          }
          // 這裡暫時全部設為 0，未來要靠後端判斷未讀數
          friend.unread = 0;
        }
      }
    } catch (err) {
      console.error(`讀取 ${f.name} 聊天紀錄失敗:`, err);
    }
  }
  renderFriends();
}

let friendRequests = [
  {
    uid: "1010",
    name: "圓圓",
    status: "online",
    avatar: "/static/bot6.jpg",
    statusText: "線上",
    bio: "屁股圓！",
  },
];

// 好友列表功能
const friendsListTrigger = document.getElementById("friendsListTrigger");
const friendsSidebar = document.getElementById("friendsSidebar");
const friendsOverlay = document.getElementById("friendsOverlay");
const closeFriendsBtn = document.getElementById("closeFriendsBtn");
const friendsContent = document.getElementById("friendsContent");
const addFriendBtn = document.getElementById("addFriendBtn");
const friendRequestsBtn = document.getElementById("friendRequestsBtn");
const friendsSearchInput = document.getElementById("friendsSearchInput");
const requestsOverlay = document.getElementById("requestsOverlay");
const requestsContent = document.getElementById("requestsContent");
const closeRequestsBtn = document.getElementById("closeRequestsBtn");
const friendsNotif = document.getElementById("friendsNotif");
const requestsNotif = document.getElementById("requestsNotif");

function updateFriendsNotif() {
  const totalUnread = friendsData.reduce((sum, f) => sum + (f.unread || 0), 0);
  if (totalUnread > 0) {
    friendsNotif.textContent = totalUnread;
    friendsNotif.classList.remove("hidden");
  } else {
    friendsNotif.classList.add("hidden");
  }
}

// 更新好友請求紅點
function updateRequestsNotif(force = false) {
  if (friendRequests.length > 0) {
    requestsNotif.textContent = friendRequests.length;
    requestsNotif.classList.remove("hidden");
  } else {
    requestsNotif.classList.add("hidden");
  }
}

function renderFriendRequests() {
  if (!friendRequests.length) {
    requestsContent.innerHTML = `<p class="text-gray-500 p-4">尚未有交友請求</p>`;
    updateRequestsNotif();
    return;
  }

  requestsContent.innerHTML = friendRequests
    .map((r) => {
      const colorKey = Number.isFinite(Number(r.uid))
        ? Number(r.uid)
        : r.name.length;
      return `
      <div class="friend-item">
        <div class="friend-avatar" style="background-color:${getAvatarColor(
          colorKey
        )}">
          ${avatarHTML(r.avatar)}
        </div>
        <div class="friend-info">
          <div class="friend-name">${r.name}</div>
          <div class="friend-status ${r.status}">
            <span class="friend-status-dot ${r.status}"></span>
            ${r.statusText || (r.status === "online" ? "線上" : "離線")}
          </div>
        </div>

        <div class="req-actions">
          <button class="req-accept" data-uid="${r.uid}">✅ 接受</button>
          <button class="req-decline" data-uid="${r.uid}">✖️ 拒絕</button>
        </div>
      </div>
    `;
    })
    .join("");
  updateRequestsNotif();
  // 綁定接受
  requestsContent.querySelectorAll(".req-accept").forEach((btn) => {
    btn.onclick = async () => {
      const uid = btn.dataset.uid;
      const req = friendRequests.find((x) => x.uid === uid);
      if (!req) return;

      // 已在好友就不重複加入
      if (!friendsData.some((f) => f.uid === req.uid)) {
        const newFriend = {
          id: friendsData.length + 1,
          uid: req.uid,
          name: req.name,
          avatar: req.avatar || "👤",
          status: req.status,
          statusText:
            req.statusText || (req.status === "online" ? "線上" : "離線"),
          bio: req.bio || "這個人很神秘，還沒有填寫自我介紹",
          unread: 0,
        };
        friendsData.push(newFriend);
        await fetch(`${API_BASE}/update_friends`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ friends: friendsData }),
        });
      }

      try {
        const resp = await fetch(`${API_BASE}/accept_friend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            me_uid: MY_UID,
            friend_uid: uid,
          }),
        });
        const data = await resp.json();
        if (data.ok) {
          console.log("✅ 已建立聊天室:", data.file);
        } else {
          console.error("❌ 建立失敗", data);
        }
      } catch (err) {
        console.error("accept_friend 錯誤:", err);
      }

      // 移除請求並刷新
      friendRequests = friendRequests.filter((x) => x.uid !== uid);
      renderFriendRequests();
      renderFriends();
    };
  });

  // 綁定拒絕
  requestsContent.querySelectorAll(".req-decline").forEach((btn) => {
    btn.onclick = () => {
      const uid = btn.dataset.uid;
      const req = friendRequests.find((x) => x.uid === uid);
      if (!req) return;

      friendRequests = friendRequests.filter((x) => x.uid !== uid);
      renderFriendRequests();
      alert(`已拒絕 ${req.name} 的好友請求`);
    };
  });
}

function renderFriends(list = friendsData) {
  list = [...list].sort((a, b) => {
    if (!a.time) return 1;
    if (!b.time) return -1;
    return new Date(b.time) - new Date(a.time);
  });

  friendsContent.innerHTML = "";
  list.forEach((f) => {
    const friendElement = document.createElement("div");
    friendElement.className = "friend-item";
    friendElement.dataset.id = f.id;

    const showTime = f.time ? formatFriendListTime(f.time) : "";

    friendElement.innerHTML = `
      <div class="friend-avatar" data-id="${f.id}" 
           style="background-color: ${getAvatarColor(f.id)}">
        ${avatarHTML(friendsData.find((x) => x.id === f.id)?.avatar)}
      </div>
      <div class="friend-info">
        <div class="friend-name">${f.name}</div>
        <div class="friend-last-msg">${f.lastMsg || ""}</div>
      </div>
      <div class="friend-meta">
        <span class="msg-time">${showTime}</span>
        ${f.unread > 0 ? `<span class="unread-badge">${f.unread}</span>` : ""}
      </div>
    `;

    friendsContent.appendChild(friendElement);
  });
  updateFriendsNotif();
}

// 聊天室訊息 → 只顯示「上午 04:06」
function formatChatTime(raw) {
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// 好友列表 → 今天只顯示「上午 04:06」，非今天顯示「MM/DD 上午 04:06」
function formatFriendListTime(raw) {
  const d = new Date(raw);
  if (isNaN(d)) return raw;

  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  if (isToday) {
    return d.toLocaleString("zh-TW", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } else {
    return d.toLocaleString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
}

async function receiveMessage(friendId, msg) {
  const f = friendsData.find((x) => x.id === friendId);
  if (!f) return;

  try {
    const resp = await fetch(`${API_BASE}/send_message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid1: f.uid, // 對方 UID
        uid2: MY_UID, // 我的 UID
        sender: f.uid, // 這裡是對方發的
        text: msg,
      }),
    });
    const result = await resp.json();

    if (result.ok) {
      // 更新前端暫存
      getMsgs(friendId).push({
        me: false,
        text: msg,
        time: result.message.time,
      });

      // 更新好友列表
      const friend = friendsData.find((ff) => ff.id === friendId);
      if (friend) {
        friend.lastMsg = msg;
        friend.time = result.message.time; // ✅ 轉成「上午/下午」
        friend.unread += 1;
      }

      // 重新渲染
      renderFriends();
    }
  } catch (err) {
    console.error("模擬訊息失敗", err);
  }
}

friendRequestsBtn.addEventListener("click", () => {
  // 如果「新增好友」視窗開著就關閉它
  document.getElementById("addFriendOverlay")?.classList.remove("show");

  requestsOverlay.classList.add("show");
  renderFriendRequests();
});

closeRequestsBtn?.addEventListener("click", () => {
  requestsOverlay.classList.remove("show");
});

friendsSearchInput?.addEventListener("input", () => {
  const keyword = friendsSearchInput.value.toLowerCase();
  const filtered = friendsData.filter((f) =>
    f.name.toLowerCase().includes(keyword)
  );
  renderFriends(filtered);
});

function getAvatarColor(id) {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
  ];
  return colors[id % colors.length];
}

const friendsChatWrapper = document.getElementById("friendsChatWrapper");

function showFriendsList() {
  renderFriends();
  friendsChatWrapper.classList.add("show");
  friendsOverlay.classList.add("show");
  document.body.style.overflow = "hidden";
}

function hideFriendsList() {
  friendsChatWrapper.classList.remove("show");
  friendsOverlay.classList.remove("show");
  document.body.style.overflow = "";
}

friendsListTrigger.addEventListener("click", showFriendsList);
closeFriendsBtn.addEventListener("click", hideFriendsList);
friendsOverlay.addEventListener("click", hideFriendsList);

addFriendBtn.addEventListener("click", () => {});

friendRequestsBtn.addEventListener("click", () => {});
// ====== 新增好友功能 ======
const USERS_JSON_URL = "/plan/user.json"; // 你的 users.json 路徑
let allUsers = [];

// 載入使用者資料
async function loadUsers() {
  if (allUsers.length) return allUsers;
  const res = await fetch(USERS_JSON_URL, { cache: "no-store" });
  const data = await res.json();
  allUsers = data.users || [];
  return allUsers;
}

// 搜尋：只允許 UID 或 姓名
function searchUser(keyword) {
  const q = String(keyword).trim();
  if (!q) return [];

  // UID 搜尋（必須是4位數字）
  if (/^\d{4}$/.test(q)) {
    return allUsers.filter((u) => u.uid === q);
  }

  // 姓名搜尋（模糊比對）
  const lower = q.toLowerCase();
  return allUsers.filter((u) => u.name.toLowerCase().includes(lower));
}

// 綁定 DOMContentLoaded
// ===== 新增好友：覆蓋在好友列上方 =====
document.addEventListener("DOMContentLoaded", async () => {
  await loadUsers();
  const addFriendBtn = document.getElementById("addFriendBtn");
  const addFriendOverlay = document.getElementById("addFriendOverlay");
  const closeAddFriendBtn = document.getElementById("closeAddFriendBtn");
  const friendSearchBtn = document.getElementById("addFriendSearchBtn");
  const friendSearchInput = document.getElementById("addFriendSearchInput");
  const friendSearchResult = document.getElementById("addFriendSearchResult");

  // 打開新增好友浮層
  addFriendBtn?.addEventListener("click", () => {
    addFriendOverlay.classList.add("show");
    friendSearchResult.innerHTML = `<p class="text-gray-500 text-sm">搜尋結果如下...</p>`;
    friendSearchInput.value = "";
  });

  // 關閉
  closeAddFriendBtn?.addEventListener("click", () => {
    addFriendOverlay.classList.remove("show");
  });

  // 搜尋
  friendSearchBtn?.addEventListener("click", () => {
    const kw = friendSearchInput.value.trim();
    const found = searchUser(kw);

    if (!found.length) {
      friendSearchResult.innerHTML = `<p class="text-red-500">❌ 找不到符合的使用者</p>`;
      return;
    }

    // 用和好友列相同的樣式 friend-item
    friendSearchResult.innerHTML = found
      .map(
        (u) => `
      <div class="friend-item">
         <div class="friend-avatar" style="background-color: ${getAvatarColor(
           parseInt(u.uid)
         )}">
          ${avatarHTML(u.avatar)}
        </div>
        <div class="friend-info">
          <div class="friend-name">${u.name}</div>
          <div class="friend-status ${u.status}">
           <span class="friend-status-dot ${u.status}"></span>
           ${u.status === "online" ? "線上" : "離線"}</div>
        </div>
        <button class="ml-auto px-2 py-1 bg-green-500 text-white rounded addFriendConfirm" data-uid="${
          u.uid
        }">
          好友請求
        </button>
      </div>
    `
      )
      .join("");

    // 綁定加入好友事件
    document.querySelectorAll(".addFriendConfirm").forEach((btn) => {
      btn.onclick = async () => {
        const uid = btn.dataset.uid;
        const user = allUsers.find((x) => x.uid === uid);
        if (!user) return;

        // 呼叫後端 API，把請求發給對方
        try {
          const resp = await fetch(`${API_BASE}/send_friend_request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              from_uid: MY_UID, // 我自己
              to_uid: user.uid, // 對方
            }),
          });
          const data = await resp.json();
          if (data.ok) {
            alert(`✅ 好友請求已發送給 ${user.name}`);
          }
        } catch (err) {
          console.error("送出好友請求失敗:", err);
        }
      };
    });
  });

  // Enter 觸發
  friendSearchInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") friendSearchBtn.click();
  });
});

// 用戶下拉選單
const profileButton = document.querySelector(".profile-button");
const dropdownMenu = document.querySelector(".dropdown-menu");

profileButton.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownMenu.classList.toggle("show");
});

document.addEventListener("click", () => {
  dropdownMenu.classList.remove("show");
});

dropdownMenu.addEventListener("click", (e) => {
  e.stopPropagation();
});

const dropdownItems = document.querySelectorAll(".dropdown-item");
dropdownItems.forEach((item) => {
  item.addEventListener("click", () => {
    console.log(`點擊了: ${item.textContent}`);
    dropdownMenu.classList.remove("show");
  });
});

// 日曆功能
const calendarNavs = document.querySelectorAll(".calendar-nav");
const calendarTitle = document.querySelector(".calendar-title");
const calendarGrid = document.querySelector(".calendar-grid");

const today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();

const months = [
  "一月",
  "二月",
  "三月",
  "四月",
  "五月",
  "六月",
  "七月",
  "八月",
  "九月",
  "十月",
  "十一月",
  "十二月",
];
const weekDays = ["日", "一", "二", "三", "四", "五", "六"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function generateCalendar() {
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === currentYear && today.getMonth() === currentMonth;
  const todayDate = today.getDate();

  calendarGrid.innerHTML = "";

  weekDays.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "calendar-day-header";
    dayHeader.textContent = day;
    calendarGrid.appendChild(dayHeader);
  });

  for (let i = 0; i < firstDay; i++) {
    const emptyDay = document.createElement("div");
    emptyDay.className = "calendar-day";
    calendarGrid.appendChild(emptyDay);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";
    dayElement.textContent = day;

    if (isCurrentMonth && day === todayDate) {
      dayElement.classList.add("today");
    }

    // 修改點擊事件：跳轉到行事曆頁面並傳遞選中的日期
    dayElement.addEventListener("click", () => {
      // 移除其他日期的選中狀態
      document.querySelectorAll(".calendar-day.selected").forEach((el) => {
        el.classList.remove("selected");
      });
      dayElement.classList.add("selected");

      // 創建選中的日期物件
      const selectedDate = new Date(currentYear, currentMonth, day);

      // 將選中的日期存儲到 localStorage 中，供行事曆頁面使用
      const dateString = `${selectedDate.getFullYear()}-${String(
        selectedDate.getMonth() + 1
      ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      localStorage.setItem("selectedCalendarDate", dateString);
      localStorage.setItem("selectedCalendarYear", selectedDate.getFullYear());
      localStorage.setItem("selectedCalendarMonth", selectedDate.getMonth());

      // 跳轉到行事曆頁面
      window.location.href = "../行事曆頁面/plan.html";
    });

    calendarGrid.appendChild(dayElement);
  }

  const totalCells = calendarGrid.children.length - 7;
  const remainingCells = 42 - totalCells;

  for (let day = 1; day <= remainingCells && remainingCells < 7; day++) {
    const nextMonthDay = document.createElement("div");
    nextMonthDay.className = "calendar-day next-month";
    nextMonthDay.textContent = day;

    // 為下個月的日期也添加點擊事件
    nextMonthDay.addEventListener("click", () => {
      // 計算下個月的年月
      let nextMonth = currentMonth + 1;
      let nextYear = currentYear;
      if (nextMonth > 11) {
        nextMonth = 0;
        nextYear++;
      }

      const selectedDate = new Date(nextYear, nextMonth, day);
      const dateString = `${selectedDate.getFullYear()}-${String(
        selectedDate.getMonth() + 1
      ).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;

      localStorage.setItem("selectedCalendarDate", dateString);
      localStorage.setItem("selectedCalendarYear", selectedDate.getFullYear());
      localStorage.setItem("selectedCalendarMonth", selectedDate.getMonth());

      window.location.href = "../行事曆頁面/plan.html";
    });

    calendarGrid.appendChild(nextMonthDay);
  }
}

function updateCalendar() {
  calendarTitle.textContent = `${currentYear}年 ${months[currentMonth]}`;
  generateCalendar();
}

calendarNavs[0].addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  }
  updateCalendar();
});

calendarNavs[1].addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  updateCalendar();
});

updateCalendar();

// ====== 猴子進度條 JS 核心 ======
let current = 0;
let target = 0;
let ticking = false;
let autoTimer = null;

const bar = document.getElementById("bar");
const fill = document.getElementById("fill");
const monkey = document.getElementById("monkey");
const nowEl = document.getElementById("now");
const bananasBox = document.getElementById("bananas");

let bananas = [];

function initBananas(
  pcts = [25, 50, 75, 100],
  bananaSrc = "/main/images/banana.png"
) {
  bananasBox.innerHTML = "";
  bananas = pcts.map((pct) => {
    const img = document.createElement("img");
    img.src = bananaSrc;
    img.alt = `banana-${pct}`;
    img.className = "banana";
    img.style.left = pct + "%";
    bananasBox.appendChild(img);
    return { pct, el: img, eaten: false };
  });
}

function setProgress(p) {
  target = clamp(Math.round(p), 0, 100);
  if (!ticking) stepTowardTarget();
}

function stepTowardTarget() {
  if (current === target) {
    ticking = false;
    return;
  }
  ticking = true;

  if (current < target) current += 1;
  else current -= 1;

  applyProgress(current);
  window.setTimeout(stepTowardTarget, 18);
}

function applyProgress(pct) {
  fill.style.width = pct + "%";
  const barRect = bar.getBoundingClientRect();
  const x = (barRect.width * pct) / 100;
  monkey.style.left = x + "px";

  bananas.forEach((b) => {
    if (!b.eaten && pct >= b.pct) {
      b.eaten = true;
      b.el.classList.add("eaten");
    }
  });

  nowEl && (nowEl.textContent = pct);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function bump(delta) {
  setProgress(current + delta);
}
function autoRun() {
  clearInterval(autoTimer);
  setProgress(0);
  autoTimer = setInterval(() => {
    if (current >= 100) {
      clearInterval(autoTimer);
      return;
    }
    setProgress(current + 1);
  }, 60);
}

// 初始化猴子進度條
window.addEventListener("load", () => {
  renderTasks();
  initBananas([25, 50, 75, 100], "images/banana.png");
  setProgress(3); // 初始進度
});

// 移除原來的日曆點擊跳轉事件，因為我們現在在日期點擊中處理跳轉
// document.addEventListener("DOMContentLoaded", () => {
//   const calendarEl = document.querySelector(".calendar");
//   if (calendarEl) {
//     calendarEl.addEventListener("click", () => {
//       window.location.href = "../行事曆頁面/plan.html";
//     });
//   }
// });

// ESC鍵關閉好友列表
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && friendsSidebar.classList.contains("show")) {
    hideFriendsList();
  }
});

// 商店按鈕
const shopButton = document.querySelector(".shop-button");
shopButton.addEventListener("click", () => {
  console.log("商店按鈕被點擊");
});

// 更多按鈕
const moreButton = document.querySelector(".more-button");
moreButton.addEventListener("click", () => {
  console.log("更多按鈕被點擊");
});

// ===== 新增學習目標 Modal：主控函式 =====
function openAddProgressModal() {
  const modal = document.getElementById("addProgressModal");
  if (!modal) return;
  modal.classList.remove("hidden");

  // 預設日期 = 今天
  const dateInput = document.getElementById("dateInput");
  if (dateInput) {
    const today = new Date();
    dateInput.value = today.toISOString().split("T")[0];
  }

  // 鎖捲動
  document.body.style.overflow = "hidden";
}

function closeAddProgressModal() {
  const modal = document.getElementById("addProgressModal");
  if (!modal) return;
  modal.classList.add("hidden");

  // 清表單
  const form = document.getElementById("addProgressForm");
  if (form) form.reset();

  // 解鎖捲動
  document.body.style.overflow = "";
}

function toLocalYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fillPlanDates(plan, startdate) {
  const d = new Date(startdate);
  for (let i = 0; i < plan.length; i++) {
    const weekStart = new Date(d);
    const weekEnd = new Date(d);
    weekEnd.setDate(weekEnd.getDate() + 6);

    plan[i]["開始日期"] = toLocalYMD(weekStart);
    plan[i]["結束日期"] = toLocalYMD(weekEnd);

    d.setDate(d.getDate() + 7); // 下一週
  }
}

// === 修改後的 handleAddProgressSubmit ===
async function handleAddProgressSubmit(event) {
  event.preventDefault();

  const goal = document.getElementById("goalInput")?.value?.trim();
  const hours = parseInt(document.getElementById("hoursInput")?.value, 10);
  const weeks = parseInt(document.getElementById("weeksInput")?.value, 10);
  const date = document.getElementById("dateInput")?.value;

  if (!goal || !hours || !weeks || !date) {
    alert("請填寫所有必填欄位");
    return;
  }
  if (hours < 1 || hours > 168) {
    alert("每週時間需在 1–168 小時之間");
    return;
  }
  if (weeks < 1 || weeks > 52) {
    alert("計畫週數需在 1–52 週之間");
    return;
  }

  try {
    showLoading(); // ← 顯示猴子 Loading

    const response = await fetch(`${API_BASE}/generate_plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goal: goal,
        time_available_per_week: hours,
        duration_in_weeks: weeks,
      }),
    });

    if (!response.ok) {
      alert("❌ 學習計畫產生失敗");
      return;
    }

    const data = await response.json();
    let plan;
    try {
      plan = typeof data.plan === "string" ? JSON.parse(data.plan) : data.plan;
    } catch {
      alert("AI 回傳內容無法解析，請檢查後端 log");
      console.log("AI原始內容", data.plan);
      return;
    }

    fillPlanDates(plan, date);

    // 儲存計畫
    const saveResp = await fetch(`${API_BASE}/save_plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: plan,
        mode: "new",
      }),
    });

    if (saveResp.ok) {
      const result = await saveResp.json();
      localStorage.setItem("latestPlan", JSON.stringify(plan));
      localStorage.setItem("latestPlanStartDate", date);

      console.log("✅ 立刻跳轉 index.html");
      window.location.href = `${API_BASE}/`;
    } else {
      console.error("❌ save_plan 失敗，status =", saveResp.status);
    }
  } catch (err) {
    console.error("API 錯誤：", err);
    alert("❌ 發生錯誤，請稍後再試");
  } finally {
    hideLoading(); // ← 關閉猴子 Loading
    closeAddProgressModal(); // ← 關閉表單 Modal
  }
}

async function loadUsers() {
  if (allUsers.length) return allUsers;
  const res = await fetch(USERS_JSON_URL, { cache: "no-store" });
  const data = await res.json();
  allUsers = data.users || [];
  return allUsers;
}
function searchUser(keyword) {
  const q = String(keyword).trim();
  if (!q) return [];

  // UID 搜尋（必須是4位數字）
  if (/^\d{4}$/.test(q)) {
    return allUsers.filter((u) => u.uid === q);
  }

  // 姓名搜尋（模糊比對）
  const lower = q.toLowerCase();
  return allUsers.filter((u) => u.name.toLowerCase().includes(lower));
}

// ===== 綁定外層點擊關閉、ESC 關閉 =====
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("addProgressModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeAddProgressModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && friendsChatWrapper.classList.contains("show")) {
      hideFriendsList();
    }
  });
});

// === 新增：猴子 Loading 控制函式 ===
function showLoading(msg = "學習計畫生成中，請稍候...") {
  const overlay = document.getElementById("modalOverlay");
  const msgBox = document.getElementById("modalMsg");
  if (overlay && msgBox) {
    msgBox.textContent = msg;
    overlay.classList.add("show");
  }
}

function hideLoading() {
  const overlay = document.getElementById("modalOverlay");
  if (overlay) {
    overlay.classList.remove("show");
  }
}

async function loadLatestPlan() {
  try {
    const resp = await fetch(`${API_BASE}/latest_ai_plan`);
    const data = await resp.json();
    console.log("最新計畫：", data.plan);
    // TODO: 把 data.plan 顯示成表格或列表
  } catch (err) {
    console.error("載入計畫錯誤：", err);
  }
}

window.addEventListener("load", async () => {
  await loadFriends();
  await initFriendsFromJSON();
  await loadChatSummaries();
  renderTasks();
  initBananas([25, 50, 75, 100], "/main/images/banana.png");
  setProgress(3);
  renderFriends();
  loadLatestPlan();
  updateRequestsNotif(true);
  initMessages();
  setTimeout(() => {
    receiveMessage(5, "您好！");
  }, 2000);

  setTimeout(() => {
    receiveMessage(5, "明天要一起打球嗎？");
  }, 5000);
});
friendsData.forEach((f) => {
  f.bio = f.bio || `這個人很神秘，還沒有填寫自我介紹`;
});

// Profile Modal DOM
const profileModal = document.getElementById("profileModal");
const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const profileStatus = document.getElementById("profileStatus");
const profileBio = document.getElementById("profileBio");
const closeProfileBtn = document.getElementById("closeProfile");
const profileStartChat = document.getElementById("profileStartChat");

function openProfile(friendId) {
  if (
    chatPanel.classList.contains("show") &&
    chatPanel.dataset.activeId == friendId
  ) {
    chatPanel.classList.remove("show");
    return;
  }
  const f = friendsData.find((x) => x.id == friendId);
  if (!f) return;
  profileAvatar.innerHTML = avatarHTML(f.avatar);
  profileName.textContent = `${f.name}（UID: ${f.uid}）`;
  profileStatus.innerHTML = `
  <span class="profile-status-dot ${f.status}"></span>
  ${f.statusText}
`;
  profileBio.textContent = f.bio || "這個人很神秘，還沒有填寫自我介紹";
  profileModal.classList.add("show");

  profileStartChat.onclick = () => {
    profileModal.classList.remove("show");
    openChat(friendId);
  };
}

closeProfileBtn?.addEventListener("click", () =>
  profileModal.classList.remove("show")
);
profileModal?.addEventListener("click", (e) => {
  if (e.target === profileModal) profileModal.classList.remove("show");
});

// Chat Modal DOM
const chatPanel = document.getElementById("chatPanel");
const chatUserName = document.getElementById("chatUserName");
const chatBody = document.getElementById("chatBody");
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const closeChatBtn = document.getElementById("closeChatBtn");
const messages = new Map();
// 訊息暫存
function initMessages() {
  friendsData.forEach((f) => {
    if (!messages.has(f.id)) {
      messages.set(f.id, []);
    }
    if (f.lastMsg) {
      messages.get(f.id).push({
        me: false,
        text: f.lastMsg,
        time: f.time || "", // ✅ 把時間塞進去
      });
    }
  });
}

function getMsgs(id) {
  if (!messages.has(id)) {
    messages.set(id, []); // 🔹不再自動塞 "嗨～一起來學習吧！"
  }
  return messages.get(id);
}

function renderMsgs(id) {
  const msgs = getMsgs(id)
    .slice()
    .sort((a, b) => {
      return new Date(a.time) - new Date(b.time); // 舊 → 新
    });

  chatBody.innerHTML = msgs
    .map((m) => {
      const time = m.time ? formatChatTime(m.time) : "";
      return `
        <div class="msg-row ${m.me ? "me" : "other"}">
          <div class="msg-bubble">${m.text}</div>
          <div class="msg-time">${time}</div>
        </div>
      `;
    })
    .join("");
  chatBody.scrollTop = chatBody.scrollHeight; // 自動滾到最新
}

async function openChat(friendId) {
  if (
    chatPanel.classList.contains("show") &&
    chatPanel.dataset.activeId == friendId
  ) {
    chatPanel.classList.remove("show");
    return;
  }

  const f = friendsData.find((x) => x.id == friendId);
  if (!f) return;

  // 🔹 找到好友並清除未讀數
  const friend = friendsData.find((ff) => ff.id === friendId);
  if (friend) {
    friend.unread = 0;
    renderFriends(); // 重新渲染好友清單，紅點消失
  }

  // 🔹 更新頭像與名稱
  const chatUserAvatar = document.getElementById("chatUserAvatar");
  chatUserAvatar.innerHTML = avatarHTML(f.avatar);
  chatUserAvatar.style.backgroundColor = getAvatarColor(f.id);
  chatUserName.textContent = f.name;

  // 🔹 載入歷史紀錄
  try {
    const resp = await fetch(`${API_BASE}/chat_history/${MY_UID}/${f.uid}`);
    const history = await resp.json();
    messages.set(
      f.id,
      history.map((m) => ({
        me: m.sender === MY_UID,
        text: m.text,
        time: m.time,
      }))
    );
    renderMsgs(f.id);
  } catch (err) {
    console.error("載入聊天紀錄失敗", err);
  }
  // 顯示聊天面板
  chatPanel.classList.add("show");
  chatPanel.dataset.activeId = friendId;
}

function formatTime(raw) {
  const d = new Date(raw);
  if (isNaN(d)) return raw; // 傳進來是 "15:27" 這種格式就直接回傳

  const options = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // ✅ 上午/下午
    month: "2-digit",
    day: "2-digit",
  };
  return d.toLocaleString("zh-TW", options);
}

function getNowTime() {
  return formatTime(new Date());
}

chatSend?.addEventListener("click", async () => {
  const friendId = +chatPanel.dataset.activeId;
  const f = friendsData.find((x) => x.id === friendId);
  if (!f) return;

  const text = chatInput.value.trim();
  if (!text) return;

  try {
    const resp = await fetch(`${API_BASE}/send_message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uid1: MY_UID,
        uid2: f.uid,
        sender: MY_UID,
        text,
      }),
    });
    const result = await resp.json();

    if (result.ok) {
      getMsgs(friendId).push({ me: true, text, time: result.message.time });

      // 更新好友列表時間與最後訊息
      const friend = friendsData.find((ff) => ff.id === friendId);
      if (friend) {
        friend.lastMsg = text;
        friend.time = result.message.time; //  更新時間
      }

      renderMsgs(friendId);
      renderFriends(); //  讓這個朋友移到最上面
    }
  } catch (err) {
    console.error("送出訊息失敗", err);
  }

  chatInput.value = "";
});

chatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") chatSend.click();
});

closeChatBtn.addEventListener("click", () => {
  chatPanel.classList.remove("show");
});

// 綁定：點好友清單 → 個資 or 聊天
friendsContent.addEventListener("click", (e) => {
  const item = e.target.closest(".friend-item");
  if (!item) return;
  const fid = Number(item.dataset.id);
  const ava = e.target.closest(".friend-avatar");
  if (ava) {
    // 點頭像 → 開啟簡介
    openProfile(fid);
  } else {
    // 點其他地方 → 直接聊天
    openChat(fid);
  }
});

window.addEventListener("beforeunload", async () => {
  const raw = localStorage.getItem("smartlearn_profile");
  if (!raw) return;
  const profile = JSON.parse(raw);
  try {
    await fetch("/api/update_profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentUser: profile.currentUser,
        status: "offline",
        statusText: "離線",
      }),
    });
    console.log("⚪ 已設為離線");
  } catch (err) {
    console.warn("無法更新離線狀態", err);
  }
});

// ✅ 2. 閒置 10 分鐘自動離線
let idleTimer;

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(setOffline, 10 * 60 * 1000); // 10 分鐘
}

async function setOffline() {
  const raw = localStorage.getItem("smartlearn_profile");
  if (!raw) return;
  const profile = JSON.parse(raw);
  await fetch("/api/update_profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      currentUser: profile.currentUser,
      status: "offline",
      statusText: "離線",
    }),
  });
  console.log("⚪ 閒置自動離線");
}

// ✅ 偵測使用者活動（滑鼠、鍵盤、點擊、滾動）
["mousemove", "keydown", "click", "scroll"].forEach((event) =>
  window.addEventListener(event, resetIdleTimer)
);

// 初始化倒數計時
resetIdleTimer();
