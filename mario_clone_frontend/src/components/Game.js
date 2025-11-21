import React, { useRef, useEffect, useState, useCallback } from "react";
import { useGameLoop, useKeyboard, useResize } from "../hooks/useGameLoop";
import {
  GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, level1, COLORS, 
  tile2px, px2tile, isSolid, isPlatform, isGround, isCoin, isEnemy, isFlag,
  PHYS, findSpawns, findCoins, rectsCollide, clamp
} from "../game/engine";

/**
 * Mario Clone Game
 * Controls: Arrow keys or A/D = Move, Space/Up = Jump. P = Pause, R = Restart
 * Objective: Collect coins, stomp enemies (jump on top), reach the flag to win. Good luck!
 */

const initialLives = 3;

const getPlayerRect = (p) => ({
  x: p.x, y: p.y, w: p.w, h: p.h
});
const getEntityRect = (e) => ({
  x: e.x, y: e.y, w: e.w, h: e.h
});

export default function Game() {
  // --- Game state
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState({ score: 0, coins: 0, lives: initialLives });
  const [state, setState] = useState(() => mkInitialGameState());
  const [showWin, setShowWin] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);

  // Responsive scaling/fitting
  const [canvasDim, setCanvasDim] = useState({ width: GAME_WIDTH, height: GAME_HEIGHT, scale: 1 });
  useResize(({ width, height }) => {
    // Calculate scale to fit window while maintaining aspect ratio
    const scale = Math.min(
      Math.max(Math.floor(width / GAME_WIDTH), 1),
      Math.floor(height / GAME_HEIGHT)
    );
    const w = Math.floor(GAME_WIDTH * scale);
    const h = Math.floor(GAME_HEIGHT * scale);
    setCanvasDim({ width: w, height: h, scale });
  });

  // Keyboard state
  const keysRef = useKeyboard();

  // --- Game Loop ---
  const canvasRef = useRef();

  // Animation/game engine
  useGameLoop(
    (dt) => { if (!paused && !showWin && !showGameOver) gameStep(dt); },
    !paused && !showWin && !showGameOver
  );

  // Main game step
  const gameStep = useCallback((dt) => {
    setState(prev => stepGame(prev, keysRef.current, dt));
  }, [keysRef]);

  // HUD update: coins/lives/score
  useEffect(() => {
    setHud({
      score: state.score,
      coins: state.collectedCoins.length,
      lives: state.lives,
    });
    if (state.win) setShowWin(true);
    if (state.lives <= 0 && !showGameOver) {
      setShowGameOver(true);
    }
  }, [state, showGameOver]);

  useEffect(() => {
    // Paint game
    const ctx = canvasRef.current.getContext("2d");
    drawGame(ctx, state, canvasDim.scale);
  }, [state, canvasDim]);

  // Keyboard events for pause/restart (P/R)
  useEffect(() => {
    function onKey(e) {
      if (e.key === "p" || e.key === "P") {
        setPaused(paused => !paused);
      }
      if (e.key === "r" || e.key === "R") {
        handleRestart();
      }
      if ((showGameOver || showWin) && e.key === "Enter") {
        handleRestart();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [showGameOver, showWin]);

  // --- Handlers
  function handlePause() {
    setPaused(p => !p);
  }
  function handleRestart() {
    setPaused(false);
    setShowWin(false);
    setShowGameOver(false);
    setState(mkInitialGameState());
  }

  // --- Types: [see mkInitialGameState for shape] ---

  // --- Render ---
  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: COLORS.background,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        position: "relative",
      }}
      tabIndex={0}
      aria-label="Mario Platformer Game"
    >
      <canvas
        ref={canvasRef}
        tabIndex={-1}
        aria-label="Mario Game Canvas"
        width={GAME_WIDTH}
        height={GAME_HEIGHT}
        style={{
          width: `${canvasDim.width}px`,
          height: `${canvasDim.height}px`,
          background: COLORS.surface,
          outline: "2px solid " + COLORS.primary,
          boxShadow: "0 4px 24px 0 #3b82f623",
          display: "block"
        }}
      />
      <HUD
        hud={hud}
        paused={paused}
        onPause={handlePause}
        onRestart={handleRestart}
        levelName={level1.name}
      />
      {(showWin || showGameOver) && (
        <OverlayScreen
          win={showWin}
          onRestart={handleRestart}
          score={hud.score}
        />
      )}
      <div
        style={{ position: "fixed", bottom: 16, left: 0, width: "100%", textAlign: "center", color: COLORS.secondary, fontSize: 14, letterSpacing: 0.3, pointerEvents: "none" }}
        aria-live="polite"
      >
        Controls: [←][→] or [A][D] — Move &nbsp;|&nbsp; [Space]/[↑] — Jump &nbsp; | &nbsp;[P] Pause &nbsp; [R] Restart
      </div>
    </div>
  );
}

