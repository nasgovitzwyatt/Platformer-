const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menus = {
    main: document.getElementById("mainMenu"),
    shop: document.getElementById("shopMenu"),
    skins: document.getElementById("skinMenu"),
    settings: document.getElementById("settingsModal")
};

const skinData = [
    {id: "skin-orange", color: "#ff5722", req: 0}, {id: "skin-blue", color: "#2196f3", req: 50},
    {id: "skin-green", color: "#4caf50", req: 100}, {id: "skin-purple", color: "#9c27b0", req: 150},
    {id: "skin-gold", color: "#ffcc00", req: 200}, {id: "skin-mint", color: "#1de9b6", req: 250},
    {id: "skin-lava", color: "#d84315", req: 300}, {id: "skin-camo", color: "#4b5320", req: 350},
    {id: "skin-ghost", color: "ghost", req: 400}, {id: "skin-neon", color: "#39ff14", req: 450},
    {id: "skin-rainbow", color: "rainbow", req: 500}, {id: "skin-diamond", color: "#b2ebf2", req: 600},
    {id: "skin-ruby", color: "#e91e63", req: 700}, {id: "skin-emerald", req: #2ecc71, req: 800},
    {id: "skin-electric", color: "#00d2ff", req: 900}, {id: "skin-void", color: "void", req: 1000}
];

let tokens = parseFloat(localStorage.getItem("parkourTokens")) || 0;
let highScore = parseInt(localStorage.getItem("parkourHigh")) || 0;
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["White", "Blue"];
let currentBGName = localStorage.getItem("currentBGName") || "White";
let playerColor = localStorage.getItem("playerColor") || "#ff5722";
let selectedSkinId = localStorage.getItem("selectedSkinId") || "skin-orange";

let config = { 
    Jump: localStorage.getItem("keyJump") || "Space", 
    Left: localStorage.getItem("keyLeft") || "ArrowLeft", 
    Right: localStorage.getItem("keyRight") || "ArrowRight" 
};

let powerupStatus = JSON.parse(localStorage.getItem("powerupStatus")) || { DoubleJump: false, Magnet: false };
let player = { x: 180, y: 500, velX: 0, velY: 0, jumping: false, onIce: false },
    platforms = [], keys = {}, particles = [], jumpCount = 0, cameraY = 0, maxHeight = 0, gameActive = false, animationId;

// --- NAVIGATION & SKIN INJECTION ---
document.getElementById("startBtn").onclick = () => init();
document.getElementById("shopBtn").onclick = () => showMenu('shop');
document.getElementById("skinMenuBtn").onclick = () => showMenu('skins');
document.getElementById("settingsBtn").onclick = () => showMenu('settings');
document.querySelectorAll(".secondary").forEach(b => b.onclick = () => showMenu('main'));

function showMenu(key) {
    Object.values(menus).forEach(m => m.style.display = "none");
    if (menus[key]) menus[key].style.display = "flex";
    updateUI();
}

// Generate Skin Grid Automatically
const skinGrid = document.getElementById("skinGrid");
skinData.forEach(s => {
    const btn = document.createElement("button");
    btn.id = s.id; btn.className = "skin-btn";
    btn.onclick = () => changeSkin(s.color, s.req, s.id);
    skinGrid.appendChild(btn);
});

function setupBinds() {
    ["Jump", "Left", "Right"].forEach(action => {
        const btn = document.getElementById("bind" + action);
        btn.onclick = (e) => {
            e.stopPropagation(); btn.innerText = "...";
            const listener = (event) => {
                event.preventDefault(); // CRITICAL: Stop flicker
                config[action] = event.code;
                localStorage.setItem("key" + action, event.code);
                btn.innerText = event.code.replace("Arrow", "");
                window.removeEventListener("keydown", listener);
            };
            window.addEventListener("keydown", listener);
        };
    });
}
setupBinds();

function updateUI() {
    document.getElementById("tokenBoard").innerText = `🪙 ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `🏆 ${highScore}m`;
    document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`;
    skinData.forEach(s => {
        const btn = document.getElementById(s.id);
        if (highScore >= s.req) {
            btn.classList.remove("locked");
            btn.innerText = (selectedSkinId === s.id) ? "●" : "";
            btn.classList.toggle("selected", selectedSkinId === s.id);
        } else { btn.classList.add("locked"); btn.innerText = "🔒"; }
    });
}

function changeSkin(color, req, id) {
    if (highScore >= req) {
        playerColor = color; selectedSkinId = id;
        localStorage.setItem("playerColor", color);
        localStorage.setItem("selectedSkinId", id);
        updateUI();
    }
}

// Controls
function setupMobile() {
    const press = (key, val) => keys[config[key]] = val;
    document.getElementById("leftBtn").ontouchstart = (e) => { e.preventDefault(); press("Left", true); };
    document.getElementById("leftBtn").ontouchend = () => press("Left", false);
    document.getElementById("rightBtn").ontouchstart = (e) => { e.preventDefault(); press("Right", true); };
    document.getElementById("rightBtn").ontouchend = () => press("Right", false);
    document.getElementById("jumpBtn").ontouchstart = (e) => {
        e.preventDefault();
        if (!player.jumping) { player.velY = -13.5; player.jumping = true; jumpCount = 1; }
        else if (powerupStatus.DoubleJump && jumpCount < 2) { player.velY = -13.5; jumpCount = 2; }
    };
}
setupMobile();

window.onkeydown = (e) => {
    if (e.code === config.Jump && gameActive) {
        if (!player.jumping) { player.velY = -13.5; player.jumping = true; jumpCount = 1; }
        else if (powerupStatus.DoubleJump && jumpCount < 2) { player.velY = -13.5; jumpCount = 2; }
    }
    keys[e.code] = true;
};
window.onkeyup = (e) => keys[e.code] = false;

function init() {
    platforms = []; player.x = 180; player.y = 500; player.velX = 0; player.velY = 0; cameraY = 0; maxHeight = 0;
    platforms.push({ x: 0, y: 580, width: 400, height: 20, type: 'normal' });
    for (let i = 0; i < 1500; i++) {
        let lastY = platforms[platforms.length-1].y - (90 + Math.random() * 50);
        let type = 'normal'; let r = Math.random();
        if (r > 0.8) type = 'ice'; else if (r > 0.7) type = 'tramp'; else if (r > 0.6) type = 'crumble';
        platforms.push({ x: Math.random() * 300, y: lastY, width: 80, height: 12, type: type, crack: 1.0 });
    }
    gameActive = true; showMenu('none'); update();
}

function update() {
    if (!gameActive) return;
    if (keys[config.Left]) player.velX -= player.onIce ? 0.08 : 1.3;
    if (keys[config.Right]) player.velX += player.onIce ? 0.08 : 1.3;
    player.velX *= player.onIce ? 0.99 : 0.7;
    player.x += player.velX; player.y += player.velY; player.velY += 0.5;
    if (player.x < -30) player.x = canvas.width; if (player.x > canvas.width) player.x = -30;

    let touchingIce = false;
    platforms.forEach(p => {
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 15 + player.velY && player.x + 30 > p.x && player.x < p.x + p.width) {
            if (p.type === 'tramp') { player.velY = -22; player.jumping = true; }
            else {
                player.velY = 0; player.y = p.y - 30; player.jumping = false; jumpCount = 0;
                if (p.type === 'ice') touchingIce = true;
                if (p.type === 'crumble') p.isCracking = true;
            }
        }
        if (p.isCracking) p.crack -= 0.02;
    });
    player.onIce = touchingIce;
    platforms = platforms.filter(p => p.type !== 'crumble' || p.crack > 0);

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    maxHeight = Math.max(maxHeight, Math.floor((500 - player.y) / 10));
    if (player.y > cameraY + 800) gameOver();
    draw(); animationId = requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0,0,400,600);
    ctx.save(); ctx.translate(0, -cameraY);
    platforms.forEach(p => {
        ctx.fillStyle = (p.type === 'ice') ? "#00f2fe" : (p.type === 'tramp' ? "#ff0080" : "#4caf50");
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
    if (selectedSkinId === "skin-void") {
        let p = Math.abs(Math.sin(Date.now() / 400));
        ctx.fillStyle = "#000"; ctx.strokeStyle = `rgb(${160*p}, 0, ${240*p})`; ctx.lineWidth = 4;
        ctx.fillRect(player.x, player.y, 30, 30); ctx.strokeRect(player.x, player.y, 30, 30);
    } else {
        ctx.fillStyle = playerColor === "rainbow" ? `hsl(${Date.now()/10%360}, 100%, 50%)` : playerColor;
        ctx.fillRect(player.x, player.y, 30, 30);
    }
    ctx.restore();
}

function gameOver() {
    gameActive = false; cancelAnimationFrame(animationId);
    if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("parkourHigh", highScore); }
    showMenu('main');
}
