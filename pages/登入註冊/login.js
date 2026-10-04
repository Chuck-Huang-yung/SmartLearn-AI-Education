document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const message = document.getElementById("message");

  // 模擬檢查帳號密碼
  if (username === "admin" && password === "1234") {
    message.style.color = "green";
    message.textContent = "登入成功，請稍候…";

    // 模擬跳轉
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1000);
  } else {
    message.style.color = "red";
    message.textContent = "帳號或密碼錯誤，請再試一次";
  }
});