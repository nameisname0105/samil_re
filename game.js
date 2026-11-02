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
const PROFILE_KEY = `${SAVE_KEY}-profile`;
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
let mapZoom = 1;
let lastFrameTime = 0;
let lastIncomeTime = Date.now();
let toastTimer = null;

let draggingMap = false;
let draggedVillager = null;
let focusedVillager = null;
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

function clampCamera() {
  cameraX = clamp(cameraX, 0, Math.max(0, worldWidth - screenWidth / mapZoom));
  cameraY = clamp(cameraY, 0, Math.max(0, worldHeight - screenHeight / mapZoom));
}

function setMapZoom(nextZoom, anchorX = screenWidth / 2, anchorY = screenHeight / 2) {
  const next = clamp(nextZoom, 0.65, 1.6);
  if (next !== mapZoom) {
    const worldAnchorX = cameraX + anchorX / mapZoom;
    const worldAnchorY = cameraY + anchorY / mapZoom;
    mapZoom = next;
    cameraX = worldAnchorX - anchorX / mapZoom;
    cameraY = worldAnchorY - anchorY / mapZoom;
    clampCamera();
  }

  const zoomLevel = document.getElementById("zoomLevel");
  if (zoomLevel) zoomLevel.value = String(Math.round(mapZoom * 100));
}

function groundY() {
  return centerTreeBaseY() - screenHeight * 0.27;
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

const CENTER_TREE_ROW = 1;
const CENTER_TREE_BLOCK_COLUMN = 2;
const CENTER_TREE_SHOP_COLUMN = 3;

function isCenterParkBlock(row, column) {
  return row === CENTER_TREE_ROW &&
    [CENTER_TREE_BLOCK_COLUMN, CENTER_TREE_SHOP_COLUMN].includes(column);
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

function centerTreeLayout() {
  const roadsX = villageRoadsX();
  const roadsY = villageRoadsY();
  const shopLeft = roadsX[CENTER_TREE_SHOP_COLUMN - 1] + 30;
  const shopRight = roadsX[CENTER_TREE_SHOP_COLUMN] - 30;
  const centerX = (shopLeft + shopRight) / 2 - 270;
  const mapCenterY = villageRowBaseY(roadsY, CENTER_TREE_ROW);
  const baseY = mapCenterY;

  return { centerX, plazaCenterY: baseY, baseY };
}

function isNearCenterParkPath(x, y, clearance = 70) {
  const { centerX, plazaCenterY, baseY } = centerTreeLayout();
  const horizontalRoads = villageRoadsY();
  let roadY = horizontalRoads[0];
  for (const candidate of horizontalRoads) {
    if (Math.abs(candidate - baseY) < Math.abs(roadY - baseY)) roadY = candidate;
  }
  const startX = villageRoadsX()[CENTER_TREE_BLOCK_COLUMN];
  const endY = plazaCenterY + 122;
  const pathX = centerX - startX;
  const pathY = endY - roadY;
  const pathLengthSquared = pathX * pathX + pathY * pathY;
  const progress = clamp(
    ((x - startX) * pathX + (y - roadY) * pathY) / pathLengthSquared,
    0,
    1
  );
  const closestX = startX + progress * pathX;
  const closestY = roadY + progress * pathY;

  return Math.hypot(x - closestX, y - closestY) < clearance;
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
    owned: { snowman: 1 }
  };
}

const savedGame = loadGame();
let coins = Number.isFinite(savedGame.coins) ? savedGame.coins : 300;

const owned = savedGame.owned && typeof savedGame.owned === "object"
  ? { ...savedGame.owned }
  : {};
const residentCounts = savedGame.residentCounts && typeof savedGame.residentCounts === "object"
  ? { ...savedGame.residentCounts }
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
  const savedResidentCount = Number(residentCounts[character.id]);
  residentCounts[character.id] = Number.isFinite(savedResidentCount)
    ? Math.floor(clamp(savedResidentCount, 0, owned[character.id]))
    : owned[character.id] > 0
      ? 1
      : 0;
}

if (Object.values(owned).every(count => count === 0)) {
  owned[CHARACTERS[0].id] = 1;
  residentCounts[CHARACTERS[0].id] = 1;
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      coins,
      owned,
      residentCounts
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

  clampCamera();
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
cameraX = clamp(
  worldWidth / 2 - screenWidth / mapZoom / 2,
  0,
  Math.max(0, worldWidth - screenWidth / mapZoom)
);
cameraY = clamp(
  worldHeight / 2 - screenHeight / mapZoom / 2,
  0,
  Math.max(0, worldHeight - screenHeight / mapZoom)
);

/* ---------- 캐릭터 ---------- */

const villagers = [];
const villagerById = new Map();
const fusionSelections = new Map();
let miniGameSession = null;
let miniGameInterval = null;
const miniGameTimeouts = new Set();
const MINI_GAMES = [
  { id: "memory", icon: "🧠", name: "친구 카드 맞추기", description: "친구 얼굴 카드 8쌍을 찾아요." },
  { id: "snake", icon: "🐍", name: "친구 스네이크", description: "친구를 움직여 눈꽃을 먹고 길게 자라요." },
  { id: "whack", icon: "🔨", name: "친구 두더지잡기", description: "나타나는 친구를 빠르게 눌러요." },
  { id: "2048", icon: "🔢", name: "눈꽃 2048", description: "같은 숫자 타일을 합쳐 2048을 만들어요." },
  { id: "reaction", icon: "⚡", name: "순발력 테스트", description: "초록불이 켜지는 순간 재빨리 눌러요." },
  { id: "breakout", icon: "🧱", name: "눈벽돌 깨기", description: "친구가 튕기는 눈덩이로 벽돌을 깨요." },
  { id: "pong", icon: "🏓", name: "눈사람 탁구", description: "친구와 AI를 상대로 랠리를 이어가요." },
  { id: "minesweeper", icon: "💣", name: "눈밭 지뢰찾기", description: "눈밭을 열어 안전한 칸을 모두 찾아요." },
  { id: "sliding", icon: "🧩", name: "크리스마스 퍼즐", description: "섞인 타일을 순서대로 맞춰요." },
  { id: "simon", icon: "🎶", name: "친구 순서 기억하기", description: "친구들이 보여주는 순서를 따라 해요." }
];

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
    let characterVillagers = villagers.filter(
      villager => villager.character.id === character.id
    ).length;

    const wantedCount = residentCounts[character.id] || 0;

    while (characterVillagers > wantedCount) {
      let index = villagers.length - 1;
      while (index >= 0 && villagers[index].character.id !== character.id) index--;
      const [removed] = villagers.splice(index, 1);
      if (removed === draggedVillager) draggedVillager = null;
      if (removed === focusedVillager) focusedVillager = null;
      hideWalkingSprite(removed);
      characterVillagers--;
    }

    for (let i = characterVillagers; i < wantedCount; i++) {
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
  ctx.textBaseline = "middle";

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
  ctx.fillText(villager.character.name, villager.x, labelY + 7);
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

  sprite.style.left = `${(villager.x - cameraX) * mapZoom - 24 * mapZoom}px`;
  sprite.style.top = `${(villager.y - cameraY) * mapZoom - 48 * mapZoom}px`;
  sprite.style.width = `${48 * mapZoom}px`;
  sprite.style.height = `${48 * mapZoom}px`;
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
  const hour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
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
    hour,
    daylight,
    top: mixHex("#263e5b", "#76b4c3", daylight),
    bottom: mixHex("#3d5a73", "#a7d1d4", daylight)
  };
}

function getCelestialPosition(hour) {
  const isMoon = hour >= 20 || hour < 6;
  const phaseHour = isMoon && hour < 6 ? hour + 24 : hour;
  const progress = isMoon
    ? (phaseHour - 20) / 10
    : (hour - 6) / 14;

  return {
    isMoon,
    x: progress * worldWidth,
    y: groundY() - screenHeight * (
      0.15 + Math.sin(progress * Math.PI) * 0.07
    )
  };
}

