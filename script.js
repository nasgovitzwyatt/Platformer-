const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Menus
const menuLayer = document.getElementById("menuLayer");
const mainMenu = document.getElementById("mainMenu");
const shopMenu = document.getElementById("shopMenu");
const skinMenu = document.getElementById("skinMenu");
const settingsModal = document.getElementById("settingsModal");

// Game elements to hide
const gameLayer = document.getElementById("gameLayer");
const mobileControls = document.getElementById("mobileControls");

const bgMultipliers = { "White": 1, "Blue": 1.2, "Forest": 1.3, "Sunset": 1.6, "Midnight": 2, "Space": 2.5, "Gold": 4, "Void": 10 };

let tokens = parseFloat(localStorage.getItem("parkourTokens")) || 0;
let highScore = parseInt(localStorage.getItem("parkourHigh")) || 0;
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["White", "Blue"];
let currentBGName = localStorage.getItem("currentBGName") || "White";
let playerColor = localStorage.getItem("playerColor") || "#ff5722";
let selectedSkinId = localStorage.getItem("selectedSkinId") || "skin-orange";

let config = { Jump: localStorage.getItem("keyJump") || "Space", Left: localStorage.getItem("keyLeft") || "ArrowLeft", Right: localStorage.getItem("keyRight") || "ArrowRight" };
let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
const JUMP_FORCE = -13.5, BOUNCE_FORCE = -22;
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false, conveyorForce: 0 };
let platforms = [], items = [], keys = {};

// --- THE FIX: POINTERDOWN EVENT LISTENER ---
function setupMenuClick(id, callback) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            callback();
        });
    }
}

// GUI State Machine
function showGame(active) {
    gameActive = active;
    if (active) {
        menuLayer.style.display = "none";
        gameLayer.style.display = "flex";
        mobileControls.style.display = "flex";
    } else {
        menuLayer.style.display = "block";
        gameLayer.style.display = "none"; // Physically remove game from click path
        mobileControls.style.display = "none";
    }
}

setupMenuClick("startBtn", () => init());
setupMenuClick("shopBtn", () => { mainMenu.style.display="none"; shopMenu.style.display="flex"; updateUI(); });
setupMenuClick("closeShop", () => { shopMenu.style.display="none"; mainMenu.style.display="flex"; });
setupMenuClick("settingsBtn", () => { mainMenu.style.display="none"; settingsModal.style.display="flex"; });
setupMenuClick("backToMenu", () => { settingsModal.style.display="none"; mainMenu.style.display="flex"; });
setupMenuClick("skinMenuBtn", () => { skinMenu.style.display = (skinMenu.style.display === "none" ? "block" : "none"); });

// Generate Skins
const skinData = [
    {id: "skin-orange", req: 0, col: "#ff5722"}, {id: "skin-blue", req: 50, col: "#2196f3"}, {id: "skin-green", req: 100, col: "#4caf50"},
    {id: "skin-purple", req: 150, col: "#9c27b0"}, {id: "skin-gold", req: 200, col: "#ffcc00"}, {id: "skin-mint", req: 250, col: "#1de9b6"},
    {id: "skin-lava", req: 300, col: "lava"}, {id: "skin-camo", req: 350, col: "camo"}, {id: "skin-ghost", req: 400, col: "ghost"},
    {id: "skin-neon", req: 450, col: "neon"}, {id: "skin-rainbow", req: 500, col: "rainbow"}, {id: "skin-diamond", req: 600, col: "diamond"},
    {id: "skin-ruby", req: 700, col: "ruby"}, {id: "skin-emerald", req: 800, col: "emerald"}, {id: "skin-electric", req: 900, col: "electric"},
    {id: "skin-void", req: 1000, col: "void"}
];

function updateUI() {
    document.getElementById("tokenBoard").innerText = `Tokens: ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;
    
    // Shop
    document.querySelectorAll('.shop-item').forEach(btn => {
        const bg = btn.dataset.bg;
        const price = btn.querySelector('.price');
        if (currentBGName === bg) price.innerText = "EQUIPPED";
        else if (ownedItems.includes(bg)) price.innerText = "EQUIP";
    });

    // Skins
    const container = document.getElementById("skinGridContainer");
    container.innerHTML = "";
    skinData.forEach(s => {
        const btn = document.createElement("button");
        btn.className = `skin-btn ${highScore < s.req ? 'locked' : ''} ${selectedSkinId === s.id ? 'selected' : ''}`;
        btn.id = s.id;
        btn.innerText = highScore < s.req ? `🔒 ${s.req}m` : (selectedSkinId === s.id ? "ACTIVE" : "SELECT");
        if (highScore >= s.req) btn.style.background = s.col;
        btn.addEventListener('pointerdown', () => changeSkin(s.col, s.req, s.id));
        container.appendChild(btn);
    });
}

function buyItem(type, name, price) {
    if (ownedItems.includes(name)) currentBGName = name;
    else if (tokens >= price) { tokens -= price; ownedItems.push(name); currentBGName = name; }
    localStorage.setItem("parkourTokens", tokens);
    localStorage.setItem("ownedItems", JSON.stringify(ownedItems));
    localStorage.setItem("currentBGName", currentBGName);
    updateUI();
}

// Connect Shop Buttons manually to be safe
document.querySelectorAll('.shop-item').forEach(item => {
    item.addEventListener('pointerdown', () => buyItem('bg', item.dataset.bg, parseInt(item.dataset.price)));
});

function changeSkin(color, req, id) {
    if (highScore >= req) { playerColor = color; selectedSkinId = id; localStorage.setItem("playerColor", color); localStorage.setItem("selectedSkinId", id); updateUI(); }
}

// Game Core
function init() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0; cameraY = 0; maxHeight = 0;
    platforms = [{ x: 0, y: 580, width: 400, height: 20, type: 'normal' }]; 
    generatePlatforms(); 
    showGame(true);
    update();
}

function generatePlatforms() {
    let lastY = platforms[0].y;
    for (let i = 0; i < 500; i++) {
        let heightM = (500 - lastY) / 10;
        lastY -= (95 + Math.random() * 45);
        let type = Math.random() > 0.7 ? 'tramp' : 'normal';
        platforms.push({ x: Math.random() * 320, y: lastY, width: 70, height: 12, type: type, speed: Math.random() > 0.8 ? 2 : 0 });
    }
}

function update() {
    if (!gameActive) return;
    player.velY += gravity; player.y += player.velY;
    platforms.forEach(p => {
        if (player.velY > 0 && player.y+30 > p.y && player.y+30 < p.y+15 && player.x+30 > p.x && player.x < p.x+p.width) {
            player.velY = p.type === 'tramp' ? BOUNCE_FORCE : JUMP_FORCE;
        }
    });
    if (player.y < cameraY + 300) cameraY = player.y - 300;
    if (player.y > cameraY + 800) { showGame(false); if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("parkourHigh", highScore); } updateUI(); }
    maxHeight = Math.max(maxHeight, Math.floor((500 - player.y) / 10));
    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.fillStyle = "#fff"; ctx.fillRect(0,0,400,600);
    ctx.save(); ctx.translate(0, -cameraY);
    platforms.forEach(p => { ctx.fillStyle = p.type==='tramp'?"#e91e63":"#455a64"; ctx.fillRect(p.x, p.y, p.width, p.height); });
    ctx.fillStyle = playerColor; ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
}

showGame(false);
updateUI();
