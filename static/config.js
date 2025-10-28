let API_BASE;
    // 如果是本地端就用本地 API
if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
    API_BASE = "http://127.0.0.1:8000";
} else {
    // 自動抓當前網域（包含 ngrok）
    API_BASE = window.location.origin;
}
console.log("偵測到的 API_BASE =", API_BASE);