function drawPixelMoon(x, y) {
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
  const startX = x - cell * 5.5;
  const startY = y - cell * 4.5;

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

function drawPixelSun(x, y) {
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
      y: groundY() - screenHeight * 0.22 + cloud.y * 0.15
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

function drawCelestial(time) {
  const sky = getRealtimeSky();
  const celestial = getCelestialPosition(sky.hour);

  if (celestial.isMoon && sky.daylight < 0.35) {
    for (let index = 0; index < 100; index++) {
      const x = (index * 173 + 47) % worldWidth;
      const y = groundY() - 20 -
        ((index * 67) % Math.max(50, Math.floor(screenHeight * 0.2)));

      if (Math.sin(time / 600 + index * 1.3) > -0.25) {
        pixelRect(x, y, 2, 2, "#f4edcf");
      }
    }

    drawPixelMoon(celestial.x, celestial.y);
  } else {
    drawPixelSun(celestial.x, celestial.y);
  }
}

function updateDayNightOverlay() {
  const overlay = document.getElementById("dayNightOverlay");
  if (!overlay) return;

  const { daylight } = getRealtimeSky();
  overlay.style.backgroundColor = `rgba(18, 30, 58, ${0.34 * (1 - daylight)})`;
}

function drawPixelSky(delta) {
  const sky = getRealtimeSky();
  const horizon = groundY() + 55;

  pixelRect(0, 0, worldWidth, horizon, sky.bottom);

  for (let y = 0; y < horizon; y += 24) {
    pixelRect(0, y, worldWidth, 24, mixHex(sky.top, sky.bottom, y / horizon));
  }

  drawPixelClouds(delta);
  drawSantaSleigh();
}

function drawSantaSleigh() {
  const elapsed = Date.now() % SANTA_INTERVAL;
  if (elapsed >= SANTA_DURATION) return;

  const progress = elapsed / SANTA_DURATION;
  const x = progress * worldWidth;
  const y = groundY() - screenHeight * 0.2 + Math.sin(progress * Math.PI * 4) * 5;

  // The sleigh travels right, so Rudolph must run ahead of it.
  pixelRect(x + 38, y + 12, 14, 2, "#d5b66b");
  pixelRect(x + 48, y + 11, 3, 2, "#d5b66b");
  pixelRect(x + 48, y + 11, 2, 7, "#d5b66b");
  pixelRect(x + 48, y + 17, 40, 2, "#d5b66b");
  pixelRect(x - 5, y + 14, 46, 5, "#9e4541");
  pixelRect(x + 2, y + 8, 35, 7, "#c8574b");
  pixelRect(x + 7, y + 2, 18, 12, "#b74740");
  pixelRect(x + 14, y - 5, 13, 9, "#f2dfc2");
  pixelRect(x + 10, y - 10, 17, 5, "#b74740");
  pixelRect(x + 22, y - 7, 5, 5, "#f2dfc2");
  pixelRect(x - 13, y + 20, 58, 3, "#e1bd6e");

  for (const offset of [53, 87]) {
    pixelRect(x + offset, y + 9, 21, 7, "#8d6041");
    pixelRect(x + offset + 13, y + 2, 8, 8, "#8d6041");
    pixelRect(x + offset + 16, y, 3, 5, "#d5b66b");
    pixelRect(x + offset + 4, y + 15, 3, 7, "#68483e");
    pixelRect(x + offset + 14, y + 15, 3, 7, "#68483e");
    pixelRect(x + offset + 17, y - 5, 2, 6, "#d5b66b");
    pixelRect(x + offset + 22, y - 5, 2, 6, "#d5b66b");
    if (offset === 53) {
      pixelRect(x + offset + 20, y + 6, 4, 4, "#d6534d");
    }
  }
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
  const { centerX, plazaCenterY, baseY } = centerTreeLayout();
  const treeBaseY = baseY;
  const roadsX = villageRoadsX();
  const { top: plazaTop, bottom: plazaBottom } = villageRowBounds(
    horizontalRoads,
    CENTER_TREE_ROW
  );
  const plazaLeft = roadsX[CENTER_TREE_BLOCK_COLUMN - 1] + 22;
  const parkRight = roadsX[CENTER_TREE_SHOP_COLUMN] - 22;

  pixelRect(
    plazaLeft,
    plazaTop,
    parkRight - plazaLeft,
    plazaBottom - plazaTop,
    "#b9cbb4"
  );
  pixelRect(plazaLeft, plazaTop, parkRight - plazaLeft, 4, "#91aa91");
  pixelRect(plazaLeft, plazaBottom - 4, parkRight - plazaLeft, 4, "#91aa91");
  for (let row = 0, y = plazaTop + 28; y < plazaBottom - 12; row++, y += 58) {
    for (let column = 0, x = plazaLeft + 24; x < parkRight - 12; column++, x += 68) {
      const seed = row * 31 + column * 17;
      if (layoutNoise(seed, 71) > 0.42) {
        pixelRect(x, y, 11 + layoutNoise(seed, 72) * 8, 3, "#e8eee0");
      }
      if (layoutNoise(seed, 73) > 0.72) {
        pixelRect(x + 24, y + 13, 5, 3, "#90aa91");
      }
    }
  }

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
    const segments = [[0, worldWidth]];
    segments.forEach(([start, end]) => {
      drawVillagePath(
        start, roadY, end, roadY,
        start + (end - start) / 3, roadY,
        start + (end - start) * 2 / 3, roadY
      );
    });

    if (index === treeRoadIndex) {
      const roadX = roadsX[CENTER_TREE_BLOCK_COLUMN];
      drawParkPath(
        roadX,
        roadY,
        centerX,
        plazaCenterY + 122,
        roadX,
        roadY - 18,
        centerX + 24,
        plazaCenterY + 145
      );
    }
  });

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
      if (isCenterParkBlock(row, column)) {
        continue;
      }

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
      plazaCenterY + Math.sin(angle) * radius - 2,
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

function drawParkPath(startX, startY, endX, endY, control1X, control1Y, control2X, control2Y) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(control1X, control1Y, control2X, control2Y, endX, endY);

  ctx.strokeStyle = "#8c9989";
  ctx.lineWidth = 34;
  ctx.stroke();
  ctx.strokeStyle = "#d5d4c5";
  ctx.lineWidth = 27;
  ctx.stroke();
  ctx.strokeStyle = "#e5e2d4";
  ctx.lineWidth = 2;
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

  const brickSections = [
    { left: -44, right: 44, top: -112, bottom: 0 },
    { left: -36, right: 36, top: -160, bottom: -112 },
    { left: -34, right: 34, top: -218, bottom: -166 }
  ];

  for (const section of brickSections) {
    const brickWidth = 34;
    const courseHeight = 14;

    for (let courseTop = section.top; courseTop < section.bottom; courseTop += courseHeight) {
      const courseBottom = Math.min(courseTop + courseHeight, section.bottom);
      pixelRect(
        section.left,
        courseTop,
        section.right - section.left,
        2,
        "rgba(75,48,39,.32)"
      );

      const offset = Math.floor((courseTop - section.top) / courseHeight) % 2
        ? 0
        : brickWidth / 2;
      for (let jointX = section.left + offset; jointX < section.right; jointX += brickWidth) {
        pixelRect(
          jointX,
          courseTop,
          2,
          courseBottom - courseTop,
          "rgba(75,48,39,.28)"
        );
      }
    }
  }

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

  pixelRect(centerX - 17 * s, baseY - 145 * s, 34 * s, 4 * s, "#e5e9dd");
  pixelRect(centerX - 11 * s, baseY - 139 * s, 22 * s, 3 * s, "#dce5df");
  pixelRect(centerX - 57 * s, baseY - 67 * s, 114 * s, 3 * s, "rgba(241,235,213,.38)");

  ctx.fillStyle = "#68483e";
  ctx.beginPath();
  ctx.moveTo(centerX - 64 * s, baseY - 78 * s);
  ctx.lineTo(centerX, baseY - 125 * s);
  ctx.lineTo(centerX + 64 * s, baseY - 78 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f0eee3";
  ctx.beginPath();
  ctx.moveTo(centerX - 60 * s, baseY - 80 * s);
  ctx.lineTo(centerX, baseY - 125 * s);
  ctx.lineTo(centerX + 60 * s, baseY - 80 * s);
  ctx.lineTo(centerX + 51 * s, baseY - 82 * s);
  ctx.lineTo(centerX, baseY - 120 * s);
  ctx.lineTo(centerX - 51 * s, baseY - 82 * s);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#704c42";
  ctx.beginPath();
  ctx.moveTo(centerX - 24 * s, baseY - 114 * s);
  ctx.lineTo(centerX, baseY - 166 * s);
  ctx.lineTo(centerX + 24 * s, baseY - 114 * s);
  ctx.closePath();
  ctx.fill();

  pixelRect(centerX - 7 * s, baseY - 151 * s, 14 * s, 17 * s, "#a9d2d3");
  pixelRect(centerX - 2 * s, baseY - 151 * s, 4 * s, 17 * s, "#f1dfaa");
  pixelRect(centerX - 7 * s, baseY - 144 * s, 14 * s, 3 * s, "#f1dfaa");
  pixelRect(centerX - 42 * s, baseY - 57 * s, 20 * s, 27 * s, "#a9d2d3");
  pixelRect(centerX - 34 * s, baseY - 57 * s, 4 * s, 27 * s, "#f1dfaa");
  pixelRect(centerX - 42 * s, baseY - 46 * s, 20 * s, 4 * s, "#f1dfaa");
  pixelRect(centerX + 22 * s, baseY - 57 * s, 20 * s, 27 * s, "#a9d2d3");
  pixelRect(centerX + 30 * s, baseY - 57 * s, 4 * s, 27 * s, "#f1dfaa");
  pixelRect(centerX + 22 * s, baseY - 46 * s, 20 * s, 4 * s, "#f1dfaa");

  pixelRect(centerX - 4 * s, baseY - 195 * s, 8 * s, 30 * s, "#d9bd79");
  pixelRect(centerX - 15 * s, baseY - 184 * s, 30 * s, 7 * s, "#d9bd79");
  pixelRect(centerX - 39 * s, baseY - 58 * s, 14 * s, 25 * s, "#a9d2d3");
  pixelRect(centerX + 25 * s, baseY - 58 * s, 14 * s, 25 * s, "#a9d2d3");
  pixelRect(centerX - 12 * s, baseY - 42 * s, 24 * s, 42 * s, "#604337");
  pixelRect(centerX - 2 * s, baseY - 37 * s, 4 * s, 4 * s, "#f2ca6c");
  pixelRect(centerX - 16 * s, baseY + 2 * s, 32 * s, 4 * s, "#80604a");
  pixelRect(centerX - 11 * s, baseY + 6 * s, 22 * s, 3 * s, "#a98762");
  pixelRect(centerX + 7 * s, baseY - 22 * s, 3 * s, 3 * s, "#edc66c");
  pixelRect(centerX - 8 * s, baseY - 32 * s, 16 * s, 4 * s, "#38684b");
  pixelRect(centerX - 4 * s, baseY - 36 * s, 3 * s, 3 * s, "#b94d45");
  pixelRect(centerX + 1 * s, baseY - 36 * s, 3 * s, 3 * s, "#d5b66b");
  pixelRect(centerX - 5 * s, baseY - 29 * s, 10 * s, 3 * s, "#d5b66b");
  pixelRect(centerX - 2 * s, baseY - 34 * s, 4 * s, 10 * s, "#d5b66b");
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

  pixelRect(centerX - 36, baseY - 35, 20, 23, "#694b40");
  pixelRect(centerX - 33, baseY - 32, 14, 17, "#f7dda0");
  pixelRect(centerX - 27, baseY - 32, 2, 17, "#956b4e");
  pixelRect(centerX - 33, baseY - 25, 14, 2, "#956b4e");
  pixelRect(centerX + 16, baseY - 35, 20, 23, "#694b40");
  pixelRect(centerX + 19, baseY - 32, 14, 17, "#f7dda0");
  pixelRect(centerX + 25, baseY - 32, 2, 17, "#956b4e");
  pixelRect(centerX + 19, baseY - 25, 14, 2, "#956b4e");
  pixelRect(centerX - 11, baseY - 34, 22, 34, "#805a42");
  pixelRect(centerX - 8, baseY - 31, 16, 31, "#a97852");
  pixelRect(centerX - 5, baseY - 27, 10, 22, "#8c6347");
  pixelRect(centerX + 4, baseY - 18, 2, 2, "#f2ca6c");
  pixelRect(centerX - 13, baseY - 2, 26, 3, "#604337");
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
      if (isCenterParkBlock(row, column)) {
        continue;
      }

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
        [
          [left + 18, baseY + 8, 1.2],
          [centerX - 20, baseY + 16, 1.05],
          [right - 72, baseY + 4, 1.15]
        ].forEach(([x, y, scale]) => {
          if (!isNearCenterParkPath(x + 25, y - 10)) {
            drawBoxwood(x, y, scale);
          }
        });
      }

      if (hasHouse && !firstChurch && !secondChurch && !clockTower && !shoppingStreet) {
        if (layoutNoise(seed, 61) > 0.12) {
          const x = left + 12;
          const y = baseY + 12;
          if (!isNearCenterParkPath(x + 25, y - 10)) {
            drawBoxwood(x, y, 1.05);
          }
        }
        if (layoutNoise(seed, 62) > 0.28) {
          const x = right - 70;
          const y = baseY + 20;
          if (!isNearCenterParkPath(x + 25, y - 10)) {
            drawBoxwood(x, y, 0.95);
          }
        }
      }

      if (hasHouse && layoutNoise(seed, 53) > 0.56) {
        const snowmanX = houseX < centerX ? centerX + 150 : centerX - 150;
        drawSnowmanDecoration(snowmanX, baseY + 1, 0.72);
      }
    }
  }
}

