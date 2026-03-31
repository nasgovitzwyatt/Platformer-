const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Elements
const mainMenu = document.getElementById("mainMenu");
const shopMenu = document.getElementById("shopMenu");
const settingsModal = document.getElementById("settingsModal");
const skinMenu = document.getElementById("skinMenu");

// Persistence & State
let tokens = parseInt(localStorage.getItem("parkourTokens")) || 0;
let highScore = parseInt(localStorage.getItem("parkourHigh")) || 0;
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["White", "Blue"];
let currentBGName = localStorage.getItem("currentBGName") || "White";

let config = {
    Jump: localStorage.getItem("keyJump") || "Space",
    Left: localStorage.getItem("keyLeft") || "ArrowLeft",
    Right: localStorage.getItem("keyRight") || "ArrowRight"
};

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
let playerColor = "#ff5722", hue = 0;
const JUMP_FORCE = -13.5, BOUNCE_FORCE = -22;
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false, conveyorForce: 0 };
let platforms = [], items = [], keys = {};

// --- GUI LOGIC ---
document.getElementById("startBtn").onclick = () => init();
document.getElementById("shopBtn").onclick = () => { mainMenu.style.display = "none"; shopMenu.style.display = "flex"; updateUI(); };
document.getElementById("closeShop").onclick = () => { shopMenu.style.display = "none"; mainMenu.style.display = "flex"; };
document.getElementById("skinMenuBtn").onclick = () => skinMenu.style.display = (skinMenu.style.display === "none" ? "block" : "none");
document.getElementById("settingsBtn").onclick = () => { mainMenu.style.display = "none"; settingsModal.style.display = "flex"; };
document.getElementById("backToMenu").onclick = () => { settingsModal.style.display = "none"; mainMenu.style.display = "flex"; };

function buyItem(type, name, price) {
    if (ownedItems.includes(name)) {
        if (type === 'bg') currentBGName = name;
        localStorage.setItem("currentBGName", name);
    } else if (tokens >= price) {
        tokens -= price;
        ownedItems.push(name);
        if (type === 'bg') currentBGName = name;
        localStorage.setItem("parkourTokens", tokens);
        localStorage.setItem("ownedItems", JSON.stringify(ownedItems));
        localStorage.setItem("currentBGName", name);
    }
    updateUI();
}

function updateUI() {
    document.getElementById("tokenBoard").innerText = `Tokens: ${tokens}`;
    document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;
    
    // Update Shop Buttons
    const bgList = ["White", "Blue", "Sunset", "Space"];
    bgList.forEach(bg => {
        const priceTag = document.getElementById(`price-${bg}`);
        if (ownedItems.includes(bg)) {
            if (priceTag) priceTag.innerText = (currentBGName === bg ? "EQUIPPED" : "OWNED");
        }
    });

    // Update Skin Locks
    const unlocks = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 1000];
    const ids = ["skin-orange", "skin-blue", "skin-green", "skin-purple", "skin-gold", "skin-mint", "skin-striped", "skin-camo", "skin-ghost", "skin-lava", "skin-rainbow", "skin-void"];
    ids.forEach((id, i) => {
        const btn = document.getElementById(id);
        if (btn) {
            if (highScore >= unlocks[i]) btn.classList.remove("locked");
            else btn.classList.add("locked");
        }
    });
}

function changeSkin(color, req) {
    if (highScore >= req) {
        playerColor = color;
        skinMenu.style.display = "none";
    }
}

// --- GAME CORE ---
function init() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0;
    cameraY = 0; maxHeight = 0;
    platforms = [{ x: 0, y: 580, width: 400, height: 20, type: 'normal' }];
    items = [];
    generatePlatforms();
    gameActive = true;
    mainMenu.style.display = "none"; shopMenu.style.display = "none"; skinMenu.style.display = "none";
    updateUI();
    update();
}

