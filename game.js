const machine = document.querySelector("#machine");
const paymentModule = document.querySelector("#paymentModule");
const cardButton = document.querySelector("#cardButton");
const mobileCardButton = document.querySelector("#mobileCardButton");
const powerSwitch = document.querySelector("#powerSwitch");
const mobilePowerSwitch = document.querySelector("#mobilePowerSwitch");
const powerLabel = document.querySelector("#powerLabel");
const machineStatus = document.querySelector("#machineStatus");
const selectedLabel = document.querySelector("#selectedLabel");
const previewIcon = document.querySelector("#previewIcon");
const ingredients = Array.from(document.querySelectorAll(".ingredient"));
const dispenseStage = document.querySelector("#dispenseStage");
const subscriberCount = document.querySelector("#subscriberCount");
const hostTitle = document.querySelector("#hostTitle");
const hostTalk = document.querySelector("#hostTalk");
const reviewScore = document.querySelector("#reviewScore");
const sweetBar = document.querySelector("#sweetBar");
const crunchBar = document.querySelector("#crunchBar");
const funBar = document.querySelector("#funBar");
const commentStack = document.querySelector("#commentStack");
const broadcastPanel = document.querySelector(".broadcast-panel");
const videoSnack = document.querySelector("#videoSnack");

const INGREDIENTS = {
  strawberry: { label: "STRAWBERRY", icon: "strawberry", main: "#ff6676", deep: "#c92b4a", light: "#ffb0ba" },
  grape: { label: "GRAPE", icon: "grape", main: "#9d67ff", deep: "#4f1fb2", light: "#d6b5ff" },
  orange: { label: "ORANGE", icon: "orange", main: "#ffb342", deep: "#c96f00", light: "#ffe08b" },
  blueberry: { label: "BLUEBERRY", icon: "blueberry", main: "#5a9dff", deep: "#2656ba", light: "#c9e0ff" },
  kiwi: { label: "KIWI", icon: "kiwi", main: "#87df5c", deep: "#2f8e39", light: "#ddffbb" },
  tomato: { label: "TOMATO", icon: "tomato", main: "#ff7d5b", deep: "#d13b23", light: "#ffbfab" },
};

const DISPLAY_NAMES = {
  strawberry: "딸기",
  grape: "포도",
  orange: "오렌지",
  blueberry: "블루베리",
  kiwi: "키위",
  tomato: "토마토",
};

let isOn = false;
let isBusy = false;
let cardInserted = false;
let cardApproved = false;
let selectedIngredients = ["strawberry"];
let selectedIngredient = "strawberry";
let flowToken = 0;
let dispensedToken = 0;
let eatingToken = 0;
let subscribers = 128540;

const REVIEW_BY_INGREDIENT = {
  strawberry: {
    talk: "첫 입부터 진짜 바삭하고 달콤해요!",
    score: 9.6,
    sweet: 94,
    crunch: 88,
    fun: 92,
    comment: "딸기 향이 바로 올라와서 너무 좋다.",
  },
  grape: {
    talk: "포도는 한 번 씹을 때마다 과즙이 팡 터져요.",
    score: 9.3,
    sweet: 89,
    crunch: 91,
    fun: 90,
    comment: "색도 예쁘고 소리도 진짜 맛있게 들린다.",
  },
  orange: {
    talk: "오렌지는 상큼함이 꽉 차 있어서 상쾌해요.",
    score: 9.2,
    sweet: 84,
    crunch: 87,
    fun: 88,
    comment: "상큼해서 계속 손이 가는 맛이에요.",
  },
  blueberry: {
    talk: "블루베리는 달달한데도 깔끔해서 계속 먹게 돼요.",
    score: 9.4,
    sweet: 86,
    crunch: 89,
    fun: 91,
    comment: "보기만 해도 시원한 색감이 좋아요.",
  },
  kiwi: {
    talk: "키위는 새콤달콤해서 입안이 산뜻해져요.",
    score: 9.1,
    sweet: 82,
    crunch: 86,
    fun: 87,
    comment: "씹을수록 산뜻한 향이 오래 남아요.",
  },
  tomato: {
    talk: "토마토는 의외로 달콤해서 재미가 있어요.",
    score: 9.0,
    sweet: 81,
    crunch: 85,
    fun: 89,
    comment: "조금 색다른데 그래서 더 기억에 남아요.",
  },
};

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getDisplayName(key) {
  return DISPLAY_NAMES[key] || DISPLAY_NAMES.strawberry;
}