// --- Core Game State & Step ---
function mkInitialGameState() {
  const { player, enemies } = findSpawns(level1);
  return {
    level: level1,
    player: {
      x: tile2px(player.x, player.y).x, y: tile2px(player.x, player.y).y - TILE_SIZE,
      dx: 0, dy: 0,
      w: 18, h: 22,
      dir: 1, // 1: right, -1: left
      grounded: false,
      jumping: false,
      wantsJump: false,
      coyote: 0,
      invuln: 0,
      animTimer: 0,
      frame: 0,
      dead: false,
      respawnTimer: 0,
    },
    camera: { x: 0, y: 0 },
    enemies: enemies.map(({ x, y }) => ({
      x: tile2px(x, y).x, y: tile2px(x, y).y,
      dx: PHYS.enemyPatrolSpeed, dy: 0,
      w: 20, h: 18,
      dead: false,
      patrolRange: { min: tile2px(x-2, 0).x, max: tile2px(x+2, 0).x }
    })),
    coins: findCoins(level1).map(({ x, y }) =>
      ({ x: tile2px(x, y).x + 6, y: tile2px(x, y).y + 5, r: 6, collected: false })
    ),
    collectedCoins: [],
    score: 0,
    lives: initialLives,
    win: false,
    timer: 0,
    started: true,
  };
}

