(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const statusEl = document.getElementById("status");
  const overlayEl = document.getElementById("overlay");
  const overlayTitleEl = overlayEl.querySelector(".overlay-title");
  const overlayTextEl = overlayEl.querySelector(".overlay-text");
  const newMazeBtn = document.getElementById("newMazeBtn");
  const easyBtn = document.getElementById("easyBtn");
  const mobileActionButtons = Array.from(
    document.querySelectorAll(".mobile-toolbar [data-action]")
  );
  const dirButtons = Array.from(document.querySelectorAll(".dir-btn[data-dir]"));

  const state = {
    cols: 7,
    rows: 5,
    cellSize: 64,
    maze: [],
    player: { x: 0, y: 0 },
    goal: { x: 0, y: 0 },
    won: false,
    winTime: 0,
    lastMoveAt: 0,
    confetti: [],
    mode: "easy",
    swipeStart: null,
  };

  const DIRS = {
    up: { dx: 0, dy: -1, wall: "n", opposite: "s" },
    right: { dx: 1, dy: 0, wall: "e", opposite: "w" },
    down: { dx: 0, dy: 1, wall: "s", opposite: "n" },
    left: { dx: -1, dy: 0, wall: "w", opposite: "e" },
  };

  function randInt(max) {
    return Math.floor(Math.random() * max);
  }

  function createCell() {
    return { n: true, e: true, s: true, w: true, visited: false };
  }

  function buildMaze(cols, rows) {
    const grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => createCell())
    );

    const stack = [[0, 0]];
    grid[0][0].visited = true;

    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const options = [];

      for (const dir of Object.values(DIRS)) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        if (!grid[ny][nx].visited) options.push({ ...dir, nx, ny });
      }

      if (!options.length) {
        stack.pop();
        continue;
      }

      const choice = options[randInt(options.length)];
      grid[y][x][choice.wall] = false;
      grid[choice.ny][choice.nx][choice.opposite] = false;
      grid[choice.ny][choice.nx].visited = true;
      stack.push([choice.nx, choice.ny]);
    }

    for (const row of grid) {
      for (const cell of row) delete cell.visited;
    }

    return grid;
  }

  function setOverlay(visible, title, text) {
    if (typeof title === "string") overlayTitleEl.textContent = title;
    if (typeof text === "string") overlayTextEl.textContent = text;
    overlayEl.classList.toggle("hidden", !visible);
  }

  function setDifficulty(mode) {
    state.mode = mode;
    if (mode === "easy") {
      state.cols = 7;
      state.rows = 5;
      easyBtn.textContent = "더 크게 보기";
      statusEl.textContent = "쉬운 미로예요. 아래의 별까지 가 보자.";
    } else {
      state.cols = 9;
      state.rows = 7;
      easyBtn.textContent = "보통으로 보기";
      statusEl.textContent = "조금 더 큰 미로예요. 길을 찾아가 보자.";
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padding = 36;
    const usableW = Math.max(1, rect.width - padding * 2);
    const usableH = Math.max(1, rect.height - padding * 2);
    state.cellSize = Math.floor(Math.min(usableW / state.cols, usableH / state.rows));
    state.cellSize = Math.max(48, Math.min(state.cellSize, 120));
  }

  function resetMaze(showIntro = false) {
    state.maze = buildMaze(state.cols, state.rows);
    state.player = { x: 0, y: 0 };
    state.goal = { x: state.cols - 1, y: state.rows - 1 };
    state.won = false;
    state.winTime = 0;
    state.confetti = [];
    state.lastMoveAt = 0;
    resize();
    if (showIntro) {
      setOverlay(true, "준비 완료", "새 미로를 눌러 시작해요. 방향 버튼으로 이동할 수 있어요.");
    } else {
      setOverlay(false);
    }
    draw();
  }

  function movePlayer(dirName) {
    const dir = DIRS[dirName];
    if (!dir || state.won) return;

    const now = performance.now();
    if (now - state.lastMoveAt < 90) return;

    const cell = state.maze[state.player.y][state.player.x];
    let moved = false;
    if (dir.dx === 1 && !cell.e) {
      state.player.x += 1;
      moved = true;
    } else if (dir.dx === -1 && !cell.w) {
      state.player.x -= 1;
      moved = true;
    } else if (dir.dy === 1 && !cell.s) {
      state.player.y += 1;
      moved = true;
    } else if (dir.dy === -1 && !cell.n) {
      state.player.y -= 1;
      moved = true;
    }

    if (!moved) return;
    state.lastMoveAt = now;
    setOverlay(false);

    if (state.player.x === state.goal.x && state.player.y === state.goal.y) {
      winGame();
    }
  }

  function winGame() {
    state.won = true;
    state.winTime = performance.now();
    statusEl.textContent = "성공! 별까지 도착했어요.";
    setOverlay(true, "성공!", "다시 미로를 눌러 또 한 번 도전해요.");
    burstConfetti();
  }

  function burstConfetti() {
    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ec4899"];
    state.confetti = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.clientWidth,
      y: -20 - Math.random() * 120,
      vx: -1.5 + Math.random() * 3,
      vy: 1.5 + Math.random() * 3.6,
      r: 3 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      vr: -0.15 + Math.random() * 0.3,
      color: colors[randInt(colors.length)],
    }));
  }

  function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawBackground() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#fffaf0");
    grad.addColorStop(1, "#fde68a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawMaze(offsetX, offsetY) {
    const s = state.cellSize;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#8b5e34";

    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const cell = state.maze[y][x];
        const px = offsetX + x * s;
        const py = offsetY + y * s;

        if (cell.n) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + s, py);
          ctx.stroke();
        }
        if (cell.w) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + s);
          ctx.stroke();
        }
        if (y === state.rows - 1 && cell.s) {
          ctx.beginPath();
          ctx.moveTo(px, py + s);
          ctx.lineTo(px + s, py + s);
          ctx.stroke();
        }
        if (x === state.cols - 1 && cell.e) {
          ctx.beginPath();
          ctx.moveTo(px + s, py);
          ctx.lineTo(px + s, py + s);
          ctx.stroke();
        }
      }
    }
  }

  function drawGoal(offsetX, offsetY) {
    const s = state.cellSize;
    const gx = offsetX + state.goal.x * s;
    const gy = offsetY + state.goal.y * s;
    const cx = gx + s / 2;
    const cy = gy + s / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "#f59e0b";
    ctx.strokeStyle = "#b45309";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const outer = -Math.PI / 2 + i * (Math.PI * 2 / 5);
      const inner = outer + Math.PI / 5;
      const r1 = s * 0.32;
      const r2 = s * 0.14;
      const x1 = Math.cos(outer) * r1;
      const y1 = Math.sin(outer) * r1;
      const x2 = Math.cos(inner) * r2;
      const y2 = Math.sin(inner) * r2;
      if (i === 0) ctx.moveTo(x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer(offsetX, offsetY) {
    const s = state.cellSize;
    const px = offsetX + state.player.x * s + s / 2;
    const py = offsetY + state.player.y * s + s / 2;
    const r = s * 0.28;

    ctx.save();
    ctx.translate(px, py);

    ctx.fillStyle = "#22c55e";
    ctx.strokeStyle = "#15803d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.12, r * 0.12, 0, Math.PI * 2);
    ctx.arc(r * 0.28, -r * 0.12, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#14532d";
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.12, r * 0.05, 0, Math.PI * 2);
    ctx.arc(r * 0.28, -r * 0.12, r * 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#14532d";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, r * 0.10, r * 0.16, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function drawConfetti() {
    if (!state.confetti.length) return;
    for (const piece of state.confetti) {
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.rot += piece.vr;
      piece.vy += 0.02;
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rot);
      ctx.fillStyle = piece.color;
      ctx.fillRect(-piece.r * 0.5, -piece.r * 0.25, piece.r, piece.r * 0.5);
      ctx.restore();
    }
    state.confetti = state.confetti.filter((p) => p.y < canvas.clientHeight + 40);
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    drawBackground();

    const s = state.cellSize;
    const boardW = s * state.cols;
    const boardH = s * state.rows;
    const offsetX = Math.round((w - boardW) / 2);
    const offsetY = Math.round((h - boardH) / 2);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    roundRect(offsetX - 14, offsetY - 14, boardW + 28, boardH + 28, 20);
    ctx.fill();

    drawMaze(offsetX, offsetY);
    drawGoal(offsetX, offsetY);
    drawPlayer(offsetX, offsetY);
    drawConfetti();

    requestAnimationFrame(draw);
  }

  function handleDirection(name) {
    movePlayer(name);
  }

  function handleKeyDown(e) {
    const map = {
      ArrowUp: "up",
      ArrowRight: "right",
      ArrowDown: "down",
      ArrowLeft: "left",
      w: "up",
      d: "right",
      s: "down",
      a: "left",
      W: "up",
      D: "right",
      S: "down",
      A: "left",
    };

    if (e.code === "Enter" || e.code === "Space") {
      e.preventDefault();
      resetMaze(false);
      return;
    }

    const dir = map[e.key];
    if (dir) {
      e.preventDefault();
      handleDirection(dir);
    }
  }

  function handleSwipeStart(point) {
    state.swipeStart = { x: point.clientX, y: point.clientY };
  }

  function handleSwipeEnd(point) {
    if (!state.swipeStart) return;
    const dx = point.clientX - state.swipeStart.x;
    const dy = point.clientY - state.swipeStart.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    state.swipeStart = null;
    if (Math.max(absX, absY) < 26) return;
    if (absX > absY) handleDirection(dx > 0 ? "right" : "left");
    else handleDirection(dy > 0 ? "down" : "up");
  }

  function bindControls() {
    newMazeBtn.addEventListener("click", () => {
      resetMaze(false);
    });

    easyBtn.addEventListener("click", () => {
      const nextMode = state.mode === "easy" ? "normal" : "easy";
      setDifficulty(nextMode);
      resetMaze(false);
    });

    for (const button of mobileActionButtons) {
      button.addEventListener("click", () => {
        if (button.dataset.action === "restart") {
          resetMaze(false);
        } else if (button.dataset.action === "difficulty") {
          const nextMode = state.mode === "easy" ? "normal" : "easy";
          setDifficulty(nextMode);
          resetMaze(false);
        }
      });
    }

    for (const button of dirButtons) {
      button.addEventListener("click", () => handleDirection(button.dataset.dir));
      button.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") {
          e.preventDefault();
          handleDirection(button.dataset.dir);
        }
      });
    }

    window.addEventListener("keydown", handleKeyDown);
    canvas.addEventListener("pointerdown", handleSwipeStart);
    canvas.addEventListener("pointerup", handleSwipeEnd);
    canvas.addEventListener("pointercancel", () => {
      state.swipeStart = null;
    });
    window.addEventListener("resize", resize);
  }

  setDifficulty("easy");
  bindControls();
  resetMaze(true);
  requestAnimationFrame(draw);
})();