function getSelectionKeys(selection = selectedIngredients) {
  const keys = Array.isArray(selection) ? selection.slice() : [selection];
  return keys.length > 0 ? keys : ["strawberry"];
}

function getSelectionLabel(selection = selectedIngredients) {
  const keys = getSelectionKeys(selection);
  const names = keys.map(getDisplayName);
  return keys.length === 1 ? `${names[0]} 탕후루` : `${names.join(" + ")} 믹스 탕후루`;
}

function buildSelectionReview(selection = selectedIngredients) {
  const keys = getSelectionKeys(selection);
  const reviews = keys.map((key) => REVIEW_BY_INGREDIENT[key] || REVIEW_BY_INGREDIENT.strawberry);
  const count = reviews.length || 1;
  const aggregate = reviews.reduce(
    (acc, review) => {
      acc.score += review.score;
      acc.sweet += review.sweet;
      acc.crunch += review.crunch;
      acc.fun += review.fun;
      return acc;
    },
    { score: 0, sweet: 0, crunch: 0, fun: 0 }
  );
  const label = keys.map(getDisplayName).join(" + ");

  return {
    talk:
      count === 1
        ? reviews[0].talk
        : `${label} 조합이라 한입마다 맛이 바뀌고 더 재미있어요.`,
    score: aggregate.score / count,
    sweet: aggregate.sweet / count,
    crunch: aggregate.crunch / count,
    fun: aggregate.fun / count,
    comment:
      count === 1
        ? reviews[0].comment
        : `${label} 조합이라 색도 다채롭고 반응도 좋아요.`,
  };
}

function setStatus(text) {
  machineStatus.textContent = text;
}

function renderPreview(selection = selectedIngredients) {
  const keys = getSelectionKeys(selection);
  previewIcon.innerHTML = keys
    .slice(0, 3)
    .map((key, index) => {
      const data = INGREDIENTS[key] || INGREDIENTS.strawberry;
      const offsets = [
        "translate(-50%, -50%) translate(-18px, 8px) rotate(-12deg)",
        "translate(-50%, -50%) translate(0, -4px) rotate(0deg)",
        "translate(-50%, -50%) translate(18px, 8px) rotate(12deg)",
      ];
      const size = keys.length === 1 ? "62px" : "48px";
      return `<svg style="position:absolute; left:50%; top:50%; width:${size}; height:${size}; transform:${offsets[index] || offsets[1]}; opacity:${keys.length === 1 ? 1 : 0.95}; color:${data.main}; filter: drop-shadow(0 6px 10px rgba(0,0,0,0.08));"><use href="#icon-${data.icon}"></use></svg>`;
    })
    .join("");
}

function buildFruitLayout(count) {
  if (count <= 1) {
    return [{ x: 110, y: 110, size: 76, tilt: -2 }];
  }

  const startY = 44;
  const stepY = Math.min(32, 98 / Math.max(1, count - 1));
  const centerX = 110;
  const sizeBase = Math.max(38, 70 - count * 3);

  return Array.from({ length: count }, (_, index) => {
    const x = centerX;
    const y = Math.round(startY + index * stepY);
    const size = Math.round(sizeBase + (index % 3 === 0 ? 2 : 0));
    const tilt = Math.round((index - (count - 1) / 2) * 1.6);

    return { x, y, size, tilt };
  });
}

function updateIngredientState() {
  ingredients.forEach((button) => {
    button.classList.toggle("is-active", selectedIngredients.includes(button.dataset.ingredient));
  });
}