// The main game advance step
function stepGame(prev, keys, dt) {
  let st = { ...prev, timer: prev.timer + dt };
  let p = { ...st.player };

  /*** 1. ---- PLAYER INPUT & PHYSICS ---- ***/
  // Input: left/right/A/D
  const left = keys["ArrowLeft"] || keys["KeyA"];
  const right = keys["ArrowRight"] || keys["KeyD"];
  const up = keys["ArrowUp"] || keys["Space"];
  let wantsJump = Boolean(up);

  // Move
  if (left) {
    p.dx -= PHYS.moveAccel * dt;
    p.dir = -1;
  } else if (right) {
    p.dx += PHYS.moveAccel * dt;
    p.dir = 1;
  }
  // Friction
  p.dx *= p.grounded ? Math.pow(PHYS.frictionGround, dt * 60) : Math.pow(PHYS.frictionAir, dt * 60);

  // Clamp max speed
  p.dx = clamp(p.dx, -PHYS.maxDX, PHYS.maxDX);

  // Gravity
  if (!p.grounded) p.dy += PHYS.gravity * dt;
  // Clamp fall speed
  p.dy = clamp(p.dy, -PHYS.maxDY, PHYS.maxDY);

  // Coyote time for jump leniency after walking off edge
  p.coyote = (p.grounded || p.coyote > 0) ? PHYS.coyoteMs : Math.max(p.coyote - dt * 1000, 0);

  // Jump logic
  if (
    wantsJump && !p.jumping &&
    (p.grounded || p.coyote > 0)
  ) {
    p.dy = -PHYS.jumpVel;
    p.grounded = false;
    p.jumping = true;
    p.coyote = 0;
  }
  if (!wantsJump) {
    p.jumping = false;
  }

  // Move in X
  let movedX = tryPlayerMoveX(st.level, p, dt);
  // Move in Y
  let movedY = tryPlayerMoveY(st.level, movedX, dt);

  // Update anim
  movedY.animTimer += dt;
  if (Math.abs(movedY.dx) > 12) {
    movedY.frame = Math.floor(movedY.animTimer * 8) % 2;
  } else {
    movedY.frame = 0;
  }

  /*** 2. ---- ENEMY PHYSICS/AI ---- ***/
  let newEnemies = st.enemies.map(e => {
    if (e.dead) return { ...e };
    let ex = { ...e };
    ex.dx = clamp(ex.dx, -PHYS.enemyPatrolSpeed, PHYS.enemyPatrolSpeed);
    ex.x += ex.dx * dt;
    // Change direction if hit patrol edge or ground edge or wall
    if (ex.x < ex.patrolRange.min) {
      ex.x = ex.patrolRange.min;
      ex.dx = Math.abs(ex.dx);
    } else if (ex.x > ex.patrolRange.max) {
      ex.x = ex.patrolRange.max;
      ex.dx = -Math.abs(ex.dx);
    }
    // Check for platform edge
    const below = getTile(st.level, ex.x + ex.w / 2, ex.y + ex.h + 1);
    if (!isGround(below)) {
      ex.dx = -ex.dx;
    }
    return ex;
  });

  /*** 3. ---- COLLISION: Player vs enemies ---- ***/
  let playerDied = false, stompedEnemies = [];
  for (let i = 0; i < newEnemies.length; ++i) {
    let e = newEnemies[i];
    if (e.dead) continue;
    if (rectsCollide(getPlayerRect(movedY), getEntityRect(e))) {
      // Stomp if falling and mostly above enemy
      if (
        movedY.dy > 30 &&
        movedY.y + movedY.h - 6 < e.y + 8 &&
        movedY.y < e.y
      ) {
        newEnemies[i] = { ...e, dead: true };
        movedY.dy = -PHYS.jumpVel * 0.7;
        movedY.grounded = false;
        stompedEnemies.push(i);
      } else if (movedY.invuln <= 0) {
        // Side hit: player "dies"
        movedY.lives = st.lives - 1;
        movedY.dead = true;
        movedY.respawnTimer = 0.9;
        movedY.invuln = PHYS.invulnMs;
        playerDied = true;
        break;
      }
    }
  }

  /*** 4. ---- COLLISION: Player vs coins ---- ***/
  let collectedCoins = [...st.collectedCoins];
  let coins = [...st.coins];
  let scoreInc = 0;
  for (let i = 0; i < coins.length; ++i) {
    let c = coins[i];
    if (!c.collected && circleBoxCollide(c.x, c.y, c.r, getPlayerRect(movedY))) {
      coins[i] = { ...c, collected: true };
      collectedCoins.push(i);
      scoreInc += 10;
    }
  }

  /*** 5. ---- COLLISION: Player vs Flag ---- ***/
  let win = false;
  let playerTile = px2tile(movedY.x + movedY.w / 2, movedY.y + movedY.h / 2);
  if (isFlag(getTile(st.level, movedY.x + movedY.w / 2, movedY.y + movedY.h / 2))) {
    win = true;
    scoreInc += 100;
  }

  /*** 6. ---- PLAYER DEATH/RESPAWN ---- ***/
  if (movedY.dead) {
    movedY.invuln = PHYS.invulnMs;
    movedY.respawnTimer -= dt;
    if (movedY.respawnTimer <= 0) {
      // Respawn at start, brief invuln, reset x/y, do not reset coins/enemies!
      const { player } = findSpawns(st.level);
      let xy = tile2px(player.x, player.y);
      movedY.x = xy.x;
      movedY.y = xy.y - TILE_SIZE;
      movedY.dx = 0;
      movedY.dy = 0;
      movedY.dir = 1;
      movedY.grounded = false;
      movedY.dead = false;
      movedY.invuln = PHYS.invulnMs;
    }
  } else if (movedY.invuln > 0) {
    movedY.invuln -= dt * 1000;
    if (movedY.invuln < 0) movedY.invuln = 0;
  }

  // Clamp to world
  movedY.x = clamp(movedY.x, 0, st.level.width * TILE_SIZE - movedY.w);
  movedY.y = clamp(movedY.y, 0, (st.level.height - 1) * TILE_SIZE - movedY.h);

  /*** 7. ---- CAMERA: follow player --- ***/
  let cx = clamp(movedY.x + movedY.w/2 - GAME_WIDTH/2, 0, st.level.width*TILE_SIZE - GAME_WIDTH);
  let camera = { x: cx, y: 0 };

  return {
    ...st,
    player: movedY,
    enemies: newEnemies,
    coins,
    collectedCoins,
    score: st.score + scoreInc + stompedEnemies.length * 50,
    lives: movedY.lives ?? st.lives,
    camera,
    win,
  };
}

