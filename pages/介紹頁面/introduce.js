document.addEventListener("DOMContentLoaded", function () {
  // CTA 按鈕點擊效果
  const ctaBtn = document.querySelector(".cta-button");
  if (ctaBtn) {
    ctaBtn.addEventListener("click", function () {
      alert("歡迎來到 SmartLearn！");
    });
  }

  // 進度條：每次 +10%，直到 100% 停止
  const bar = document.querySelector(".progress-fill");
  if (bar) {
    let progress = 0;

    function stepProgress() {
      if (progress < 100) {
        progress += 10; // 每次增加 10%
        if (progress > 100) progress = 100; // 不超過 100
        bar.style.width = progress + "%";
      }
    }

    // 每 1 秒更新一次
    setInterval(stepProgress, 1000);
  }

  // 滑鼠移動視差效果
  document.addEventListener("mousemove", function (e) {
    const shapes = document.querySelectorAll(".floating-shape");
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;

    shapes.forEach((shape, index) => {
      const speed = (index + 1) * 0.5;
      const xMove = (x - 0.5) * speed * 20;
      const yMove = (y - 0.5) * speed * 20;
      shape.style.transform = `translate(${xMove}px, ${yMove}px)`;
    });
  });
});
