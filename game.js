'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── ShootingStar (bonus fugaz, no envuelve) ───────────────────────────────────
const STAR_RADIUS = 12;
const SPARK_RADIUS = 6;
const STAR_SPEED = 130;
const SPARK_SPEED = 170;
const STAR_POINTS = 150;
const SPARK_POINTS = 50;
const SHOOTING_STAR_MIN = 8;    // segundos entre apariciones
const SHOOTING_STAR_MAX = 12;
const DESPAWN_MARGIN = 40;

class ShootingStar {
  constructor(x, y, vx, vy, isSpark = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.isSpark = isSpark;
    this.radius = isSpark ? SPARK_RADIUS : STAR_RADIUS;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Dejar estela temporal en la trayectoria
    if (typeof trails !== 'undefined' && trails) {
      trails.push(new Trail(this.x, this.y, this.isSpark));
      if (trails.length > 400) trails.splice(0, trails.length - 400);
    }
    if (
      this.x < -DESPAWN_MARGIN || this.x > W + DESPAWN_MARGIN ||
      this.y < -DESPAWN_MARGIN || this.y > H + DESPAWN_MARGIN
    ) this.dead = true;
  }

  split() {
    if (this.isSpark) return [];
    const sparks = [];
    for (let i = 0; i < 2; i++) {
      const angle = rand(0, Math.PI * 2);
      const speed = SPARK_SPEED + rand(-15, 15);
      sparks.push(new ShootingStar(
        this.x, this.y,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        true
      ));
    }
    return sparks;
  }

  draw() {
    const speed = Math.hypot(this.vx, this.vy) || 1;
    const nx = this.vx / speed;
    const ny = this.vy / speed;
    const tailLen = this.isSpark ? 18 : 32;
    const outer = this.isSpark ? 7 : 13;
    const inner = outer * 0.45;
    // Orientar una punta en la dirección de vuelo
    const baseAngle = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    ctx.save();
    ctx.translate(this.x, this.y);
    // Cola brillante opuesta a la velocidad
    ctx.strokeStyle = this.isSpark
      ? 'rgba(255, 230, 109, 0.7)'
      : 'rgba(255, 230, 109, 0.9)';
    ctx.lineWidth = this.isSpark ? 1.5 : 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-nx * tailLen, -ny * tailLen);
    ctx.stroke();
    // Estrella de 5 puntas rellena con resplandor amarillo
    ctx.rotate(baseAngle);
    ctx.shadowColor = '#ffe66d';
    ctx.shadowBlur = this.isSpark ? 8 : 14;
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
const SKINS = [
  { id: 'classic', name: 'CLASSIC', stroke: '#fff',    flame: 'rgba(255, 130, 0, 0.85)', shape: 'classic' },
  { id: 'neon',    name: 'NEON',    stroke: '#0ff',    flame: 'rgba(0, 255, 255, 0.9)',  shape: 'dart' },
  { id: 'ember',   name: 'EMBER',   stroke: '#ff5544', flame: 'rgba(255, 90, 40, 0.9)',  shape: 'wide' },
  { id: 'gold',    name: 'GOLD',    stroke: '#ffd447', flame: 'rgba(255, 200, 60, 0.9)', shape: 'needle' },
  { id: 'phantom', name: 'PHANTOM', stroke: '#b366ff', flame: 'rgba(179, 102, 255, 0.9)', shape: 'phantom' },
  { id: 'viper',   name: 'VIPER',   stroke: '#39ff6a', flame: 'rgba(57, 255, 106, 0.9)',  shape: 'viper' },
  { id: 'nova',    name: 'NOVA',    stroke: '#ff3da6', flame: 'rgba(255, 61, 166, 0.9)',  shape: 'nova' },
  { id: 'frost',   name: 'FROST',   stroke: '#6ca8ff', flame: 'rgba(108, 168, 255, 0.9)', shape: 'frost' },
];
const SKIN_KEY = 'asteroids-skin';

function loadSkinIndex() {
  try {
    const raw = localStorage.getItem(SKIN_KEY);
    const i = SKINS.findIndex(s => s.id === raw);
    return i >= 0 ? i : 0;
  } catch { return 0; }
}

function saveSkinIndex(i) {
  try { localStorage.setItem(SKIN_KEY, SKINS[i].id); } catch {}
}

// Traza el casco de la nave según la forma de la skin (sin stroke/fill).
// Todas las formas miran hacia +X con la nariz en ~x=20 para no alterar
// la hitbox (ship.radius) ni la posición de salida de las balas.
function traceHull(shape) {
  ctx.beginPath();
  switch (shape) {
    case 'dart':      // morro largo y estrecho
      ctx.moveTo( 26,  0);
      ctx.lineTo(-14, -7);
      ctx.lineTo( -8,  0);
      ctx.lineTo(-14,  7);
      break;
    case 'wide':      // alas anchas en flecha
      ctx.moveTo( 16,  0);
      ctx.lineTo(-10, -13);
      ctx.lineTo( -4,  0);
      ctx.lineTo(-10,  13);
      break;
    case 'needle':    // aguja fina y alargada
      ctx.moveTo( 24,  0);
      ctx.lineTo(-12, -5);
      ctx.lineTo( -6,  0);
      ctx.lineTo(-12,  5);
      break;
    case 'phantom':   // rombo facetado
      ctx.moveTo( 20,  0);
      ctx.lineTo( -2, -10);
      ctx.lineTo(-12,  0);
      ctx.lineTo( -2,  10);
      break;
    case 'viper':     // doble aleta trasera en W
      ctx.moveTo( 20,  0);
      ctx.lineTo(-12, -11);
      ctx.lineTo( -5,  -4);
      ctx.lineTo( -8,   0);
      ctx.lineTo( -5,   4);
      ctx.lineTo(-12,  11);
      break;
    case 'nova':      // punta de flecha robusta
      ctx.moveTo( 22,  0);
      ctx.lineTo( -6, -10);
      ctx.lineTo(-12,  -4);
      ctx.lineTo(-12,   4);
      ctx.lineTo( -6,  10);
      break;
    case 'frost':     // casco facetado de 6 puntas
      ctx.moveTo( 18,  0);
      ctx.lineTo( -6, -6);
      ctx.lineTo(-14, -8);
      ctx.lineTo( -9,  0);
      ctx.lineTo(-14,  8);
      ctx.lineTo( -6,  6);
      break;
    case 'classic':
    default:          // triángulo con muesca trasera
      ctx.moveTo( 20,  0);   // nariz
      ctx.lineTo(-12, -9);   // ala izquierda
      ctx.lineTo( -7,  0);   // muesca trasera
      ctx.lineTo(-12,  9);   // ala derecha
      break;
  }
  ctx.closePath();
}

class Ship {
  constructor() {
    this.skinIndex = loadSkinIndex();
    this.reset();
  }

