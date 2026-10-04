let userData = null;

// ======== 載入使用者資料 ========
async function loadUserData() {
  const username =
    localStorage.getItem("currentUser") ||
    localStorage.getItem("signup_username");

  if (!username) {
    alert("找不到使用者帳號，請重新登入");
    window.location.href = "/login_ui";
    return;
  }

  try {
    const res = await fetch(`/api/me?currentUser=${username}`);
    if (!res.ok) throw new Error("讀取使用者資料失敗");
    userData = await res.json();

    if (userData.isHidden) {
      // 隱藏模式下強制為 hidden
      userData.status = "hidden";
      userData.statusText = "隱藏中";
      console.log("🟡 從 isHidden 自動還原 hidden 狀態");
    } else {
      // 非隱藏模式下，如果狀態不是 online，恢復成線上
      if (
        !userData.status ||
        userData.status === "hidden" ||
        userData.status === "offline"
      ) {
        userData.status = "online";
        userData.statusText = "線上";
        console.log("🟢 已解除隱藏，自動恢復為線上");
      }
    }

    const currentStatus =
      typeof userData.status === "string" ? userData.status.trim() : "unknown";
    console.log("目前後端狀態：", currentStatus);

    // ✅ 不再改變狀態，只保留顯示
    switch (currentStatus) {
      case "hidden":
        console.log("🔒 維持隱藏模式（不更動）");
        break;
      case "online":
        console.log("🟢 使用者在線上（維持）");
        break;
      case "offline":
        console.log("⚪ 使用者離線（維持）");
        break;
      default:
        console.log("❔ 未知狀態（不變更）");
    }

    // ✅ 更新主畫面
    const nameEl = document.getElementById("user-name");
    const idEl = document.getElementById("user-id");
    if (nameEl && idEl) {
      nameEl.textContent = userData.displayName || username;
      idEl.textContent =
        "帳戶 ID：" + (userData.uid || userData.currentUser || "—");
    }

    // ======== 顯示頭像 ========
    const avatarEl = document.getElementById("user-avatar");
    const fallbackEl = document.getElementById("avatar-fallback");

    if (avatarEl && fallbackEl) {
      const avatar = (userData.avatar || "").trim().replace(/\s+/g, "");
      if (
        avatar &&
        avatar.startsWith("data:image") &&
        avatar.includes("base64,")
      ) {
        // ✅ base64 直接顯示
        avatarEl.src = avatar;
      } else if (avatar && avatar.includes("/static/avatars/")) {
        // ✅ 上傳過的檔案（伺服器中的路徑）
        avatarEl.src = avatar;
      } else if (avatar && avatar.includes("default")) {
        // ✅ 預設頭像
        avatarEl.src = "/static/default_avatar.png";
      } else {
        // ✅ 顯示一個字母頭像
        avatarEl.classList.add("hidden");
        fallbackEl.classList.remove("hidden");
        fallbackEl.textContent = (
          userData.displayName?.trim()?.[0] ||
          userData.currentUser?.trim()?.[0] ||
          "U"
        ).toUpperCase();
      }
      avatarEl.classList.remove("hidden");
      fallbackEl.classList.add("hidden");
    }
  } catch (err) {
    console.error("讀取資料失敗:", err);
    alert("無法載入使用者資料");
  }
}

// ======== 更新使用者資料 ========
async function updateProfileField(field, value) {
  if (!userData) return false;
  try {
    const res = await fetch("/api/update_profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentUser: userData.currentUser,
        [field]:
          field === "tags" ? value.split(",").map((v) => v.trim()) : value,
      }),
    });
    const result = await res.json();
    if (result.ok || res.ok) {
      await loadUserData();
      return true;
    }
  } catch (err) {
    console.error("更新失敗:", err);
  }
  return false;
}