function generatePlatforms() {
    let lastY = platforms[platforms.length - 1].y;
    while (platforms.length < 500) {
        lastY -= (90 + Math.random() * 40);
        let type = 'normal', roll = Math.random();
        if (roll < 0.1) type = 'tramp';
        else if (roll < 0.2) type = 'crumble';
        else if (roll < 0.3) type = 'conveyor';

        let plat = {
            x: Math.random() * 320, y: lastY, width: 60, height: 12, 
            type: type, speed: (Math.random() < 0.2 ? 2 : 0), beltDir: 1.5
        };
        platforms.push(plat);
        if (Math.random() < 0.3) items.push({ x: plat.x + 25, y: plat.y - 25, collected: false });
    }
}

function update() {
    if (!gameActive) return;
    let friction = player.onIce ? 0.98 : 0.8;
    if (keys[config.Right]) player.velX += 1;
    if (keys[config.Left]) player.velX -= 1;
    player.velX *= friction; player.velX += player.conveyorForce;
    player.velY += gravity; player.x += player.velX; player.y += player.velY;
    
    if (player.x < -30) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -30;
    player.conveyorForce = 0;

    platforms.forEach(plat => {
        if (player.velY > 0 && player.y + 30 > plat.y && player.y + 30 < plat.y + 15 + player.velY &&
            player.x + 30 > plat.x && player.x < plat.x + plat.width) {
            if (plat.type === 'tramp') player.velY = BOUNCE_FORCE;
            else { player.velY = 0; player.y = plat.y - 30; if (plat.type === 'conveyor') player.conveyorForce = plat.beltDir; }
        }
        if (plat.speed) { plat.x += plat.speed; if (plat.x < 0 || plat.x > 340) plat.speed *= -1; }
    });

    items.forEach(item => {
        if (!item.collected && Math.abs(player.x - item.x) < 30 && Math.abs(player.y - item.y) < 30) {
            item.collected = true; tokens++; updateUI();
        }
    });

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    let h = Math.max(0, Math.floor((500 - player.y) / 10));
    if (h > maxHeight) { maxHeight = h; document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`; }
    if (player.y > cameraY + 700) gameOver();
    hue++; draw(); requestAnimationFrame(update);
}

function draw() {
    // REALISTIC GRADIENT BACKGROUNDS
    let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (currentBGName === "White") {
        grad.addColorStop(0, "#ffffff"); grad.addColorStop(1, "#eeeeee");
    } else if (currentBGName === "Blue") {
        grad.addColorStop(0, "#4facfe"); grad.addColorStop(1, "#00f2fe");
    } else if (currentBGName === "Sunset") {
        grad.addColorStop(0, "#ff8c00"); grad.addColorStop(1, "#ff0080");
    } else if (currentBGName === "Space") {
        grad.addColorStop(0, "#0f0c29"); grad.addColorStop(0.5, "#302b63"); grad.addColorStop(1, "#24243e");
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save(); ctx.translate(0, -cameraY);
    platforms.forEach(p => {
        ctx.fillStyle = p.type === 'tramp' ? "#e91e63" : (p.type === 'conveyor' ? "#757575" : "#455a64");
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
    items.forEach(item => { if (!item.collected) { ctx.fillStyle = "#ffeb3b"; ctx.beginPath(); ctx.arc(item.x+5, item.y+5, 8, 0, Math.PI*2); ctx.fill(); } });
    
    // Skin Rendering
    if (playerColor === 'rainbow') ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    else if (playerColor === 'void') { ctx.fillStyle = "black"; ctx.shadowBlur = 10; ctx.shadowColor = "white"; }
    else ctx.fillStyle = playerColor;
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.shadowBlur = 0; ctx.restore();
}

function gameOver() {
    gameActive = false;
    if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("parkourHigh", highScore); }
    mainMenu.style.display = "flex";
    document.getElementById("statusText").innerText = "GAME OVER";
}

// Rebinding & Keys
window.addEventListener("keydown", e => {
    if (["Space", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
});
window.addEventListener("keyup", e => keys[e.code] = false);

updateUI();