// --- Physics/collision helpers ---
function getTile(level, px, py) {
  const { x, y } = px2tile(px, py);
  if (x < 0 || x >= level.width || y < 0 || y >= level.height)
    return 0;
  return level.tiles[y][x];
}
function tryPlayerMoveX(level, p, dt) {
  let np = { ...p, x: p.x + p.dx * dt };
  // Resolve solid (1) and platform (2) for horizontal
  let tx = np.dx > 0
    ? Math.floor((np.x + np.w) / TILE_SIZE)
    : Math.floor(np.x / TILE_SIZE);
  let tyTop = Math.floor(np.y / TILE_SIZE);
  let tyBot = Math.floor((np.y + np.h - 1) / TILE_SIZE);
  // Bounds
  for (let ty = tyTop; ty <= tyBot; ++ty) {
    let t = getTile(level, np.x + (np.dx > 0 ? np.w : 0), np.y + p.h / 2);
    if (isSolid(t)) {
      np.x = p.dx > 0
        ? tx * TILE_SIZE - np.w
        : (tx+1) * TILE_SIZE;
      np.dx = 0;
      break;
    }
  }
  return np;
}
function tryPlayerMoveY(level, p, dt) {
  let np = { ...p, y: p.y + p.dy * dt };
  np.grounded = false;
  // Downward: ground/platform collision
  if (p.dy >= 0) {
    let txLeft = Math.floor(np.x / TILE_SIZE);
    let txRight = Math.floor((np.x + np.w - 1) / TILE_SIZE);
    let tyBot = Math.floor((np.y + np.h) / TILE_SIZE);
    for (let tx = txLeft; tx <= txRight; ++tx) {
      let t = level.tiles[tyBot]?.[tx];
      if (isGround(t) || isPlatform(t)) {
        np.y = tyBot * TILE_SIZE - np.h;
        np.dy = 0;
        np.grounded = true;
        np.coyote = PHYS.coyoteMs;
      }
    }
  }
  // Upward: hit ceiling
  if (p.dy < 0) {
    let txLeft = Math.floor(np.x / TILE_SIZE);
    let txRight = Math.floor((np.x + np.w - 1) / TILE_SIZE);
    let tyTop = Math.floor(np.y / TILE_SIZE);
    for (let tx = txLeft; tx <= txRight; ++tx) {
      let t = level.tiles[tyTop]?.[tx];
      if (isSolid(t)) {
        np.y = (tyTop + 1) * TILE_SIZE;
        np.dy = 0;
      }
    }
  }
  return np;
}

// Circle/Rect collision (for coins)
function circleBoxCollide(cx, cy, cr, rect) {
  let testX = clamp(cx, rect.x, rect.x + rect.w);
  let testY = clamp(cy, rect.y, rect.y + rect.h);
  let distX = cx - testX;
  let distY = cy - testY;
  return (distX * distX + distY * distY) < (cr * cr + 0.5);
}