// ======== 打開彈窗 ========
function openSection(type) {
  const modal = document.getElementById("sectionModal");
  const content = document.getElementById("sectionContent");

  if (!modal || !content) {
    console.error("找不到 #sectionModal 或 #sectionContent");
    alert("頁面尚未完全載入，請稍後再試");
    return;
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  modal.style.alignItems = "center";
  modal.style.justifyContent = "center";

  if (!userData) {
    content.innerHTML = `<p class='text-center text-gray-600'>尚未載入資料</p>`;
    return;
  }

  const safe = (v) => (v ? v : "—");
  const safeDate = (v) => (v ? v.split("T")[0] : "—");

  const stageList = [
    "國小",
    "國中",
    "高中 / 高職",
    "大學",
    "研究生",
    "社會人士",
  ];

  const stageSelect = `
  <div class="flex items-center gap-2 mt-2">
    <div class="flex items-center gap-2 flex-1">
      <select id="stageSelect" class="border border-gray-300 rounded-md px-2 py-1 text-gray-700 hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-none transition w-32">
        ${stageList
          .map(
            (label) =>
              `<option value="${label}" ${
                userData.stage === label ? "selected" : ""
              }>${label}</option>`
          )
          .join("")}
      </select>
      <button id="saveStageBtn" onclick="saveStage()" class="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 active:scale-95 transition">
        儲存
      </button>
    </div>
  </div>
`;

  const templates = {
    profile: `
      <h2 class="text-xl font-semibold mb-4">個人資料</h2>
      <div class="space-y-2">
        ${editableField("顯示名稱", "displayName", safe(userData.displayName))}
        ${editableField("所在地", "location", safe(userData.location))}
        ${editableField("個人介紹", "bio", safe(userData.bio))}
        ${editableField("GitHub", "github", safe(userData.github))}

        <!-- ✅ 興趣標籤筆圖示移除（改為純顯示） -->
        <p class="flex items-center gap-2">
          <strong class="w-24">興趣標籤：</strong>
          <span class="text-gray-700 flex-1">${
            userData.tags?.length ? userData.tags.join(", ") : "—"
          }</span>
        </p>

      </div>
      <p class="text-sm text-gray-400 mt-3">
        🔴 為個人名片上顯示資料，請謹慎填寫，不填寫則將不顯示
      </p>
    `,
    account: `
      <h2 class="text-xl font-semibold mb-4">帳戶資訊</h2>

      <div class="space-y-2 text-gray-800">
        <p><strong>帳號：</strong> ${safe(userData.currentUser)}</p>
        <p><strong>密碼：</strong> ********</p>

        <!-- ✅ 改良版學習階段行 -->
        <div class="flex items-center gap-3 mt-3">
          <strong class="whitespace-nowrap">學習階段：</strong>
          <select id="stageSelect" 
            class="border border-gray-300 rounded-md px-3 py-1.5 text-gray-700 hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-400 outline-none transition w-40">
            ${stageList
              .map(
                (label) =>
                  `<option value="${label}" ${
                    userData.stage === label ? "selected" : ""
                  }>${label}</option>`
              )
              .join("")}
          </select>
          <button id="saveStageBtn" onclick="saveStage()" 
            class="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 active:scale-95 transition text-sm">
            儲存
          </button>
        </div>

        <p class="mt-3"><strong>註冊日期：</strong> ${safeDate(
          userData.createdAt
        )}</p>
        <p><strong>最後登入：</strong> ${safeDate(userData.lastLogin)}</p>
      </div>
    `,
    password: `
      <h2 class="text-xl font-semibold mb-4">重設密碼</h2>
      <form id="resetForm" class="space-y-3">
        <input id="oldPwd" type="password" placeholder="目前密碼" class="w-full border rounded-lg px-3 py-2" />
        <input id="newPwd" type="password" placeholder="新密碼" class="w-full border rounded-lg px-3 py-2" />
        <input id="confirmPwd" type="password" placeholder="確認新密碼" class="w-full border rounded-lg px-3 py-2" />
        <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
          更新密碼
        </button>
      </form>
    `,
    tags: `
      <h2 class="text-xl font-semibold mb-4">興趣標籤</h2>
      <p>這裡可以新增或修改您的興趣標籤。</p>
      <p class="text-gray-500 text-sm mt-2">目前標籤： ${
        userData.tags?.length ? userData.tags.join(", ") : "—"
      }</p>
      <button onclick="goToInterests()" class="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
        重新設定興趣
      </button>
    `,
    cardPreview: `
      <h2 class="text-xl font-semibold mb-4">個人名片預覽</h2>

      <div class="bg-white rounded-xl shadow-lg p-4 flex items-center gap-4 w-full max-w-md mx-auto border border-gray-200">
        <!-- 頭像 -->
        <div class="flex-shrink-0">
          <img src="${userData.avatar || "/static/default_avatar.png"}" 
              class="w-20 h-20 rounded-full border border-gray-300 object-cover" 
              alt="頭像" />
        </div>

        <!-- 右側資訊 -->
        <div class="flex-1">
          <p class="text-lg font-semibold text-gray-800">
            ${safe(userData.displayName)} 
            <span class="text-gray-500 text-sm">( UID：${safe(
              userData.uid || userData.currentUser
            )} )</span>
          </p>

          <!-- 狀態顯示 -->
          <p class="text-sm mt-1 flex items-center gap-1 ${
            userData.status === "online"
              ? "text-green-600"
              : userData.status === "hidden"
              ? "text-yellow-500"
              : "text-gray-400"
          }">
            ${
              userData.status === "online"
                ? "🟢 線上"
                : userData.status === "hidden"
                ? "🟡 隱藏中"
                : "⚪ 離線"
            }
          </p>

          ${
            userData.bio
              ? `<p class="text-gray-600 text-sm mt-1">${safe(
                  userData.bio
                )}</p>`
              : ""
          }

          ${
            userData.tags?.length
              ? `<p class="text-gray-400 text-xs mt-1">興趣：${userData.tags.join(
                  "、"
                )}</p>`
              : ""
          }

          <!-- 底部按鈕 -->
          <div class="flex gap-3 mt-4">
            <button class="flex-1 bg-blue-600 text-white rounded-lg py-1.5 hover:bg-blue-700 transition">發起聊天</button>
            <button class="flex-1 bg-red-500 text-white rounded-lg py-1.5 hover:bg-red-600 transition">封鎖</button>
          </div>
        </div>
      </div>
    `,
    status: `
      <h2 class="text-xl font-semibold mb-4">上線狀態設定</h2>
      
      <!-- 狀態下拉 -->
      <!--
      <select id="statusSelect" class="border rounded-lg px-3 py-2 w-full mb-3">
        <option value="online" ${
          userData.status === "online" ? "selected" : ""
        }>🟢 線上</option>
        <option value="offline" ${
          userData.status === "offline" ? "selected" : ""
        }>⚪ 離線</option>
      </select>
       -->
      <div id="statusSelect" class="hidden"></div>
      <!-- 隱藏開關 -->
      <div class="flex items-center justify-between bg-gray-50 border rounded-lg p-3">
        <div>
          <p class="text-gray-700 font-medium">隱藏模式</p>
          <p class="text-gray-400 text-sm">開啟後，您的狀態將顯示為隱藏中</p>
        </div>
      <label class="inline-flex items-center cursor-pointer">
        <input id="hiddenSwitch" type="checkbox" class="sr-only">
        <div class="w-11 h-6 bg-gray-300 rounded-full relative transition-colors duration-300" id="switchBg">
          <span id="switchDot" class="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all duration-300"></span>
        </div>
      </label>
      </div>
      <!-- 儲存按鈕 -->
      <button onclick="saveStatus()" class="mt-5 bg-blue-600 text-white w-full py-2 rounded-lg hover:bg-blue-700">
        儲存狀態
      </button>

      <p class="text-sm text-gray-400 mt-3">
        您可以自行選擇是否隱藏或顯示上線狀態
      </p>
    `,
  };

  content.innerHTML =
    templates[type] || `<p class='text-center text-gray-500'>功能開發中 🚧</p>`;

  if (type === "profile") attachEditEvents();
  if (type === "password") setupPasswordForm();
  // ✅ 狀態設定彈窗初始化（隱藏模式開關控制）
  if (type === "status") {
    const switchEl = document.getElementById("hiddenSwitch");
    const selectEl = document.getElementById("statusSelect");
    const dotEl = document.getElementById("switchDot");
    const bgEl = document.getElementById("switchBg");

    if (switchEl && selectEl && dotEl && bgEl) {
      const isHidden = userData.status === "hidden";
      switchEl.checked = isHidden;
      if (isHidden) {
        selectEl.value = "offline"; // 顯示「離線」
        selectEl.disabled = true; // 但不可選
      } else {
        selectEl.value = userData.status || "offline";
        selectEl.disabled = false;
      }
      // 初始化外觀
      updateSwitchUI(isHidden);

      // 點開關時動態移動 + 狀態更新
      switchEl.addEventListener("change", () => {
        const isOn = switchEl.checked;
        updateSwitchUI(isOn);

        if (isOn) {
          // 開啟隱藏 → 顯示為離線（灰掉）
          selectEl.value = "offline";
          selectEl.disabled = true;
        } else {
          // 關閉隱藏 → 回復原本可選
          selectEl.value = "online";
          selectEl.disabled = false;
        }
      });
    }

    function updateSwitchUI(isOn) {
      dotEl.style.transform = isOn ? "translateX(20px)" : "translateX(0)";
      bgEl.style.backgroundColor = isOn ? "#2563eb" : "#d1d5db"; // 藍 / 灰
    }
  }
}

// ======== 重新導向興趣頁面 ========
function goToInterests() {
  window.location.href = "../interests_ui";
}

// ======== 可編輯欄位產生器 ========
function editableField(label, field, value) {
  return `
    <p class="editable-field flex items-center gap-2" data-field="${field}">
      <strong class="w-24">${label}：</strong>
      <span class="editable-text text-gray-700 flex-1">${value}</span>
      <button class="text-blue-600 hover:text-blue-800">✎</button>
    </p>
  `;
}

// ======== 綁定編輯事件 ========
function attachEditEvents() {
  const buttons = document.querySelectorAll(".editable-field button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const parent = btn.closest(".editable-field");
      const field = parent.dataset.field;
      const span = parent.querySelector(".editable-text");
      const oldValue =
        span.textContent.trim() === "—" ? "" : span.textContent.trim();
      const newValue = prompt(`請輸入新的${field}：`, oldValue);
      if (newValue === null) return;

      const ok = await updateProfileField(field, newValue);
      if (ok) {
        span.textContent = newValue || "—";
      } else {
        alert("更新失敗，請稍後再試。");
      }
    });
  });
}

