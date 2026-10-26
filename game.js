"use strict";

const CHARACTERS = [
  { id: "snowman", name: "눈사람", emoji: "⛄", rarity: "포근한 친구" },
  { id: "penguin", name: "펭귄", emoji: "🐧", rarity: "반짝이는 친구" },
  { id: "bear", name: "꼬마 곰", emoji: "🐻", rarity: "포근한 친구" },
  { id: "fox", name: "눈꽃 여우", emoji: "🦊", rarity: "포근한 친구" },
  { id: "cat", name: "겨울 고양이", emoji: "🐱", rarity: "포근한 친구" },
  { id: "cookie", name: "진저 쿠키", emoji: "🍪", rarity: "포근한 친구" },
  { id: "santa", name: "산타", emoji: "🎅", rarity: "특별한 친구" },
  { id: "reindeer", name: "루돌프", emoji: "🦌", rarity: "특별한 친구" }
];

const SAVE_KEY = "cozy-snow-village-final";
const SUMMON_COST = 300;
const DUPLICATE_REWARD = 100;

const canvas = document.getElementById("world");
if (!canvas) throw new Error("index.html에서 id가 world인 canvas를 찾을 수 없습니다.");

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("브라우저가 Canvas를 지원하지 않습니다.");

let screenWidth = window.innerWidth;
let screenHeight = window.innerHeight;
let worldWidth = Math.max(3000, screenWidth * 3);
let cameraX = 0;
let lastFrameTime = 0;
let lastIncomeTime = Date.now();
let toastTimer = null;

let draggingMap = false;
let draggedVillager = null;
let dragMoved = false;
let pointerStartX = 0;
let pointerStartY = 0;
let cameraStartX = 0;
let destinationMarker = null;

const keysDown = new Set();
const imageCache = new Map();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function groundY() {
  return screenHeight * 0.54;
}

function pathY() {
  return groundY() + Math.min(88, screenHeight * 0.14);
}

function pixelRect(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(
    Math.round(x),
    Math.round(y),
    Math.max(1, Math.round(width)),
    Math.max(1, Math.round(height))
  );
}

function formatNumber(value) {
  return Math.floor(value).toLocaleString("ko-KR");
}

/* ---------- 저장 데이터 ---------- */

function loadGame() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (saved && typeof saved === "object") return saved;
  } catch (error) {
    console.warn("저장 데이터를 읽지 못했습니다.", error);
  }

  return {
    coins: 300,
    owned: { snowman: 1 },
    lastSeen: Date.now()
  };
}

const savedGame = loadGame();
let coins = Number.isFinite(savedGame.coins) ? savedGame.coins : 300;

const owned = savedGame.owned && typeof savedGame.owned === "object"
  ? savedGame.owned
  : { snowman: 1 };

for (const character of CHARACTERS) {
  const count = Number(owned[character.id]);
  owned[character.id] = Number.isFinite(count) && count > 0
    ? Math.floor(count)
    : 0;
}

if (Object.values(owned).every(count => count === 0)) {
  owned.snowman = 1;
}

const previousTime = Number(savedGame.lastSeen) || Date.now();
const offlineSeconds = clamp(
  Math.floor((Date.now() - previousTime) / 1000),
  0,
  24 * 60 * 60
);

if (offlineSeconds > 10) {
  coins += offlineSeconds;
  setTimeout(() => {
    showToast(`다시 오셨네요! 오프라인 보상 ❄ ${formatNumber(offlineSeconds)}`);
  }, 700);
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      coins,
      owned,
      lastSeen: Date.now()
    }));
  } catch (error) {
    console.warn("게임을 저장하지 못했습니다.", error);
  }
}

/* ---------- 캔버스 크기 ---------- */

