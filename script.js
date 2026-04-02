const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menus = {
    main: document.getElementById("mainMenu"),
    shop: document.getElementById("shopMenu"),
    skins: document.getElementById("skinMenu"),
    settings: document.getElementById("settingsModal")
};

// --- DATA ---
const skinData = [];
const colorList = [
    "#ff5722", "#2196f3", "#4caf50", "#9c27b0", "#ffcc00", "#1de9b6", "#d84315", "#4b5320",
    "#ffffff", "#39ff14", "rainbow", "#b2ebf2", "#e91e63", "#2ecc71", "#00d2ff", "void",
    "#795548", "#607d8b", "#f44336", "#e91e63", "#9e9e9e", "#00bcd4", "#8bc34a", "#cddc39"
];
colorList.forEach((c, i) => skinData.push({ id: `s${i}`, color: c, req: i * 50 }));

let tokens = parseFloat(localStorage.getItem("tokens")) || 0;
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let playerColor = "#ff5722";
let selectedSkinId = "s0";
let config = JSON.parse(localStorage.getItem("controls")) || { Jump: "Space", Left: "ArrowLeft", Right: "ArrowRight" };
let bindingKey = null;

// Game State
let currentSkinPage = 0;
const skinsPerPage = 12;
let activeEnv = "White";
let envMultiplier = 1;
let powerupStatus = { DoubleJump: false, Magnet: false };
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["bg-White"];

let platforms = [], items = [], keys = {}, gameActive = false, cameraY = 0, maxHeight = 0;
let player = { x: 185, y: 500, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0 };
let lastTime = 0;

// --- MENU NAVIGATION ---
function showMenu(key) {
    Object.values(menus).forEach(m => m.style.display = "none");
    if (menus[key]) menus[key].style.display = "flex";
    if (key === 'skins') renderSkins();
    if (key === 'settings') updateSettingsUI();
}

document.getElementById("startBtn").onclick = () => init();
document.getElementById("shopBtn").onclick = () => showMenu('shop');
document.getElementById("skinMenuBtn").onclick = () => showMenu('skins');
document.getElementById("settingsBtn").onclick = () => showMenu('settings');
document.querySelectorAll(".close-btn").forEach(b => b.onclick = () => showMenu('main'));

// --- SKIN SYSTEM ---
function renderSkins() {
    const grid = document.getElementById("skinGrid");
    grid.innerHTML = "";
    const start = currentSkinPage * skinsPerPage;
    const pageSkins = skinData.slice(start, start + skinsPerPage);

    pageSkins.forEach(s => {
        const btn = document.createElement("button");
        btn.className = "skin-btn";
        if (highScore < s.req) btn.classList.add("locked");
        if (selectedSkinId === s.id) btn.classList.add("selected");
        
        btn.style.background = s.color === "rainbow" ? "linear-gradient(45deg,red,blue,green)" : (s.color === "void" ? "#000" : s.color);
        btn.onclick = () => { if(highScore >= s.req) { playerColor = s.color; selectedSkinId = s.id; renderSkins(); } };
        grid.appendChild(btn);
    });
    document.getElementById("skinPageNum").innerText = `PAGE ${currentSkinPage + 1}`;
}

document.getElementById("nextSkinPage").onclick = () => { if((currentSkinPage+1)*skinsPerPage < skinData.length) { currentSkinPage++; renderSkins(); } };
document.getElementById("prevSkinPage").onclick = () => { if(currentSkinPage > 0) { currentSkinPage--; renderSkins(); } };

// --- KEYBINDS ---
function updateSettingsUI() {
    document.getElementById("bindJump").innerText = config.Jump.replace("Arrow","");
    document.getElementById("bindLeft").innerText = config.Left.replace("Arrow","");
    document.getElementById("bindRight").innerText = config.Right.replace("Arrow","");
}
['Jump','Left','Right'].forEach(act => {
    document.getElementById(`bind${act}`).onclick = () => { bindingKey = act; document.getElementById(`bind${act}`).innerText = "..."; };
});

// --- SHOP ---
window.buyItem = function(type, name, price) {
    const id = `${type}-${name}`;
    if (ownedItems.includes(id)) {
        if (type === 'bg') { activeEnv = name; setMultiplier(name); }
        return;
    }
    if (tokens >= price) {
        tokens -= price; ownedItems.push(id);
        if (type === 'bg') { activeEnv = name; setMultiplier(name); }
        else powerupStatus[name] = true;
        updateUI();
    }
};
function setMultiplier(env) {
    const m = { "White": 1, "Blue": 1.2, "Forest": 1.5, "Midnight": 3, "Void": 10 };
    envMultiplier = m[env] || 1;
}