/* ---------- 장난감 가게 왼쪽의 큰 크리스마스 트리 ---------- */

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
  const { centerX, plazaCenterY, baseY } = centerTreeLayout();
  const pixelSize = 7;
  const roadsX = villageRoadsX();
  const horizontalRoads = villageRoadsY();
  const { top: parkTop, bottom: parkBottom } = villageRowBounds(
    horizontalRoads,
    CENTER_TREE_ROW
  );
  const parkLeft = roadsX[CENTER_TREE_BLOCK_COLUMN - 1] + 22;
  const parkRight = roadsX[CENTER_TREE_SHOP_COLUMN] - 22;

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

  const boxwoodAngles = [
    -2.55, -2.15, -1.78, -1.35, -0.98, -0.58,
    0.58, 0.98, 1.35, 1.78, 2.15, 2.55
  ];
  boxwoodAngles.forEach((angle, index) => {
    const radius = 150 + (index % 3) * 7;
    const shrubCenterX = centerX + Math.cos(angle) * radius;
    const y = plazaCenterY + Math.sin(angle) * radius + 4;
    const x = shrubCenterX - 25;
    if (isNearCenterParkPath(shrubCenterX, y)) return;
    drawBoxwood(x, y, 0.82 + (index % 2) * 0.12);
  });

  drawSnowmanDecoration(centerX - 166, plazaCenterY + 31, 0.86);
  drawSnowmanDecoration(centerX + 140, plazaCenterY + 34, 0.82);

  drawGiftBox(centerX - 66, baseY - 27, "#b85048", 26);
  drawGiftBox(centerX - 31, baseY - 20, "#547e66", 22);
  drawGiftBox(centerX + 13, baseY - 24, "#668db0", 25);
  drawGiftBox(centerX + 47, baseY - 18, "#c58b4e", 21);

  drawLamp(centerX - 300, plazaCenterY + 55);
  drawLamp(centerX + 300, plazaCenterY + 55);
  drawBench(centerX - 270, plazaCenterY + 190, 1.05);
  drawBench(centerX + 220, plazaCenterY + 190, 1.05);
  drawBoxwood(centerX - 360, plazaCenterY + 192, 0.82);
  drawBoxwood(centerX + 310, plazaCenterY + 192, 0.82);
  drawSmallTree(parkLeft + 48, parkTop + 165, 0.92, true);
  drawSmallTree(parkLeft + 176, parkBottom - 32, 0.78, true);
  drawSmallTree(parkRight - 190, parkTop + 160, 1.02, true);
  drawSmallTree(parkRight - 66, parkBottom - 40, 0.82, true);

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
  const worldX = position.x / mapZoom + cameraX;
  const worldY = position.y / mapZoom + cameraY;
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
  const villager = findVillagerAt(
    position.x / mapZoom + cameraX,
    position.y / mapZoom + cameraY
  );

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
      position.x / mapZoom + cameraX,
      30,
      worldWidth - 30
    );

    draggedVillager.y = clamp(
      position.y / mapZoom + cameraY + 18,
      groundY() + 30,
      worldHeight - 25
    );

    draggedVillager.targetX = draggedVillager.x;
    draggedVillager.targetY = draggedVillager.y;
    draggedVillager.moving = false;
    return;
  }

  if (draggingMap && dragMoved) {
    focusedVillager = null;
    cameraX = clamp(
      cameraStartX - (event.clientX - pointerStartX) / mapZoom,
      0,
      Math.max(0, worldWidth - screenWidth / mapZoom)
    );
    cameraY = clamp(
      cameraStartY - (event.clientY - pointerStartY) / mapZoom,
      0,
      Math.max(0, worldHeight - screenHeight / mapZoom)
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
  if (event.deltaX !== 0 || event.deltaY !== 0) focusedVillager = null;

  if (event.deltaY !== 0) {
    const position = pointerPosition(event);
    setMapZoom(mapZoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1), position.x, position.y);
  }
  if (event.deltaX !== 0) {
    cameraX = clamp(
      cameraX + event.deltaX / mapZoom,
      0,
      Math.max(0, worldWidth - screenWidth / mapZoom)
    );
  }
}, { passive: false });

document.getElementById("zoomIn")?.addEventListener("click", () => {
  setMapZoom(mapZoom + 0.1);
});

document.getElementById("zoomOut")?.addEventListener("click", () => {
  setMapZoom(mapZoom - 0.1);
});

document.getElementById("zoomReset")?.addEventListener("click", () => {
  setMapZoom(1);
});

const uiToggle = document.getElementById("uiToggle");
uiToggle?.addEventListener("click", () => {
  const hidden = document.body.classList.toggle("ui-hidden");
  uiToggle.textContent = hidden ? "UI 보이기" : "UI 숨기기";
  uiToggle.setAttribute("aria-expanded", String(!hidden));
});

const zoomInput = document.getElementById("zoomLevel");
zoomInput?.addEventListener("change", () => {
  const percentage = Number(zoomInput.value);
  if (!Number.isFinite(percentage) || zoomInput.value.trim() === "") {
    setMapZoom(mapZoom);
    return;
  }

  setMapZoom(percentage / 100);
});

zoomInput?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    zoomInput.blur();
  }
});

window.addEventListener("keydown", event => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }

  if (document.getElementById("miniGamesModal")?.classList.contains("open")) return;

  if (event.key === "+" || event.key === "=") {
    setMapZoom(mapZoom + 0.1);
    return;
  }
  if (event.key === "-" || event.key === "_") {
    setMapZoom(mapZoom - 0.1);
    return;
  }

  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
    event.preventDefault();
    focusedVillager = null;
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
  if (id === "miniGamesModal") showMiniGameMenu();
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY));
    if (saved && typeof saved === "object") return saved;
  } catch (error) {
    console.warn("프로필 정보를 읽지 못했습니다.", error);
  }
  return { name: "포근한 눈꽃 마을", status: "작은 겨울의 큰 행복", characterId: CHARACTERS[0].id, photo: "" };
}

let profile = loadProfile();
let pendingProfilePhoto = profile.photo || "";

function renderProfileAvatar(element, characterId = profile.characterId, photo = profile.photo) {
  if (!element) return;
  if (photo) {
    const image = document.createElement("img");
    image.src = photo;
    image.alt = "프로필 사진";
    element.replaceChildren(image);
    return;
  }
  const character = CHARACTERS.find(item => item.id === characterId);
  element.innerHTML = character
    ? miniCharacterImage(character, "profile-character-avatar")
    : "✳";
}

function renderProfile() {
  const name = profile.name || "포근한 눈꽃 마을";
  const status = profile.status || "상태 메시지를 작성해보세요.";
  document.getElementById("profileName").textContent = name;
  document.getElementById("profileStatusPreview").textContent = status;
  renderProfileAvatar(document.getElementById("profileAvatarSmall"));
}

function openProfileEditor() {
  const select = document.getElementById("profileCharacter");
  const available = CHARACTERS.filter(character => (owned[character.id] || 0) > 0);
  select.replaceChildren(...available.map(character => {
    const option = document.createElement("option");
    option.value = character.id;
    option.textContent = `${character.name} · 보유 ${owned[character.id]}마리`;
    return option;
  }));
  if (available.length === 0) {
    const option = document.createElement("option");
    option.value = CHARACTERS[0].id;
    option.textContent = CHARACTERS[0].name;
    select.appendChild(option);
  }
  select.value = available.some(character => character.id === profile.characterId)
    ? profile.characterId
    : available[0]?.id || CHARACTERS[0].id;
  document.getElementById("profileNameInput").value = profile.name || "";
  document.getElementById("profileStatusInput").value = profile.status || "";
  document.getElementById("profileStatusCount").textContent =
    `${(profile.status || "").length}/80`;
  pendingProfilePhoto = profile.photo || "";
  renderProfileAvatar(document.getElementById("profileAvatarPreview"), select.value, pendingProfilePhoto);
  openModal("profileModal");
}

function processProfilePhoto(file) {
  if (!file || !file.type.startsWith("image/")) {
    showToast("이미지 파일을 선택해주세요.");
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => showToast("프로필 사진을 읽지 못했습니다.");
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => showToast("선택한 사진을 열지 못했습니다.");
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        showToast("프로필 사진을 처리할 수 없습니다.");
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      pendingProfilePhoto = canvas.toDataURL("image/jpeg", 0.82);
      renderProfileAvatar(
        document.getElementById("profileAvatarPreview"),
        document.getElementById("profileCharacter").value,
        pendingProfilePhoto
      );
    };
    image.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}

function saveProfile() {
  const name = document.getElementById("profileNameInput").value.trim();
  const status = document.getElementById("profileStatusInput").value.trim();
  if (!name) {
    showToast("표시 이름을 입력해주세요.");
    return;
  }
  profile = {
    name: name.slice(0, 24),
    status: status.slice(0, 80),
    characterId: document.getElementById("profileCharacter").value,
    photo: pendingProfilePhoto
  };
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("프로필 정보를 저장하지 못했습니다.", error);
    showToast("프로필을 저장하지 못했습니다. 사진 용량을 줄이거나 기본 사진을 선택해주세요.");
    return;
  }
  renderProfile();
  closeModal("profileModal");
  showToast("프로필을 저장했어요.");
}

document.getElementById("openProfile")?.addEventListener("click", openProfileEditor);
document.getElementById("profileSave")?.addEventListener("click", saveProfile);
document.getElementById("profileStatusInput")?.addEventListener("input", event => {
  document.getElementById("profileStatusCount").textContent = `${event.target.value.length}/80`;
});
document.getElementById("profileCharacter")?.addEventListener("change", event => {
  if (!pendingProfilePhoto) {
    renderProfileAvatar(document.getElementById("profileAvatarPreview"), event.target.value, "");
  }
});
document.getElementById("profilePhotoInput")?.addEventListener("change", event => {
  processProfilePhoto(event.target.files?.[0]);
  event.target.value = "";
});
document.getElementById("profileClearPhoto")?.addEventListener("click", () => {
  pendingProfilePhoto = "";
  renderProfileAvatar(
    document.getElementById("profileAvatarPreview"),
    document.getElementById("profileCharacter").value,
    ""
  );
});
renderProfile();

function stopMiniGame() {
  if (miniGameInterval !== null) {
    clearInterval(miniGameInterval);
    miniGameInterval = null;
  }
  for (const timeout of miniGameTimeouts) clearTimeout(timeout);
  miniGameTimeouts.clear();
  miniGameSession = null;
}

function showMiniGameMenu() {
  stopMiniGame();
  const menu = document.getElementById("miniGameMenu");
  menu.replaceChildren(...MINI_GAMES.map(game => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mini-game-choice";
    button.dataset.miniGame = game.id;
    button.innerHTML = `<span>${game.icon}</span><strong>${game.name}</strong><small>${game.description}</small>`;
    return button;
  }));
  menu.hidden = false;
  document.getElementById("miniGamePanel").hidden = true;
  document.getElementById("miniGameBack").hidden = true;
}