// --- Drawing ---
function drawGame(ctx, st, scale) {
  ctx.save();
  ctx.setTransform(scale, 0, 0, scale, 0, 0); // Scale to screen size
  // Camera
  ctx.translate(-Math.floor(st.camera.x), -Math.floor(st.camera.y));
  // BG
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(st.camera.x, st.camera.y, GAME_WIDTH, GAME_HEIGHT);

  //--- Draw Level Tiles ---
  for (let y = 0; y < st.level.height; ++y) {
    for (let x = 0; x < st.level.width; ++x) {
      let tile = st.level.tiles[y][x];
      let rx = x * TILE_SIZE, ry = y * TILE_SIZE;
      if (isGround(tile)) {
        ctx.fillStyle = COLORS.secondary;
        ctx.fillRect(rx, ry, TILE_SIZE, TILE_SIZE);
      } else if (isPlatform(tile)) {
        ctx.fillStyle = COLORS.primary;
        ctx.fillRect(rx+2, ry+TILE_SIZE-8, TILE_SIZE-4, 6);
      } else if (isFlag(tile)) {
        ctx.save();
        ctx.strokeStyle = COLORS.success;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(rx+TILE_SIZE/2, ry+4);
        ctx.lineTo(rx+TILE_SIZE/2, ry+TILE_SIZE);
        ctx.stroke();
        ctx.fillStyle = COLORS.success;
        ctx.beginPath();
        ctx.arc(rx+TILE_SIZE/2, ry+8, 6, 0, 2*Math.PI);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  //-- Draw coins
  st.coins.forEach((c, i) => {
    if (!c.collected) {
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, 2 * Math.PI);
      ctx.fillStyle = "#FFD700";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = COLORS.primary;
      ctx.stroke();
      ctx.restore();
    }
  });

  //-- Draw Enemies
  st.enemies.forEach(e => {
    if (!e.dead) {
      ctx.save();
      ctx.fillStyle = COLORS.error;
      ctx.strokeStyle = COLORS.secondary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(e.x, e.y, e.w, e.h);
      ctx.fill();
      ctx.stroke();
      // Eyes
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(e.x + 6, e.y + 7, 2.2, 0, 2*Math.PI);
      ctx.arc(e.x + 14, e.y + 7, 2.2, 0, 2*Math.PI);
      ctx.fill();
      ctx.restore();
    }
  });

  //-- Draw Player
  const p = st.player;
  ctx.save();
  const invulnAlpha = (p.invuln && p.invuln > 0)
    ? (Math.abs(Math.sin(st.timer*18)) > 0.5 ? 0.6 : 1)
    : 1;
  ctx.globalAlpha = invulnAlpha;
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
  if (p.dir < 0) ctx.scale(-1, 1);
  ctx.translate(-p.w / 2, -p.h / 2);
  ctx.fillStyle = COLORS.primary;
  ctx.fillRect(0, 0, p.w, p.h);
  // Face (basic)
  ctx.fillStyle = COLORS.success;
  ctx.fillRect(6, 6, 5, 5);
  ctx.fillStyle = COLORS.text;
  ctx.fillRect(6, 14, 5, 3);
  ctx.restore();
  
  ctx.restore();
}


// --- HUD/Overlay Components ---
function HUD({ hud, paused, onPause, onRestart, levelName }) {
  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, width: "100vw", pointerEvents: "none", zIndex: 90,
        display: "flex", justifyContent: "center"
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        style={{
          background: "#fffdfbdc",
          boxShadow: "0 3px 16px #3b82f610",
          margin: 10,
          padding: "8px 18px",
          borderRadius: 18,
          border: "2px solid " + COLORS.primary,
          color: COLORS.text,
          fontSize: 17,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: "2em",
          pointerEvents: "auto"
        }}
      >
        <span style={{ color: COLORS.secondary }}>Score: <b>{hud.score}</b></span>
        <span style={{ color: COLORS.success }}>Coins: <b>{hud.coins}</b></span>
        <span style={{ color: COLORS.primary }}>Lives: <b>{hud.lives}</b></span>
        <span style={{ fontSize: "0.94em", color: COLORS.secondary, fontWeight: 400 }}>
          {levelName}
        </span>
        <button
          style={buttonStyle(paused ? COLORS.primary : COLORS.secondary)}
          onClick={() => onPause()}
          tabIndex={0}
        >
          {paused ? "Resume" : "Pause"}
        </button>
        <button
          style={buttonStyle(COLORS.success)}
          onClick={() => onRestart()}
          tabIndex={0}
        >
          Restart
        </button>
      </div>
    </div>
  );
}
function OverlayScreen({ win, onRestart, score }) {
  return (
    <div
      style={{
        position: "fixed", left: 0, top: 0, width: "100vw", height: "100vh",
        background: "#0008", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column",
        zIndex: 150, pointerEvents: "auto",
      }}
      aria-modal="true"
      aria-label={win ? "You win!" : "Game Over"}
      tabIndex={0}
      role="dialog"
    >
      <div
        style={{
          background: COLORS.surface,
          color: COLORS.text,
          border: `3px solid ${win ? COLORS.success : COLORS.primary}`,
          borderRadius: 32,
          padding: "40px 54px 28px 54px",
          minWidth: 330,
          textAlign: "center",
          boxShadow: "0 16px 42px #06b6d422",
        }}
      >
        <div style={{
          fontSize: 38, fontWeight: "bold", color: win ? COLORS.primary : COLORS.error,
          paddingBottom: 12
        }}>
          {win ? "🏁 You Win!" : "❌ Game Over!"}
        </div>
        <div style={{ color: COLORS.secondary, fontSize: 22, marginBottom: 6 }}>
          Score: {score}
        </div>
        <div style={{ color: COLORS.secondary, fontSize: 17 }}>
          {win
            ? "Congratulations! You reached the flag.\nPress Enter or Restart to play again."
            : "Better luck next time!\nPress Enter or Restart to try again."}
        </div>
        <button
          style={{
            ...buttonStyle(win ? COLORS.success : COLORS.primary),
            minWidth: 120, fontSize: 17, marginTop: 26
          }}
          onClick={onRestart}
          autoFocus
        >Restart</button>
      </div>
    </div>
  );
}

function buttonStyle(color) {
  return {
    background: color,
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontWeight: 600,
    padding: "8px 19px",
    fontSize: 16,
    marginLeft: 6,
    cursor: "pointer",
    outline: "2px solid transparent",
    transition: "background 0.16s, outline 0.16s",
    pointerEvents: "auto",
  };
}
