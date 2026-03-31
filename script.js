const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game State
let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false, isPaused = false;
let highScore = localStorage.getItem("parkourHigh") || 0;
let playerColor = "#ff5722", hue = 0;
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false };
let platforms = [];

// Controls & Keybinds
let keybinds = JSON.parse(localStorage.getItem("keybinds")) || { left: "KeyA", right: "KeyD", jump: "Space" };
const keys = {};
let rebindingKey = null;

// Skin Data
const skins = [
    { name: "Orange", color: "#ff5722", req: 0 },
    { name: "Blue", color: "#2196f3", req: 50 },
    { name: "Green", color: "#4caf50", req: 100 },
    { name: "Purple", color: "#9c27b0", req: 150 },
    { name: "Gold", color: "#ffcc00", req: 200 },
    { name: "Mint", color: "#1de9b6", req: 250 },
    { name: "Rainbow", color: "rainbow", req: 500 }
];

// --- GUI Functions ---
function startGame() {
    document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
    initGame();
}

function openSkins() {
    document.getElementById("mainGui").classList.add("hidden");
    const grid = document.getElementById("skinGrid");
    grid.innerHTML = "";
    skins.forEach(skin => {
        const div = document.createElement("div");
        div.className = `skin-item ${highScore < skin.req ? 'locked' : ''}`;
        div.style.background = skin.color === 'rainbow' ? 'linear-gradient(to right, red, purple)' : skin.color;
        div.onclick = () => { if(highScore >= skin.req) { playerColor = skin.color; closeOverlay(); } };
        grid.appendChild(div);
    });
    document.getElementById("skinsGui").classList.remove("hidden");
}

function openSettings() {
    document.getElementById("mainGui").classList.add("hidden");
    document.getElementById("settingsGui").classList.remove("hidden");
    updateBindLabels();
}

function closeOverlay() {
    document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
    document.getElementById("mainGui").classList.remove("hidden");
}

function rebind(action) {
    rebindingKey = action;
    document.getElementById(`bind-${action}`).innerText = "PRESS KEY...";
}

function updateBindLabels() {
    document.getElementById("bind-left").innerText = keybinds.left.replace("Key", "");
    document.getElementById("bind-right").innerText = keybinds.right.replace("Key", "");
    document.getElementById("bind-jump").innerText = keybinds.jump.replace("Space", "SPC");
}

// --- Game Logic ---
function initGame() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0;
    cameraY = 0; maxHeight = 0; gameActive = true; isPaused = false;
    platforms = [{ x: 0, y: 580, width: 400, height: 20, type: 'normal' }];
    generatePlatforms();
    update();
}

function generatePlatforms() {
    let lastY = platforms[0].y;
    for(let i=0; i<300; i++) {
        lastY -= 100 + Math.random() * 40;
        platforms.push({ x: Math.random()*320, y: lastY, width: 70, height: 12, type: 'normal' });
    }
}

function update() {
    if (!gameActive || isPaused) return;

    if (keys[keybinds.left]) player.velX = -5;
    else if (keys[keybinds.right]) player.velX = 5;
    else player.velX *= 0.8;

    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    platforms.forEach(p => {
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 15 && player.x + 30 > p.x && player.x < p.x + p.width) {
            player.jumping = false; player.velY = 0; player.y = p.y - 30;
        }
    });

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    let h = Math.max(0, Math.floor((500 - player.y)/10));
    if (h > maxHeight) maxHeight = h;

    document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`;
    document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;

    if (player.y > cameraY + 650) {
        gameActive = false;
        if(maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("parkourHigh", highScore); }
        document.getElementById("guiTitle").innerText = "YOU FELL!";
        document.getElementById("mainGui").classList.remove("hidden");
    }

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -cameraY);
    ctx.fillStyle = "#455a64";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
    ctx.fillStyle = playerColor === 'rainbow' ? `hsl(${Date.now()/10%360}, 100%, 50%)` : playerColor;
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
}

// --- Listeners ---
window.addEventListener("keydown", e => {
    if (rebindingKey) {
        keybinds[rebindingKey] = e.code;
        localStorage.setItem("keybinds", JSON.stringify(keybinds));
        rebindingKey = null;
        updateBindLabels();
        return;
    }
    keys[e.code] = true;
    if (e.code === keybinds.jump && !player.jumping) { player.velY = -13; player.jumping = true; }
});
window.addEventListener("keyup", e => keys[e.code] = false);

document.getElementById("pauseBtn").onclick = () => {
    isPaused = !isPaused;
    if(!isPaused) update();
    document.getElementById("pauseBtn").innerText = isPaused ? "▶" : "⏸";
};

// Mobile
document.getElementById("leftBtn").ontouchstart = () => keys[keybinds.left] = true;
document.getElementById("leftBtn").ontouchend = () => keys[keybinds.left] = false;
document.getElementById("rightBtn").ontouchstart = () => keys[keybinds.right] = true;
document.getElementById("rightBtn").ontouchend = () => keys[keybinds.right] = false;
document.getElementById("jumpBtn").ontouchstart = () => { if(!player.jumping) { player.velY = -13; player.jumping = true; } };
