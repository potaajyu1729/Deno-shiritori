const Effects = (() => {
  const colors = ["#2f6fed", "#22c19a", "#ff8a3d", "#ffd23f", "#ff5d73"];

  //背景粒子
  const canvas = document.getElementById("particleCanvas");
  const ctx = canvas.getContext("2d");
  let ambient = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  function initAmbient() {
    ambient = [];
    const count = Math.min(40, Math.floor(window.innerWidth / 30));
    for (let i = 0; i < count; i++) {
      ambient.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: 2 + Math.random() * 4,
        vy: 0.2 + Math.random() * 0.6,
        vx: (Math.random() - 0.5) * 0.3,
        alpha: 0.15 + Math.random() * 0.25,
      });
    }
  }
  initAmbient();

  //一時的なバースト粒子
  let bursts = [];

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    //背景粒子
    for (const p of ambient) {
      p.y -= p.vy;
      p.x += p.vx;
      if (p.y < -10) {
        p.y = canvas.height + 10;
        p.x = Math.random() * canvas.width;
      }
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    //バースト粒子
    bursts = bursts.filter((p) => p.life > 0);
    for (const p of bursts) {
      p.life -= 1;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    requestAnimationFrame(loop);
  }
  loop();

  //粒子
  function burst(target, amount = 14) {
    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      bursts.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        r: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 40 + Math.random() * 20,
        maxLife: 60,
      });
    }
  }

  //+スコア
  function floatingScore(text, anchor) {
    const rect = anchor.getBoundingClientRect();
    const node = document.createElement("div");
    node.className = "floating-score";
    node.textContent = text;
    node.style.left = `${rect.left + rect.width / 2}px`;
    node.style.top = `${rect.top}px`;
    document.body.appendChild(node);
    setTimeout(() => node.remove(), 1000);
  }

  //レベルアップ
  function levelUp(label) {
    const node = document.createElement("div");
    node.className = "levelup-banner";
    node.textContent = typeof label === "number" ? `LEVEL ${label}` : label;
    document.body.appendChild(node);

    //バースト
    const fake = {
      getBoundingClientRect: () => ({
        left: window.innerWidth / 2,
        top: window.innerHeight / 2,
        width: 0,
        height: 0,
      }),
    };
    burst(fake, 60);
    setTimeout(() => node.remove(), 1200);
  }

  //実績解除
  function toast(text) {
    const container = document.getElementById("toastContainer");
    const node = document.createElement("div");
    node.className = "toast";
    node.textContent = text;
    container.appendChild(node);
    requestAnimationFrame(() => node.classList.add("toast-in"));
    setTimeout(() => {
      node.classList.remove("toast-in");
      node.classList.add("toast-out");
      setTimeout(() => node.remove(), 400);
    }, 2600);
  }

  //ミス時
  function shake(target) {
    if (!target) return;
    target.classList.remove("shake");
    void target.offsetWidth;
    target.classList.add("shake");
    setTimeout(() => target.classList.remove("shake"), 500);
  }

  return { burst, floatingScore, levelUp, toast, shake };
})();