function resizeCanvas() {
  screenWidth = window.innerWidth;
  screenHeight = window.innerHeight;
  worldWidth = Math.max(3000, screenWidth * 3);

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.floor(screenWidth * pixelRatio);
  canvas.height = Math.floor(screenHeight * pixelRatio);
  canvas.style.width = `${screenWidth}px`;
  canvas.style.height = `${screenHeight}px`;

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingEnabled = false;

  cameraX = clamp(cameraX, 0, Math.max(0, worldWidth - screenWidth));
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
cameraX = Math.max(0, worldWidth / 2 - screenWidth / 2);

/* ---------- 캐릭터 ---------- */

const villagers = [];
const villagerById = new Map();

function createVillager(character, index) {
  const startX = worldWidth / 2 + (index - 1) * 65;

  return {
    character,
    x: clamp(startX, 60, worldWidth - 60),
    y: pathY() + 24,
    targetX: clamp(startX, 60, worldWidth - 60),
    targetY: pathY() + 24,
    direction: index % 2 === 0 ? 1 : -1,
    speed: 34 + Math.random() * 18,
    moving: false,
    nextWander: performance.now() + 2500 + Math.random() * 4000,
    bubble: "",
    bubbleUntil: 0
  };
}

function syncVillagers() {
  for (const character of CHARACTERS) {
    const existingCount = villagers.filter(
      villager => villager.character.id === character.id
    ).length;

    const wantedCount = owned[character.id] || 0;

    for (let i = existingCount; i < wantedCount; i++) {
      villagers.push(createVillager(character, villagers.length));
    }
  }

  villagerById.clear();

  for (const villager of villagers) {
    if (!villagerById.has(villager.character.id)) {
      villagerById.set(villager.character.id, villager);
    }
  }
}

function updateVillagers(delta, time) {
  const seconds = delta / 1000;
  const minY = pathY() - 12;
  const maxY = Math.min(screenHeight - 30, pathY() + 40);

  for (const villager of villagers) {
    if (villager === draggedVillager) continue;

    if (!villager.moving && time > villager.nextWander) {
      villager.targetX = clamp(
        villager.x + (Math.random() - 0.5) * 380,
        50,
        worldWidth - 50
      );

      villager.targetY = clamp(
        pathY() + (Math.random() - 0.5) * 36,
        minY,
        maxY
      );

      villager.nextWander = time + 2500 + Math.random() * 5000;
    }

    const dx = villager.targetX - villager.x;
    const dy = villager.targetY - villager.y;
    const distance = Math.hypot(dx, dy);

    villager.moving = distance > 2;

    if (villager.moving) {
      villager.direction = dx < 0 ? -1 : 1;
      const step = Math.min(distance, villager.speed * seconds);

      villager.x += (dx / distance) * step;
      villager.y += (dy / distance) * step;
    } else {
      villager.x = villager.targetX;
      villager.y = villager.targetY;
    }
  }
}

function drawFallbackCharacter(villager, time) {
  const x = Math.round(villager.x);
  const foot = Math.round(villager.y);
  const step = villager.moving ? Math.round(Math.sin(time / 75) * 2) : 0;

  const designs = {
    snowman: { main: "#f2f1e7", light: "#dce5dd", dark: "#454746", accent: "#47738a" },
    penguin: { main: "#394b50", light: "#f2eee1", dark: "#343a3a", accent: "#eaae58" },
    bear: { main: "#936a4d", light: "#dbc39d", dark: "#493e35", accent: "#b66b50" },
    fox: { main: "#bf704a", light: "#f0dfc9", dark: "#493e35", accent: "#d4a45c" },
    cat: { main: "#79747b", light: "#e6d8c8", dark: "#493e35", accent: "#b66b50" },
    cookie: { main: "#a8794b", light: "#e8cf96", dark: "#493e35", accent: "#7f9d77" },
    santa: { main: "#af4f45", light: "#eee7d7", dark: "#493e35", accent: "#af4f45" },
    reindeer: { main: "#9b6847", light: "#ead8b7", dark: "#493e35", accent: "#b04d43" }
  };

  const colors = designs[villager.character.id] || designs.bear;

  pixelRect(x - 10, foot + 1, 20, 3, "rgba(45,54,48,.2)");
  pixelRect(x - 7, foot - 19 + step, 14, 14, colors.main);
  pixelRect(x - 6, foot - 28 + step, 12, 10, colors.main);
  pixelRect(x - 4, foot - 14 + step, 8, 6, colors.light);

  if (villager.character.id === "snowman") {
    pixelRect(x - 8, foot - 20 + step, 16, 3, colors.accent);
    pixelRect(x - 3, foot - 25 + step, 2, 2, colors.dark);
    pixelRect(x + 2, foot - 25 + step, 2, 2, colors.dark);
    pixelRect(x + 1, foot - 22 + step, 4, 2, "#df925b");
  } else if (villager.character.id === "penguin") {
    pixelRect(x - 4, foot - 17 + step, 8, 10, colors.light);
    pixelRect(x - 2, foot - 24 + step, 2, 2, "#ffffff");
    pixelRect(x + 2, foot - 24 + step, 2, 2, "#ffffff");
    pixelRect(x - 2, foot - 22 + step, 2, 2, colors.dark);
    pixelRect(x + 2, foot - 22 + step, 2, 2, colors.dark);
    pixelRect(x - 2, foot - 8 + step, 5, 2, colors.accent);
  } else if (villager.character.id === "santa") {
    pixelRect(x - 7, foot - 31 + step, 14, 3, colors.light);
    pixelRect(x - 4, foot - 36 + step, 10, 6, colors.accent);
    pixelRect(x - 3, foot - 14 + step, 6, 7, colors.light);
  } else {
    pixelRect(x - 7, foot - 33 + step, 4, 6, colors.main);
    pixelRect(x + 3, foot - 33 + step, 4, 6, colors.main);
    pixelRect(x - 4, foot - 25 + step, 2, 2, colors.dark);
    pixelRect(x + 2, foot - 25 + step, 2, 2, colors.dark);
  }

  const legOffset = villager.moving && Math.floor(time / 100) % 2 ? 2 : 0;
  pixelRect(x - 5 - legOffset, foot - 5, 4, 5, colors.dark);
  pixelRect(x + 1 + legOffset, foot - 5, 4, 5, colors.dark);
}

function drawVillager(villager, time) {
  drawFallbackCharacter(villager, time);

  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const labelWidth = ctx.measureText(villager.character.name).width + 10;
  pixelRect(
    villager.x - labelWidth / 2,
    villager.y - 49,
    labelWidth,
    14,
    "rgba(250,247,237,.92)"
  );

  ctx.fillStyle = "#443c32";
  ctx.fillText(villager.character.name, villager.x, villager.y - 38);

  if (villager.bubble && time < villager.bubbleUntil) {
    drawSpeechBubble(villager, time);
  }
}

syncVillagers();

/* ---------- 실시간 하늘 ---------- */

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
}

function mixHex(from, to, amount) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);

  return `rgb(${a.map((value, index) =>
    Math.round(value + (b[index] - value) * amount)
  ).join(", ")})`;
}

function getRealtimeSky() {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  let daylight;

  if (hour >= 6 && hour < 8) {
    daylight = (hour - 6) / 2;
  } else if (hour >= 8 && hour < 17) {
    daylight = 1;
  } else if (hour >= 17 && hour < 20) {
    daylight = 1 - (hour - 17) / 3;
  } else {
    daylight = 0;
  }

  return {
    daylight,
    top: mixHex("#263e5b", "#76b4c3", daylight),
    bottom: mixHex("#3d5a73", "#a7d1d4", daylight)
  };
}

function drawPixelMoon() {
  const rows = [
    "...#####...",
    "..#######..",
    ".#########.",
    "##########.",
    "##########.",
    "#########..",
    ".########..",
    "..######...",
    "...####...."
  ];

  const cell = 5;
  const startX = cameraX + screenWidth * 0.73;
  const startY = screenHeight * 0.13;

  rows.forEach((row, rowIndex) => {
    [...row].forEach((pixel, columnIndex) => {
      if (pixel === "#") {
        pixelRect(
          startX + columnIndex * cell,
          startY + rowIndex * cell,
          cell,
          cell,
          "#f3e7bd"
        );
      }
    });
  });

  pixelRect(startX + 9 * cell, startY + 3 * cell, 2 * cell, cell, "#d7d0b2");
  pixelRect(startX + 3 * cell, startY + 6 * cell, cell, cell, "#d7d0b2");
  pixelRect(startX + 6 * cell, startY + 2 * cell, cell, cell, "#e1d9b8");
}

