// Facebook SDK 初始化
window.fbAsyncInit = function () {
  FB.init({
    appId: 1192808199557885,
    cookie: true,
    xfbml: true,
    version: "v18.0",
  });
};

// Facebook 登入方法
function loginWithFacebook() {
  FB.login(
    (res) => {
      console.log("FB.login response:", res);
      if (!res.authResponse) {
        alert("使用者取消或登入失敗");
        return;
      }
      FB.api("/me", { fields: "id,name,email" }, (me) => {
        console.log("FB.api /me:", me);
        if (me && !me.error) {
          showUser(me.name || "(無名稱)", me.email || "(未提供 email)");
        } else {
          alert("取得使用者資料失敗");
        }
      });
    },
    { scope: "public_profile,email" }
  );
}

// 讓 HTML onclick 可以呼叫
window.loginWithFacebook = loginWithFacebook;
