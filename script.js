const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menus = {
    main: document.getElementById("mainMenu"),
    shop: document.getElementById("shopMenu"),
    skins: document.getElementById("skinMenu"),
    settings: document.getElementById("settingsModal")
};

// --- EXPANDED SKIN DATA (32 SKINS) ---
const skinData = [];
const colorList = [
    "#ff5722", "#2196f3", "#4caf50", "#9c27b0", "#ffcc00", "#1de9b6", "#d84315", "#4b5320",
    "#ffffff", "#39ff14", "rainbow", "#b2ebf2", "#e91e63", "#2ecc71", "#00d2ff", "void",
    "#795548", "#607d8b", "#f44336", "#e91e63", "#9e9e9e", "#00bcd4", "#8bc34a", "#cddc39",
    "#ffeb3b", "#ff9800", "#3f51b5", "#673ab7", "#009688", "#455a64", "#ff5252", "gold-shimmer"
];
colorList.forEach((c, i) => skinData.push({ id: `s${i}`, color: c, req: i * 50 }));

let tokens = parseFloat(localStorage.getItem("tokens")) || 0;
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let playerColor = "#ff5722";
let selectedSkinId = "s0";
let config = JSON.parse(localStorage.getItem("controls")) || { Jump: "Space", Left: "ArrowLeft", Right: "ArrowRight" };
let bindingKey = null;

// Pagination State
let currentSkinPage = 0;
const skinsPerPage = 8;

// Shop & Game State
let activeEnv = "White";
let envMultiplier = 1;
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["bg-White"];
let powerupStatus = { DoubleJump: false, Magnet: false };
let platforms = [], items = [], keys = {}, gameActive = false, cameraY = 0, maxHeight = 0;
let player = { x: 185, y: 500, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0 };

// Delta Time Variables
let lastTime = 0;

function showMenu(key) {
    Object.values(menus).forEach(m => m.style.display = "none");
    if (menus[key]) menus[key].style.display = "flex";
    if (key === 'skins') renderSkins();
}

// --- PAGINATION LOGIC ---
function renderSkins() {
    const skinGrid = document.getElementById("skinGrid");
    skinGrid.innerHTML = "";
    const start = currentSkinPage * skinsPerPage;
    const end = start + skinsPerPage;
    const pageSkins = skinData.slice(start, end);

    pageSkins.forEach(s => {
        const btn = document.createElement("button");
        btn.className = "skin-btn";
        btn.classList.toggle("locked", highScore < s.req);
        btn.classList.toggle("selected", selectedSkinId === s.id);
        
        if (s.color === "rainbow") btn.style.background = "linear-gradient(45deg, red, blue)";
        else if (s.color === "void") btn.style.background = "#000";
        else if (s.color === "gold-shimmer") btn.style.background = "linear-gradient(45deg, #ffd700, #fff)";
        else btn.style.background = s.color;

        btn.onclick = () => {
            if (highScore >= s.req) {
                playerColor = s.color;
                selectedSkinId = s.id;
                renderSkins();
            }
        };
        skinGrid.appendChild(btn);
    });
    document.getElementById("skinPageNum").innerText = `PAGE ${currentSkinPage + 1}`;
}

document.getElementById("nextSkinPage").onclick = () => {
    if ((currentSkinPage + 1) * skinsPerPage < skinData.length) {
        currentSkinPage++;
        renderSkins();
    }
};
document.getElementById("prevSkinPage").onclick = () => {
    if (currentSkinPage > 0) {
        currentSkinPage--;
        renderSkins();
    }
};

// --- GAME CORE ---
function init() {
    platforms = []; items = []; cameraY = 0; maxHeight = 0;
    player.x = 185; player.y = 500; player.velX = 0; player.velY = 0; player.jumpCount = 0;
    platforms.push({ x: 0, y: 580, width: 400, height: 20, type: 'normal' });
    
    for(let i=0; i<1000; i++) {
        let lastY = (platforms[platforms.length-1].y) - (110 + Math.random()*40);
        platforms.push({ x: Math.random()*320, y: lastY, width: 80, height: 14, type: Math.random() > 0.8 ? 'ice' : 'normal', crack: 1 });
        if(Math.random() > 0.7) items.push({ x: Math.random()*380, y: lastY - 30, collected: false });
    }
    gameActive = true;
    showMenu('none');
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function loop(timestamp) {
    if (!gameActive) return;

    // Delta Time calculation (Standardizes speed)
    const dt = (timestamp - lastTime) / 16.67; 
    lastTime = timestamp;

    // Physics (Multiplied by dt to keep speed consistent)
    if (keys[config.Left]) player.velX -= 0.6 * dt;
    if (keys[config.Right]) player.velX += 0.6 * dt;
    player.velX *= Math.pow(0.85, dt);
    
    player.x += player.velX * dt;
    player.y += player.velY * dt;
    player.velY += 0.4 * dt;

    // Collision & Screen Wrap
    if (player.x < -30) player.x = 400; if (player.x > 400) player.x = -30;
    
    platforms.forEach(p => {
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 15 && player.x + 30 > p.x && player.x < p.x + p.width) {
            player.velY = 0; player.y = p.y - 30; player.jumpCount = 0;
        }
    });

    items.forEach(it => {
        if (!it.collected) {
            let d = Math.sqrt((player.x-it.x)**2 + (player.y-it.y)**2);
            if (d < 35) { it.collected = true; tokens += 1; updateUI(); }
        }
    });

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    maxHeight = Math.max(maxHeight, Math.floor((500 - player.y)/10));
    if (player.y > cameraY + 800) { gameActive = false; showMenu('main'); }

    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0,0,400,600);
    ctx.save(); ctx.translate(0, -cameraY);
    ctx.fillStyle = "#222";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
    ctx.fillStyle = "#ffd700";
    items.forEach(it => { if(!it.collected) { ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, Math.PI*2); ctx.fill(); } });
    ctx.fillStyle = playerColor === 'rainbow' ? `hsl(${Date.now()/10%360},100%,50%)` : playerColor;
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
}

function handleJump() {
    if (player.jumpCount < (powerupStatus.DoubleJump ? 2 : 1)) {
        player.velY = -11;
        player.jumpCount++;
    }
}

// --- CONTROLS ---
window.onkeydown = (e) => {
    if (bindingKey) { config[bindingKey] = e.code; bindingKey = null; updateUI(); return; }
    if (e.code === config.Jump) handleJump();
    keys[e.code] = true;
};
window.onkeyup = (e) => keys[e.code] = false;

document.getElementById("startBtn").onclick = () => init();
document.getElementById("skinMenuBtn").onclick = () => showMenu('skins');
document.querySelectorAll(".close-btn").forEach(b => b.onclick = () => showMenu('main'));

function updateUI() {
    document.getElementById("tokenBoard").innerText = `🪙 ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `🏆 ${highScore}m`;
    document.getElementById("scoreBoard").innerText = `${maxHeight}m`;
    localStorage.setItem("tokens", tokens);
    localStorage.setItem("highScore", highScore);
}

updateUI();
