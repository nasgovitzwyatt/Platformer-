const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const overlay = document.getElementById("overlay");

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
let highScore = localStorage.getItem("parkourHigh") || 0;
let playerColor = "#ff5722", hue = 0, windForce = 0;

const JUMP_FORCE = -13.5;
const BOUNCE_FORCE = -22;
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false };
let platforms = [];
const keys = {};

// --- THE SPEED-UP FIX: FIXED DELTA TIME ---
let lastTime = 0;
const targetFPS = 60;
const timestep = 1000 / targetFPS; // Exactly 16.66ms per frame

function updateUI() {
    document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;
    const unlocks = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];
    const ids = ["skin-orange", "skin-blue", "skin-green", "skin-purple", "skin-gold", "skin-mint", "skin-striped", "skin-camo", "skin-ghost", "skin-lava", "skin-rainbow", "skin-neon", "skin-diamond", "skin-ruby", "skin-emerald", "skin-void"];
    ids.forEach((id, i) => {
        const btn = document.getElementById(id);
        if (btn) {
            if (highScore >= unlocks[i]) { btn.classList.remove("locked"); btn.innerText = "SELECT"; }
            else { btn.classList.add("locked"); btn.innerText = unlocks[i] + "m"; }
        }
    });
}

function changeSkin(color, req) { if (highScore >= req) playerColor = color; }

function init() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0;
    cameraY = 0; maxHeight = 0; windForce = 0;
    platforms = [{ x: 0, y: 580, width: 400, height: 20, speed: 0, type: 'normal', isCracking: false }];
    generatePlatforms();
    gameActive = true;
    overlay.style.display = "none";
    updateUI();
    
    // Reset clock to prevent "jump-start" speed
    lastTime = performance.now();
    requestAnimationFrame(mainLoop);
}

function generatePlatforms() {
    let lastY = platforms[platforms.length - 1].y;
    while (platforms.length < 500) {
        let gap = Math.min(48, (500 - lastY) / 100);
        lastY -= (90 + gap) + Math.random() * 40;
        let h = (500 - lastY) / 10;
        let type = 'normal', roll = Math.random();
        if (h > 40) {
            if (roll < 0.12) type = 'tramp';
            else if (roll < 0.28) type = 'crumble';
            else if (h > 140 && roll < 0.45) type = 'ice';
        }
        let moveSpeed = 0;
        if (h > 100 && Math.random() < 0.45) moveSpeed = (Math.random() > 0.5 ? 2.2 : -2.2) + (h / 350);
        platforms.push({ x: Math.random() * 320, y: lastY, width: Math.max(40, 80 - (h / 35)), height: 12, type: type, speed: moveSpeed, crackTimer: 2500, isCracking: false });
    }
}

// THE MAIN LOOP: This ignores extra "speed" signals from the browser
function mainLoop(currentTime) {
    if (!gameActive) return;

    let delta = currentTime - lastTime;

    if (delta >= timestep) {
        update();
        draw();
        lastTime = currentTime - (delta % timestep);
    }
    requestAnimationFrame(mainLoop);
}

function update() {
    let h = Math.max(0, Math.floor((500 - player.y) / 10));
    if (h >= 1000) { windForce = Math.sin(Date.now() / 1000) * 1.5; player.velX += windForce; }
    
    let friction = player.onIce ? 0.98 : 0.8;
    let accel = player.onIce ? 0.3 : 1;

    if (keys["ArrowRight"]) player.velX += accel;
    else if (keys["ArrowLeft"]) player.velX -= accel;
    
    player.velX *= friction;
    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    if (player.x < -30) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -30;

    player.onIce = false; 

    platforms = platforms.filter(plat => {
        if (plat.isCracking) { plat.crackTimer -= 16.6; if (plat.crackTimer <= 0) return false; }
        if (player.velY > 0 && player.y + 30 > plat.y && player.y + 30 < plat.y + 15 + player.velY && player.x + 30 > plat.x && player.x < plat.x + plat.width) {
            if (plat.type === 'tramp') { player.velY = BOUNCE_FORCE; player.jumping = true; } 
            else { player.jumping = false; player.velY = 0; player.y = plat.y - 30; if (plat.type === 'ice') player.onIce = true; if (plat.type === 'crumble') plat.isCracking = true; }
        }
        if (plat.speed !== 0) { plat.x += plat.speed; if (plat.x < 0 || plat.x + plat.width > canvas.width) plat.speed *= -1; }
        return true;
    });

    if (player.y < canvas.height/2 + cameraY) cameraY = player.y - canvas.height/2;
    if (h > maxHeight) { maxHeight = h; document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`; }
    if (player.y > cameraY + canvas.height + 100) gameOver();
    hue++; 
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(0, -cameraY);
    
    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#80deea";
        else if (p.type === 'crumble') { let c = Math.floor((p.crackTimer / 2500) * 150); ctx.fillStyle = `rgb(${200 - c}, 100, 50)`; } 
        else if (p.type === 'tramp') ctx.fillStyle = "#e91e63";
        else ctx.fillStyle = "#45