// ======== 密碼表單送出 ========
function setupPasswordForm() {
  const form = document.getElementById("resetForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const oldPwd = document.getElementById("oldPwd").value.trim();
    const newPwd = document.getElementById("newPwd").value.trim();
    const confirmPwd = document.getElementById("confirmPwd").value.trim();

    if (!oldPwd || !newPwd || !confirmPwd) {
      alert("請填寫完整密碼欄位");
      return;
    }
    if (newPwd !== confirmPwd) {
      alert("新密碼不一致");
      return;
    }

    alert("密碼更新功能可與後端 /api/change_password 對接");
    form.reset();
  });
}

// ======== 關閉彈窗 ========
function closeModal() {
  const modal = document.getElementById("sectionModal");
  if (modal) modal.classList.add("hidden");
}

// ======== 上線狀態儲存 ========
async function saveStatus() {
  const select = document.getElementById("statusSelect");
  const switchEl = document.getElementById("hiddenSwitch");

  if (!select || !switchEl) return;

  const isHidden = switchEl.checked;
  let status = select.value;
  let statusText = status === "online" ? "線上" : "離線";

  // 如果啟用隱藏模式
  if (isHidden) {
    status = "hidden";
    statusText = "隱藏中";
  }

  try {
    const res = await fetch("/api/update_profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentUser: userData.currentUser,
        status,
        statusText,
        isHidden,
      }),
    });

    const result = await res.json();
    if (res.ok && result.ok) {
      alert(
        isHidden
          ? "🔒 您已啟用隱藏模式（狀態將顯示為隱藏中）"
          : `✅ 狀態已更新為：${statusText}`
      );
      closeModal();
      await loadUserData(); // 重新載入顯示最新狀態
    } else {
      alert("更新失敗，請稍後再試。");
    }
  } catch (err) {
    console.error("狀態更新失敗:", err);
    alert("無法連線到伺服器。");
  }
}