function drawPixelSun() {
  const x = cameraX + screenWidth * 0.73;
  const y = screenHeight * 0.17;
  const size = 5;

  pixelRect(x - size * 3, y - size * 3, size * 6, size * 6, "rgba(255,220,143,.17)");
  pixelRect(x - size * 2, y - size * 2, size * 4, size * 4, "#f7d994");
  pixelRect(x - size, y - size, size * 2, size * 2, "#ffedb7");
}

const clouds = [
  { x: 160, y: 85, speed: 8, scale: 1 },
  { x: 820, y: 137, speed: 5, scale: 0.8 },
  { x: 1530, y: 78, speed: 6, scale: 0.9 },
  { x: 2240, y: 123, speed: 4, scale: 0.72 }
];

function drawPixelCloud(cloud) {
  const x = cloud.x;
  const y = cloud.y;
  const scale = cloud.scale;
  const color = "rgba(238,246,239,.77)";

  pixelRect(x, y + 8 * scale, 68 * scale, 13 * scale, color);
  pixelRect(x + 10 * scale, y + 2 * scale, 20 * scale, 14 * scale, color);
  pixelRect(x + 28 * scale, y - 2 * scale, 22 * scale, 18 * scale, color);
  pixelRect(x + 48 * scale, y + 5 * scale, 15 * scale, 13 * scale, color);
}

function drawPixelClouds(delta) {
  const seconds = Math.min(delta, 50) / 1000;

  for (const cloud of clouds) {
    cloud.x += cloud.speed * seconds;

    if (cloud.x > worldWidth + 100) cloud.x = -100;

    drawPixelCloud(cloud);
  }
}

const snowflakes = Array.from({ length: 150 }, (_, index) => ({
  x: (index * 97 + Math.random() * 300) % 4000,
  y: Math.random() * 1000,
  speed: 20 + Math.random() * 42,
  drift: Math.random() * 1.2 - 0.6,
  size: Math.random() < 0.8 ? 2 : 3
}));

function drawSnow(delta, time) {
  for (const flake of snowflakes) {
    flake.y += flake.speed * delta / 1000;
    flake.x += flake.drift + Math.sin(time / 900 + flake.y) * 0.15;

    if (flake.y > screenHeight + 5) {
      flake.y = -5;
      flake.x = cameraX + Math.random() * screenWidth;
    }

    if (flake.x < cameraX - 8) flake.x = cameraX + screenWidth + 8;
    if (flake.x > cameraX + screenWidth + 8) flake.x = cameraX - 8;

    pixelRect(flake.x, flake.y, flake.size, flake.size, "rgba(255,255,255,.82)");
  }
}

function drawPixelSky(time, delta) {
  const sky = getRealtimeSky();
  const horizon = groundY() + 55;

  pixelRect(0, 0, worldWidth, horizon, sky.bottom);

  for (let y = 0; y < horizon; y += 24) {
    pixelRect(0, y, worldWidth, 24, mixHex(sky.top, sky.bottom, y / horizon));
  }

  if (sky.daylight < 0.35) {
    for (let index = 0; index < 100; index++) {
      const x = (index * 173 + 47) % worldWidth;
      const y = 18 + ((index * 67) % Math.max(50, Math.floor(groundY() * 0.65)));

      if (Math.sin(time / 600 + index * 1.3) > -0.25) {
        pixelRect(x, y, 2, 2, "#f4edcf");
      }
    }

    drawPixelMoon();
  } else {
    drawPixelSun();
  }

  drawPixelClouds(delta);
}

/* ---------- 도트 산맥 ---------- */

function drawPixelMountain(centerX, baseY, width, height, color, snowColor, variant) {
  const step = 8;
  const rows = Math.ceil(height / step);

  for (let row = 0; row < rows; row++) {
    const progress = row / rows;

    // 위쪽은 좁고 아래쪽은 넓어지는 부드러운 산 형태
    const curve = Math.sqrt(progress);
    const leftFactor = 0.88 + variant * 0.04;
    const rightFactor = 1.08 - variant * 0.03;
    const halfWidth = width * curve / 2;
    const y = baseY - height + row * step;

    pixelRect(
      centerX - halfWidth * leftFactor,
      y,
      halfWidth * (leftFactor + rightFactor),
      step + 1,
      color
    );

    // 산 정상에만 눈이 쌓이도록 폭을 점점 넓힙니다.
    if (progress < 0.23) {
      const capProgress = progress / 0.23;
      const capWidth = Math.max(step, width * 0.12 + width * 0.22 * capProgress);

      pixelRect(
        centerX - capWidth / 2,
        y,
        capWidth,
        step,
        snowColor
      );
    }
  }

  // 산 중턱의 눈 능선
  const ridgeY = baseY - height * (0.56 + variant * 0.04);
  const ridgeX = centerX - width * 0.29;

  for (let i = 0; i < 8; i++) {
    pixelRect(
      ridgeX + i * 8,
      ridgeY + i * 3,
      12,
      3,
      snowColor
    );
  }

  // 반대편의 어두운 바위 면
  for (let i = 0; i < 7; i++) {
    pixelRect(
      centerX + width * 0.10 + i * 7,
      baseY - height * 0.35 + i * 5,
      10,
      5,
      "rgba(43,70,83,.19)"
    );
  }
}

function drawMountains() {
  const baseY = groundY() + 28;
  const sky = getRealtimeSky();
  const farColor = sky.daylight > 0.5 ? "#8aaab0" : "#49667d";
  const nearColor = sky.daylight > 0.5 ? "#75969f" : "#405c74";

  for (let index = -1; index < Math.ceil(worldWidth / 560) + 1; index++) {
    const x = index * 560;

    drawPixelMountain(
      x + 180,
      baseY,
      310,
      150 + (index % 3) * 14,
      farColor,
      "#e2ece8",
      index % 3
    );

    drawPixelMountain(
      x + 430,
      baseY + 13,
      260,
      108 + (index % 2) * 16,
      nearColor,
      "#e8efeb",
      (index + 1) % 3
    );
  }
}

/* ---------- 눈밭과 길 ---------- */

