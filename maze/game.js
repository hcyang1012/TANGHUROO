(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const statusEl = document.getElementById("status");
  const newMazeBtn = document.getElementById("newMazeBtn");
  const easyBtn = document.getElementById("easyBtn");
  const mobileButtons = Array.from(document.querySelectorAll(".dir-btn"));

  const state = {
    cols: 7,
    rows: 5,
    cellSize: 64,
    maze: [],
    player: { x: 0, y: 0 },
    goal: { x: 0, y: 0 },
    won: false,
    winTime: 0,
    holdDir: null,
    holdTimer: 0,
    lastPadButtons: [],
    lastMoveAt: 0,
    confetti: [],
    mode: "easy"
  };

  const DIRS = [
    { name: "up", dx: 0, dy: -1, wall: "n", opposite: "s", button: 12 },
    { name: "right", dx: 1, dy: 0, wall: "e", opposite: "w", button: 15 },
    { name: "down", dx: 0, dy: 1, wall: "s", opposite: "n", button: 13 },
    { name: "left", dx: -1, dy: 0, wall: "w", opposite: "e", button: 14 },
  ];

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

      for (const dir of DIRS) {
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

  function setDifficulty(mode) {
    state.mode = mode;
    if (mode === "easy") {
      state.cols = 7;
      state.rows = 5;
      statusEl.textContent = "아주 쉬운 미로예요. 왼쪽 스틱이나 방향키로 움직여서 별을 찾아가 보자.";
      easyBtn.textContent = "보통으로 바꾸기";
    } else {
      state.cols = 9;
      state.rows = 7;
      statusEl.textContent = "조금 더 큰 미로예요. A 버튼을 누르면 언제든 새 미로가 나와요.";
      easyBtn.textContent = "더 쉽고 크게";
    }
    newMaze();
  }

  function newMaze() {
    state.maze = buildMaze(state.cols, state.rows);
    state.player = { x: 0, y: 0 };
    state.goal = { x: state.cols - 1, y: state.rows - 1 };
    state.won = false;
    state.winTime = 0;
    state.confetti = [];
    state.holdDir = null;
    state.holdTimer = 0;
    statusEl.textContent =
      state.mode === "easy"
        ? "출발! 초록색 나를 움직여서 오른쪽 아래의 별까지 가 보자."
        : "새 미로가 생겼어요. 별까지 길을 찾아가 보자.";
    resize();
    draw();
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
    state.cellSize = Math.max(52, Math.min(state.cellSize, 120));
  }

  function movePlayer(dx, dy) {
    if (state.won) return;
    const now = performance.now();
    if (now - state.lastMoveAt < 90) return;

    const cell = state.maze[state.player.y][state.player.x];
    if (dx === 1 && !cell.e) state.player.x += 1;
    if (dx === -1 && !cell.w) state.player.x -= 1;
    if (dy === 1 && !cell.s) state.player.y += 1;
    if (dy === -1 && !cell.n) state.player.y -= 1;

    state.lastMoveAt = now;
    if (state.player.x === state.goal.x && state.player.y === state.goal.y) {
      winGame();
    }
  }

  function winGame() {
    state.won = true;
    state.winTime = performance.now();
    statusEl.textContent = "와! 별을 찾았어요! 새 미로로 한 번 더 해 볼까?";
    burstConfetti();
  }

  function burstConfetti() {
    const colors = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#ec4899"];
    state.confetti = Array.from({ length: 100 }, () => ({
      x: Math.random() * canvas.clientWidth,
      y: -20 - Math.random() * 120,
      vx: -1.5 + Math.random() * 3,
      vy: 1.5 + Math.random() * 3.6,
      r: 3 + Math.random() * 5,
      rot: Math.random() * Math.PI,
      vr: -0.15 + Math.random() * 0.3,
      color: colors[randInt(colors.length)]
    }));
  }

  function drawMaze(offsetX, offsetY) {
    const s = state.cellSize;
    const maze = state.maze;

    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#8b5e34";

    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const cell = maze[y][x];
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

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
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

  function drawBackground() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, "#fffaf0");
    grad.addColorStop(1, "#fde68a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    for (let i = 0; i < 20; i++) {
      const x = (i * 97 + (state.won ? performance.now() * 0.04 : 0)) % (w + 120) - 60;
      const y = (i * 61) % h;
      ctx.beginPath();
      ctx.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
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

    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillRect(offsetX - 14, offsetY - 14, boardW + 28, boardH + 28);
    ctx.restore();

    drawMaze(offsetX, offsetY);
    drawGoal(offsetX, offsetY);
    drawPlayer(offsetX, offsetY);
    drawConfetti();

    if (state.won) {
      const elapsed = performance.now() - state.winTime;
      if (elapsed > 2500) {
        statusEl.textContent = "멋져요! 새 미로 버튼을 눌러 또 놀아 보자.";
      }
    }

    requestAnimationFrame(draw);
  }

  function inputFromDirection(name) {
    const dir = DIRS.find((d) => d.name === name);
    if (!dir) return;
    movePlayer(dir.dx, dir.dy);
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
      newMaze();
      e.preventDefault();
      return;
    }

    const dir = map[e.key];
    if (dir) {
      inputFromDirection(dir);
      e.preventDefault();
    }
  }

  function handleMobilePress(button) {
    const dir = button.dataset.dir;
    const action = button.dataset.action;
    if (dir) {
      inputFromDirection(dir);
      return;
    }
    if (action === "restart") {
      newMaze();
    }
  }

  function bindMobileControls() {
    for (const button of mobileButtons) {
      button.addEventListener("click", () => handleMobilePress(button));
      button.addEventListener(
        "touchstart",
        (e) => {
          e.preventDefault();
          handleMobilePress(button);
        },
        { passive: false }
      );
    }
  }

  function setupSwipeControls() {
    let startX = 0;
    let startY = 0;
    let active = false;

    canvas.addEventListener("pointerdown", (e) => {
      active = true;
      startX = e.clientX;
      startY = e.clientY;
    });

    canvas.addEventListener("pointerup", (e) => {
      if (!active) return;
      active = false;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (Math.max(absX, absY) < 28) return;
      if (absX > absY) inputFromDirection(dx > 0 ? "right" : "left");
      else inputFromDirection(dy > 0 ? "down" : "up");
    });

    canvas.addEventListener("pointercancel", () => {
      active = false;
    });
  }

  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && pads[0];
    if (!pad) return;

    const buttons = pad.buttons.map((b) => !!b.pressed);
    const justPressed = (index) => buttons[index] && !state.lastPadButtons[index];

    if (justPressed(0)) newMaze(); // A
    if (justPressed(9)) newMaze(); // Start

    const axisX = Math.abs(pad.axes[0] || 0) > 0.45 ? pad.axes[0] : 0;
    const axisY = Math.abs(pad.axes[1] || 0) > 0.45 ? pad.axes[1] : 0;
    let nextDir = null;

    if (buttons[12] || axisY < 0) nextDir = "up";
    else if (buttons[13] || axisY > 0) nextDir = "down";
    else if (buttons[14] || axisX < 0) nextDir = "left";
    else if (buttons[15] || axisX > 0) nextDir = "right";

    const now = performance.now();
    if (nextDir) {
      if (state.holdDir !== nextDir) {
        state.holdDir = nextDir;
        state.holdTimer = now;
        inputFromDirection(nextDir);
      } else if (now - state.holdTimer > 180) {
        state.holdTimer = now;
        inputFromDirection(nextDir);
      }
    } else {
      state.holdDir = null;
    }

    state.lastPadButtons = buttons;
  }

  function loopGamepad() {
    pollGamepad();
    requestAnimationFrame(loopGamepad);
  }

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", handleKeyDown);
  newMazeBtn.addEventListener("click", newMaze);
  easyBtn.addEventListener("click", () => {
    setDifficulty(state.mode === "easy" ? "normal" : "easy");
  });
  bindMobileControls();
  setupSwipeControls();
  window.addEventListener("gamepadconnected", () => {
    statusEl.textContent = "게임패드가 연결됐어요. 왼쪽 스틱이나 십자키로 움직여 보세요.";
  });

  setDifficulty("easy");
  requestAnimationFrame(draw);
  requestAnimationFrame(loopGamepad);
})();
