(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const speedEl = document.getElementById("speed");
  const messageEl = document.getElementById("message");
  const overlayEl = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const soundBtn = document.getElementById("soundBtn");
  const touchButtons = document.querySelectorAll("[data-dir]");

  const GRID = 20;
  const SPEED_STEP = 0.9;
  const MIN_STEP_MS = 88;
  const BASE_STEP_MS = 170;

  const state = {
    running: false,
    gameOver: false,
    cellSize: 24,
    boardPx: 0,
    snake: [],
    direction: { x: 1, y: 0 },
    nextDirection: { x: 1, y: 0 },
    food: { x: 0, y: 0 },
    score: 0,
    best: loadBestScore(),
    speed: 1,
    lastStepAt: 0,
    lastFrameAt: 0,
    growBy: 0,
    audioOn: true,
    audioContext: null,
    soundUnlocked: false,
    swipe: null,
  };

  const colors = {
    head: "#16a34a",
    body: "#22c55e",
    body2: "#4ade80",
    food: "#ef4444",
    foodGlow: "#fca5a5",
    grid: "rgba(120, 53, 15, 0.07)",
    shadow: "rgba(21, 128, 61, 0.18)",
  };

  function randInt(max) {
    return Math.floor(Math.random() * max);
  }

  function loadBestScore() {
    try {
      return Number(localStorage.getItem("snake-best") || 0);
    } catch {
      return 0;
    }
  }

  function saveBestScore(value) {
    try {
      localStorage.setItem("snake-best", String(value));
    } catch {
      // 저장소를 쓸 수 없는 환경이면 그냥 무시해도 게임은 잘 돌아간다.
    }
  }

  function samePos(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function clampStepMs() {
    return Math.max(MIN_STEP_MS, BASE_STEP_MS - (state.speed - 1) * SPEED_STEP * 8);
  }

  function setMessage(text) {
    messageEl.textContent = text;
  }

  function setOverlay(title, text, hidden = false) {
    overlayEl.innerHTML = `<span class="overlay-title">${title}</span><span class="overlay-text">${text}</span>`;
    overlayEl.classList.toggle("hidden", hidden);
  }

  function updateHud() {
    scoreEl.textContent = String(state.score);
    bestEl.textContent = String(state.best);
    speedEl.textContent = String(state.speed);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.cellSize = rect.width / GRID;
    state.boardPx = rect.width;
  }

  function newSnake() {
    const start = { x: 5, y: 10 };
    state.snake = [
      { x: start.x, y: start.y },
      { x: start.x - 1, y: start.y },
      { x: start.x - 2, y: start.y },
    ];
    state.direction = { x: 1, y: 0 };
    state.nextDirection = { x: 1, y: 0 };
    state.growBy = 0;
  }

  function placeFood() {
    do {
      state.food = { x: randInt(GRID), y: randInt(GRID) };
    } while (state.snake.some((segment) => samePos(segment, state.food)));
  }

  function resetGame() {
    state.running = true;
    state.gameOver = false;
    state.score = 0;
    state.speed = 1;
    state.lastStepAt = 0;
    newSnake();
    placeFood();
    updateHud();
    setOverlay("달려볼까?", "먹이를 향해 움직여요. 벽을 조심!", true);
    setMessage("방향키나 WASD로 움직여요. 먹이를 먹으면 길어져요.");
  }

  function endGame() {
    state.running = false;
    state.gameOver = true;
    if (state.score > state.best) {
      state.best = state.score;
      saveBestScore(state.best);
    }
    updateHud();
    setOverlay("게임 끝!", `점수 ${state.score}점. 다시 시작해서 더 길어져 보자!`, false);
    setMessage("벽이나 자기 몸에 부딪혔어요. 다시 시작 버튼을 누르면 바로 다시 할 수 있어요.");
    playTone(130, 0.18, "square", 0.08, 0);
    playTone(90, 0.24, "triangle", 0.07, 0.11);
  }

  function ensureAudio() {
    if (!state.audioOn) return null;
    if (!state.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      state.audioContext = new AudioContextClass();
    }
    if (state.audioContext.state === "suspended") {
      state.audioContext.resume();
    }
    state.soundUnlocked = true;
    soundBtn.textContent = "소리 끄기";
    return state.audioContext;
  }

  function playTone(freq, duration, type = "sine", gain = 0.05, delay = 0) {
    const audio = ensureAudio();
    if (!audio) return;

    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime + delay);
    amp.gain.setValueAtTime(0.0001, audio.currentTime + delay);
    amp.gain.exponentialRampToValueAtTime(gain, audio.currentTime + delay + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + delay + duration);
    osc.connect(amp).connect(audio.destination);
    osc.start(audio.currentTime + delay);
    osc.stop(audio.currentTime + delay + duration + 0.02);
  }

  function playEatSound() {
    playTone(660, 0.07, "triangle", 0.06, 0);
    playTone(880, 0.08, "triangle", 0.05, 0.05);
  }

  function moveSnake() {
    state.direction = state.nextDirection;

    const head = state.snake[0];
    const next = {
      x: head.x + state.direction.x,
      y: head.y + state.direction.y,
    };

    const willEat = samePos(next, state.food);
    const hitWall = next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID;
    const checkLength = state.growBy === 0 && !willEat
      ? state.snake.length - 1
      : state.snake.length;
    const hitSelf = state.snake.slice(0, checkLength).some((segment) => samePos(segment, next));

    if (hitWall || hitSelf) {
      endGame();
      return;
    }

    state.snake.unshift(next);

    if (willEat) {
      state.score += 1;
      state.speed = 1 + Math.floor(state.score / 4);
      state.growBy += 1;
      placeFood();
      updateHud();
      setMessage("잘했어요! 먹이를 먹을수록 뱀이 더 길어져요.");
      playEatSound();
    }

    if (state.growBy > 0) {
      state.growBy -= 1;
    } else {
      state.snake.pop();
    }
  }

  function canTurn(next) {
    return next.x !== -state.direction.x || next.y !== -state.direction.y;
  }

  function setDirection(dir) {
    const mapping = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    const next = mapping[dir];
    if (!next) return;
    if (!state.running) {
      resetGame();
    }
    if (canTurn(next)) state.nextDirection = next;
  }

  function drawBackground() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#fffaf0");
    grad.addColorStop(1, "#fde68a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.18)";
    for (let i = 0; i < 24; i++) {
      const x = (i * 83) % w;
      const y = (i * 47) % h;
      ctx.beginPath();
      ctx.arc(x + 10, y + 10, 3 + (i % 4), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGrid() {
    const size = state.cellSize;
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;

    for (let i = 1; i < GRID; i++) {
      const p = i * size;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, state.boardPx);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(state.boardPx, p);
      ctx.stroke();
    }
  }

  function drawFood() {
    const s = state.cellSize;
    const cx = state.food.x * s + s / 2;
    const cy = state.food.y * s + s / 2;
    const r = s * 0.34;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = colors.foodGlow;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.food;
    ctx.strokeStyle = "#b91c1c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#166534";
    ctx.beginPath();
    ctx.ellipse(r * 0.06, -r * 0.95, r * 0.18, r * 0.34, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSnake() {
    const s = state.cellSize;

    state.snake.forEach((segment, index) => {
      const x = segment.x * s;
      const y = segment.y * s;
      const pad = index === 0 ? 2 : 4;
      const radius = index === 0 ? 14 : 12;

      ctx.save();
      ctx.fillStyle = index === 0 ? colors.head : (index % 2 === 0 ? colors.body : colors.body2);
      ctx.strokeStyle = colors.head;
      ctx.lineWidth = 2;
      ctx.shadowColor = colors.shadow;
      ctx.shadowBlur = 8;

      roundRect(ctx, x + pad, y + pad, s - pad * 2, s - pad * 2, radius);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.stroke();

      if (index === 0) {
        ctx.fillStyle = "white";
        const eyeY = y + s * 0.36;
        const leftEyeX = x + s * 0.36;
        const rightEyeX = x + s * 0.64;
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, s * 0.06, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY, s * 0.06, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#14532d";
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, s * 0.03, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY, s * 0.03, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#14532d";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + s * 0.5, y + s * 0.58, s * 0.12, 0, Math.PI);
        ctx.stroke();
      }

      ctx.restore();
    });
  }

  function roundRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    drawBackground();
    drawGrid();
    drawFood();
    drawSnake();
  }

  function tick(now) {
    if (!state.running) {
      draw();
      requestAnimationFrame(tick);
      return;
    }

    if (!state.lastStepAt) state.lastStepAt = now;
    const stepMs = clampStepMs();
    if (now - state.lastStepAt >= stepMs) {
      state.lastStepAt = now;
      moveSnake();
    }

    draw();
    requestAnimationFrame(tick);
  }

  function handleKeyDown(event) {
    const map = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      a: "left",
      s: "down",
      d: "right",
      W: "up",
      A: "left",
      S: "down",
      D: "right",
    };

    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      resetGame();
      ensureAudio();
      return;
    }

    const dir = map[event.key];
    if (dir) {
      event.preventDefault();
      ensureAudio();
      setDirection(dir);
    }
  }

  function handleTouchDir(dir) {
    ensureAudio();
    setDirection(dir);
  }

  function handleSwipeStart(point) {
    state.swipe = { x: point.clientX, y: point.clientY };
  }

  function handleSwipeEnd(point) {
    if (!state.swipe) return;
    const dx = point.clientX - state.swipe.x;
    const dy = point.clientY - state.swipe.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    state.swipe = null;

    if (Math.max(absX, absY) < 24) return;
    if (absX > absY) handleTouchDir(dx > 0 ? "right" : "left");
    else handleTouchDir(dy > 0 ? "down" : "up");
  }

  function setSoundEnabled() {
    state.audioOn = !state.audioOn;
    if (!state.audioOn) {
      soundBtn.textContent = "소리 켜기";
      setMessage("소리가 꺼져 있어요. 다시 켜면 먹는 소리가 들려요.");
      return;
    }
    soundBtn.textContent = "소리 끄기";
    ensureAudio();
    setMessage("소리가 켜졌어요. 먹이를 먹을 때마다 소리가 나요.");
  }

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", handleKeyDown);
  startBtn.addEventListener("click", () => {
    ensureAudio();
    resetGame();
  });
  soundBtn.addEventListener("click", setSoundEnabled);

  touchButtons.forEach((button) => {
    button.addEventListener("click", () => handleTouchDir(button.dataset.dir));
  });

  canvas.addEventListener("pointerdown", (event) => {
    ensureAudio();
    handleSwipeStart(event);
  });
  canvas.addEventListener("pointerup", (event) => handleSwipeEnd(event));
  canvas.addEventListener("pointercancel", () => {
    state.swipe = null;
  });

  resize();
  updateHud();
  soundBtn.textContent = "소리 끄기";
  setOverlay("준비 완료", "시작 버튼을 누르거나 스페이스를 눌러 시작해요.", false);
  draw();
  requestAnimationFrame(tick);
})();