function drawGround() {
  const horizon = groundY();
  const road = pathY();

  pixelRect(0, horizon, worldWidth, screenHeight - horizon, "#dce9e4");

  // 눈밭의 잔잔한 도트 무늬
  for (let x = 0; x < worldWidth; x += 72) {
    const seed = Math.floor(x / 72);
    const y = horizon + 16 + (seed * 31) % Math.max(50, screenHeight * 0.19);

    pixelRect(x, y, 31, 3, "#cbded9");
    pixelRect(x + 17, y + 9, 20, 2, "#f7f6ee");
  }

  // 마을 중앙 길
  pixelRect(0, road, worldWidth, 48, "#c8bda9");
  pixelRect(0, road + 3, worldWidth, 4, "#e3dac8");
  pixelRect(0, road + 43, worldWidth, 5, "#b9ad9a");

  for (let x = 18; x < worldWidth; x += 86) {
    const offset = Math.floor(x / 86) % 3;
    pixelRect(x, road + 15 + offset * 5, 21, 2, "#eee9dc");
  }

  // 길 가장자리의 불규칙한 눈더미
  for (let x = 0; x < worldWidth; x += 190) {
    pixelRect(x + 28, road - 4, 38, 4, "#f5f5ec");
    pixelRect(x + 38, road - 8, 20, 4, "#f5f5ec");
  }

  // 화면 아래쪽에 눈의 층과 작은 발자국을 추가
  const bottomY = Math.max(road + 72, screenHeight * 0.82);

  for (let x = 30; x < worldWidth; x += 115) {
    const seed = Math.floor(x / 115);
    const y = bottomY + (seed % 4) * 12;

    pixelRect(x, y, 29, 3, "#cbded9");
    pixelRect(x + 19, y + 8, 16, 2, "#f8f7ef");

    if (seed % 2 === 0) {
      pixelRect(x + 50, y + 17, 3, 5, "#b9cbc6");
      pixelRect(x + 59, y + 22, 3, 5, "#b9cbc6");
    }
  }
}

/* ---------- 집, 나무, 등불 ---------- */

function drawSmallTree(x, baseY, scale = 1, decorated = true) {
  const s = scale;

  // 그림자와 줄기
  pixelRect(x - 5 * s, baseY, 32 * s, 4 * s, "rgba(56,76,64,.18)");
  pixelRect(x + 8 * s, baseY - 22 * s, 8 * s, 23 * s, "#76513f");

  // 가지를 층층이 쌓아 삼각형 나무로 표현
  pixelRect(x + 8 * s, baseY - 70 * s, 8 * s, 14 * s, "#43805b");
  pixelRect(x + 4 * s, baseY - 58 * s, 16 * s, 17 * s, "#347352");
  pixelRect(x, baseY - 43 * s, 24 * s, 17 * s, "#285842");

  // 눈 덮인 가지
  pixelRect(x + 8 * s, baseY - 72 * s, 8 * s, 3 * s, "#f0f2e9");
  pixelRect(x + 4 * s, baseY - 59 * s, 8 * s, 3 * s, "#e8efe7");
  pixelRect(x + 14 * s, baseY - 43 * s, 9 * s, 3 * s, "#e8efe7");
  pixelRect(x - 2 * s, baseY - 28 * s, 9 * s, 3 * s, "#e8efe7");

  if (decorated) {
    pixelRect(x + 7 * s, baseY - 33 * s, 4 * s, 4 * s, "#d65249");
    pixelRect(x + 15 * s, baseY - 47 * s, 4 * s, 4 * s, "#f1ca69");
    pixelRect(x + 10 * s, baseY - 61 * s, 4 * s, 4 * s, "#d65249");
  }
}

function drawCabin(x, baseY, scale, wallColor, index) {
  const s = scale;
  const wallX = x + 5 * s;
  const wallWidth = 70 * s;
  const wallHeight = 43 * s;
  const wallTop = baseY - wallHeight;

  // 집 밑그림자
  pixelRect(x - 4 * s, baseY, 88 * s, 4 * s, "rgba(51,67,57,.2)");

  // 몸체
  pixelRect(wallX, wallTop, wallWidth, wallHeight, wallColor);

  // 벽의 가장자리와 밑부분
  pixelRect(wallX, wallTop, 4 * s, wallHeight, "rgba(56,44,39,.18)");
  pixelRect(wallX, baseY - 4 * s, wallWidth, 4 * s, "#755344");

  // 계단식 박공지붕
  const roofTop = baseY - 76 * s;
  const roofBottom = wallTop + 3 * s;
  const roofHeight = roofBottom - roofTop;
  const roofRows = Math.ceil(roofHeight / (5 * s));

  for (let row = 0; row < roofRows; row++) {
    const progress = (row + 1) / roofRows;
    const width = 18 * s + progress * 72 * s;
    const y = roofTop + row * 5 * s;

    pixelRect(
      x + 40 * s - width / 2,
      y,
      width,
      6 * s,
      row < 2 ? "#80564a" : "#704a42"
    );
  }

  // 지붕 위의 눈
  pixelRect(x + 29 * s, roofTop - 2 * s, 25 * s, 4 * s, "#f1f0e8");
  pixelRect(x + 15 * s, roofTop + 10 * s, 15 * s, 3 * s, "#e7eee8");
  pixelRect(x + 56 * s, roofTop + 10 * s, 15 * s, 3 * s, "#e7eee8");

  // 창문
  const windowColor = index % 2 === 0 ? "#ffe7a2" : "#f1ca76";

  pixelRect(x + 13 * s, baseY - 31 * s, 14 * s, 15 * s, "#694b40");
  pixelRect(x + 15 * s, baseY - 29 * s, 10 * s, 11 * s, windowColor);
  pixelRect(x + 19 * s, baseY - 29 * s, 2 * s, 11 * s, "#956b4e");
  pixelRect(x + 15 * s, baseY - 24 * s, 10 * s, 2 * s, "#956b4e");

  pixelRect(x + 53 * s, baseY - 31 * s, 14 * s, 15 * s, "#694b40");
  pixelRect(x + 55 * s, baseY - 29 * s, 10 * s, 11 * s, windowColor);
  pixelRect(x + 59 * s, baseY - 29 * s, 2 * s, 11 * s, "#956b4e");
  pixelRect(x + 55 * s, baseY - 24 * s, 10 * s, 2 * s, "#956b4e");

  // 문
  pixelRect(x + 32 * s, baseY - 28 * s, 15 * s, 28 * s, "#604337");
  pixelRect(x + 44 * s, baseY - 15 * s, 2 * s, 2 * s, "#f2ca6c");

  // 굴뚝
  pixelRect(x + 58 * s, roofTop - 10 * s, 10 * s, 21 * s, "#765047");
  pixelRect(x + 55 * s, roofTop - 12 * s, 16 * s, 4 * s, "#f0eee5");

  const smokeStep = Math.floor(performance.now() / 500 + index) % 4;
  pixelRect(
    x + (61 + smokeStep) * s,
    roofTop - (20 + smokeStep * 4) * s,
    5 * s,
    4 * s,
    "rgba(245,248,242,.48)"
  );
}

