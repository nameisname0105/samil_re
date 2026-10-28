"use strict";

const CHARACTER_NAMES = [
  "겨울 친구 01", "겨울 친구 02", "겨울 친구 03", "겨울 친구 04",
  "겨울 친구 05", "겨울 친구 06", "겨울 친구 07", "겨울 친구 08",
  "겨울 친구 09", "겨울 친구 10", "겨울 친구 11", "겨울 친구 12",
  "겨울 친구 13", "겨울 친구 14", "겨울 친구 15", "겨울 친구 16",
  "겨울 친구 17", "겨울 친구 18", "겨울 친구 19", "겨울 친구 20",
  "겨울 친구 21", "겨울 친구 22", "겨울 친구 23", "겨울 친구 24",
  "겨울 친구 25", "겨울 친구 26", "겨울 친구 27", "겨울 친구 28",
  "겨울 친구 29", "겨울 친구 30", "겨울 친구 31", "겨울 친구 32",
  "겨울 친구 33", "겨울 친구 34", "겨울 친구 35", "겨울 친구 36",
  "겨울 친구 37", "겨울 친구 38", "겨울 친구 39", "겨울 친구 40",
  "겨울 친구 41", "겨울 친구 42", "겨울 친구 43", "겨울 친구 44",
  "겨울 친구 45", "겨울 친구 46", "겨울 친구 47", "겨울 친구 48",
  "겨울 친구 49", "겨울 친구 50", "겨울 친구 51", "겨울 친구 52",
  "겨울 친구 53", "겨울 친구 54", "겨울 친구 55", "겨울 친구 56",
  "겨울 친구 57", "겨울 친구 58", "겨울 친구 59", "겨울 친구 60",
  "겨울 친구 61", "겨울 친구 62", "겨울 친구 63", "겨울 친구 64"
];

const LEGACY_CHARACTER_IDS = [
  "snowman", "penguin", "bear", "fox", "cat", "cookie", "santa", "reindeer"
];

const CHARACTERS = CHARACTER_NAMES.map((name, index) => {
  const number = String(index + 1).padStart(2, "0");
  const id = `character_${number}`;

  return {
    id,
    name,
    rarity: index < 39
      ? "포근한 친구"
      : index < 58
        ? "반짝이는 친구"
        : "특별한 친구",
    images: {
      idle: `characters_split/characters/${id}.png`,
      walk: `animated_characters_gif/animated_gifs/${id}.gif`
    }
  };
});

const SAVE_KEY = "cozy-snow-village-final";
const SUMMON_COST = 500;
const DUPLICATE_REWARD = 100;
const SANTA_INTERVAL = 10 * 60 * 1000;
const SANTA_DURATION = 25 * 1000;
const VILLAGER_CONVERSATIONS = [
  ["저기 새 가게 봤어?", "응, 초콜릿 냄새가 여기까지 나!"],
  ["트리 불빛이 하나씩 켜진다!", "진짜네. 밤에 다시 보러 오자."],
  ["손 시렵지 않아?", "조금. 장갑 안에 손난로 넣어뒀어."],
  ["선물로 뭐 받고 싶어?", "다 같이 오래 놀 수 있으면 좋겠어!"],
  ["방금 종소리 들었어?", "응, 시계탑에서 울렸나 봐."],
  ["눈 밟을 때 뽀드득 소리 난다.", "우리 발자국 나란히 찍어 볼까?"],
  ["코코아 한 잔 마실래?", "좋아! 마시멜로도 올려 달라고 하자."],
  ["오늘 마을이 더 반짝이는 것 같아.", "우리가 전구를 달아서 그런가 봐!"],
  ["집까지 같이 갈래?", "응, 큰길 따라 천천히 가자."],
  ["이 선물 상자 누구 거지?", "트리 옆에 있었어. 주인을 찾아 주자."],
  ["목도리 색 정말 잘 어울린다.", "고마워! 네 모자랑 맞춰 봤어."],
  ["눈사람 코가 당근이 아니네?", "아까 다람쥐가 가져간 것 같아!"],
  ["아까 만든 눈 천사 봤어?", "응! 네가 날개를 엄청 크게 만들었더라."],
  ["상점가 구경 다 했어?", "아직 장난감 가게는 못 가 봤어. 같이 갈래?"],
  ["오늘 뭐가 제일 좋았어?", "너랑 마을 구경한 거!"]
];

const canvas = document.getElementById("world");
if (!canvas) throw new Error("index.html에서 id가 world인 canvas를 찾을 수 없습니다.");

const foregroundCanvas = document.getElementById("worldForeground");
if (!foregroundCanvas) throw new Error("index.html에서 id가 worldForeground인 canvas를 찾을 수 없습니다.");

const mainContext = canvas.getContext("2d");
if (!mainContext) throw new Error("브라우저가 Canvas를 지원하지 않습니다.");
const foregroundContext = foregroundCanvas.getContext("2d");
if (!foregroundContext) throw new Error("브라우저가 Canvas를 지원하지 않습니다.");
let ctx = mainContext;

let screenWidth = window.innerWidth;
let screenHeight = window.innerHeight;
let worldWidth = Math.max(2500, screenWidth * 2.4);
let worldHeight = Math.max(2000, screenHeight * 2.4);
let cameraX = 0;
let cameraY = 0;
let lastFrameTime = 0;
let lastIncomeTime = Date.now();
let toastTimer = null;

let draggingMap = false;
let draggedVillager = null;
let dragMoved = false;
let pointerStartX = 0;
let pointerStartY = 0;
let cameraStartX = 0;
let cameraStartY = 0;
let destinationMarker = null;

const keysDown = new Set();
const imageCache = new Map();
const walkingSprites = new Map();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function groundY() {
  return worldHeight * 0.25;
}

function pathY() {
  return groundY() + Math.min(88, screenHeight * 0.14);
}

