// ===== PHASER CONFIG =====
const config = {
  type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600
  },
  backgroundColor: '#1e1e1e',
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

// ===== VARIABLES =====
let player, bullets, enemies;
let moveVector = { x: 0, y: 0 };
let firePressed = false;
let lastShot = 0;
let powerLevel = 1;

// Safe zone
let safeZoneRadius = 350;
let safeZoneCenter = { x: 400, y: 300 };

// Player stats
const BRAWLER = {
  speed: 220,
  damage: 20,
  fireRate: 250
};

// ===== PRELOAD ASSETS =====
function preload() {
  this.load.image('player', 'https://i.imgur.com/6R4JQZB.png');
  this.load.image('enemy', 'https://i.imgur.com/8Qf8g9W.png');
  this.load.image('bullet', 'https://i.imgur.com/T5sKX9E.png');
}

// ===== CREATE SCENE =====
function create() {
  // Fullscreen on first tap (mobile)
  this.input.once('pointerdown', () => {
    if (!this.scale.isFullscreen) {
      this.scale.startFullscreen();
    }
  });

  // Player
  player = this.physics.add.sprite(400, 300, 'player');
  player.health = 100;
  player.setCollideWorldBounds(true);

  // Groups
  bullets = this.physics.add.group();
  enemies = this.physics.add.group();

  // Spawn enemies
  for (let i = 0; i < 5; i++) {
    let e = enemies.create(
      Phaser.Math.Between(100, 700),
      Phaser.Math.Between(100, 500),
      'enemy'
    );
    e.health = 80;
  }

  // Collision
  this.physics.add.overlap(bullets, enemies, hitEnemy);

  // Mobile controls
  createJoystick(this);
  createFireButton(this);

  // UI
  this.ui = this.add.text(10, 10, '', {
    font: '16px Arial',
    fill: '#ffffff'
  });
}

// ===== UPDATE LOOP =====
function update() {
  // Move player
  player.setVelocity(
    moveVector.x * BRAWLER.speed,
    moveVector.y * BRAWLER.speed
  );

  // Rotate player in direction of movement
  if (moveVector.x !== 0 || moveVector.y !== 0) {
    player.rotation = Phaser.Math.Angle.Between(
      0, 0,
      moveVector.x, moveVector.y
    );
  }

  // Shoot
  if (firePressed) shoot();

  // Enemy AI: move toward player
  enemies.children.iterate(enemy => {
    if (!enemy) return;
    this.physics.moveToObject(enemy, player, 80);
  });

  // Gas zone damage
  applyGas(player);
  enemies.children.iterate(e => e && applyGas(e));

  // Draw safe zone
  drawSafeZone(this);

  // Restart if player dies
  if (player.health <= 0) this.scene.restart();

  // Update UI
  this.ui.setText(`HP: ${Math.floor(player.health)}  Power: ${powerLevel}`);
}

// ===== SHOOT FUNCTION =====
function shoot() {
  const now = Date.now();
  if (now < lastShot + BRAWLER.fireRate) return;
  lastShot = now;

  const b = bullets.create(player.x, player.y, 'bullet');
  b.rotation = player.rotation;

  game.scene.scenes[0].physics.velocityFromRotation(
    player.rotation,
    500,
    b.body.velocity
  );

  b.damage = BRAWLER.damage + powerLevel * 5;
  setTimeout(() => b.destroy(), 1500);
}

// ===== BULLET HIT =====
function hitEnemy(bullet, enemy) {
  bullet.destroy();
  enemy.health -= bullet.damage;
  if (enemy.health <= 0) enemy.destroy();
}

// ===== SAFE ZONE =====
function applyGas(entity) {
  const d = Phaser.Math.Distance.Between(
    entity.x, entity.y,
    safeZoneCenter.x, safeZoneCenter.y
  );
  if (d > safeZoneRadius) entity.health -= 0.15;
}

function drawSafeZone(scene) {
  if (!scene.zone) scene.zone = scene.add.graphics();
  scene.zone.clear();
  scene.zone.lineStyle(3, 0x00ff00, 0.5);
  scene.zone.strokeCircle(
    safeZoneCenter.x,
    safeZoneCenter.y,
    safeZoneRadius
  );
  safeZoneRadius -= 0.05;
}

// ===== MOBILE TOUCH CONTROLS =====
function createJoystick(scene) {
  let base = scene.add.circle(120, 480, 40, 0x444444, 0.5);
  let thumb = scene.add.circle(120, 480, 20, 0xffffff, 0.8);

  base.setScrollFactor(0);
  thumb.setScrollFactor(0);

  scene.input.on('pointermove', p => {
    if (!p.isDown) return;

    const dx = p.x - base.x;
    const dy = p.y - base.y;
    const dist = Math.min(40, Math.hypot(dx, dy));

    const angle = Math.atan2(dy, dx);
    thumb.x = base.x + Math.cos(angle) * dist;
    thumb.y = base.y + Math.sin(angle) * dist;

    moveVector.x = Math.cos(angle);
    moveVector.y = Math.sin(angle);
  });

  scene.input.on('pointerup', () => {
    thumb.x = base.x;
    thumb.y = base.y;
    moveVector.x = 0;
    moveVector.y = 0;
  });
}

function createFireButton(scene) {
  let btn = scene.add.circle(680, 480, 35, 0xff5555, 0.8);
  btn.setScrollFactor(0);
  btn.setInteractive();

  btn.on('pointerdown', () => firePressed = true);
  btn.on('pointerup', () => firePressed = false);
  btn.on('pointerout', () => firePressed = false);
}