function drawFestiveLights(x, y, length, time) {
  const colors = ["#d95a50", "#f2cf74", "#85ae80", "#83b5c7"];

  pixelRect(x, y, length, 2, "#514b43");

  for (let index = 0; index < 8; index++) {
    const lightX = x + length / 8 * index;
    const colorIndex = (index + Math.floor(time / 450)) % colors.length;
    pixelRect(lightX, y + 3, 4, 4, colors[colorIndex]);
  }
}

function drawLamp(x, baseY) {
  pixelRect(x, baseY - 42, 4, 43, "#70513e");
  pixelRect(x - 6, baseY - 50, 16, 13, "#76533d");
  pixelRect(x - 3, baseY - 47, 10, 8, "#ffe59b");
  pixelRect(x - 9, baseY - 55, 22, 4, "#68503e");
  pixelRect(x - 8, baseY - 34, 19, 3, "rgba(255,220,140,.17)");
}

/* ---------- 벤치와 마을 장식 ---------- */

function drawBench(x, y, scale = 1) {
  const s = scale;

  // 좌판
  pixelRect(x, y, 42 * s, 5 * s, "#855d43");
  pixelRect(x + 2 * s, y - 7 * s, 38 * s, 5 * s, "#986d4c");

  // 등받이 기둥
  pixelRect(x + 3 * s, y - 17 * s, 4 * s, 16 * s, "#76513f");
  pixelRect(x + 35 * s, y - 17 * s, 4 * s, 16 * s, "#76513f");
  pixelRect(x + 4 * s, y - 20 * s, 34 * s, 4 * s, "#855d43");

  // 다리
  pixelRect(x + 5 * s, y + 4 * s, 4 * s, 12 * s, "#624638");
  pixelRect(x + 33 * s, y + 4 * s, 4 * s, 12 * s, "#624638");

  // 등받이에 살짝 쌓인 눈
  pixelRect(x + 5 * s, y - 22 * s, 28 * s, 2 * s, "#f2f2e9");
}

function drawSnowmanDecoration(x, baseY, scale = 1) {
  const s = scale;

  pixelRect(x - 15 * s, baseY, 31 * s, 4 * s, "rgba(56,76,64,.16)");

  pixelRect(x - 12 * s, baseY - 19 * s, 24 * s, 18 * s, "#f3f2e9");
  pixelRect(x - 9 * s, baseY - 35 * s, 18 * s, 16 * s, "#f8f6ee");

  // 눈과 코
  pixelRect(x - 5 * s, baseY - 29 * s, 2 * s, 2 * s, "#414542");
  pixelRect(x + 3 * s, baseY - 29 * s, 2 * s, 2 * s, "#414542");
  pixelRect(x + 1 * s, baseY - 26 * s, 6 * s, 2 * s, "#e89150");

  // 모자와 목도리
  pixelRect(x - 10 * s, baseY - 39 * s, 20 * s, 4 * s, "#36413e");
  pixelRect(x - 6 * s, baseY - 47 * s, 12 * s, 9 * s, "#36413e");
  pixelRect(x - 12 * s, baseY - 20 * s, 24 * s, 4 * s, "#b94d45");
}

/* ---------- 집과 나무 배치 ---------- */

function drawVillage(time) {
  const road = pathY();
  const houseBase = road - 20;

  let index = 0;

  for (let x = 120; x < worldWidth; x += 470) {
    const scale = index % 3 === 0 ? 1 : 0.85;
    const wallColors = ["#a9584d", "#5e7b68", "#a97b50"];

    drawCabin(
      x,
      houseBase,
      scale,
      wallColors[index % wallColors.length],
      index
    );

    drawSmallTree(x - 47, houseBase + 1, 1.05, index % 2 === 0);
    drawSmallTree(x + 88, houseBase + 1, 0.86, true);
    drawLamp(x + 205, road + 6);

    if (index % 2 === 0) {
      drawFestiveLights(x + 14, houseBase - 78 * scale, 60 * scale, time);
    }

    index++;
  }

  // 길 뒤쪽에 낮은 눈 덮인 나무를 더 심습니다.
  let treeIndex = 0;
  for (let x = 45; x < worldWidth; x += 205) {
    const nearHouse = Math.floor(x / 470) % 2 === 0;

    if (!nearHouse) {
      const scale = treeIndex % 3 === 0 ? 1.15 : 0.9;
      drawSmallTree(x, road - 12, scale, treeIndex % 2 === 0);
    }

    treeIndex++;
  }
}

/* ---------- 중앙의 큰 크리스마스 트리 ---------- */

function drawTreeTier(centerX, topY, baseY, maxWidth, color, pixelSize) {
  for (let y = topY; y < baseY; y += pixelSize) {
    const progress = (y - topY) / (baseY - topY);
    const width = Math.max(pixelSize * 2, maxWidth * progress);
    const left = Math.round(centerX - width / 2);

    pixelRect(left, y, width, pixelSize, color);

    if (progress > 0.72) {
      pixelRect(left - pixelSize, y, pixelSize, pixelSize, color);
      pixelRect(left + width, y, pixelSize, pixelSize, color);
    }
  }
}

function drawGiftBox(x, y, color, size) {
  pixelRect(x, y + 2, size, size - 2, color);
  pixelRect(x - 2, y, size + 4, 5, color);
  pixelRect(x + size / 2 - 2, y, 4, size, "#f3d27a");
  pixelRect(x, y + 10, size, 3, "#f3d27a");

  pixelRect(x + size / 2 - 8, y - 4, 7, 5, "#f3d27a");
  pixelRect(x + size / 2 + 2, y - 4, 7, 5, "#f3d27a");
  pixelRect(x + size / 2 - 2, y - 3, 5, 5, "#dfb85f");

  pixelRect(x - 3, y + size, size + 6, 3, "rgba(53,65,53,.18)");
}

