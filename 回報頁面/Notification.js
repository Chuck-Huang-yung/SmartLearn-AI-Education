document.addEventListener("DOMContentLoaded", () => {
  const uidInput = document.getElementById("uid");
  const form = document.getElementById("reportForm");
  const statusEl = document.getElementById("status");

  // ✅ 優先從 smartlearn_profile 取得最新登入的 UID
  let currentUID = "未知使用者";
  try {
    const profile = JSON.parse(
      localStorage.getItem("smartlearn_profile") || "{}"
    );
    if (profile && profile.uid) currentUID = profile.uid;
  } catch (e) {
    console.warn("無法解析 smartlearn_profile：", e);
  }

  // ✅ 若登入頁面有另外存 user_uid，也一併檢查
  if (localStorage.getItem("user_uid")) {
    currentUID = localStorage.getItem("user_uid");
  }

  // ✅ 更新畫面上的 UID
  uidInput.value = currentUID;

  // ✅ 監聽送出表單
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      uid: uidInput.value.trim(),
      message: document.getElementById("message").value.trim(),
      time: new Date().toISOString(),
    };

    if (!payload.uid || payload.uid === "未知使用者") {
      statusEl.textContent = "⚠️ 尚未登入或找不到 UID，請重新登入後再試。";
      return;
    }

    try {
      const res = await fetch("/api/report_issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("送出失敗");

      statusEl.innerHTML = "✅ 回報已成功送出，將盡快為您協助！";
      form.reset();
    } catch (err) {
      console.error(err);
      statusEl.textContent = "❌ 回報失敗，請稍後再試。";
    }
  });
});
