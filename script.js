const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const shopBtn = document.getElementById("shopBtn");
const closeShop = document.getElementById("closeShop");
const mainMenu = document.getElementById("mainMenu");
const shopMenu = document.getElementById("shopMenu");
const settingsModal = document.getElementById("settingsModal");
const skinMenu = document.getElementById("skinMenu");
const skinMenuBtn = document.getElementById("skinMenuBtn");

let tokens = parseInt(localStorage.getItem("parkourTokens")) || 0;
let highScore = localStorage.getItem("parkourHigh") || 0;
let config = {
    Jump: localStorage.getItem("keyJump") || "Space",
    Left: localStorage.getItem("keyLeft") || "ArrowLeft",
    Right: localStorage.getItem("keyRight") || "ArrowRight"
};

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
let playerColor = "#ff5722";
let currentBG = localStorage.getItem("selectedBG") || "#ffffff"; 
let hue = 0; 

const JUMP_FORCE = -13.5; 
const BOUNCE_FORCE = -22; 
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false, conveyorForce: 0 };
let platforms = [];
let items = []; 
const keys = {};

startBtn.onclick = () => init();
shopBtn.onclick = () => { mainMenu.style.display = "none"; shopMenu.style.display = "flex"; };
closeShop.onclick = () => { shopMenu.style.display = "none"; mainMenu.style.display = "flex"; };
skinMenuBtn.onclick = () => skinMenu.style.display = skinMenu.style.display === "none" ? "block" : "none";
document.getElementById("settingsBtn").onclick = () => { mainMenu.style.display = "none"; settingsModal.style.display = "flex"; };
document.getElementById("backToMenu").onclick = () => { settingsModal.style.display = "none"; mainMenu.style.display = "flex"; };

function buyItem(type, name, price) {
    if (tokens >= price) {
        if (price > 0) {
            tokens -= price;
            localStorage.setItem("parkourTokens", tokens);
        }
        if (type === 'bg') {
            if (name === 'White') currentBG = "#ffffff";
            if (name === 'Blue') currentBG = "#87CEEB"; // Sky Blue
            if (name === 'Space') currentBG = "#0b0d17";
            if (name === 'Sunset') currentBG = "#fd5e53";
            localStorage.setItem("selectedBG", currentBG);
            alert(`Equipped ${name}!`);
        }
        updateUI();
    } else { alert("Not enough tokens!"); }
}

// ... (Input Handling & UI Update from previous code) ...
// Ensure init() and update() loops are present as in previous working versions

function init() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0;
    cameraY = 0; maxHeight = 0;
    platforms = [{ x: 0, y: 580, width: 400, height: 20, speed: 0, type: 'normal' }];
    items = [];
    generatePlatforms();
    gameActive = true;
    mainMenu.style.display = "none"; shopMenu.style.display = "none"; settingsModal.style.display = "none"; skinMenu.style.display = "none";
    updateUI();
    update();
}

function generatePlatforms() {
    let lastY = platforms[platforms.length - 1].y;
    while (platforms.length < 500) {
        let gap = Math.min(48, (500 - lastY) / 100); 
        lastY -= (90 + gap) + Math.random() * 40; 
        let h = (500 - lastY) / 10;
        let type = 'normal', roll = Math.random();
        if (h > 40) {
            if (roll < 0.10) type = 'tramp'; 
            else if (roll < 0.20) type = 'crumble'; 
            else if (roll < 0.30) type = 'conveyor';
            else if (h > 140 && roll < 0.40) type = 'ice';
        }
        let plat = {
            x: Math.random() * 320, y: lastY, width: Math.max(40, 80 - (h / 35)), 
            height: 12, type: type, speed: (h > 100 && Math.random() < 0.4) ? 2 : 0, 
            crackTimer: 2500, isCracking: false, beltDir: Math.random() > 0.5 ? 1.5 : -1.5
        };
        platforms.push(plat);
        if (Math.random() < 0.3) items.push({ x: plat.x + plat.width/2 - 5, y: plat.y - 25, collected: false });
    }
}