function drawCenterTree(time) {
  const centerX = worldWidth / 2;
  const baseY = pathY() + 17;
  const pixelSize = 7;

  pixelRect(centerX - 85, baseY + 1, 170, 7, "rgba(54,68,56,.2)");
  pixelRect(centerX - 12, baseY - 35, 24, 42, "#76513f");

  drawTreeTier(centerX, baseY - 190, baseY - 103, 96, "#43825d", pixelSize);
  drawTreeTier(centerX, baseY - 145, baseY - 57, 132, "#347354", pixelSize);
  drawTreeTier(centerX, baseY - 99, baseY - 12, 172, "#285b48", pixelSize);

  for (let index = 0; index < 10; index++) {
    const x = centerX - 71 + index * 15;
    const y = baseY - 25 - ((index * 17) % 70);
    pixelRect(x, y, 10, 3, "#e8eee4");
  }

  const ornaments = [
    [-7, -160, "#f3cf73"],
    [-30, -128, "#d6534d"],
    [22, -117, "#f2cf73"],
    [-50, -88, "#83b7c9"],
    [-10, -92, "#d6534d"],
    [40, -81, "#f3cf73"],
    [-66, -55, "#d6534d"],
    [-31, -50, "#f4d27a"],
    [12, -53, "#83b7c9"],
    [59, -46, "#d6534d"],
    [-46, -26, "#f2cf73"],
    [34, -24, "#f3cf73"]
  ];

  ornaments.forEach(([offsetX, offsetY, color], index) => {
    const lit = Math.floor(time / 430 + index) % 3 !== 0;
    pixelRect(
      centerX + offsetX,
      baseY + offsetY,
      7,
      7,
      lit ? color : "#e2e5d8"
    );
  });

  // 별 꼭대기 장식
  pixelRect(centerX - 5, baseY - 204, 10, 5, "#f5d77e");
  pixelRect(centerX - 2, baseY - 211, 5, 20, "#f5d77e");
  pixelRect(centerX - 10, baseY - 204, 21, 5, "#f5d77e");

  drawGiftBox(centerX - 66, baseY - 27, "#b85048", 26);
  drawGiftBox(centerX - 31, baseY - 20, "#547e66", 22);
  drawGiftBox(centerX + 13, baseY - 24, "#668db0", 25);
  drawGiftBox(centerX + 47, baseY - 18, "#c58b4e", 21);
}

/* ---------- 아래쪽 장식: 나무, 벤치, 눈사람, 선물 ---------- */

function drawLowerDecorations(time) {
  const road = pathY();
  const lowerStart = road + 74;

  // 맵 아래쪽에 일정한 간격으로 큰 나무를 배치합니다.
  for (let index = 0, x = 80; x < worldWidth; index++, x += 310) {
    const scale = index % 3 === 0 ? 1.22 : 0.95;
    const baseY = Math.min(screenHeight - 4, lowerStart + 40 + (index % 3) * 10);

    drawSmallTree(x, baseY, scale, index % 2 === 0);

    // 나무 옆 작은 눈더미
    pixelRect(x - 12, baseY + 1, 38, 4, "#cbded9");
    pixelRect(x - 5, baseY - 2, 23, 3, "#f7f6ee");
  }

  // 벤치는 울타리 대신 길가와 아래쪽 빈 공간에 배치합니다.
  for (let index = 0, x = 260; x < worldWidth; index++, x += 520) {
    drawBench(x, road + 73 + (index % 2) * 10, index % 2 === 0 ? 1 : 0.9);
  }

  // 몇몇 구간에 눈사람과 선물 소품
  for (let index = 0, x = 430; x < worldWidth; index++, x += 680) {
    const baseY = Math.min(screenHeight - 7, lowerStart + 61);

    drawSnowmanDecoration(x, baseY, index % 2 === 0 ? 0.9 : 0.78);

    if (index % 2 === 0) {
      drawGiftBox(x + 48, baseY - 18, "#b85048", 17);
      drawGiftBox(x + 69, baseY - 14, "#547e66", 14);
    }
  }

  // 길 가장자리의 작은 색 전구
  const colors = ["#d95a50", "#f2cf74", "#83b5c7", "#85ae80"];

  for (let x = 90; x < worldWidth; x += 100) {
    const lightIndex = Math.floor(x / 100) + Math.floor(time / 600);
    pixelRect(
      x,
      road + 51,
      4,
      4,
      colors[Math.abs(lightIndex) % colors.length]
    );
  }
}

/* ---------- 캐릭터 대화와 클릭 ---------- */