// --- GAME CORE ---
function init() {
    platforms = []; items = []; cameraY = 0; maxHeight = 0;
    player.x = 185; player.y = 500; player.velX = 0; player.velY = 0; player.jumpCount = 0;
    
    platforms.push({ x: 0, y: 580, width: 400, height: 20, type: 'normal' });
    
    for(let i=0; i<1500; i++) {
        let lastY = platforms[platforms.length-1].y - (100 + Math.random()*45);
        let r = Math.random();
        let type = 'normal';
        if (r > 0.9) type = 'tramp';
        else if (r > 0.8) type = 'ice';
        else if (r > 0.7) type = 'conveyor';
        else if (r > 0.6) type = 'crumble';
        
        platforms.push({ x: Math.random()*320, y: lastY, width: 80, height: 14, type, crack: 1, isCracking: false });
        if(Math.random() > 0.75) items.push({ x: Math.random()*380, y: lastY - 30, collected: false });
    }
    gameActive = true; showMenu('none'); lastTime = performance.now(); loop();
}

function loop(t) {
    if (!gameActive) return;
    const dt = Math.min((t - lastTime) / 16.67, 2);
    lastTime = t;

    // Physics
    if (keys[config.Left]) player.velX -= 0.8 * dt;
    if (keys[config.Right]) player.velX += 0.8 * dt;
    player.velX *= Math.pow(0.85, dt);
    player.x += player.velX * dt;
    player.y += player.velY * dt;
    player.velY += 0.5 * dt;

    if (player.x < -30) player.x = 400; if (player.x > 400) player.x = -30;

    // Collisions
    let onIce = false;
    platforms.forEach(p => {
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 15 + player.velY && player.x + 30 > p.x && player.x < p.x + p.width) {
            if (p.type === 'tramp') { player.velY = -18; player.jumpCount = 1; }
            else {
                player.velY = 0; player.y = p.y - 30; player.jumpCount = 0;
                if (p.type === 'ice') onIce = true;
                if (p.type === 'conveyor') player.velX += 3 * dt;
                if (p.type === 'crumble') p.isCracking = true;
            }
        }
        if (p.isCracking) p.crack -= 0.02 * dt;
    });
    player.onIce = onIce;
    platforms = platforms.filter(p => p.type !== 'crumble' || p.crack > 0);

    // Items
    items.forEach(it => {
        if (!it.collected) {
            let dx = player.x - it.x, dy = player.y - it.y;
            let d = Math.sqrt(dx*dx + dy*dy);
            if (powerupStatus.Magnet && d < 120) { it.x += (dx/-d)*4; it.y += (dy/-d)*4; }
            if (d < 35) { it.collected = true; tokens += (1 * envMultiplier); updateUI(); }
        }
    });

    // Score & Camera
    if (player.y < cameraY + 300) cameraY = player.y - 300;
    let currentScore = Math.max(0, Math.floor((500 - player.y)/10));
    if (currentScore > maxHeight) {
        maxHeight = currentScore;
        document.getElementById("scoreBoard").innerText = `${maxHeight}m`;
        if (maxHeight > highScore) { highScore = maxHeight; updateUI(); }
    }

    if (player.y > cameraY + 800) { gameActive = false; showMenu('main'); }

    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0,0,400,600);
    const bg = { "White": "#f0f0f0", "Blue": "#e3f2fd", "Forest": "#e8f5e9", "Midnight": "#0a0a20", "Void": "#000" };
    ctx.fillStyle = bg[activeEnv] || "#f0f0f0";
    ctx.fillRect(0,0,400,600);

    ctx.save(); ctx.translate(0, -cameraY);
    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#00f2fe";
        else if (p.type === 'tramp') ctx.fillStyle = "#ff3b3b";
        else if (p.type === 'conveyor') ctx.fillStyle = "#666";
        else if (p.type === 'crumble') ctx.fillStyle = `rgba(76,175,80,${p.crack})`;
        else ctx.fillStyle = "#222";
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
    ctx.fillStyle = "#ffd700";
    items.forEach(it => { if(!it.collected) { ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, Math.PI*2); ctx.fill(); } });
    
    ctx.fillStyle = playerColor === 'rainbow' ? `hsl(${Date.now()/10%360},100%,50%)` : playerColor;
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
}

function handleJump() {
    const limit = powerupStatus.DoubleJump ? 2 : 1;
    if (player.jumpCount < limit) { player.velY = -12.5; player.jumpCount++; }
}

window.onkeydown = (e) => {
    if (bindingKey) { config[bindingKey] = e.code; bindingKey = null; updateSettingsUI(); updateUI(); return; }
    if (e.code === config.Jump) handleJump();
    keys[e.code] = true;
};
window.onkeyup = (e) => keys[e.code] = false;

// Touch
document.getElementById("leftBtn").ontouchstart = (e) => { e.preventDefault(); keys[config.Left] = true; };
document.getElementById("leftBtn").ontouchend = () => keys[config.Left] = false;
document.getElementById("rightBtn").ontouchstart = (e) => { e.preventDefault(); keys[config.Right] = true; };
document.getElementById("rightBtn").ontouchend = () => keys[config.Right] = false;
document.getElementById("jumpBtn").ontouchstart = (e) => { e.preventDefault(); handleJump(); };

function updateUI() {
    document.getElementById("tokenBoard").innerText = `🪙 ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `🏆 ${highScore}m`;
    localStorage.setItem("tokens", tokens);
    localStorage.setItem("highScore", highScore);
}
updateUI();