function miniGameCharacters(limit = 16) {
  const ownedCharacters = CHARACTERS.filter(character => (owned[character.id] || 0) > 0);
  const remainingCharacters = CHARACTERS.filter(character => !ownedCharacters.includes(character));
  const available = [...ownedCharacters, ...remainingCharacters];
  return available.slice(0, Math.min(limit, available.length));
}

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function miniCharacterImage(character, className = "mini-character-image") {
  return `<img class="${className}" src="${character.images.idle}" alt="${character.name}" draggable="false">`;
}

function setMiniGameStatus(message) {
  document.getElementById("miniGameStatus").textContent = message;
}

function renderMiniGame(type, options = {}) {
  stopMiniGame();
  const characters = miniGameCharacters(16);
  miniGameSession = { type: type === "snake-play" ? "snake" : type, characters, score: 0 };
  document.getElementById("miniGameContent").replaceChildren();
  document.getElementById("miniGamePanel").hidden = false;
  document.getElementById("miniGameRestart").hidden = false;
  const content = document.getElementById("miniGameContent");

  if (type === "memory") {
    const pairs = shuffled(characters).slice(0, 8);
    const cards = shuffled([...pairs, ...pairs]);
    const best = Number(localStorage.getItem(`${SAVE_KEY}-memory-best-seconds`));
    Object.assign(miniGameSession, {
      cards, flipped: [], matched: new Set(), locked: false, moves: 0,
      startedAt: performance.now(),
      bestSeconds: Number.isFinite(best) && best > 0 ? best : null
    });
    content.innerHTML = `<div class="mini-record">최고 기록: <strong>${miniGameSession.bestSeconds === null ? "아직 없음" : formatMiniTime(miniGameSession.bestSeconds)}</strong></div>
      <div class="memory-grid" aria-label="친구 얼굴 카드">${cards.map((_, index) =>
        `<button type="button" class="memory-card" data-card-index="${index}" aria-label="카드 ${index + 1}">?</button>`
      ).join("")}</div>`;
    setMiniGameStatus("친구 얼굴 카드 8쌍을 모두 찾아보세요!");
  } else if (type === "snake") {
    const ownedCharacters = CHARACTERS.filter(character => (owned[character.id] || 0) > 0);
    const best = readMiniRecord("snake-best");
    const selectedPlayer = ownedCharacters.find(character => character.id === options.playerId) || ownedCharacters[0];
    Object.assign(miniGameSession, {
      ownedCharacters, player: selectedPlayer, bestScore: best, choosingPlayer: true
    });
    content.innerHTML = `<p class="mini-game-prompt">스네이크로 플레이할 보유 캐릭터를 고르세요.</p>
      <div class="mini-owned-characters">${ownedCharacters.map(character =>
        `<button type="button" class="mini-owned-choice${character === selectedPlayer ? " selected" : ""}" data-snake-character="${character.id}" aria-pressed="${character === selectedPlayer}">${miniCharacterImage(character)}<span>${character.name}</span><small>보유 ${owned[character.id]}마리</small></button>`
      ).join("")}</div>
      <button type="button" class="mini-game-action" data-snake-start${selectedPlayer ? "" : " disabled"}>선택한 친구로 시작</button>`;
    setMiniGameStatus(`스네이크 최고 기록: 눈꽃 ${best}개`);
  } else if (type === "snake-play") {
    const player = CHARACTERS.find(character => character.id === options.playerId) ||
      CHARACTERS.find(character => (owned[character.id] || 0) > 0);
    if (!player) {
      setMiniGameStatus("플레이할 보유 캐릭터가 없어요.");
      return;
    }
    Object.assign(miniGameSession, {
      player, boardSize: 14, snake: [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }],
      direction: { x: 1, y: 0 }, nextDirection: { x: 1, y: 0 }, score: 0, running: true,
      bestScore: readMiniRecord("snake-best")
    });
    miniGameSession.food = randomSnakeFood(miniGameSession);
    content.innerHTML = `<div class="mini-record">최고 기록: <strong data-snake-best>눈꽃 ${miniGameSession.bestScore}개</strong></div>
      <div class="snake-heading">${miniCharacterImage(player)}<span>${player.name} · 방향키 또는 아래 버튼으로 이동</span></div>
      <div class="snake-board" data-snake-board></div>
      <div class="snake-controls"><button data-snake-direction="up">▲</button><button data-snake-direction="left">◀</button><button data-snake-direction="down">▼</button><button data-snake-direction="right">▶</button></div>`;
    drawSnakeBoard();
    miniGameInterval = setInterval(tickSnake, 145);
    setMiniGameStatus(`눈꽃을 먹으며 벽과 자기 몸을 피해요! 최고 ${miniGameSession.bestScore}개`);
  } else if (type === "whack") {
    const best = readMiniRecord("whack-best");
    Object.assign(miniGameSession, { elapsed: 0, lastTick: performance.now(), lastTargetChange: 0, hits: 0, running: true, activeIndex: -1, bestScore: best });
    content.innerHTML = `<div class="mini-record">최고 기록: <strong data-whack-best>${best}마리</strong></div>
      <div class="whack-grid">${Array.from({ length: 9 }, (_, index) =>
      `<button type="button" class="whack-hole" data-whack-index="${index}" aria-label="구멍 ${index + 1}"></button>`
    ).join("")}</div>`;
    chooseWhackTarget();
    miniGameInterval = setInterval(tickWhack, 100);
    setMiniGameStatus("20초 동안 나타나는 친구를 최대한 많이 눌러요!");
  } else if (type === "2048") {
    const best = readMiniRecord("2048-best");
    Object.assign(miniGameSession, { board: Array(16).fill(0), score: 0, over: false, bestScore: best });
    add2048Tile();
    add2048Tile();
    content.innerHTML = `<div class="game-character-badge">${miniCharacterImage(characters[0])}<span>🎄 친구와 함께 크리스마스 2048 🎄</span></div>
      <div class="mini-record">최고 기록: <strong data-2048-best>${best}점</strong></div>
      <div class="tile-board" data-2048-board></div>
      <div class="tile-controls"><button data-tile-direction="up">▲</button><button data-tile-direction="left">◀</button><button data-tile-direction="down">▼</button><button data-tile-direction="right">▶</button></div>`;
    draw2048Board();
    setMiniGameStatus(`크리스마스 타일을 합쳐요! 현재 최고 ${best}점`);
  } else if (type === "reaction") {
    Object.assign(miniGameSession, { state: "ready", startedAt: 0 });
    content.innerHTML = `<div class="reaction-character">${miniCharacterImage(characters[0])}</div>
      <button type="button" class="reaction-pad" data-reaction>시작</button>
      <p class="mini-record" data-reaction-best>최고 기록: ${formatMiniTime(Number(localStorage.getItem(`${SAVE_KEY}-reaction-best-ms`)) || 0, true)}</p>`;
    setMiniGameStatus("초록색으로 바뀌면 재빨리 눌러요!");
    } else if (type === "breakout") {
      const player = characters[0];
      Object.assign(miniGameSession, { player, x: 0.5, y: 0.72, vx: 0.006, vy: -0.006, paddle: 0.5, bricks: Array.from({ length: 24 }, (_, index) => ({ x: index % 6, y: Math.floor(index / 6), alive: true })), score: 0, running: true });
      content.innerHTML = `<div class="arcade-character">${miniCharacterImage(player)}<span>${player.name}</span></div><canvas class="arcade-canvas breakout-canvas" data-breakout width="360" height="420" aria-label="눈벽돌 깨기"></canvas><div class="mini-game-controls"><button data-arcade-move="-1">◀</button><button data-arcade-move="1">▶</button></div>`;
      miniGameInterval = setInterval(tickBreakout, 16);
      setMiniGameStatus("친구가 튕긴 눈덩이로 모든 선물 벽돌을 깨세요!");
    } else if (type === "pong") {
      Object.assign(miniGameSession, { player: characters[0], x: 0.5, y: 0.5, vx: 0.006, vy: 0.003, paddle: 0.5, aiPaddle: 0.5, playerScore: 0, aiScore: 0, running: true });
      content.innerHTML = `<div class="arcade-canvas pong-canvas" data-pong aria-label="눈사람 탁구"><span class="pong-center-line"></span><span class="pong-ball">❄</span><span class="pong-player-paddle"></span><span class="pong-ai-paddle"></span></div><div class="mini-game-controls"><button data-arcade-move="-1">▲</button><button data-arcade-move="1">▼</button></div>`;
      miniGameInterval = setInterval(tickPong, 16);
      setMiniGameStatus("위아래 버튼이나 화살표 키로 패들을 움직여 AI와 경기하세요. 5점 선취!");
    } else if (type === "minesweeper") {
      startMinesweeper();
    } else if (type === "sliding") {
      startSlidingPuzzle();
    } else if (type === "simon") {
      Object.assign(miniGameSession, { sequence: [], inputIndex: 0, acceptingInput: false, score: 0 });
      content.innerHTML = `<div class="simon-character">${miniCharacterImage(characters[0])}<span>친구들의 순서를 기억해요</span></div><div class="simon-grid">${characters.slice(0, 4).map((character, index) =>
        `<button type="button" class="simon-pad" data-simon-pad="${index}">${miniCharacterImage(character)}</button>`
      ).join("")}</div>`;
      nextSimonRound();
    }
  }