function villageRoadsY() {
  const roads = [pathY()];
  for (let y = groundY() + 410; y < worldHeight - 150; y += 410) {
    roads.push(y);
  }
  return roads;
}

function villageRoadsX() {
  return Array.from({ length: 5 }, (_, index) =>
    worldWidth * (index + 1) / 6
  );
}

function centerTreeBaseY() {
  return worldHeight / 2 + 105;
}

function isShoppingStreet(row, column) {
  return (row === 0 && [1, 4].includes(column)) ||
    (row === 1 && [0, 3].includes(column)) ||
    (row === 2 && [2, 5].includes(column));
}

function villageRowBounds(roadsY, row) {
  const top = roadsY[row] + (row === 0 ? 82 : 68);
  const bottom = row + 1 < roadsY.length
    ? roadsY[row + 1] - 32
    : worldHeight - 34;
  return { top, bottom };
}

function villageRowBaseY(roadsY, row) {
  const { top, bottom } = villageRowBounds(roadsY, row);
  return top + (bottom - top) * 0.58;
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
  ? { ...savedGame.owned }
  : {};

LEGACY_CHARACTER_IDS.forEach((legacyId, index) => {
  const count = Number(owned[legacyId]);
  if (Number.isFinite(count) && count > 0) {
    const newId = CHARACTERS[index].id;
    owned[newId] = (Number(owned[newId]) || 0) + Math.floor(count);
  }
  delete owned[legacyId];
});

for (const character of CHARACTERS) {
  const count = Number(owned[character.id]);
  owned[character.id] = Number.isFinite(count) && count > 0
    ? Math.floor(count)
    : 0;
}

if (Object.values(owned).every(count => count === 0)) {
  owned[CHARACTERS[0].id] = 1;
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
  worldWidth = Math.max(2500, screenWidth * 2.4);
  worldHeight = Math.max(2000, screenHeight * 2.4);

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

  [canvas, foregroundCanvas].forEach(target => {
    target.width = Math.floor(screenWidth * pixelRatio);
    target.height = Math.floor(screenHeight * pixelRatio);
    target.style.width = `${screenWidth}px`;
    target.style.height = `${screenHeight}px`;
  });

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingEnabled = false;
  foregroundContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  foregroundContext.imageSmoothingEnabled = false;

  cameraX = clamp(cameraX, 0, Math.max(0, worldWidth - screenWidth));
  cameraY = clamp(cameraY, 0, Math.max(0, worldHeight - screenHeight));
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
cameraX = Math.max(0, worldWidth / 2 - screenWidth / 2);
cameraY = clamp(
  centerTreeBaseY() - 105.5 - screenHeight / 2,
  0,
  Math.max(0, worldHeight - screenHeight)
);

/* ---------- 캐릭터 ---------- */

const villagers = [];
const villagerById = new Map();

function createVillager(character, index) {
  const roads = villageRoadsY();
  const startX = 70 + (index % 16) * (worldWidth - 140) / 15;
  const startY = roads[Math.floor(index / 16) % roads.length] + 25;
  getCharacterImage(character, false);
  getCharacterImage(character, true);

  return {
    character,
    x: clamp(startX, 60, worldWidth - 60),
    y: startY,
    targetX: clamp(startX, 60, worldWidth - 60),
    targetY: startY,
    direction: index % 2 === 0 ? 1 : -1,
    speed: 34 + Math.random() * 18,
    moving: false,
    nextWander: performance.now() + 2500 + Math.random() * 4000,
    bubble: "",
    bubbleUntil: 0,
    bubbleOffsetX: 0,
    nextConversation: performance.now() + 10000 + Math.random() * 10000
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

  for (const villager of villagers) {
    if (villager === draggedVillager) continue;

    if (!villager.moving && time > villager.nextWander) {
      villager.targetX = clamp(
        villager.x + (Math.random() - 0.5) * 380,
        50,
        worldWidth - 50
      );

      villager.targetY = clamp(
        villager.y + (Math.random() - 0.5) * 640,
        groundY() + 40,
        worldHeight - 50
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

  for (let first = 0; first < villagers.length; first++) {
    const villager = villagers[first];
    if (villager === draggedVillager || time < villager.nextConversation) continue;

    for (let second = first + 1; second < villagers.length; second++) {
      const neighbor = villagers[second];
      if (neighbor === draggedVillager || time < neighbor.nextConversation) continue;
      if (Math.hypot(villager.x - neighbor.x, villager.y - neighbor.y) > 54) continue;

      const [firstLine, secondLine] =
        VILLAGER_CONVERSATIONS[
          Math.floor(Math.random() * VILLAGER_CONVERSATIONS.length)
        ];
      const conversationDuration = 2200;
      const nextConversation = time + 18000 + Math.random() * 12000;

      villager.bubble = firstLine;
      villager.bubbleUntil = time + conversationDuration;
      villager.bubbleOffsetX = -34;
      villager.nextConversation = nextConversation;
      neighbor.bubble = secondLine;
      neighbor.bubbleUntil = time + conversationDuration;
      neighbor.bubbleOffsetX = 34;
      neighbor.nextConversation = nextConversation;
      break;
    }
  }
}

function drawFallbackCharacter(villager, time) {
  const x = Math.round(villager.x);
  const foot = Math.round(villager.y);
  const step = villager.moving ? Math.round(Math.sin(time / 75) * 2) : 0;

  pixelRect(x - 10, foot + 1, 20, 3, "rgba(45,54,48,.2)");
  pixelRect(x - 7, foot - 19 + step, 14, 14, "#936a4d");
  pixelRect(x - 6, foot - 28 + step, 12, 10, "#936a4d");
  pixelRect(x - 4, foot - 14 + step, 8, 6, "#dbc39d");
  pixelRect(x - 4, foot - 24 + step, 2, 2, "#493e35");
  pixelRect(x + 2, foot - 24 + step, 2, 2, "#493e35");
  pixelRect(x - 7, foot - 20 + step, 14, 3, "#b66b50");

  const legOffset = villager.moving && Math.floor(time / 100) % 2 ? 2 : 0;
  pixelRect(x - 5 - legOffset, foot - 5, 4, 5, "#493e35");
  pixelRect(x + 1 + legOffset, foot - 5, 4, 5, "#493e35");
}

function getCharacterImage(character, moving) {
  const imageType = moving ? "walk" : "idle";
  const imagePath = character.images?.[imageType];

  if (!imagePath) return null;

  let image = imageCache.get(imagePath);

  if (!image) {
    image = new Image();
    image.src = imagePath;
    imageCache.set(imagePath, image);
  }

  return image.complete && image.naturalWidth > 0 ? image : null;
}

function drawVillager(villager, time) {
  const idleImage = getCharacterImage(villager.character, false);
  const image = villager.moving
    ? getCharacterImage(villager.character, true)
    : idleImage;

  if (villager.moving) {
    showWalkingSprite(villager);
    pixelRect(villager.x - 12, villager.y + 1, 24, 3, "rgba(45,54,48,.2)");
  } else if (image) {
    hideWalkingSprite(villager);
    pixelRect(villager.x - 12, villager.y + 1, 24, 3, "rgba(45,54,48,.2)");
    ctx.save();
    ctx.translate(villager.x, 0);
    ctx.scale(getCharacterDirection(villager), 1);
    ctx.drawImage(image, -24, villager.y - 48, 48, 48);
    ctx.restore();
  } else {
    hideWalkingSprite(villager);
    drawFallbackCharacter(villager, time);
  }

  ctx.font = "12px Jua, 'Gowun Dodum', sans-serif";
  ctx.shadowColor = "rgba(57, 48, 37, .18)";
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const labelWidth = ctx.measureText(villager.character.name).width + 10;
  const labelY = villager.y - (idleImage ? 61 : 49);
  pixelRect(
    villager.x - labelWidth / 2,
    labelY,
    labelWidth,
    14,
    "rgba(250,247,237,.92)"
  );

  ctx.fillStyle = "#443c32";
  ctx.fillText(villager.character.name, villager.x, labelY + 11);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  if (villager.bubble && time < villager.bubbleUntil) {
    drawSpeechBubble(villager, time);
  }
}

function showWalkingSprite(villager) {
  let sprite = walkingSprites.get(villager);

  if (!sprite) {
    const layer = document.getElementById("characterAnimations");
    if (!layer) throw new Error("걷기 애니메이션 레이어가 없습니다.");

    sprite = document.createElement("img");
    sprite.className = "walking-sprite";
    sprite.src = villager.character.images.walk;
    sprite.alt = "";
    sprite.draggable = false;
    layer.appendChild(sprite);
    walkingSprites.set(villager, sprite);
  }

  sprite.style.left = `${villager.x - cameraX - 24}px`;
  sprite.style.top = `${villager.y - cameraY - 48}px`;
  sprite.style.transform = `scaleX(${getCharacterDirection(villager)})`;
}

function getCharacterDirection(villager) {
  return villager.character.id === "character_40"
    ? -villager.direction
    : villager.direction;
}

function hideWalkingSprite(villager) {
  const sprite = walkingSprites.get(villager);
  if (!sprite) return;

  sprite.remove();
  walkingSprites.delete(villager);
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

function layoutNoise(index, salt = 0) {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
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
  const startX = worldWidth * 0.5;
  const startY = groundY() - screenHeight * 0.4;

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
  const x = worldWidth * 0.5;
  const y = groundY() - screenHeight * 0.36;
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

    drawPixelCloud({
      ...cloud,
      y: groundY() - screenHeight * 0.43 + cloud.y
    });
  }
}

const snowflakes = Array.from({ length: 150 }, () => ({
  x: Math.random() * screenWidth,
  y: Math.random() * screenHeight,
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
      flake.x = Math.random() * screenWidth;
    }

    if (flake.x < -8) flake.x = screenWidth + 8;
    if (flake.x > screenWidth + 8) flake.x = -8;

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
  drawSantaSleigh();
}

function drawSantaSleigh() {
  const elapsed = Date.now() % SANTA_INTERVAL;
  if (elapsed >= SANTA_DURATION) return;

  const progress = elapsed / SANTA_DURATION;
  const x = cameraX - 120 + progress * (screenWidth + 240);
  const y = groundY() - screenHeight * 0.29 + Math.sin(progress * Math.PI * 4) * 5;

  for (const offset of [-70, -39]) {
    pixelRect(x + offset, y + 9, 21, 7, "#8d6041");
    pixelRect(x + offset + 13, y + 2, 8, 8, "#8d6041");
    pixelRect(x + offset + 16, y, 3, 5, "#d5b66b");
    pixelRect(x + offset + 4, y + 15, 3, 7, "#68483e");
    pixelRect(x + offset + 14, y + 15, 3, 7, "#68483e");
    pixelRect(x + offset + 17, y - 5, 2, 6, "#d5b66b");
    pixelRect(x + offset + 22, y - 5, 2, 6, "#d5b66b");
  }

  pixelRect(x - 5, y + 14, 46, 5, "#9e4541");
  pixelRect(x + 2, y + 8, 35, 7, "#c8574b");
  pixelRect(x + 7, y + 2, 18, 12, "#b74740");
  pixelRect(x + 14, y - 5, 13, 9, "#f2dfc2");
  pixelRect(x + 10, y - 10, 17, 5, "#b74740");
  pixelRect(x + 22, y - 7, 5, 5, "#f2dfc2");
  pixelRect(x - 13, y + 20, 58, 3, "#e1bd6e");
}

/* ---------- 도트 산맥 ---------- */

function drawPixelMountain(centerX, baseY, width, height, color, snowColor, variant) {
  const peaks = [
    [-0.5, 0], [-0.4, 0.2], [-0.29, 0.46], [-0.18, 0.35],
    [-0.07, 0.65], [0.03, 1], [0.12, 0.77], [0.23, 0.52],
    [0.33, 0.59], [0.43, 0.24], [0.5, 0]
  ];
  const top = baseY - height;

  ctx.beginPath();
  ctx.moveTo(centerX - width / 2, baseY);
  peaks.forEach(([offset, heightFactor], index) => {
    const adjustedHeight = heightFactor
      * (0.94 + Math.sin(index * 2.4 + variant) * 0.06);
    ctx.lineTo(centerX + width * offset, baseY - height * adjustedHeight);
  });
  ctx.lineTo(centerX + width / 2, baseY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();

  const snowCap = [
    [-0.18, 0.35], [-0.07, 0.65], [0.03, 1],
    [0.12, 0.77], [0.23, 0.52], [0.16, 0.58],
    [0.11, 0.56], [0.06, 0.72], [0.01, 0.49],
    [-0.04, 0.58], [-0.1, 0.38]
  ];

  ctx.beginPath();
  snowCap.forEach(([offset, heightFactor], index) => {
    const x = centerX + width * offset;
    const y = baseY - height * heightFactor;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = snowColor;
  ctx.fill();

  for (let index = 0; index < 3; index++) {
    const x = centerX - width * 0.3 + index * width * 0.25;
    const y = top + height * (0.58 + layoutNoise(index, variant) * 0.12);
    pixelRect(x, y, width * 0.1, 4, "rgba(43,70,83,.16)");
  }
}

function drawMountains() {
  const baseY = groundY() + 28;
  const sky = getRealtimeSky();
  const farColor = sky.daylight > 0.5 ? "#8aaab0" : "#49667d";
  const nearColor = sky.daylight > 0.5 ? "#75969f" : "#405c74";

  for (let index = -1; index < Math.ceil(worldWidth / 430) + 1; index++) {
    const x = index * 430;
    const variation = layoutNoise(index + 1, 21);

    drawPixelMountain(
      x + 160 + variation * 100,
      baseY,
      300 + variation * 120,
      122 + layoutNoise(index + 1, 22) * 75,
      farColor,
      "#e2ece8",
      variation * 5
    );

    drawPixelMountain(
      x + 365 + layoutNoise(index + 1, 23) * 90,
      baseY + 13,
      210 + layoutNoise(index + 1, 24) * 120,
      86 + layoutNoise(index + 1, 25) * 60,
      nearColor,
      "#e8efeb",
      variation * 3 + 1
    );
  }
}

/* ---------- 눈밭과 길 ---------- */

function drawGround() {
  const horizon = groundY();

  pixelRect(0, horizon, worldWidth, worldHeight - horizon, "#dce9e4");

  for (let row = 0, y = horizon + 38; y < worldHeight; row++, y += 96) {
    for (let column = 0, x = 20; x < worldWidth; column++, x += 96) {
      const seed = row * 37 + column * 19;
      const offsetX = layoutNoise(seed, 26) * 25;
      const offsetY = layoutNoise(seed, 27) * 35;
      pixelRect(x + offsetX, y + offsetY, 20 + layoutNoise(seed, 28) * 18, 3, "#cbded9");

      if (layoutNoise(seed, 29) > 0.48) {
        pixelRect(x + 15 + offsetX, y + 10 + offsetY, 13, 2, "#f7f6ee");
      }
    }
  }

  const horizontalRoads = villageRoadsY();
  const centerX = worldWidth / 2;
  const treeBaseY = centerTreeBaseY();
  const plazaCenterY = treeBaseY - 70;

  ctx.beginPath();
  ctx.arc(centerX, plazaCenterY, 122, 0, Math.PI * 2);
  ctx.fillStyle = "#c9cbbb";
  ctx.fill();

  const treeRoadIndex = horizontalRoads.reduce((closest, roadY, index) =>
    Math.abs(roadY - treeBaseY) < Math.abs(horizontalRoads[closest] - treeBaseY)
      ? index
      : closest,
  0);
  horizontalRoads.forEach((roadY, index) => {
    const segments = index === treeRoadIndex
      ? [[0, centerX - 155], [centerX + 155, worldWidth]]
      : [[0, worldWidth]];
    segments.forEach(([start, end]) => {
      drawVillagePath(
        start, roadY, end, roadY,
        start + (end - start) / 3, roadY,
        start + (end - start) * 2 / 3, roadY
      );
    });

    if (index === treeRoadIndex) {
      drawVillagePath(
        centerX - 155, roadY, centerX - 116, plazaCenterY,
        centerX - 178, roadY + 18, centerX - 144, plazaCenterY
      );
      drawVillagePath(
        centerX + 155, roadY, centerX + 116, plazaCenterY,
        centerX + 178, roadY + 18, centerX + 144, plazaCenterY
      );
    }
  });

  const roadsX = villageRoadsX();
  const centerRoadIndex = Math.floor(roadsX.length / 2);
  roadsX.forEach((roadX, index) => {
    const segments = index === centerRoadIndex
      ? []
      : [[horizon, worldHeight]];

    segments.forEach(([start, end]) => {
      drawVillagePath(
        roadX, start, roadX, end,
        roadX, start + (end - start) / 3,
        roadX, start + (end - start) * 2 / 3
      );
    });
  });

  for (let row = 0; row < horizontalRoads.length; row++) {
    const { top, bottom } = villageRowBounds(horizontalRoads, row);
    if (bottom - top < 100) continue;

    for (let column = 0; column <= roadsX.length; column++) {
      const left = column === 0 ? 28 : roadsX[column - 1] + 22;
      const right = column === roadsX.length ? worldWidth - 28 : roadsX[column] - 22;
      const seed = row * 17 + column;
      const centerX = (left + right) / 2;
      const baseY = villageRowBaseY(horizontalRoads, row);
      const firstChurch = row === 0 && column === 0;
      const secondChurch = row === 1 && column === roadsX.length;
      const clockTower = row === 0 && column === 2;
      const shoppingStreet = isShoppingStreet(row, column);
      const hasHouse = layoutNoise(seed, 44) > 0.13;
      if (!hasHouse && !firstChurch && !secondChurch && !clockTower && !shoppingStreet) continue;

      const houseX = centerX - 40 + (layoutNoise(seed, 43) - 0.5) * 90;
      const scale = 1.5 + layoutNoise(seed, 45) * 0.22;
      const entryX = firstChurch || secondChurch
        ? centerX - 62
        : clockTower
          ? centerX + 50
          : shoppingStreet
            ? centerX - 40
            : houseX + 39 * scale;
      const entryY = clockTower ? baseY + 78 : baseY;
      const targetY = row + 1 < horizontalRoads.length
        ? horizontalRoads[row + 1] - 12
        : worldHeight - 18;
      drawPathCurve(entryX, entryY, entryX, targetY, 0);
    }
  }

  ctx.beginPath();
  ctx.arc(centerX, plazaCenterY, 122, 0, Math.PI * 2);
  ctx.strokeStyle = "#a9a58f";
  ctx.lineWidth = 5;
  ctx.stroke();

  for (let index = 0; index < 20; index++) {
    const angle = index * Math.PI * 2 / 20;
    const radius = 97 + (index % 3) * 5;
    pixelRect(
      centerX + Math.cos(angle) * radius - 4,
      treeBaseY - 70 + Math.sin(angle) * radius - 2,
      8,
      3,
      "#e3dfd0"
    );
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
  const style = index % 3;
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
    const width = style === 1
      ? 86 * s
      : style === 2
        ? 22 * s + progress * 66 * s
        : 18 * s + progress * 72 * s;
    const y = style === 1
      ? roofTop + row * 5 * s
      : roofTop + row * 5 * s - (style === 2 ? Math.sin(progress * Math.PI) * 8 * s : 0);

    pixelRect(
      x + 40 * s - width / 2,
      y,
      width,
      6 * s,
      style === 1
        ? (row < 2 ? "#6d5149" : "#5c453f")
        : (row < 2 ? "#80564a" : "#704a42")
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

  if (style === 1) {
    pixelRect(x - 20 * s, baseY - 29 * s, 25 * s, 29 * s, wallColor);
    pixelRect(x - 24 * s, baseY - 33 * s, 34 * s, 5 * s, "#765047");
    pixelRect(x - 16 * s, baseY - 23 * s, 12 * s, 12 * s, windowColor);
  } else if (style === 2) {
    pixelRect(x + 29 * s, roofTop + 12 * s, 22 * s, 16 * s, wallColor);
    pixelRect(x + 25 * s, roofTop + 9 * s, 30 * s, 5 * s, "#80564a");
    pixelRect(x + 35 * s, roofTop + 17 * s, 10 * s, 9 * s, windowColor);
    pixelRect(x + 30 * s, baseY, 24 * s, 5 * s, "#76513f");
  }

  // 문
  pixelRect(x + 32 * s, baseY - 28 * s, 15 * s, 28 * s, "#604337");
  pixelRect(x + 44 * s, baseY - 15 * s, 2 * s, 2 * s, "#f2ca6c");
  drawWreath(x + 39 * s, baseY - 20 * s, s * 0.72);

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

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + length / 2, y + Math.min(7, length * 0.08), x + length, y);
  ctx.strokeStyle = "#514b43";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  for (let index = 0; index < 8; index++) {
    const progress = index / 7;
    const lightX = x + length * progress;
    const lightY = y + Math.min(14, length * 0.16) * progress * (1 - progress);
    const colorIndex = (index + Math.floor(time / 450)) % colors.length;
    pixelRect(lightX - 2, lightY + 2, 4, 5, colors[colorIndex]);
  }
}

function drawWreath(x, y, scale = 1) {
  ctx.fillStyle = "#386d4d";
  ctx.beginPath();
  ctx.arc(x, y, 5 * scale, 0, Math.PI * 2);
  ctx.fill();
  pixelRect(x - 2 * scale, y - 2 * scale, 4 * scale, 4 * scale, "#a9423d");
  pixelRect(x - 6 * scale, y - 5 * scale, 3 * scale, 3 * scale, "#d76556");
}

function drawLamp(x, baseY) {
  pixelRect(x, baseY - 42, 4, 43, "#70513e");
  pixelRect(x - 6, baseY - 50, 16, 13, "#76533d");
  pixelRect(x - 3, baseY - 47, 10, 8, "#ffe59b");
  pixelRect(x - 9, baseY - 55, 22, 4, "#68503e");
  pixelRect(x - 8, baseY - 34, 19, 3, "rgba(255,220,140,.17)");
}

function drawPathCurve(startX, startY, endX, endY, bend) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(
    startX + bend, startY + (endY - startY) * 0.35,
    endX - bend, endY - (endY - startY) * 0.35,
    endX, endY
  );
  ctx.strokeStyle = "#a9a58f";
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = "#d8d2bf";
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.restore();
}

function drawVillagePath(startX, startY, endX, endY, control1X, control1Y, control2X, control2Y) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(control1X, control1Y, control2X, control2Y, endX, endY);
  ctx.strokeStyle = "#a9a58f";
  ctx.lineWidth = 16;
  ctx.stroke();
  ctx.strokeStyle = "#d8d2bf";
  ctx.lineWidth = 11;
  ctx.stroke();
  ctx.restore();
}

function drawClockTower(centerX, baseY, scale = 1.2) {
  ctx.save();
  ctx.translate(centerX, baseY);
  ctx.scale(scale, scale);
  centerX = 0;
  baseY = 0;

  pixelRect(centerX - 72, baseY + 2, 144, 7, "rgba(51,67,57,.2)");
  pixelRect(centerX - 64, baseY, 128, 6, "rgba(51,67,57,.2)");
  pixelRect(centerX - 44, baseY - 112, 88, 112, "#b88e69");
  pixelRect(centerX - 35, baseY - 106, 5, 96, "#d0aa7c");
  pixelRect(centerX + 30, baseY - 106, 5, 96, "#9d704f");
  pixelRect(centerX - 50, baseY - 118, 100, 10, "#805848");
  pixelRect(centerX - 36, baseY - 160, 72, 48, "#a97858");
  pixelRect(centerX - 42, baseY - 166, 84, 8, "#714d42");
  pixelRect(centerX - 34, baseY - 218, 68, 54, "#835545");
  pixelRect(centerX - 42, baseY - 226, 84, 10, "#70483e");

  for (let row = 0; row < 7; row++) {
    const width = 24 + row * 11;
    pixelRect(centerX - width / 2, baseY - 258 + row * 5, width, 7, "#65473e");
  }

  ctx.fillStyle = "#f3e7bd";
  ctx.beginPath();
  ctx.arc(centerX, baseY - 192, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#60483d";
  ctx.lineWidth = 4;
  ctx.stroke();
  pixelRect(centerX - 2, baseY - 205, 4, 15, "#60483d");
  pixelRect(centerX - 2, baseY - 192, 12, 4, "#60483d");
  pixelRect(centerX - 30, baseY - 194, 5, 5, "#a94f47");
  pixelRect(centerX + 25, baseY - 194, 5, 5, "#a94f47");
  pixelRect(centerX - 28, baseY - 86, 15, 23, "#ffe8a6");
  pixelRect(centerX + 13, baseY - 86, 15, 23, "#ffe8a6");
  pixelRect(centerX - 34, baseY - 91, 27, 4, "#805848");
  pixelRect(centerX + 7, baseY - 91, 27, 4, "#805848");
  pixelRect(centerX - 34, baseY - 78, 4, 17, "#875d49");
  pixelRect(centerX + 30, baseY - 78, 4, 17, "#875d49");
  pixelRect(centerX - 9, baseY - 45, 18, 45, "#5c4038");
  pixelRect(centerX - 7, baseY - 35, 3, 25, "#846149");
  pixelRect(centerX + 4, baseY - 35, 3, 25, "#846149");
  pixelRect(centerX - 3, baseY - 282, 6, 24, "#d5b66b");
  pixelRect(centerX - 15, baseY - 274, 30, 5, "#d5b66b");

  for (let row = 0; row < 5; row++) {
    const y = baseY - 105 + row * 18;
    pixelRect(centerX - 41, y, 7, 3, "#a77b5c");
    pixelRect(centerX + 34, y + 8, 7, 3, "#a77b5c");
  }

  ctx.restore();
}

function drawChurch(centerX, baseY, scale, wallColor, time) {
  const s = scale;
  pixelRect(centerX - 60 * s, baseY, 120 * s, 5 * s, "rgba(51,67,57,.2)");
  pixelRect(centerX - 54 * s, baseY - 74 * s, 108 * s, 74 * s, wallColor);
  pixelRect(centerX - 62 * s, baseY - 82 * s, 124 * s, 10 * s, "#714c43");
  pixelRect(centerX - 20 * s, baseY - 111 * s, 40 * s, 38 * s, "#80584a");
  pixelRect(centerX - 25 * s, baseY - 116 * s, 50 * s, 7 * s, "#62483f");
  pixelRect(centerX - 18 * s, baseY - 154 * s, 36 * s, 40 * s, "#7b5145");
  pixelRect(centerX - 25 * s, baseY - 161 * s, 50 * s, 8 * s, "#62483f");

  ctx.fillStyle = "#68483e";
  ctx.beginPath();
  ctx.moveTo(centerX - 64 * s, baseY - 78 * s);
  ctx.lineTo(centerX, baseY - 125 * s);
  ctx.lineTo(centerX + 64 * s, baseY - 78 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#704c42";
  ctx.beginPath();
  ctx.moveTo(centerX - 24 * s, baseY - 114 * s);
  ctx.lineTo(centerX, baseY - 166 * s);
  ctx.lineTo(centerX + 24 * s, baseY - 114 * s);
  ctx.closePath();
  ctx.fill();

  pixelRect(centerX - 4 * s, baseY - 195 * s, 8 * s, 30 * s, "#d9bd79");
  pixelRect(centerX - 15 * s, baseY - 184 * s, 30 * s, 7 * s, "#d9bd79");
  pixelRect(centerX - 39 * s, baseY - 58 * s, 14 * s, 25 * s, "#a9d2d3");
  pixelRect(centerX + 25 * s, baseY - 58 * s, 14 * s, 25 * s, "#a9d2d3");
  pixelRect(centerX - 12 * s, baseY - 42 * s, 24 * s, 42 * s, "#604337");
  pixelRect(centerX - 2 * s, baseY - 37 * s, 4 * s, 4 * s, "#f2ca6c");
  drawFestiveLights(centerX - 40 * s, baseY - 64 * s, 80 * s, time);
}

function drawStorefront(centerX, baseY, index, time, scale = 1.15) {
  ctx.save();
  ctx.translate(centerX, baseY);
  ctx.scale(scale, scale);
  centerX = 0;
  baseY = 0;

  const wallColors = ["#9f6550", "#64816d", "#8b6a8c"];
  const awningColors = ["#bf554c", "#e7c56e", "#6f9c82", "#7299ad"];
  const wall = wallColors[index % wallColors.length];
  pixelRect(centerX - 55, baseY, 110, 5, "rgba(51,67,57,.2)");
  pixelRect(centerX - 48, baseY - 55, 96, 55, wall);
  pixelRect(centerX - 57, baseY - 61, 114, 9, "#68483e");
  pixelRect(centerX - 42, baseY - 92, 84, 34, "#80584a");
  pixelRect(centerX - 50, baseY - 97, 100, 7, "#60473e");
  pixelRect(centerX - 40, baseY - 51, 80, 11, awningColors[index % awningColors.length]);

  for (let stripe = 0; stripe < 5; stripe++) {
    pixelRect(centerX - 40 + stripe * 16, baseY - 51, 8, 11, "#f4e8d0");
  }

  pixelRect(centerX - 36, baseY - 34, 26, 22, "#f7dda0");
  pixelRect(centerX + 10, baseY - 34, 26, 22, "#f7dda0");
  pixelRect(centerX - 6, baseY - 39, 12, 39, "#604337");
  pixelRect(centerX - 35, baseY - 82, 70, 18, "#f3e7bd");
  ctx.fillStyle = "#514338";
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    ["코코아", "선물", "빵집", "장난감", "뜨개질", "초콜릿"][index % 6],
    centerX,
    baseY - 73
  );
  drawFestiveLights(centerX - 36, baseY - 57, 72, time);
  ctx.restore();
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

function drawBoxwood(x, baseY, scale = 1) {
  const s = scale;
  pixelRect(x - 4 * s, baseY, 58 * s, 4 * s, "rgba(56,76,64,.16)");
  pixelRect(x + 2 * s, baseY - 16 * s, 18 * s, 14 * s, "#416c4d");
  pixelRect(x + 15 * s, baseY - 24 * s, 23 * s, 22 * s, "#376247");
  pixelRect(x + 33 * s, baseY - 15 * s, 17 * s, 13 * s, "#477653");
  pixelRect(x + 7 * s, baseY - 18 * s, 8 * s, 3 * s, "#edf0e7");
  pixelRect(x + 23 * s, baseY - 25 * s, 10 * s, 3 * s, "#edf0e7");
  pixelRect(x + 39 * s, baseY - 17 * s, 8 * s, 3 * s, "#edf0e7");
}

/* ---------- 집과 나무 배치 ---------- */

function drawVillage(time) {
  const horizontalRoads = villageRoadsY();
  const verticalRoads = villageRoadsX();
  const wallColors = ["#a9584d", "#5e7b68", "#a97b50", "#8d657e", "#647f91"];

  for (let row = 0; row < horizontalRoads.length; row++) {
    const { top, bottom } = villageRowBounds(horizontalRoads, row);
    if (bottom - top < 125) continue;

    for (let column = 0; column <= verticalRoads.length; column++) {
      const left = column === 0 ? 28 : verticalRoads[column - 1] + 30;
      const right = column === verticalRoads.length
        ? worldWidth - 28
        : verticalRoads[column] - 30;
      const seed = row * 17 + column;
      const centerX = (left + right) / 2;
      const baseY = villageRowBaseY(horizontalRoads, row);
      const houseX = centerX - 40 + (layoutNoise(seed, 43) - 0.5) * 90;
      const hasHouse = layoutNoise(seed, 44) > 0.13;
      const firstChurch = row === 0 && column === 0;
      const secondChurch = row === 1 && column === verticalRoads.length;
      const clockTower = row === 0 && column === 2;
      const shoppingStreet = isShoppingStreet(row, column);

      if (firstChurch || secondChurch) {
        drawChurch(
          centerX - 62, baseY,
          firstChurch ? 1.38 : 1.28,
          wallColors[firstChurch ? 0 : 2],
          time
        );
      } else if (clockTower) {
        drawClockTower(centerX + 50, baseY + 78, 1.34);
      } else if (shoppingStreet) {
        drawStorefront(centerX - 40, baseY, column, time, 1.28);
      } else if (hasHouse) {
        const scale = 1.5 + layoutNoise(seed, 45) * 0.22;
        const colorIndex = Math.floor(layoutNoise(seed, 46) * wallColors.length);
        drawCabin(houseX, baseY, scale, wallColors[colorIndex], seed);
        const hasRightTree = layoutNoise(seed, 49) > 0.28;
        if (hasRightTree) {
          drawSmallTree(
            houseX + 140 * scale / 1.4,
            baseY + 1,
            0.8 + layoutNoise(seed, 50) * 0.22,
            true
          );
        }
        if (!hasRightTree && layoutNoise(seed, 52) > 0.43) {
          drawGiftBox(houseX + 140 * scale / 1.4, baseY - 17, "#b85048", 15);
        }
        drawSmallTree(
          houseX - 100 * scale / 1.4,
          baseY + 1,
          0.82 + layoutNoise(seed, 47) * 0.2,
          layoutNoise(seed, 48) > 0.35
        );
        if (layoutNoise(seed, 51) > 0.32) {
          drawFestiveLights(
            houseX + 8 * scale,
            baseY - 39 * scale,
            64 * scale,
            time
          );
        }
      } else {
        drawBoxwood(left + 18, baseY + 8, 1.2);
        drawBoxwood(centerX - 20, baseY + 16, 1.05);
        drawBoxwood(right - 72, baseY + 4, 1.15);
      }

      if (hasHouse && !firstChurch && !secondChurch && !clockTower && !shoppingStreet) {
        if (layoutNoise(seed, 61) > 0.12) {
          drawBoxwood(left + 12, baseY + 12, 1.05);
        }
        if (layoutNoise(seed, 62) > 0.28) {
          drawBoxwood(right - 70, baseY + 20, 0.95);
        }
      }

      if (hasHouse && layoutNoise(seed, 53) > 0.56) {
        const snowmanX = houseX < centerX ? centerX + 150 : centerX - 150;
        drawSnowmanDecoration(snowmanX, baseY + 1, 0.72);
      }
    }
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
  const baseY = centerTreeBaseY();
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

  const plazaCenterY = baseY - 70;
  const boxwoodAngles = [
    -2.55, -2.15, -1.78, -1.35, -0.98, -0.58,
    0.58, 0.98, 1.35, 1.78, 2.15, 2.55
  ];
  boxwoodAngles.forEach((angle, index) => {
    const radius = 150 + (index % 3) * 7;
    const x = centerX + Math.cos(angle) * radius - 25;
    const y = plazaCenterY + Math.sin(angle) * radius + 4;
    drawBoxwood(x, y, 0.82 + (index % 2) * 0.12);
  });

  drawSnowmanDecoration(centerX - 166, plazaCenterY + 31, 0.86);
  drawSnowmanDecoration(centerX + 140, plazaCenterY + 34, 0.82);
  drawGiftBox(centerX - 62, plazaCenterY + 75, "#b85048", 18);
  drawGiftBox(centerX + 50, plazaCenterY + 80, "#547e66", 17);

  drawGiftBox(centerX - 66, baseY - 27, "#b85048", 26);
  drawGiftBox(centerX - 31, baseY - 20, "#547e66", 22);
  drawGiftBox(centerX + 13, baseY - 24, "#668db0", 25);
  drawGiftBox(centerX + 47, baseY - 18, "#c58b4e", 21);
}

/* ---------- 아래쪽 장식: 나무, 벤치, 눈사람, 선물 ---------- */

function drawLowerDecorations(time) {
  const roadsY = villageRoadsY();
  const roadsX = villageRoadsX();
  roadsY.forEach(roadY => {
    for (let column = 0; column <= roadsX.length; column++) {
      const left = column === 0 ? 24 : roadsX[column - 1] + 45;
      const right = column === roadsX.length ? worldWidth - 24 : roadsX[column] - 45;
      if (right - left < 160) continue;

      drawLamp(right - 36, roadY - 40);
      if (column % 2 === 0) {
        drawBench(left + 40, roadY + 65, 0.9);
      }
    }
  });
}

/* ---------- 캐릭터 대화와 클릭 ---------- */

function drawSpeechBubble(villager, time) {
  const text = villager.bubble;
  ctx.font = "10px sans-serif";
  const width = Math.min(190, ctx.measureText(text).width + 18);
  const x = clamp(
    villager.x + villager.bubbleOffsetX - width / 2,
    4,
    worldWidth - width - 4
  );
  const y = clamp(villager.y - 108, 4, worldHeight - 30);

  ctx.save();
  ctx.globalAlpha = Math.min(1, (villager.bubbleUntil - time) / 250);

  pixelRect(x, y, width, 22, "#fffdf4");
  pixelRect(x + width / 2 - 3, y + 22, 6, 4, "#fffdf4");

  ctx.fillStyle = "#40382f";
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
  villager.bubbleOffsetX = 0;
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
  const worldY = position.y + cameraY;
  const villager = findVillagerAt(worldX, worldY);

  if (villager) {
    greetVillager(villager);
    return;
  }

  if (villagers.length > 0) {
    const nearest = villagers.reduce((best, current) =>
      Math.hypot(current.x - worldX, current.y - worldY)
        < Math.hypot(best.x - worldX, best.y - worldY)
        ? current
        : best
    );

    nearest.targetX = clamp(worldX, 40, worldWidth - 40);
    nearest.targetY = clamp(worldY + 10, groundY() + 40, worldHeight - 30);
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
  const villager = findVillagerAt(position.x + cameraX, position.y + cameraY);

  pointerStartX = event.clientX;
  pointerStartY = event.clientY;
  cameraStartX = cameraX;
  cameraStartY = cameraY;
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
      position.y + cameraY + 18,
      groundY() + 30,
      worldHeight - 25
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
    cameraY = clamp(
      cameraStartY - (event.clientY - pointerStartY),
      0,
      worldHeight - screenHeight
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
      showToast(`${villager.character.name}를 현재 위치로 옮겼어요.`);
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

  cameraX = clamp(
    cameraX + event.deltaX,
    0,
    Math.max(0, worldWidth - screenWidth)
  );
  cameraY = clamp(
    cameraY + event.deltaY,
    0,
    Math.max(0, worldHeight - screenHeight)
  );
}, { passive: false });

window.addEventListener("keydown", event => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    keysDown.add(event.key);
  }
});

window.addEventListener("keyup", event => keysDown.delete(event.key));
window.addEventListener("blur", () => keysDown.clear());

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

  document.getElementById("resultEmoji").innerHTML =
    `<img class="result-portrait" src="${character.images.idle}" alt="">`;
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
        ${count
          ? `<img class="character-portrait" src="${character.images.idle}" alt="">`
          : '<span class="emoji">❔</span>'}
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
          ${count
            ? `<img class="resident-portrait" src="${character.images.idle}" alt="">`
            : "<span>?</span>"}
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
  cameraY = clamp(
    villager.y - screenHeight / 2,
    0,
    Math.max(0, worldHeight - screenHeight)
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
  ctx.translate(-cameraX, -cameraY);

  drawPixelSky(time, delta);
  drawMountains();
  drawGround();
  drawDestination(time);

  [...villagers]
    .sort((a, b) => a.y - b.y)
    .forEach(villager => drawVillager(villager, time));

  ctx.restore();

  ctx = foregroundContext;
  try {
    ctx.clearRect(0, 0, screenWidth, screenHeight);
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    drawVillage(time);
    drawLowerDecorations(time);
    drawCenterTree(time);
    ctx.restore();
    drawSnow(delta, time);
  } finally {
    ctx = mainContext;
  }
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
  if (keysDown.has("ArrowUp")) {
    cameraY = clamp(
      cameraY - 6,
      0,
      Math.max(0, worldHeight - screenHeight)
    );
  }
  if (keysDown.has("ArrowDown")) {
    cameraY = clamp(
      cameraY + 6,
      0,
      Math.max(0, worldHeight - screenHeight)
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