function drawSpeechBubble(villager, time) {
  const text = villager.bubble;
  const width = Math.min(190, ctx.measureText(text).width + 18);
  const x = clamp(villager.x - width / 2, 4, worldWidth - width - 4);
  const y = villager.y - 76;

  ctx.save();
  ctx.globalAlpha = Math.min(1, (villager.bubbleUntil - time) / 250);

  pixelRect(x, y, width, 22, "#fffdf4");
  pixelRect(x + width / 2 - 3, y + 22, 6, 4, "#fffdf4");

  ctx.fillStyle = "#40382f";
  ctx.font = "10px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + width / 2, y + 11);

  ctx.restore();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function greetVillager(villager) {
  const phrases = [
    "메리 크리스마스!",
    "눈이 참 예쁘게 내려요.",
    "따뜻한 코코아 마실래요?",
    "같이 마을을 산책할까요?",
    "여기는 정말 포근해요."
  ];

  villager.bubble = phrases[Math.floor(Math.random() * phrases.length)];
  villager.bubbleUntil = performance.now() + 2300;
  showToast(`${villager.character.name}: ${villager.bubble}`);
}

function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

function findVillagerAt(worldX, y) {
  return [...villagers].reverse().find(villager =>
    Math.abs(villager.x - worldX) < 24 &&
    y >= villager.y - 52 &&
    y <= villager.y + 8
  );
}

function handleMapClick(position) {
  const worldX = position.x + cameraX;
  const villager = findVillagerAt(worldX, position.y);

  if (villager) {
    greetVillager(villager);
    return;
  }

  if (
    position.y > pathY() - 35 &&
    position.y < screenHeight - 15 &&
    villagers.length > 0
  ) {
    const nearest = villagers.reduce((best, current) =>
      Math.abs(current.x - worldX) < Math.abs(best.x - worldX)
        ? current
        : best
    );

    nearest.targetX = clamp(worldX, 40, worldWidth - 40);
    nearest.targetY = clamp(
      position.y + 10,
      pathY() - 8,
      screenHeight - 30
    );
    nearest.nextWander = performance.now() + 5000;
    nearest.moving = true;

    destinationMarker = {
      x: nearest.targetX,
      y: nearest.targetY,
      time: performance.now()
    };

    showToast(`${nearest.character.name}가 그쪽으로 걸어가요.`);
  }
}

canvas.addEventListener("pointerdown", event => {
  if (event.pointerType === "mouse" && event.button !== 0) return;

  const position = pointerPosition(event);
  const villager = findVillagerAt(position.x + cameraX, position.y);

  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  cameraStartX = cameraX;
  dragMoved = false;

  if (villager) {
    draggedVillager = villager;
    villager.moving = false;
    canvas.classList.add("dragging-character");
  } else {
    draggingMap = true;
    canvas.classList.add("dragging-map");
  }

  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", event => {
  const position = pointerPosition(event);
  const distance = Math.hypot(
    event.clientX - pointerStartX,
    event.clientY - pointerStartY
  );

  if (distance > 4) dragMoved = true;

  if (draggedVillager) {
    draggedVillager.x = clamp(
      position.x + cameraX,
      30,
      worldWidth - 30
    );

    draggedVillager.y = clamp(
      position.y + 18,
      pathY() - 15,
      Math.min(screenHeight - 25, pathY() + 45)
    );

    draggedVillager.targetX = draggedVillager.x;
    draggedVillager.targetY = draggedVillager.y;
    draggedVillager.moving = false;
    return;
  }

  if (draggingMap && dragMoved) {
    cameraX = clamp(
      cameraStartX - (event.clientX - pointerStartX),
      0,
      worldWidth - screenWidth
    );
  }
});

canvas.addEventListener("pointerup", event => {
  const position = pointerPosition(event);

  if (draggedVillager) {
    const villager = draggedVillager;
    draggedVillager = null;
    canvas.classList.remove("dragging-character");

    if (dragMoved) {
      villager.targetX = villager.x;
      villager.targetY = villager.y;
      villager.nextWander = performance.now() + 4000;
      showToast(`${villager.character.name}를 그 위치로 옮겼어요.`);
    } else {
      greetVillager(villager);
    }

    return;
  }

  if (draggingMap) {
    draggingMap = false;
    canvas.classList.remove("dragging-map");

    if (!dragMoved) {
      handleMapClick(position);
    }
  }
});

canvas.addEventListener("pointercancel", () => {
  draggingMap = false;
  draggedVillager = null;
  canvas.classList.remove("dragging-map", "dragging-character");
});

canvas.addEventListener("wheel", event => {
  event.preventDefault();

  const amount = Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ? event.deltaX
    : event.deltaY;

  cameraX = clamp(
    cameraX + amount,
    0,
    Math.max(0, worldWidth - screenWidth)
  );
}, { passive: false });

window.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    keysDown.add(event.key);
  }
});

window.addEventListener("keyup", event => keysDown.delete(event.key));
window.addEventListener("blur", () => keysDown.clear());

document.getElementById("moveLeft")?.addEventListener("click", () => {
  cameraX = clamp(
    cameraX - screenWidth * 0.6,
    0,
    Math.max(0, worldWidth - screenWidth)
  );
});

document.getElementById("moveRight")?.addEventListener("click", () => {
  cameraX = clamp(
    cameraX + screenWidth * 0.6,
    0,
    Math.max(0, worldWidth - screenWidth)
  );
});

/* ---------- 모달, 선물 상자, 도감 ---------- */

function openModal(id) {
  document.getElementById(id)?.classList.add("open");
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("open");
}

document.getElementById("openSummon")?.addEventListener("click", () => {
  document.getElementById("summonResult")?.classList.remove("show");
  document.getElementById("giftVisual").style.display = "block";
  document.getElementById("summonStage").classList.remove("shaking", "burst");
  openModal("summonModal");
});

document.getElementById("openCodex")?.addEventListener("click", () => {
  renderCodex();
  openModal("codexModal");
});

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => closeModal(button.dataset.close));
});

document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
  backdrop.addEventListener("click", event => {
    if (event.target === backdrop) backdrop.classList.remove("open");
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal-backdrop").forEach(modal => {
      modal.classList.remove("open");
    });
  }
});