// ======== 初始化 ========
// ======== 頭像上傳（正式版：儲存伺服器端） ========
async function handleAvatarChange(fileInput) {
  const file = fileInput.files[0];
  if (!file) return;

  // 檢查檔案格式
  const allowed = ["image/jpeg", "image/png", "image/gif"];
  if (!allowed.includes(file.type)) {
    alert("僅支援 JPG / PNG / GIF 格式");
    return;
  }

  // 顯示上傳中
  const avatarEl = document.getElementById("user-avatar");
  avatarEl.style.opacity = "0.5";

  const formData = new FormData();
  formData.append("avatar", file);
  formData.append("currentUser", userData.currentUser);

  try {
    const res = await fetch("/api/upload_avatar", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "上傳失敗");

    // ✅ 從後端回傳的是 URL（例如 /static/avatars/XXXX.png）
    userData.avatar = data.avatar;
    avatarEl.src = data.avatar;
    avatarEl.style.opacity = "1";

    const profile = {
      currentUser: userData.currentUser,
      uid: userData.uid,
      name: userData.displayName || userData.currentUser,
      avatar: data.avatar,
    };
    localStorage.setItem("smartlearn_profile", JSON.stringify(profile));

    alert("✅ 頭像已更新！");
  } catch (err) {
    console.error("頭像上傳錯誤:", err);
    alert("❌ 上傳失敗：" + err.message);
    avatarEl.style.opacity = "1";
  }
}

document.addEventListener("DOMContentLoaded", loadUserData);

async function saveStage() {
  const select = document.getElementById("stageSelect");
  const btn = document.getElementById("saveStageBtn");
  if (!select || !btn) return;

  const newStage = select.value;

  btn.textContent = "儲存中...";
  btn.disabled = true;

  const ok = await updateProfileField("stage", newStage);

  if (ok) {
    btn.textContent = "✅ 已儲存";
    btn.classList.remove("bg-blue-600");
    btn.classList.add("bg-green-500");
    setTimeout(() => {
      btn.textContent = "儲存";
      btn.classList.remove("bg-green-500");
      btn.classList.add("bg-blue-600");
      btn.disabled = false;
    }, 1500);
  } else {
    btn.textContent = "錯誤";
    btn.classList.remove("bg-blue-600");
    btn.classList.add("bg-red-500");
    setTimeout(() => {
      btn.textContent = "儲存";
      btn.classList.remove("bg-red-500");
      btn.classList.add("bg-blue-600");
      btn.disabled = false;
    }, 1500);
  }
}

// ✅ 讓 HTML onclick 可以找到這些函式
window.openSection = openSection;
window.closeModal = closeModal;
window.saveStatus = saveStatus;
window.goToInterests = goToInterests;