function updateCardButton() {
  const icon = '<svg><use href="#icon-card"></use></svg>';
  const markup = cardInserted
    ? `${icon}<span>카드 빼기</span>`
    : `${icon}<span>카드 넣기</span>`;
  cardButton.innerHTML = markup;
  if (mobileCardButton) {
    mobileCardButton.innerHTML = markup;
  }
}

function clearDispense() {
  const existing = dispenseStage.querySelector(".tanghulu-item");
  if (existing) existing.remove();
  dispensedToken += 1;
}

function setReviewBars(data) {
  sweetBar.style.width = `${data.sweet}%`;
  crunchBar.style.width = `${data.crunch}%`;
  funBar.style.width = `${data.fun}%`;
  reviewScore.textContent = data.score.toFixed(1);
}

function addComment(text) {
  const comment = document.createElement("div");
  comment.className = "comment-chip";
  comment.textContent = text;
  commentStack.prepend(comment);
  while (commentStack.children.length > 4) {
    commentStack.lastElementChild.remove();
  }
}

function updateBroadcastForIngredient(key) {
  const review = buildSelectionReview(key);
  hostTitle.textContent = `${getSelectionLabel(key)} 리뷰`;
  hostTalk.textContent = review.talk;
  setReviewBars(review);
}

function animateSubscriberGain() {
  subscribers += 12 + Math.floor(Math.random() * 18);
  subscriberCount.textContent = subscribers.toLocaleString("en-US");
}

function scrollToBroadcastPanel() {
  if (!window.matchMedia("(max-width: 640px)").matches) return;
  if (!broadcastPanel) return;

  const targetTop = Math.max(0, broadcastPanel.getBoundingClientRect().top + window.scrollY - 12);
  window.scrollTo({
    top: targetTop,
    behavior: "smooth",
  });
}

function renderVideoSnack(key) {
  videoSnack.replaceChildren();
  const snack = createTanghulu(getSelectionKeys(key));
  snack.classList.add("video-tanghulu");
  videoSnack.appendChild(snack);
}

function triggerEatingAnimation() {
  broadcastPanel.classList.remove("is-reacting");
  videoSnack.classList.remove("is-showing", "is-chewing");
  void broadcastPanel.offsetWidth;
  void videoSnack.offsetWidth;
  broadcastPanel.classList.add("is-reacting");
  videoSnack.classList.add("is-showing");
}

async function playEatingSequence(key, token) {
  const selection = getSelectionKeys(key);
  const review = buildSelectionReview(selection);

  eatingToken = token;
  renderVideoSnack(selection);
  triggerEatingAnimation();
  scrollToBroadcastPanel();
  animateSubscriberGain();
  addComment(review.comment || "한입 리액션!");
  updateBroadcastForIngredient(selection);
  setStatus(`${getSelectionLabel(selection)}를 먹는 중이에요.`);

  const stages = [
    { delay: 420, talk: "한입 크게 베어 무는 중!" },
    { delay: 780, talk: "지금 입안에서 바삭 소리가 길게 나요." },
    { delay: 980, talk: review.talk },
    { delay: 1040, talk: "오물오물할수록 과즙이 더 달콤하게 퍼져요." },
    { delay: 1120, talk: "마지막 한입까지 완전 만족!" },
  ];

  for (const stage of stages) {
    await sleep(stage.delay);
    if (eatingToken !== token) return;
    hostTalk.textContent = stage.talk;
    videoSnack.classList.toggle("is-chewing", stage.delay >= 620);
  }

  await sleep(900);
  if (eatingToken !== token) return;

  videoSnack.classList.remove("is-showing");
  videoSnack.classList.remove("is-chewing");
  broadcastPanel.classList.remove("is-reacting");
  isBusy = false;
  updatePowerUI();
  if (isOn) {
    setStatus("먹기 완료! 카드를 다시 넣으면 다음 탕후루를 받을 수 있어요.");
  }
}

function resetPaymentVisuals() {
  paymentModule.classList.remove("is-inserting", "is-scanning", "is-ejecting");
  if (cardInserted) {
    paymentModule.classList.add("is-in-slot");
  } else {
    paymentModule.classList.remove("is-in-slot", "is-approved");
  }
}