function tickBreakout() {
  const session = miniGameSession;
  const canvas = document.querySelector("[data-breakout]");
  const context = canvas?.getContext("2d");
  if (!session || session.type !== "breakout" || !session.running || !canvas || !context) return;
  const width = canvas.width;
  const height = canvas.height;
  const ballX = session.x * width;
  const ballY = session.y * height;
  const radius = 8;
  session.x += session.vx;
  session.y += session.vy;
  if (session.x < radius / width || session.x > 1 - radius / width) session.vx *= -1;
  if (session.y < radius / height) session.vy = Math.abs(session.vy);
  const paddleWidth = 78;
  const paddleY = height - 30;
  if (session.vy > 0 && ballY + radius >= paddleY && ballY < paddleY + 10 &&
      Math.abs(ballX - session.paddle * width) < paddleWidth / 2 + radius) {
    session.vy = -Math.abs(session.vy);
    session.vx = clamp((ballX - session.paddle * width) / width * 0.02, -0.009, 0.009);
  } else if (ballY > height + radius / 2) {
    session.running = false;
    setMiniGameStatus(`눈덩이를 놓쳤어요! ${session.score}점 · 다시 하기로 재도전`);
  }
  const brickWidth = 56;
  const brickHeight = 18;
  const gap = 4;
  session.bricks.forEach(brick => {
    if (!brick.alive) return;
    const x = 4 + brick.x * (brickWidth + gap);
    const y = 30 + brick.y * 24;
    if (session.x * width + radius > x && session.x * width - radius < x + brickWidth &&
        session.y * height + radius > y && session.y * height - radius < y + brickHeight) {
      brick.alive = false;
      session.vy *= -1;
      session.score += 10;
    }
  });
  if (!session.bricks.some(brick => brick.alive)) {
    session.running = false;
    setMiniGameStatus(`모든 눈벽돌을 깼어요! ${session.score}점 🎉`);
  }
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#eaf5f2";
  context.fillRect(0, 0, width, height);
  session.bricks.forEach(brick => {
    if (!brick.alive) return;
    context.fillStyle = ["#c96758", "#e0b650", "#718f79", "#82b5c3"][brick.y];
    context.fillRect(4 + brick.x * (brickWidth + gap), 30 + brick.y * 24, brickWidth, brickHeight);
  });
  context.fillStyle = "#385b50";
  context.fillRect(session.paddle * width - paddleWidth / 2, paddleY, paddleWidth, 10);
  context.fillStyle = "#fff";
  context.beginPath();
  context.arc(session.x * width, session.y * height, radius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#31453d";
  context.font = "bold 16px sans-serif";
  context.fillText(`🎁 ${session.score}`, 12, 20);
}

function tickPong() {
  const session = miniGameSession;
  const court = document.querySelector("[data-pong]");
  if (!session || session.type !== "pong" || !session.running || !court) return;
  session.aiPaddle += clamp(session.y - session.aiPaddle, -0.006, 0.006);
  session.x += session.vx;
  session.y += session.vy;
  if (session.y < 0.04 || session.y > 0.96) session.vy *= -1;
  const hitPaddle = (position, paddle) =>
    Math.abs(session.y - paddle) < 0.16 && Math.abs(session.x - position) < 0.035;
  if (session.vx < 0 && hitPaddle(0.06, session.paddle)) {
    session.vx = Math.abs(session.vx) * 1.04;
    session.vy += (session.y - session.paddle) * 0.018;
  } else if (session.vx > 0 && hitPaddle(0.94, session.aiPaddle)) {
    session.vx = -Math.abs(session.vx) * 1.04;
    session.vy += (session.y - session.aiPaddle) * 0.018;
  }
  if (session.x < 0 || session.x > 1) {
    if (session.x < 0) session.aiScore++;
    else session.playerScore++;
    session.x = 0.5;
    session.y = 0.5;
    session.vx = session.playerScore > session.aiScore ? -0.006 : 0.006;
    session.vy = (Math.random() - 0.5) * 0.008;
  }
  court.style.setProperty("--pong-ball-x", `${session.x * 100}%`);
  court.style.setProperty("--pong-ball-y", `${session.y * 100}%`);
  court.style.setProperty("--pong-player-y", `${session.paddle * 100}%`);
  court.style.setProperty("--pong-ai-y", `${session.aiPaddle * 100}%`);
  if (session.playerScore >= 5 || session.aiScore >= 5) {
    session.running = false;
    setMiniGameStatus(`경기 종료 · 나 ${session.playerScore} : ${session.aiScore} AI`);
  } else {
    setMiniGameStatus(`나 ${session.playerScore} : ${session.aiScore} AI · 5점 먼저 내면 승리`);
  }
}

function startMinesweeper() {
  const session = miniGameSession;
  if (!session) return;
  Object.assign(session, {
    size: 8, mineCount: 10, cells: Array(64).fill(null).map(() => ({ mine: false, revealed: false, flagged: false, adjacent: 0 })),
    started: false, over: false, revealedCount: 0
  });
  document.getElementById("miniGameContent").innerHTML =
    `<div class="minesweeper-toolbar"><span data-mine-count>깃발 0 / 10</span><button type="button" class="mini-game-action" data-mine-flag>깃발 모드: 끔</button></div>
    <div class="minesweeper-board" data-minesweeper-board role="grid" aria-label="눈밭 지뢰찾기"></div>`;
  drawMinesweeperBoard();
  setMiniGameStatus("첫 칸은 안전해요. 지뢰를 피해 모든 칸을 열어보세요!");
}

function placeMines(firstIndex) {
  const session = miniGameSession;
  const protectedCells = new Set([firstIndex]);
  const firstX = firstIndex % session.size;
  const firstY = Math.floor(firstIndex / session.size);
  for (let y = Math.max(0, firstY - 1); y <= Math.min(session.size - 1, firstY + 1); y++) {
    for (let x = Math.max(0, firstX - 1); x <= Math.min(session.size - 1, firstX + 1); x++) {
      protectedCells.add(y * session.size + x);
    }
  }
  const candidates = shuffled(Array.from({ length: session.cells.length }, (_, index) => index)
    .filter(index => !protectedCells.has(index))).slice(0, session.mineCount);
  candidates.forEach(index => { session.cells[index].mine = true; });
  session.cells.forEach((cell, index) => {
    const x = index % session.size;
    const y = Math.floor(index / session.size);
    cell.adjacent = adjacentMineIndices(x, y).filter(next => session.cells[next].mine).length;
  });
  session.started = true;
}

function adjacentMineIndices(x, y) {
  const result = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < miniGameSession.size && ny < miniGameSession.size) {
        result.push(ny * miniGameSession.size + nx);
      }
    }
  }
  return result;
}

function drawMinesweeperBoard() {
  const board = document.querySelector("[data-minesweeper-board]");
  const session = miniGameSession;
  if (!board || !session || session.type !== "minesweeper") return;
  board.innerHTML = session.cells.map((cell, index) => {
    const content = cell.flagged ? "🚩" : cell.revealed
      ? cell.mine ? "💣" : cell.adjacent || ""
      : "";
    return `<button type="button" class="mine-cell${cell.revealed ? " revealed" : ""}${cell.mine && cell.revealed ? " mine" : ""}" data-mine-cell="${index}" aria-label="칸 ${index + 1}${cell.flagged ? ", 깃발" : ""}">${content}</button>`;
  }).join("");
  const flags = session.cells.filter(cell => cell.flagged).length;
  document.querySelector("[data-mine-count]").textContent = `깃발 ${flags} / ${session.mineCount}`;
}

function revealMineCell(index) {
  const session = miniGameSession;
  if (!session || session.type !== "minesweeper" || session.over) return;
  const cell = session.cells[index];
  if (!cell || cell.flagged || cell.revealed) return;
  if (!session.started) placeMines(index);
  if (cell.mine) {
    session.over = true;
    session.cells.forEach(item => { if (item.mine) item.revealed = true; });
    drawMinesweeperBoard();
    setMiniGameStatus("앗, 지뢰를 밟았어요. 다시 도전해보세요!");
    return;
  }
  const reveal = currentIndex => {
    const current = session.cells[currentIndex];
    if (!current || current.mine || current.flagged || current.revealed) return;
    current.revealed = true;
    session.revealedCount++;
    if (current.adjacent === 0) {
      const x = currentIndex % session.size;
      const y = Math.floor(currentIndex / session.size);
      adjacentMineIndices(x, y).forEach(reveal);
    }
  };
  reveal(index);
  if (session.revealedCount === session.cells.length - session.mineCount) {
    session.over = true;
    setMiniGameStatus("성공! 눈밭의 안전한 칸을 모두 찾았어요! 🎉");
  } else setMiniGameStatus(`안전한 칸 ${session.revealedCount}개를 찾았어요.`);
  drawMinesweeperBoard();
}

function toggleMineFlag(index) {
  const session = miniGameSession;
  const cell = session?.cells[index];
  if (!session || session.type !== "minesweeper" || session.over || !cell || cell.revealed) return;
  cell.flagged = !cell.flagged;
  drawMinesweeperBoard();
}

function startSlidingPuzzle() {
  const session = miniGameSession;
  if (!session) return;
  const board = [1, 2, 3, 4, 5, 6, 7, 8, 0];
  let blank = 8;
  for (let turn = 0; turn < 120; turn++) {
    const x = blank % 3;
    const y = Math.floor(blank / 3);
    const choices = [
      ...(x > 0 ? [blank - 1] : []), ...(x < 2 ? [blank + 1] : []),
      ...(y > 0 ? [blank - 3] : []), ...(y < 2 ? [blank + 3] : [])
    ];
    const swap = choices[Math.floor(Math.random() * choices.length)];
    [board[blank], board[swap]] = [board[swap], board[blank]];
    blank = swap;
  }
  Object.assign(session, { puzzle: board, moves: 0, over: false });
  document.getElementById("miniGameContent").innerHTML =
    `<div class="sliding-board" data-sliding-board aria-label="크리스마스 퍼즐">${board.map((value, index) =>
      `<button type="button" class="sliding-tile${value ? "" : " empty"}" data-sliding-tile="${index}">${value ? `🎁<small>${value}</small>` : ""}</button>`
    ).join("")}</div><p class="mini-record" data-sliding-moves>이동 횟수: 0</p>`;
  setMiniGameStatus("빈칸 옆의 타일을 눌러 1부터 8까지 맞춰요!");
}

function moveSlidingTile(index) {
  const session = miniGameSession;
  if (!session || session.type !== "sliding" || session.over) return;
  const blank = session.puzzle.indexOf(0);
  if (Math.abs(index % 3 - blank % 3) + Math.abs(Math.floor(index / 3) - Math.floor(blank / 3)) !== 1) return;
  [session.puzzle[index], session.puzzle[blank]] = [session.puzzle[blank], session.puzzle[index]];
  session.moves++;
  const board = document.querySelector("[data-sliding-board]");
  board.innerHTML = session.puzzle.map((value, tileIndex) =>
    `<button type="button" class="sliding-tile${value ? "" : " empty"}" data-sliding-tile="${tileIndex}">${value ? `🎁<small>${value}</small>` : ""}</button>`
  ).join("");
  document.querySelector("[data-sliding-moves]").textContent = `이동 횟수: ${session.moves}`;
  if (session.puzzle.every((value, tileIndex) => value === (tileIndex + 1) % 9)) {
    session.over = true;
    setMiniGameStatus(`${session.moves}번 움직여 퍼즐을 완성했어요! 🎄`);
  }
}

function nextSimonRound() {
  const session = miniGameSession;
  if (!session || session.type !== "simon") return;
  session.sequence.push(Math.floor(Math.random() * 4));
  session.inputIndex = 0;
  session.acceptingInput = false;
  setMiniGameStatus(`라운드 ${session.sequence.length} · 순서를 기억하세요.`);
  session.sequence.forEach((padIndex, step) => {
    const timeout = setTimeout(() => {
      miniGameTimeouts.delete(timeout);
      if (miniGameSession !== session) return;
      const pad = document.querySelector(`[data-simon-pad="${padIndex}"]`);
      pad?.classList.add("active");
      const clearTimeoutId = setTimeout(() => {
        miniGameTimeouts.delete(clearTimeoutId);
        pad?.classList.remove("active");
      }, 360);
      miniGameTimeouts.add(clearTimeoutId);
      if (step === session.sequence.length - 1) {
        const readyTimeout = setTimeout(() => {
          miniGameTimeouts.delete(readyTimeout);
          if (miniGameSession === session) session.acceptingInput = true;
        }, 420);
        miniGameTimeouts.add(readyTimeout);
      }
    }, 650 * (step + 1));
    miniGameTimeouts.add(timeout);
  });
}