function chooseCharacter() {
  const roll = Math.random() * 100;
  let pool;

  if (roll < 10) {
    pool = CHARACTERS.filter(character => character.rarity === "특별한 친구");
  } else if (roll < 40) {
    pool = CHARACTERS.filter(character => character.rarity === "반짝이는 친구");
  } else {
    pool = CHARACTERS.filter(character => character.rarity === "포근한 친구");
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

function playSummonEffect() {
  const layer = document.getElementById("effectLayer");
  if (!layer) return;

  const flash = document.createElement("div");
  flash.className = "summon-flash";
  layer.appendChild(flash);
  setTimeout(() => flash.remove(), 700);

  const colors = ["#f5d57b", "#fff8df", "#e48b76", "#91bd91", "#8dbad1"];

  for (let index = 0; index < 34; index++) {
    const particle = document.createElement("i");
    const angle = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 180;

    particle.className = "summon-particle";
    particle.style.left = `${50 + (Math.random() - 0.5) * 14}vw`;
    particle.style.top = `${45 + (Math.random() - 0.5) * 14}vh`;
    particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty(
      "--particle-color",
      colors[index % colors.length]
    );

    layer.appendChild(particle);
    setTimeout(() => particle.remove(), 900);
  }
}

const summonButton = document.getElementById("summonButton");

summonButton?.addEventListener("click", async () => {
  if (coins < SUMMON_COST || summonButton.disabled) {
    showToast("눈송이가 조금 더 필요해요.");
    return;
  }

  summonButton.disabled = true;
  coins -= SUMMON_COST;
  updateUI();

  const stage = document.getElementById("summonStage");
  const gift = document.getElementById("giftVisual");

  stage.classList.add("shaking");
  gift.style.display = "block";

  await new Promise(resolve => setTimeout(resolve, 700));

  stage.classList.remove("shaking");
  stage.classList.add("burst");
  playSummonEffect();

  const character = chooseCharacter();
  const duplicate = (owned[character.id] || 0) > 0;

  owned[character.id] = (owned[character.id] || 0) + 1;

  if (duplicate) coins += DUPLICATE_REWARD;

  syncVillagers();

  gift.style.display = "none";

  document.getElementById("resultEmoji").textContent = character.emoji;
  document.getElementById("resultName").textContent = duplicate
    ? `${character.name}와 다시 만났어요!`
    : `${character.name}가 마을에 찾아왔어요!`;
  document.getElementById("resultRarity").textContent = duplicate
    ? `${character.rarity} · 눈송이 ${DUPLICATE_REWARD}개를 받았어요`
    : character.rarity;

  const result = document.getElementById("summonResult");
  result.classList.remove("show");
  void result.offsetWidth;
  result.classList.add("show");

  updateUI();
});

function renderCodex() {
  const list = document.getElementById("codexList");
  if (!list) return;

  list.innerHTML = CHARACTERS.map(character => {
    const count = owned[character.id] || 0;

    return `
      <div class="codex-item ${count ? "" : "locked"}">
        <span class="emoji">${count ? character.emoji : "❔"}</span>
        <span>
          ${count ? character.name : "아직 만나지 못한 친구"}
          <small>${count
            ? `${character.rarity} · 만난 횟수 ${count}`
            : "선물 상자에서 만나요"}</small>
        </span>
      </div>
    `;
  }).join("");
}

function updateUI() {
  const coinsElement = document.getElementById("coins");
  if (coinsElement) coinsElement.textContent = formatNumber(coins);

  const discovered = CHARACTERS.filter(
    character => (owned[character.id] || 0) > 0
  ).length;

  const countElement = document.getElementById("collectionCount");
  if (countElement) {
    countElement.textContent = `${discovered} / ${CHARACTERS.length} 발견`;
  }

  const questText = document.getElementById("questText");
  const questBar = document.getElementById("questBar");

  if (discovered >= CHARACTERS.length) {
    if (questText) questText.textContent = "모든 친구가 마을에 모였어요!";
    if (questBar) questBar.style.width = "100%";
  } else {
    if (questText) {
      questText.textContent = `친구 ${discovered}/${CHARACTERS.length}명 발견하기`;
    }
    if (questBar) {
      questBar.style.width = `${discovered / CHARACTERS.length * 100}%`;
    }
  }

  const collection = document.getElementById("collection");

  if (collection) {
    collection.innerHTML = CHARACTERS.map(character => {
      const count = owned[character.id] || 0;

      return `
        <button class="resident-card ${count ? "" : "locked"}"
          data-character="${character.id}"
          title="${count ? `${character.name} 찾기` : "아직 만나지 못한 친구"}">
          <span>${count ? character.emoji : "?"}</span>
          ${count > 1 ? `<span class="count">×${count}</span>` : ""}
        </button>
      `;
    }).join("");
  }

  if (summonButton) summonButton.disabled = coins < SUMMON_COST;

  saveGame();
}

document.getElementById("collection")?.addEventListener("click", event => {
  const button = event.target.closest("[data-character]");
  if (!button) return;

  const villager = villagerById.get(button.dataset.character);

  if (!villager) {
    showToast("아직 만나지 못한 친구예요.");
    return;
  }

  cameraX = clamp(
    villager.x - screenWidth / 2,
    0,
    Math.max(0, worldWidth - screenWidth)
  );

  greetVillager(villager);
});

/* ---------- 시계, 눈송이 획득, 렌더링 ---------- */

function updateClock() {
  const clock = document.getElementById("clock");
  if (!clock) return;

  clock.textContent = new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function earnSnowflakes() {
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastIncomeTime) / 1000);

  if (elapsedSeconds < 1) return;

  // 경과한 실제 시간 기준으로 초당 눈송이 1개 지급
  coins += elapsedSeconds;
  lastIncomeTime += elapsedSeconds * 1000;

  updateUI();
}

function drawDestination(time) {
  if (!destinationMarker) return;

  const age = time - destinationMarker.time;

  if (age > 900) {
    destinationMarker = null;
    return;
  }

  ctx.save();
  ctx.globalAlpha = 1 - age / 900;
  ctx.strokeStyle = "#fff7dc";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(
    destinationMarker.x,
    destinationMarker.y,
    8 + age / 50,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  ctx.restore();
}

function drawScene(time, delta) {
  ctx.clearRect(0, 0, screenWidth, screenHeight);

  ctx.save();
  ctx.translate(-cameraX, 0);

  drawPixelSky(time, delta);
  drawMountains();
  drawGround();
  drawVillage(time);
  drawLowerDecorations(time);
  drawCenterTree(time);
  drawDestination(time);

  [...villagers]
    .sort((a, b) => a.y - b.y)
    .forEach(villager => drawVillager(villager, time));

  drawSnow(delta, time);

  ctx.restore();
}

function frame(time) {
  const delta = lastFrameTime
    ? Math.min(50, time - lastFrameTime)
    : 16;

  lastFrameTime = time;

  if (keysDown.has("ArrowLeft")) {
    cameraX = clamp(
      cameraX - 6,
      0,
      Math.max(0, worldWidth - screenWidth)
    );
  }

  if (keysDown.has("ArrowRight")) {
    cameraX = clamp(
      cameraX + 6,
      0,
      Math.max(0, worldWidth - screenWidth)
    );
  }

  updateVillagers(delta, time);
  drawScene(time, delta);

  requestAnimationFrame(frame);
}

setInterval(earnSnowflakes, 1000);
setInterval(updateClock, 15000);
setInterval(saveGame, 10000);

window.addEventListener("beforeunload", saveGame);

updateClock();
updateUI();
requestAnimationFrame(frame);