function updatePowerUI() {
  powerSwitch.classList.toggle("is-on", isOn);
  powerSwitch.setAttribute("aria-pressed", String(isOn));
  powerLabel.textContent = isOn ? "ON" : "OFF";
  if (mobilePowerSwitch) {
    mobilePowerSwitch.classList.toggle("is-on", isOn);
    mobilePowerSwitch.setAttribute("aria-pressed", String(isOn));
    mobilePowerSwitch.innerHTML = isOn
      ? '<svg aria-hidden="true"><use href="#icon-power"></use></svg><span>ON</span>'
      : '<svg aria-hidden="true"><use href="#icon-power"></use></svg><span>OFF</span>';
  }
  cardButton.disabled = !isOn || isBusy;
  if (mobileCardButton) {
    mobileCardButton.disabled = !isOn || isBusy;
  }

  if (!isOn) {
    isBusy = false;
    cardInserted = false;
    cardApproved = false;
    selectedIngredient = selectedIngredients[0] || "strawberry";
    flowToken += 1;
    dispensedToken += 1;
    eatingToken += 1;
    clearDispense();
    broadcastPanel.classList.remove("is-reacting");
    videoSnack.classList.remove("is-showing");
    videoSnack.replaceChildren();
    paymentModule.classList.remove("is-inserting", "is-scanning", "is-ejecting", "is-approved", "is-in-slot");
    updateCardButton();
    machine.dataset.running = "false";
    setStatus("전원을 켜고 맛을 고른 뒤 카드를 넣어 주세요.");
    return;
  }

  machine.dataset.running = "true";
  resetPaymentVisuals();
  updateCardButton();

  if (cardInserted) {
    setStatus(cardApproved ? "승인 완료! 카드를 빼 주세요." : "카드가 들어 있는 상태예요.");
  } else {
    setStatus(`${getSelectionLabel()}를 준비했어요. 카드를 넣어 주세요.`);
  }
}

function setSelectedIngredient(key) {
  const index = selectedIngredients.indexOf(key);
  if (index >= 0) {
    if (selectedIngredients.length === 1) return;
    selectedIngredients.splice(index, 1);
  } else {
    selectedIngredients.push(key);
  }
  selectedIngredient = selectedIngredients[0] || "strawberry";
  selectedLabel.textContent = getSelectionLabel();
  renderPreview(selectedIngredients);
  updateIngredientState();
  updateBroadcastForIngredient(selectedIngredients);

  if (!isOn) {
    setStatus("먼저 전원을 켜 주세요.");
    return;
  }

  if (cardInserted) {
    setStatus("카드를 빼면 탕후루가 토출돼요.");
  } else {
    setStatus(`${getSelectionLabel()} 선택 완료. 카드를 넣어 주세요.`);
  }
}

function createTanghulu(key) {
  const keys = getSelectionKeys(key);
  const palettes = keys.map((ingredientKey) => INGREDIENTS[ingredientKey] || INGREDIENTS.strawberry);
  const fruitLayout = buildFruitLayout(keys.length);
  const item = document.createElement("div");
  item.className = "tanghulu-item";
  const basePalette = palettes[0];
  item.style.setProperty("--fruit-main", basePalette.main);
  item.style.setProperty("--fruit-deep", basePalette.deep);
  item.style.setProperty("--fruit-light", basePalette.light);

  const fruits = fruitLayout
    .map((layout, index) => {
      const palette = palettes[index % palettes.length];
      return `<span class="tanghulu-fruit" style="--x:${layout.x}px; --y:${layout.y}px; --size:${layout.size}px; --tilt:${layout.tilt}deg; --fruit-main:${palette.main}; --fruit-deep:${palette.deep}; --fruit-light:${palette.light};"></span>`;
    })
    .join("");

  item.innerHTML = `
    <div class="tanghulu-stick"></div>
    <div class="tanghulu-glass"></div>
    ${fruits}
    <span class="tanghulu-drip one"></span>
    <span class="tanghulu-drip two"></span>
    <span class="tanghulu-spark a"></span>
    <span class="tanghulu-spark b"></span>
  `;

  return item;
}