function formatMiniTime(seconds, milliseconds = false) {
  if (milliseconds) return seconds > 0 && Number.isFinite(seconds) ? `${Math.round(seconds)}ms` : "아직 없음";
  const value = Math.max(0, seconds);
  return `${Math.floor(value / 60)}분 ${(value % 60).toFixed(2)}초`;
}

function readMiniRecord(key) {
  const value = Number(localStorage.getItem(`${SAVE_KEY}-${key}`));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function saveMiniRecord(key, value) {
  try {
    localStorage.setItem(`${SAVE_KEY}-${key}`, String(value));
  } catch (error) {
    console.error(`미니게임 기록(${key})을 저장하지 못했습니다.`, error);
    showToast("최고 기록을 저장하지 못했습니다.");
  }
}

function randomSnakeFood(session) {
  const occupied = new Set(session.snake.map(cell => `${cell.x},${cell.y}`));
  const empty = [];
  for (let y = 0; y < session.boardSize; y++) {
    for (let x = 0; x < session.boardSize; x++) {
      if (!occupied.has(`${x},${y}`)) empty.push({ x, y });
    }
  }
  return empty.length ? empty[Math.floor(Math.random() * empty.length)] : null;
}

function drawSnakeBoard() {
  const board = document.querySelector("[data-snake-board]");
  const session = miniGameSession;
  if (!board || !session || session.type !== "snake") return;
  const head = session.snake[0];
  const body = new Set(session.snake.slice(1).map(cell => `${cell.x},${cell.y}`));
  board.innerHTML = Array.from({ length: session.boardSize * session.boardSize }, (_, index) => {
    const x = index % session.boardSize;
    const y = Math.floor(index / session.boardSize);
    const isHead = x === head.x && y === head.y;
    const isBody = body.has(`${x},${y}`);
    const food = session.food && x === session.food.x && y === session.food.y;
    const value = isHead ? miniCharacterImage(session.player, "snake-head-image") :
      isBody ? "●" : food ? "❄" : "";
    return `<span class="snake-cell${isHead ? " snake-head" : isBody ? " snake-body" : food ? " snake-food" : ""}">${value}</span>`;
  }).join("");
}

function setSnakeDirection(direction) {
  const session = miniGameSession;
  if (!session || session.type !== "snake" || !session.running) return;
  const next = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[direction];
  if (next && !(next.x === -session.direction.x && next.y === -session.direction.y)) session.nextDirection = next;
}

function tickSnake() {
  const session = miniGameSession;
  if (!session || session.type !== "snake" || !session.running) return;
  session.direction = session.nextDirection;
  const head = { x: session.snake[0].x + session.direction.x, y: session.snake[0].y + session.direction.y };
  const ateFood = head.x === session.food.x && head.y === session.food.y;
  const bodyToCheck = ateFood ? session.snake : session.snake.slice(0, -1);
  if (head.x < 0 || head.y < 0 || head.x >= session.boardSize || head.y >= session.boardSize ||
      bodyToCheck.some(cell => cell.x === head.x && cell.y === head.y)) {
    session.running = false;
    if (session.score > session.bestScore) {
      session.bestScore = session.score;
      saveMiniRecord("snake-best", session.score);
    }
    const bestElement = document.querySelector("[data-snake-best]");
    if (bestElement) bestElement.textContent = `눈꽃 ${session.bestScore}개`;
    setMiniGameStatus(`게임 종료! 눈꽃 ${session.score}개를 모았어요.`);
    return;
  }
  session.snake.unshift(head);
  if (ateFood) {
    session.score++;
    session.food = randomSnakeFood(session);
    if (!session.food) {
      session.running = false;
      setMiniGameStatus("대단해요! 눈꽃 마을을 모두 채웠어요!");
    }
  } else session.snake.pop();
  drawSnakeBoard();
  if (session.score > session.bestScore) {
    session.bestScore = session.score;
    saveMiniRecord("snake-best", session.score);
  }
  const bestElement = document.querySelector("[data-snake-best]");
  if (bestElement) bestElement.textContent = `눈꽃 ${session.bestScore}개`;
  setMiniGameStatus(`눈꽃 ${session.score}개 · 길이 ${session.snake.length}`);
}

function chooseWhackTarget() {
  const session = miniGameSession;
  if (!session || session.type !== "whack" || !session.running) return;
  const holes = [...document.querySelectorAll("[data-whack-index]")];
  holes.forEach(hole => {
    hole.replaceChildren();
    hole.classList.remove("active");
  });
  session.activeIndex = Math.floor(Math.random() * holes.length);
  session.activeCharacter = session.characters[Math.floor(Math.random() * session.characters.length)];
  const hole = holes[session.activeIndex];
  if (hole) {
    hole.innerHTML = miniCharacterImage(session.activeCharacter);
    hole.classList.add("active");
  }
}

function tickWhack() {
  const session = miniGameSession;
  if (!session || session.type !== "whack" || !session.running) return;
  const now = performance.now();
  session.elapsed += now - session.lastTick;
  session.lastTick = now;
  if (session.elapsed >= 20000) {
    session.running = false;
    if (session.hits > session.bestScore) {
      session.bestScore = session.hits;
      saveMiniRecord("whack-best", session.hits);
    }
    const record = document.querySelector("[data-whack-best]");
    if (record) record.textContent = `${session.bestScore}마리`;
    if (miniGameInterval !== null) clearInterval(miniGameInterval);
    miniGameInterval = null;
    setMiniGameStatus(`시간 종료! 친구 ${session.hits}명을 잡았어요.`);
    return;
  }
  if (session.elapsed - session.lastTargetChange >= 750) {
    session.lastTargetChange = session.elapsed;
    chooseWhackTarget();
  }
  setMiniGameStatus(`남은 시간 ${Math.ceil((20000 - session.elapsed) / 1000)}초 · 잡은 친구 ${session.hits}명`);
}

function add2048Tile() {
  const empty = miniGameSession.board.map((value, index) => value === 0 ? index : -1).filter(index => index >= 0);
  if (empty.length) miniGameSession.board[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
}

function draw2048Board() {
  const board = document.querySelector("[data-2048-board]");
  if (!board || miniGameSession?.type !== "2048") return;
  const christmasDecorations = ["🎄", "🎁", "❄️", "🔔", "⭐", "🧦", "🕯️"];
  board.innerHTML = miniGameSession.board.map((value, index) =>
    `<span class="tile-cell tile-${value || "empty"}${value ? " tile-arrive" : ""}" data-tile-cell="${index}">${value ? `<span class="tile-decoration">${christmasDecorations[Math.min(Math.log2(value) - 1, christmasDecorations.length - 1)]}</span><strong>${value}</strong>` : ""}</span>`
  ).join("");
  setMiniGameStatus(`점수 ${miniGameSession.score}`);
  const bestElement = document.querySelector("[data-2048-best]");
  if (bestElement) bestElement.textContent = `${miniGameSession.bestScore}점`;
}

function slideTileLine(line) {
  const values = line.filter(Boolean);
  let score = 0;
  for (let index = 0; index < values.length - 1; index++) {
    if (values[index] === values[index + 1]) {
      values[index] *= 2;
      score += values[index];
      values.splice(index + 1, 1);
    }
  }
  while (values.length < 4) values.push(0);
  return { values, score };
}

function move2048(direction) {
  const session = miniGameSession;
  if (!session || session.type !== "2048" || session.over) return;
  const old = [...session.board];
  let gained = 0;
  for (let line = 0; line < 4; line++) {
    const indices = Array.from({ length: 4 }, (_, step) =>
      direction === "left" ? line * 4 + step :
        direction === "right" ? line * 4 + 3 - step :
          direction === "up" ? step * 4 + line : (3 - step) * 4 + line
    );
    const result = slideTileLine(indices.map(index => session.board[index]));
    gained += result.score;
    indices.forEach((index, step) => { session.board[index] = result.values[step]; });
  }
  if (old.every((value, index) => value === session.board[index])) return;
  session.score += gained;
  if (session.score > session.bestScore) {
    session.bestScore = session.score;
    saveMiniRecord("2048-best", session.bestScore);
  }
  add2048Tile();
  draw2048Board();
  if (session.board.includes(2048)) setMiniGameStatus(`대성공! 2048 완성 · 점수 ${session.score}`);
  const canMove = session.board.some(value => value === 0) ||
    session.board.some((value, index) =>
      index % 4 < 3 && value === session.board[index + 1] ||
      index < 12 && value === session.board[index + 4]
    );
  if (!canMove) {
    session.over = true;
    setMiniGameStatus(`게임 종료 · 최종 점수 ${session.score}`);
  }
}

function beginReaction() {
  const session = miniGameSession;
  if (!session || session.type !== "reaction") return;
  session.state = "waiting";
  const pad = document.querySelector("[data-reaction]");
  pad.className = "reaction-pad waiting";
  pad.textContent = "초록불을 기다리세요...";
  setMiniGameStatus("초록불이 켜지기 전에 누르면 실패예요!");
  const timeout = setTimeout(() => {
    miniGameTimeouts.delete(timeout);
    if (miniGameSession !== session || session.state !== "waiting") return;
    session.state = "go";
    session.startedAt = performance.now();
    pad.className = "reaction-pad go";
    pad.textContent = "지금!";
  }, 1200 + Math.random() * 2800);
  miniGameTimeouts.add(timeout);
}

function handleMiniGameChoice(game) {
  const session = miniGameSession;
  const content = document.getElementById("miniGameContent");
  if (!session) return;

  if (game.matches("[data-card-index]") && session.type === "memory" && !session.locked) {
    const index = Number(game.dataset.cardIndex);
    if (session.matched.has(index) || session.flipped.includes(index)) return;
    game.innerHTML = miniCharacterImage(session.cards[index]);
    game.classList.add("revealed");
    session.flipped.push(index);
    if (session.flipped.length < 2) return;
    session.moves++;
    const [first, second] = session.flipped;
    const cards = [...content.querySelectorAll("[data-card-index]")];
    if (session.cards[first].id === session.cards[second].id) {
      session.matched.add(first);
      session.matched.add(second);
      cards[first].classList.add("matched");
      cards[second].classList.add("matched");
      session.flipped = [];
      if (session.matched.size === session.cards.length) {
        const seconds = (performance.now() - session.startedAt) / 1000;
        const isRecord = session.bestSeconds === null || seconds < session.bestSeconds;
        if (isRecord) localStorage.setItem(`${SAVE_KEY}-memory-best-seconds`, String(seconds));
        content.querySelector(".mini-record").innerHTML =
          `완성 시간: <strong>${formatMiniTime(seconds)}</strong> · 최고 기록: <strong>${formatMiniTime(isRecord ? seconds : session.bestSeconds)}</strong>${isRecord ? " 🏆" : ""}`;
        setMiniGameStatus(`모두 찾았어요! ${session.moves}번 시도 · ${formatMiniTime(seconds)}${isRecord ? " · 새 최고 기록!" : ""}`);
      } else setMiniGameStatus(`짝을 찾았어요! 시도 ${session.moves}회`);
      return;
    }
    session.locked = true;
    setMiniGameStatus(`다시 찾아보세요 · 시도 ${session.moves}회`);
    const timeout = setTimeout(() => {
      miniGameTimeouts.delete(timeout);
      if (miniGameSession !== session) return;
      cards[first].textContent = "?";
      cards[second].textContent = "?";
      cards[first].classList.remove("revealed");
      cards[second].classList.remove("revealed");
      session.flipped = [];
      session.locked = false;
    }, 700);
    miniGameTimeouts.add(timeout);
    return;
  }
  if (game.matches("[data-snake-character]") && session.type === "snake" && session.choosingPlayer) {
    session.player = session.ownedCharacters.find(character => character.id === game.dataset.snakeCharacter);
    content.querySelectorAll("[data-snake-character]").forEach(choice => {
      const selected = choice === game;
      choice.classList.toggle("selected", selected);
      choice.setAttribute("aria-pressed", String(selected));
    });
    content.querySelector("[data-snake-start]").disabled = !session.player;
    return;
  }
  if (game.matches("[data-snake-start]") && session.type === "snake" && session.player) {
    renderMiniGame("snake-play", { playerId: session.player.id });
    return;
  }
  if (game.matches("[data-snake-direction]") && session.type === "snake") {
    setSnakeDirection(game.dataset.snakeDirection);
    return;
  }
  if (game.matches("[data-whack-index]") && session.type === "whack" && session.running) {
    if (Number(game.dataset.whackIndex) === session.activeIndex) {
      session.hits++;
      session.lastTargetChange = session.elapsed;
      chooseWhackTarget();
      setMiniGameStatus(`남은 시간 ${Math.ceil((20000 - session.elapsed) / 1000)}초 · 잡은 친구 ${session.hits}명`);
    }
    return;
  }
  if (game.matches("[data-mine-cell]") && session.type === "minesweeper") {
    const index = Number(game.dataset.mineCell);
    if (session.flagMode) toggleMineFlag(index);
    else revealMineCell(index);
    return;
  }
  if (game.matches("[data-mine-flag]") && session.type === "minesweeper") {
    session.flagMode = !session.flagMode;
    game.textContent = `깃발 모드: ${session.flagMode ? "켬" : "끔"}`;
    game.classList.toggle("selected", session.flagMode);
    return;
  }
  if (game.matches("[data-sliding-tile]") && session.type === "sliding") {
    moveSlidingTile(Number(game.dataset.slidingTile));
    return;
  }
  if (game.matches("[data-simon-pad]") && session.type === "simon" && session.acceptingInput) {
    const index = Number(game.dataset.simonPad);
    const pad = game;
    pad.classList.add("active");
    setTimeout(() => pad.classList.remove("active"), 180);
    if (index !== session.sequence[session.inputIndex]) {
      session.acceptingInput = false;
      setMiniGameStatus(`아쉬워요! ${session.sequence.length - 1}라운드까지 성공했어요.`);
      return;
    }
    session.inputIndex++;
    if (session.inputIndex === session.sequence.length) {
      session.score = session.sequence.length;
      session.acceptingInput = false;
      setMiniGameStatus(`정확해요! ${session.score}라운드 성공! 다음 순서도 기억해요.`);
      const timeout = setTimeout(() => {
        miniGameTimeouts.delete(timeout);
        if (miniGameSession === session) nextSimonRound();
      }, 700);
      miniGameTimeouts.add(timeout);
    }
    return;
  }
  if (game.matches("[data-arcade-move]") && ["breakout", "pong"].includes(session.type)) {
    const direction = Number(game.dataset.arcadeMove);
    session.paddle = clamp(session.paddle + direction * 0.08, 0.1, 0.9);
    return;
  }
  if (game.matches("[data-tile-direction]") && session.type === "2048") {
    move2048(game.dataset.tileDirection);
    return;
  }
  if (game.matches("[data-reaction]") && session.type === "reaction") {
    if (session.state === "ready") {
      beginReaction();
    } else if (session.state === "waiting") {
      for (const timeout of miniGameTimeouts) clearTimeout(timeout);
      miniGameTimeouts.clear();
      session.state = "ready";
      game.className = "reaction-pad";
      game.textContent = "다시 시작";
      setMiniGameStatus("아직 초록불이 아니에요! 준비되면 눌러주세요.");
    } else if (session.state === "go") {
      const reaction = performance.now() - session.startedAt;
      const bestKey = `${SAVE_KEY}-reaction-best-ms`;
      const previousBest = Number(localStorage.getItem(bestKey)) || Infinity;
      const isRecord = reaction < previousBest;
      if (isRecord) localStorage.setItem(bestKey, String(Math.round(reaction)));
      session.state = "ready";
      game.className = "reaction-pad";
      game.textContent = "한 번 더";
      content.querySelector("[data-reaction-best]").textContent =
        `이번 기록: ${Math.round(reaction)}ms · 최고 기록: ${formatMiniTime(isRecord ? reaction : previousBest, true)}${isRecord ? " 🏆" : ""}`;
      setMiniGameStatus(isRecord ? "새로운 최고 기록이에요!" : "기록 완료! 더 빠르게 눌러보세요.");
    }
  }
}



document.getElementById("openMiniGames")?.addEventListener("click", () => {
  showMiniGameMenu();
  openModal("miniGamesModal");
});
document.getElementById("miniGameMenu")?.addEventListener("click", event => {
  const choice = event.target.closest("[data-mini-game]");
  if (!choice) return;

  document.getElementById("miniGameMenu").hidden = true;
  document.getElementById("miniGameBack").hidden = false;
  renderMiniGame(choice.dataset.miniGame);
});
document.getElementById("miniGameBack")?.addEventListener("click", showMiniGameMenu);
document.getElementById("miniGameRestart")?.addEventListener("click", () => {
  if (!miniGameSession) return;
  if (miniGameSession.type === "snake" && miniGameSession.boardSize) {
    renderMiniGame("snake-play", { playerId: miniGameSession.player.id });
  } else renderMiniGame(miniGameSession.type);
});
document.getElementById("miniGameContent")?.addEventListener("click", event => {
  const gameChoice = event.target.closest("button");
  if (!gameChoice) return;
  handleMiniGameChoice(gameChoice);
});
document.getElementById("miniGameContent")?.addEventListener("contextmenu", event => {
  const cell = event.target.closest("[data-mine-cell]");
  if (!cell || miniGameSession?.type !== "minesweeper") return;
  event.preventDefault();
  toggleMineFlag(Number(cell.dataset.mineCell));
});
document.addEventListener("keydown", event => {
  const session = miniGameSession;
  if (!session || !document.getElementById("miniGamesModal")?.classList.contains("open")) return;
  const key = event.key.toLowerCase();
  if (session.type === "snake" && ["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"].includes(key)) {
    event.preventDefault();
    event.stopPropagation();
    const directions = { arrowleft: "left", a: "left", arrowright: "right", d: "right", arrowup: "up", w: "up", arrowdown: "down", s: "down" };
    setSnakeDirection(directions[key]);
    return;
  }
  if (session.type === "breakout" && ["arrowleft", "arrowright", "a", "d"].includes(key)) {
    event.preventDefault();
    session.paddle = clamp(session.paddle + (["arrowleft", "a"].includes(key) ? -0.035 : 0.035), 0.1, 0.9);
    return;
  }
  if (session.type === "pong" && ["arrowup", "arrowdown", "w", "s"].includes(key)) {
    event.preventDefault();
    session.paddle = clamp(session.paddle + (["arrowup", "w"].includes(key) ? -0.04 : 0.04), 0.1, 0.9);
    return;
  }
  if (session.type === "2048" && ["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(key)) {
    event.preventDefault();
    event.stopPropagation();
    move2048(key.replace("arrow", ""));
    return;
  }
  if (session.type === "reaction" && key === " ") {
    event.preventDefault();
    event.stopPropagation();
    document.querySelector("[data-reaction]")?.click();
  }
});

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
    if (event.target === backdrop) closeModal(backdrop.id);
  });
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    document.querySelectorAll(".modal-backdrop").forEach(modal => {
      closeModal(modal.id);
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
  if (!duplicate) residentCounts[character.id] = 1;

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

function getUndeployedCopyCount() {
  return CHARACTERS.reduce(
    (total, character) => total + Math.max(
      0,
      (owned[character.id] || 0) - (residentCounts[character.id] || 0)
    ),
    0
  );
}

function summonRandomOwnedCharacter() {
  const availableCopies = CHARACTERS
    .map(character => ({
      character,
      available: Math.max(
        0,
        (owned[character.id] || 0) - (residentCounts[character.id] || 0)
      )
    }))
    .filter(entry => entry.available > 0);

  const totalAvailable = availableCopies.reduce(
    (total, entry) => total + entry.available,
    0
  );
  if (!totalAvailable) {
    showToast("마을에 부를 수 있는 친구가 없어요.");
    return;
  }

  let choice = Math.floor(Math.random() * totalAvailable);
  const selected = availableCopies.find(entry => {
    choice -= entry.available;
    return choice < 0;
  });
  if (!selected) throw new Error("랜덤 소환 캐릭터를 선택하지 못했습니다.");

  residentCounts[selected.character.id] =
    (residentCounts[selected.character.id] || 0) + 1;
  syncVillagers();
  updateUI();
  showToast(`${selected.character.name}를 마을에 불렀어요.`);
}

function summonAllOwnedCharacters() {
  for (const character of CHARACTERS) {
    residentCounts[character.id] = owned[character.id] || 0;
  }
  syncVillagers();
  updateUI();
  showToast("보유한 친구를 모두 마을에 불렀어요.");
}

function getFusionSelectionCount() {
  return [...fusionSelections.values()].reduce((total, count) => total + count, 0);
}

function updateFusionSelectionUI() {
  const selectedCount = getFusionSelectionCount();
  const counter = document.getElementById("fusionSelectionCount");
  if (counter) counter.textContent = `선택 ${selectedCount} / 3`;

  const materials = document.getElementById("fusionMaterials");
  if (materials) {
    materials.innerHTML = [...fusionSelections.entries()]
      .flatMap(([characterId, count]) => {
        const character = CHARACTERS.find(item => item.id === characterId);
        if (!character) return [];
        return Array.from({ length: count }, () => `
          <span class="fusion-material">
            <img src="${character.images.idle}" alt="${character.name}">
            <span>${character.name}</span>
          </span>
        `);
      })
      .join("");
  }

  const confirmButton = document.getElementById("fusionConfirm");
  if (confirmButton) confirmButton.disabled = selectedCount !== 3;
}

function renderFusionSelection() {
  fusionSelections.clear();
  document.getElementById("fusionCompletion")?.classList.remove("show");
  const list = document.getElementById("fusionList");
  if (!list) return;

  list.innerHTML = CHARACTERS
    .filter(character => (owned[character.id] || 0) > 0)
    .map(character => `
      <label class="fusion-item">
        <img src="${character.images.idle}" alt="">
        <span>${character.name}<small>${character.rarity} · 보유 ${owned[character.id]}마리</small></span>
        <input type="number" min="0" max="${owned[character.id]}" step="1" value="0"
          data-fusion-character="${character.id}" aria-label="${character.name} 합성 수량">
      </label>
    `)
    .join("");

  updateFusionSelectionUI();
}

function fuseSelectedCharacters() {
  if (getFusionSelectionCount() !== 3) {
    showToast("합성할 캐릭터를 정확히 3마리 선택해주세요.");
    return;
  }

  const usedCharacters = [...fusionSelections.entries()].map(([characterId, count]) => {
    const character = CHARACTERS.find(item => item.id === characterId);
    if (!character) throw new Error(`합성 캐릭터를 찾을 수 없습니다: ${characterId}`);
    return { character, count };
  });

  for (const [characterId, count] of fusionSelections) {
    if (!owned[characterId] || count > owned[characterId]) {
      showToast("선택한 캐릭터 수량이 보유량보다 많아요.");
      return;
    }
  }

  for (const [characterId, count] of fusionSelections) {
    owned[characterId] -= count;
    residentCounts[characterId] = Math.min(
      residentCounts[characterId] || 0,
      owned[characterId]
    );
  }

  const character = chooseCharacter();
  const isNew = (owned[character.id] || 0) === 0;
  owned[character.id] = (owned[character.id] || 0) + 1;
  if (isNew) residentCounts[character.id] = 1;

  const used = document.getElementById("fusionUsed");
  if (used) {
    used.replaceChildren();
    used.textContent = `재료: ${usedCharacters
      .map(({ character: usedCharacter, count }) => `${usedCharacter.name} × ${count}`)
      .join(", ")}`;
  }
  const resultImage = document.getElementById("fusionResultImage");
  if (resultImage) {
    resultImage.src = character.images.idle;
    resultImage.alt = character.name;
  }
  const resultName = document.getElementById("fusionResultName");
  if (resultName) resultName.textContent = character.name;
  const resultRarity = document.getElementById("fusionResultRarity");
  if (resultRarity) resultRarity.textContent = character.rarity;

  fusionSelections.clear();
  for (const input of document.querySelectorAll("[data-fusion-character]")) {
    input.value = "0";
  }
  updateFusionSelectionUI();
  syncVillagers();
  updateUI();
  const completion = document.getElementById("fusionCompletion");
  completion?.classList.remove("show");
  void completion?.offsetWidth;
  completion?.classList.add("show");
  playSummonEffect();
  showToast(`합성 결과: ${character.name}${isNew ? "를 새로 만났어요!" : "를 얻었어요!"}`);
}

function resetGame() {
  if (!window.confirm("눈송이와 캐릭터 수집 기록을 모두 초기화할까요?")) return;

  coins = 300;
  for (const character of CHARACTERS) {
    owned[character.id] = 0;
    residentCounts[character.id] = 0;
  }
  owned[CHARACTERS[0].id] = 1;
  residentCounts[CHARACTERS[0].id] = 1;
  focusedVillager = null;
  syncVillagers();
  updateUI();
  showToast("마을을 처음 상태로 초기화했어요.");
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
    const orderedCharacters = CHARACTERS.filter(character => owned[character.id] > 0);

    collection.innerHTML = orderedCharacters.map(character => {
      const count = owned[character.id] || 0;
      const residents = residentCounts[character.id] || 0;

      return `
        <div class="resident-entry ${!residents ? "inactive" : ""}">
          <button class="resident-card ${count ? "" : "locked"}"
            data-focus-character="${character.id}"
            ${!count || !residents ? "disabled" : ""}
            title="${count ? `${character.name}에게 시점 고정` : "아직 만나지 못한 친구"}">
            ${count
              ? `<img class="resident-portrait" src="${character.images.idle}" alt="">`
              : "<span>?</span>"}
          </button>
          <div class="resident-tools" aria-label="${character.name} 마을 인원 조절">
            <button type="button" data-resident-action="remove" data-character="${character.id}"
              aria-label="${character.name} 한 명 빼기" title="맵에서 한 명 빼기" ${residents <= 0 ? "disabled" : ""}>−</button>
            <input type="number" data-resident-count data-character="${character.id}"
              min="0" max="${count}" step="1" value="${residents}"
              aria-label="${character.name} 마을 인원 수" title="마을에 둘 인원 수를 직접 입력하세요">
            <button type="button" data-resident-action="add" data-character="${character.id}"
              aria-label="${character.name} 한 명 추가" title="맵에 한 명 추가" ${residents >= count ? "disabled" : ""}>+</button>
          </div>
        </div>
      `;
    }).join("");
  }

  const availableCopies = getUndeployedCopyCount();
  const randomSummonButton = document.getElementById("randomSummon");
  if (randomSummonButton) randomSummonButton.disabled = availableCopies === 0;
  const summonAllButton = document.getElementById("summonAll");
  if (summonAllButton) summonAllButton.disabled = availableCopies === 0;
  const fuseButton = document.getElementById("fuseCharacters");
  const ownedCopies = CHARACTERS.reduce(
    (total, character) => total + (owned[character.id] || 0),
    0
  );
  if (fuseButton) fuseButton.disabled = ownedCopies < 3;
  const resetButton = document.getElementById("resetGame");
  if (resetButton) resetButton.hidden = discovered < CHARACTERS.length;

  const clearResidentsButton = document.getElementById("clearResidents");
  if (clearResidentsButton) {
    clearResidentsButton.disabled = villagers.length === 0;
  }

  if (summonButton) summonButton.disabled = coins < SUMMON_COST;

  saveGame();
}

document.getElementById("clearResidents")?.addEventListener("click", () => {
  for (const character of CHARACTERS) {
    residentCounts[character.id] = 0;
  }
  syncVillagers();
  updateUI();
  showToast("모든 친구를 마을에서 내보냈어요.");
});

document.getElementById("randomSummon")?.addEventListener(
  "click",
  summonRandomOwnedCharacter
);
document.getElementById("summonAll")?.addEventListener(
  "click",
  summonAllOwnedCharacters
);
document.getElementById("fuseCharacters")?.addEventListener(
  "click",
  () => {
    renderFusionSelection();
    openModal("fusionModal");
  }
);
document.getElementById("fusionList")?.addEventListener("input", event => {
  const input = event.target.closest("[data-fusion-character]");
  if (!input) return;

  const characterId = input.dataset.fusionCharacter;
  const remainingSlots = 3 - [...fusionSelections.entries()]
    .filter(([id]) => id !== characterId)
    .reduce((total, [, count]) => total + count, 0);
  const requested = Number(input.value);
  const count = Number.isFinite(requested)
    ? clamp(Math.floor(requested), 0, Math.min(owned[characterId] || 0, remainingSlots))
    : 0;
  input.value = String(count);
  if (count > 0) fusionSelections.set(characterId, count);
  else fusionSelections.delete(characterId);
  updateFusionSelectionUI();
});
document.getElementById("fusionConfirm")?.addEventListener(
  "click",
  fuseSelectedCharacters
);
document.getElementById("resetGame")?.addEventListener("click", resetGame);

document.getElementById("collection")?.addEventListener("click", event => {
  const actionButton = event.target.closest("[data-resident-action]");
  if (actionButton) {
    const characterId = actionButton.dataset.character;
    if (!characterId || !owned[characterId]) return;

    const adjustment = actionButton.dataset.residentAction === "add" ? 1 : -1;
    const currentCount = residentCounts[characterId] || 0;
    if (adjustment > 0 && currentCount >= owned[characterId]) {
      showToast("뽑은 횟수만큼 이미 마을에 있어요.");
      return;
    }

    residentCounts[characterId] = clamp(
      currentCount + adjustment,
      0,
      owned[characterId]
    );
    syncVillagers();
    updateUI();
    return;
  }

  const button = event.target.closest("[data-focus-character]");
  if (!button) return;

  const villager = villagerById.get(button.dataset.focusCharacter);

  if (!villager) {
    showToast("맵에 없는 친구예요. + 버튼으로 마을에 불러올 수 있어요.");
    return;
  }

  focusedVillager = villager;

  greetVillager(villager);
});

document.getElementById("collection")?.addEventListener("change", event => {
  const countInput = event.target.closest("[data-resident-count]");
  if (!countInput) return;

  const characterId = countInput.dataset.character;
  const inputValue = countInput.value.trim();
  const requestedCount = Number(inputValue);

  if (!characterId || !owned[characterId] || inputValue === "" || !Number.isFinite(requestedCount)) {
    updateUI();
    return;
  }

  residentCounts[characterId] = clamp(
    Math.floor(requestedCount),
    0,
    owned[characterId]
  );
  syncVillagers();
  updateUI();
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
  ctx.scale(mapZoom, mapZoom);
  ctx.translate(-cameraX, -cameraY);

  drawPixelSky(delta);
  drawMountains();
  drawGround();
  drawCelestial(time);
  drawDestination(time);

  [...villagers]
    .sort((a, b) => a.y - b.y)
    .forEach(villager => drawVillager(villager, time));

  ctx.restore();

  ctx = foregroundContext;
  try {
    ctx.clearRect(0, 0, screenWidth, screenHeight);
    ctx.save();
    ctx.scale(mapZoom, mapZoom);
    ctx.translate(-cameraX, -cameraY);
    drawVillage(time);
    drawLowerDecorations(time);
    drawCenterTree(time);
    ctx.restore();
    drawSnow(delta, time);
  } finally {
    ctx = mainContext;
  }

  updateDayNightOverlay();
}

function frame(time) {
  const delta = lastFrameTime
    ? Math.min(50, time - lastFrameTime)
    : 16;

  lastFrameTime = time;

  if (focusedVillager && villagers.includes(focusedVillager)) {
    cameraX = clamp(
      focusedVillager.x - screenWidth / mapZoom / 2,
      0,
      Math.max(0, worldWidth - screenWidth / mapZoom)
    );
    cameraY = clamp(
      focusedVillager.y - screenHeight / mapZoom / 2,
      0,
      Math.max(0, worldHeight - screenHeight / mapZoom)
    );
  } else {
    focusedVillager = null;
  }

  if (keysDown.has("ArrowLeft")) {
    cameraX = clamp(
      cameraX - 6 / mapZoom,
      0,
      Math.max(0, worldWidth - screenWidth / mapZoom)
    );
  }

  if (keysDown.has("ArrowRight")) {
    cameraX = clamp(
      cameraX + 6 / mapZoom,
      0,
      Math.max(0, worldWidth - screenWidth / mapZoom)
    );
  }
  if (keysDown.has("ArrowUp")) {
    cameraY = clamp(
      cameraY - 6 / mapZoom,
      0,
      Math.max(0, worldHeight - screenHeight / mapZoom)
    );
  }
  if (keysDown.has("ArrowDown")) {
    cameraY = clamp(
      cameraY + 6 / mapZoom,
      0,
      Math.max(0, worldHeight - screenHeight / mapZoom)
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