function update() {
    if (!gameActive) return;
    let friction = player.onIce ? 0.98 : 0.8;
    let accel = player.onIce ? 0.3 : 1;
    if (keys[config.Right]) player.velX += accel;
    else if (keys[config.Left]) player.velX -= accel;
    player.velX *= friction; player.velX += player.conveyorForce;
    player.velY += gravity; player.x += player.velX; player.y += player.velY;
    if (player.x < -30) player.x = canvas.width; if (player.x > canvas.width) player.x = -30;
    player.onIce = false; player.conveyorForce = 0;
    platforms.forEach(plat => {
        if (player.velY > 0 && player.y + 30 > plat.y && player.y + 30 < plat.y + 15 + player.velY &&
            player.x + 30 > plat.x && player.x < plat.x + plat.width) {
            if (plat.type === 'tramp') { player.velY = BOUNCE_FORCE; player.jumping = true; }
            else {
                player.jumping = false; player.velY = 0; player.y = plat.y - 30;
                if (plat.type === 'ice') player.onIce = true;
                if (plat.type === 'conveyor') player.conveyorForce = plat.beltDir;
            }
        }
        if (plat.speed !== 0) { plat.x += plat.speed; if (plat.x < 0 || plat.x + plat.width > canvas.width) plat.speed *= -1; }
    });
    items.forEach(item => {
        if (!item.collected && player.x < item.x + 15 && player.x + 30 > item.x && player.y < item.y + 15 && player.y + 30 > item.y) {
            item.collected = true; tokens++; localStorage.setItem("parkourTokens", tokens);
            document.getElementById("tokenBoard").innerText = `Tokens: ${tokens}`;
        }
    });
    if (player.y < canvas.height/2 + cameraY) cameraY = player.y - canvas.height/2;
    let h = Math.max(0, Math.floor((500 - player.y) / 10));
    if (h > maxHeight) { maxHeight = h; document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`; }
    if (player.y > cameraY + canvas.height + 100) gameOver();
    hue++; draw(); requestAnimationFrame(update);
}

function draw() {
    ctx.fillStyle = currentBG; ctx.fillRect(0,0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(0, -cameraY);
    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#80deea"; else if (p.type === 'tramp') ctx.fillStyle = "#e91e63";
        else if (p.type === 'conveyor') ctx.fillStyle = "#757575"; else ctx.fillStyle = "#455a64";
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
    items.forEach(item => { if (!item.collected) { ctx.fillStyle = "#ffeb3b"; ctx.beginPath(); ctx.arc(item.x+5, item.y+5, 6, 0, Math.PI*2); ctx.fill(); } });
    ctx.fillStyle = playerColor === 'rainbow' ? `hsl(${hue}, 100%, 50%)` : playerColor;
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
}

function gameOver() { gameActive = false; mainMenu.style.display = "flex"; updateUI(); }

// ... setupBtn remains same ...
function updateUI() {
    document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;
    document.getElementById("tokenBoard").innerText = `Tokens: ${tokens}`;
    const unlocks = [0, 50, 100, 150, 200, 500, 1000];
    const ids = ["skin-orange", "skin-blue", "skin-green", "skin-purple", "skin-gold", "skin-rainbow", "skin-void"];
    ids.forEach((id, i) => {
        const btn = document.getElementById(id);
        if (btn) {
            if (highScore >= unlocks[i]) { btn.classList.remove("locked"); btn.innerText = "SELECT"; }
            else { btn.classList.add("locked"); btn.innerText = unlocks[i] + "m"; }
        }
    });
}
const setupBtn = (id, action) => {
    const btn = document.getElementById(id);
    btn.addEventListener("touchstart", (e) => {
        e.preventDefault(); if (action === "Jump") { if (!player.jumping && gameActive) { player.velY = JUMP_FORCE; player.jumping = true; } }
        else keys[config[action]] = true;
    });
    btn.addEventListener("touchend", (e) => { e.preventDefault(); keys[config[action]] = false; });
};
setupBtn("leftBtn", "Left"); setupBtn("rightBtn", "Right"); setupBtn("jumpBtn", "Jump");
updateUI();