async function insertCard() {
  if (!isOn || isBusy) return;

  const token = ++flowToken;
  isBusy = true;
  updatePowerUI();

  paymentModule.classList.remove("is-ejecting", "is-approved");
  paymentModule.classList.add("is-inserting");
  setStatus("카드를 넣는 중...");
  updateCardButton();

  await sleep(720);
  if (token !== flowToken || !isOn) return;

  paymentModule.classList.remove("is-inserting");
  paymentModule.classList.add("is-scanning");
  setStatus("카드를 확인하는 중...");

  await sleep(860);
  if (token !== flowToken || !isOn) return;

  paymentModule.classList.remove("is-scanning");
  paymentModule.classList.add("is-in-slot", "is-approved");
  cardInserted = true;
  cardApproved = true;
  isBusy = false;
  updateCardButton();
  updatePowerUI();
  setStatus("승인 완료! 카드를 빼 주세요.");
}

async function ejectCardAndDispense() {
  if (!isOn || isBusy || !cardInserted) return;

  const token = ++flowToken;
  isBusy = true;
  updatePowerUI();

  paymentModule.classList.remove("is-approved");
  paymentModule.classList.add("is-ejecting");
  setStatus("카드를 빼는 중...");
  updateCardButton();

  await sleep(720);
  if (token !== flowToken || !isOn) return;

  paymentModule.classList.remove("is-ejecting", "is-in-slot");
  cardInserted = false;
  isBusy = false;
  updateCardButton();
  updatePowerUI();

  if (cardApproved) {
    cardApproved = false;
    setStatus("결제 완료! 탕후루를 토출할게요...");
    await sleep(180);
    if (!isOn) return;
    dispenseTanghulu();
  } else {
    setStatus("카드를 뺐어요.");
  }
}

function dispenseTanghulu() {
  clearDispense();

  const token = ++dispensedToken;
  const selection = selectedIngredients.slice();
  const item = createTanghulu(selection);
  dispenseStage.appendChild(item);

  requestAnimationFrame(() => {
    if (token !== dispensedToken) return;
    item.classList.add("is-visible");
  });

  setStatus(`${getSelectionLabel(selection)} 토출됐어요!`);
  isBusy = true;
  updatePowerUI();
  eatingToken += 1;
  const eatingRun = eatingToken;
  playEatingSequence(selection, eatingRun);

  window.setTimeout(() => {
    if (token !== dispensedToken) return;
    item.classList.add("is-snacked");
    window.setTimeout(() => {
      if (token !== dispensedToken) return;
      item.classList.remove("is-visible");
      window.setTimeout(() => {
        if (token !== dispensedToken) return;
        clearDispense();
        if (isOn && eatingToken === eatingRun) {
          setStatus("다음 탕후루를 위해 카드를 다시 넣어 주세요.");
        }
      }, 900);
    }, 1200);
  }, 5200);
}

powerSwitch.addEventListener("click", () => {
  isOn = !isOn;
  if (!isOn) {
    cardInserted = false;
    cardApproved = false;
    isBusy = false;
  }
  updatePowerUI();
});

ingredients.forEach((button) => {
  button.addEventListener("click", () => {
    setSelectedIngredient(button.dataset.ingredient);
  });
});

cardButton.addEventListener("click", async () => {
  if (!isOn || isBusy) return;
  if (!cardInserted) {
    await insertCard();
  } else {
    await ejectCardAndDispense();
  }
});

if (mobilePowerSwitch) {
  mobilePowerSwitch.addEventListener("click", () => {
    powerSwitch.click();
  });
}

if (mobileCardButton) {
  mobileCardButton.addEventListener("click", async () => {
    if (!isOn || isBusy) return;
    if (!cardInserted) {
      await insertCard();
    } else {
      await ejectCardAndDispense();
    }
  });
}

selectedLabel.textContent = getSelectionLabel();
renderPreview(selectedIngredients);
updateIngredientState();
updateBroadcastForIngredient(selectedIngredients);
updateCardButton();
updatePowerUI();