  get skin() { return SKINS[this.skinIndex] ?? SKINS[0]; }

  setSkin(i) {
    this.skinIndex = ((i % SKINS.length) + SKINS.length) % SKINS.length;
    saveSkinIndex(this.skinIndex);
  }

  cycleSkin(dir = 1) { this.setSkin(this.skinIndex + dir); }

  reset() {
    const skinIndex = (typeof this.skinIndex === 'number') ? this.skinIndex : loadSkinIndex();
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.boost         = 0;
    this.shield        = 0;
    this.triple        = 0;
    this.dead          = false;
    this.skinIndex     = skinIndex;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.boost         > 0) this.boost         -= dt;
    if (this.shield        > 0) this.shield        -= dt;
    if (this.triple        > 0) this.triple        -= dt;

    const ROT    = 3.5;  // rad/s
    const THRUST = 260 * (this.boost > 0 ? 2 : 1);  // px/s², x2 con speed boost
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.triple > 0) {
      const SPREAD = 0.2;
      return [this.angle - SPREAD, this.angle, this.angle + SPREAD]
        .map(a => new Bullet(ox, oy, a));
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Escudo: círculo azul siempre visible mientras está activo,
    // incluso durante el parpadeo de invencibilidad de reaparición.
    if (this.shield > 0) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = SHIELD_COLOR;
      ctx.lineWidth   = 2;
      ctx.shadowColor = SHIELD_COLOR;
      ctx.shadowBlur  = 12;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    const boosted = this.boost > 0;
    const tripled = this.triple > 0;
    const skin = this.skin;
    ctx.strokeStyle = tripled ? TRIPLE_COLOR : boosted ? BOOST_COLOR : skin.stroke;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta según la forma de la skin (color + shape shift)
    traceHull(skin.shape || 'classic');
    ctx.stroke();

    // Detalle de cabina para las formas facetadas (refuerza el shape shift)
    if (skin.shape === 'phantom' || skin.shape === 'nova' || skin.shape === 'frost') {
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-2, 0);
      ctx.stroke();
    } else if (skin.shape === 'viper' || skin.shape === 'wide') {
      ctx.beginPath();
      ctx.arc(2, 0, 2.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(boosted ? 12 : 6, boosted ? 24 : 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = boosted ? 'rgba(0, 255, 255, 0.9)' : skin.flame;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Trail (estela temporal de la estrella fugaz) ─────────────────────────────
class Trail {
  constructor(x, y, isSpark = false) {
    this.x = x;
    this.y = y;
    this.life = isSpark ? 0.3 : 0.5;
    this.ttl  = this.life;
    this.r    = isSpark ? 2.5 : 4;
    this.dead = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const t = Math.max(this.ttl / this.life, 0);
    ctx.fillStyle = `rgba(255, 230, 109, ${(t * 0.6).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * t + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── PowerUp (boost / shield / triple-shot) ─────────────────────────────────────
const BOOST_DURATION  = 5;    // segundos de velocidad x2
const SHIELD_DURATION = 5;    // segundos de invulnerabilidad
const TRIPLE_DURATION = 5;    // segundos de triple disparo
const SHIELD_COLOR    = '#4d7cff';
const BOOST_COLOR     = '#0ff';
const TRIPLE_COLOR    = '#f0f';
const POWERUP_TTL    = 10;   // segundos antes de desaparecer si no se recoge
const POWERUP_EVERY  = 13;   // segundos entre intentos de aparición

class PowerUp {
  constructor(x, y, type = 'boost') {
    this.x = x;
    this.y = y;
    this.type = type;   // 'boost' | 'shield' | 'triple'
    const angle = rand(0, Math.PI * 2);
    const speed = rand(10, 30);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.ttl    = POWERUP_TTL;
    this.radius = 10;
    this.dead   = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const blink = this.ttl < 3 ? (Math.floor(this.ttl * 6) % 2 === 0) : true;
    if (!blink) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.type === 'shield') {
      // Pickup de escudo: círculo azul con "S"
      ctx.strokeStyle = SHIELD_COLOR;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = SHIELD_COLOR;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = SHIELD_COLOR;
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('S', 0, 3.5);
      ctx.restore();
      return;
    }
    const color = this.type === 'triple' ? TRIPLE_COLOR : BOOST_COLOR;
    const label = this.type === 'triple' ? '3x' : '2x';
    // Estrella de 5 puntas (boost / triple)
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 10 : 4.5;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, 3.5);
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups, shootingStars, trails;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let powerupTimer;
let shootingStarTimer;
let skinNotice = 0;   // segundos restantes del aviso "SKIN: X"

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnPowerup() {
  // Máximo 1 pickup activo en pantalla; tipo aleatorio entre los 3
  if (powerups.length > 0) return;
  const SAFE_DIST = 130;
  let x, y;
  do {
    x = rand(0, W);
    y = rand(0, H);
  } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
  const r = Math.random();
  const type = r < 1 / 3 ? 'boost' : r < 2 / 3 ? 'shield' : 'triple';
  powerups.push(new PowerUp(x, y, type));
}

function resetShootingStarTimer() {
  shootingStarTimer = rand(SHOOTING_STAR_MIN, SHOOTING_STAR_MAX);
}

function spawnShootingStar() {
  // Máximo 1 estrella fugaz viva; entra por un borde apuntando a la nave
  if (shootingStars.length > 0) { resetShootingStarTimer(); return; }
  const speed = STAR_SPEED + rand(-10, 10);
  const edge = randInt(0, 3);
  let x, y;
  if (edge === 0) {          // izquierda
    x = -20; y = rand(0, H);
  } else if (edge === 1) {   // derecha
    x = W + 20; y = rand(0, H);
  } else if (edge === 2) {   // arriba
    x = rand(0, W); y = -20;
  } else {                   // abajo
    x = rand(0, W); y = H + 20;
  }
  // Apuntar a la posición actual de la nave con leve dispersión
  // para obligar al jugador a moverse pero mantenerlo esquivable.
  const tx = (typeof ship !== 'undefined' && ship) ? ship.x : W / 2;
  const ty = (typeof ship !== 'undefined' && ship) ? ship.y : H / 2;
  const AIM_SPREAD = 0.15;   // radianes de dispersión
  const angle = Math.atan2(ty - y, tx - x) + rand(-AIM_SPREAD, AIM_SPREAD);
  shootingStars.push(new ShootingStar(
    x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, false
  ));
  resetShootingStarTimer();
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  shootingStars = [];
  trails    = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  skinNotice = 0;
  powerupTimer = POWERUP_EVERY;
  resetShootingStarTimer();
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  shootingStars = [];
  trails    = [];
  powerupTimer = POWERUP_EVERY;
  resetShootingStarTimer();
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.boost = 0;
  ship.shield = 0;
  ship.triple = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (skinNotice > 0) skinNotice -= dt;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    trails.forEach(t => t.update(dt));
    trails = trails.filter(t => !t.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerups.forEach(p => p.update(dt));
    powerups = powerups.filter(p => !p.dead);
    shootingStars.forEach(s => s.update(dt));
    shootingStars = shootingStars.filter(s => !s.dead);
    trails.forEach(t => t.update(dt));
    trails = trails.filter(t => !t.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Cambiar skin con C
  if (pressed('KeyC')) {
    ship.cycleSkin(1);
    skinNotice = 1.5;
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));
  shootingStars.forEach(s => s.update(dt));
  trails.forEach(t => t.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);
  shootingStars = shootingStars.filter(s => !s.dead);
  trails    = trails.filter(t => !t.dead);

  // Aparición del pickup: 1 máximo, no aparece con boost/escudo/triple activo
  powerupTimer -= dt;
  if (powerupTimer <= 0) {
    powerupTimer = POWERUP_EVERY;
    if (powerups.length === 0 && ship.boost <= 0 && ship.shield <= 0 && ship.triple <= 0) spawnPowerup();
  }

  // Aparición de la estrella fugaz: temporizador 8-12s, 1 máximo
  shootingStarTimer -= dt;
  if (shootingStarTimer <= 0) spawnShootingStar();

  // Nave recoge power-up (boost, escudo o triple-shot)
  for (const p of powerups) {
    if (!p.dead && !ship.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'shield') ship.shield = SHIELD_DURATION;
      else if (p.type === 'triple') ship.triple = TRIPLE_DURATION;
      else ship.boost = BOOST_DURATION;
      explode(p.x, p.y, 10);
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Bala vs estrella fugaz (no bloquea nivel; da chispas al partirse)
  const newSparks = [];
  for (const b of bullets) {
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += s.isSpark ? SPARK_POINTS : STAR_POINTS;
        explode(s.x, s.y, s.isSpark ? 6 : 10);
        newSparks.push(...s.split());
      }
    }
  }
  shootingStars = shootingStars.filter(s => !s.dead).concat(newSparks);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide (el escudo otorga invulnerabilidad temporal)
  if (ship.invincible <= 0 && ship.shield <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
    // Nave vs estrella fugaz
    if (state === 'playing') {
      for (const s of shootingStars) {
        if (dist(ship, s) < ship.radius + s.radius * 0.82) {
          killShip();
          break;
        }
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y, color = '#fff', shape = 'classic') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(0.45, 0.45);
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2.5;
  ctx.lineJoin    = 'round';
  traceHull(shape);
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  let hy = 46;
  if (ship && ship.boost > 0) {
    ctx.fillStyle = BOOST_COLOR;
    ctx.fillText(`BOOST ${ship.boost.toFixed(1)}s`, W / 2, hy);
    ctx.fillStyle = '#fff';
    hy += 18;
  }

  if (ship && ship.shield > 0) {
    ctx.fillStyle = SHIELD_COLOR;
    ctx.fillText(`SHIELD ${ship.shield.toFixed(1)}s`, W / 2, hy);
    ctx.fillStyle = '#fff';
    hy += 18;
  }

  if (ship && ship.triple > 0) {
    ctx.fillStyle = TRIPLE_COLOR;
    ctx.fillText(`TRIPLE ${ship.triple.toFixed(1)}s`, W / 2, hy);
    ctx.fillStyle = '#fff';
    hy += 18;
  }

  if (ship && skinNotice > 0) {
    ctx.fillStyle = ship.skin.stroke;
    ctx.fillText(`SKIN: ${ship.skin.name}`, W / 2, hy);
    ctx.fillStyle = '#fff';
  }

  ctx.textAlign = 'left';
  ctx.font = '12px monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('C: SKIN', 14, H - 14);
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  const lifeColor = ship ? ship.skin.stroke : '#fff';
  const lifeShape = ship ? ship.skin.shape : 'classic';
  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18, lifeColor, lifeShape);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  trails.forEach(t => t.draw());
  shootingStars.forEach(s => s.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
