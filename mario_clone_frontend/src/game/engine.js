//
// Mario Clone Game Engine Utilities: Physics, Entities, Level, Collision
//

// --- Constants/config ---
export const GAME_WIDTH = 384;
export const GAME_HEIGHT = 216;
export const TILE_SIZE = 24;

// Theme colors (light, primary, success, secondary, text)
export const COLORS = {
  background: "#f9fafb",
  surface: "#ffffff",
  primary: "#3b82f6",
  success: "#06b6d4",
  secondary: "#64748b",
  error: "#EF4444",
  text: "#111827",
};

// --- Utility: Clamp a number
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

// --- Level Data ---
// 0 = air, 1 = ground, 2 = platform (can fall through sides), 3 = coin, 4 = enemy start, 5 = flag 
export const level1 = {
  name: "Level 1: Go Go Mario!",
  width: 32,
  height: 10,
  tiles: [
    // 0: air, 1: ground, 2: platform, 3: coin, 4: enemy, 5: flag
    // Each row: 32 columns
    // Top row is y=0, left is x=0
    [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], // y=0 (top)
    [0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0], // y=1
    [0,0,0,0,0,0,0,0,0,0,3,0,0,0,0,0,0,0,0,4,0,0,3,0,0,0,2,0,0,0,0,0], // y=2
    [0,0,0,2,0,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,3,0,0,0,0,0,0], // y=3
    [0,0,0,0,0,0,0,2,0,0,0,3,0,0,0,0,0,0,2,0,0,0,0,0,0,0,4,0,0,0,0,0], // y=4
    [0,0,0,0,0,0,3,0,0,4,0,0,2,0,0,0,0,2,0,0,0,0,0,0,0,0,0,0,3,0,0,0], // y=5
    [0,0,0,0,0,2,0,0,0,0,0,0,0,3,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,0,0],  // y=6
    [0,0,0,0,2,0,0,0,0,4,0,3,0,0,0,4,0,0,0,3,0,0,0,0,0,0,0,0,0,2,0,5], // y=7 (flag at right)
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // y=8 (ground)
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // y=9 (bottom, invisible buffer)
  ],
};

// Tiles that block player horizontal/vertical movement
export function isSolid(t) { return t === 1 || t === 2 || t === 5; }
export function isPlatform(t) { return t === 2; }
export function isGround(t) { return t === 1; }
export function isCoin(t) { return t === 3; }
export function isEnemy(t) { return t === 4; }
export function isFlag(t) { return t === 5; }

// --- Rect collision (AABB) ---
export function rectsCollide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// --- Physics/Entity mechanics ---
// Basic gravity, jump, friction
export const PHYS = {
  gravity: 900, // px/s^2
  moveAccel: 800, // left/right
  maxDX: 180,     // max x velocity
  maxDY: 450,     // max y velocity
  jumpVel: 340,
  frictionGround: 0.78, // multiplier per second
  frictionAir: 0.93,
  coyoteMs: 100,  // ms of jump ability after walk/jump off ledge
  invulnMs: 1100,
  enemyPatrolSpeed: 60,
};

// Spawns for entities
export function findSpawns(level) {
  let player = { x: 1, y: 5 };
  const enemies = [];
  for (let y = 0; y < level.tiles.length; ++y) {
    for (let x = 0; x < level.width; ++x) {
      const t = level.tiles[y][x];
      if (isEnemy(t)) enemies.push({ x, y });
    }
  }
  return { player, enemies };
}

// Find all coins (for initial coin count)
export function findCoins(level) {
  const coins = [];
  for (let y = 0; y < level.tiles.length; ++y) {
    for (let x = 0; x < level.width; ++x) {
      if (isCoin(level.tiles[y][x])) coins.push({ x, y });
    }
  }
  return coins;
}

// --- Convert tile coords to world units (pixels)
export function tile2px(tx, ty) {
  return { x: tx * TILE_SIZE, y: ty * TILE_SIZE };
}
export function px2tile(x, y) {
  return { x: Math.floor(x / TILE_SIZE), y: Math.floor(y / TILE_SIZE) };
}
