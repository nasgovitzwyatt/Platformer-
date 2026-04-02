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
const colorList = ["#ff5722", "#2196f3", "#4caf50", "#9c27b0", "#ffcc00", "#1de9b6", "#ffffff", "rainbow", "void", "#ff1744", "#00e676", "#7c4dff", "#d4e157", "#ff7043", "#26c6da", "#ec407a"];
colorList.forEach((c, i) => skinData.push({ id: `s${i}`, color: c, req: i * 50 }));

let tokens = parseFloat(localStorage.getItem("tokens")) || 500; 
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let playerColor = "#ff5722";
let selectedSkinId = "s0";
let config = JSON.parse(localStorage.getItem("controls")) || { Jump: "Space", Left: "ArrowLeft", Right: "ArrowRight" };
let bindingKey = null;

let currentSkinPage = 0;
const skinsPerPage = 8;
let activeEnv = "White";
let envMultiplier = 1;
let powerupStatus = { DoubleJump: false, Magnet: false };
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["bg-White"];

let platforms = [], items = [], particles = [], keys = {}, gameActive = false, cameraY = 0, maxHeight = 0;
let player = { x: 185, y: 540, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0 };
let lastTime = 0;

// --- UI LOGIC ---
function showMenu(key) {
    Object.values(menus).forEach(m => m.style.display = "none");
    if (menus[key]) menus[key].style.display = "flex";
    if (key === 'skins') renderSkins();
    if (key === 'shop') renderShop();
    if (key === 'settings') updateSettingsUI();
}

document.getElementById("startBtn").onclick = () => init();
document.getElementById("shopBtn").onclick = () => showMenu('shop');
document.getElementById("skinMenuBtn").onclick = () => showMenu('skins');
document.getElementById("settingsBtn").onclick = () => showMenu('settings');
document.querySelectorAll(".close-btn").forEach(b => b.onclick = () => showMenu('main'));

// --- SHOP RENDERING ---
function renderShop() {
    const envList = document.getElementById("envList");
    const techList = document.getElementById("techList");
    envList.innerHTML = ""; techList.innerHTML = "";

    const envs = [
        {name: 'White', m: 1, p: 0}, {name: 'Blue', m: 1.2, p: 50}, 
        {name: 'Forest', m: 1.5, p: 100}, {name: 'Midnight', m: 3, p: 250}, {name: 'Void', m: 10, p: 500}
    ];

    envs.forEach(e => {
        const isOwned = ownedItems.includes(`bg-${e.name}`);
        const isEquipped = activeEnv === e.name;
        const btn = document.createElement("button");
        btn.className = `shop-item ${isEquipped ? 'equipped' : ''}`;
        btn.innerHTML = `<span>${e.name} (${e.m}x)</span> <span class="price ${isOwned ? 'owned' : ''}">${isEquipped ? 'EQUIPPED' : (isOwned ? 'OWNED' : e.p)}</span>`;
        btn.onclick = () => buyItem('bg', e.name, e.p);
        envList.appendChild(btn);
    });

    const techs = [{id: 'DoubleJump', n: 'Double Jump', p: 150}, {id: 'Magnet', n: 'Token Magnet', p: 200}];
    techs.forEach(t => {
        const isOwned = ownedItems.includes(`pow-${t.id}`);
        const btn = document.createElement("button");
        btn.className = "shop-item";
        btn.innerHTML = `<span>${t.n}</span> <span class="price ${isOwned ? 'owned' : ''}">${isOwned ? 'ACTIVE' : t.p}</span>`;
        btn.onclick = () => buyItem('pow', t.id, t.p);
        techList.appendChild(btn);
    });
}

window.buyItem = function(type, name, price) {
    const id = `${type}-${name}`;
    if (ownedItems.includes(id)) {
        if (type === 'bg') { activeEnv = name; setMultiplier(name); renderShop(); }
        return;
    }
    if (tokens >= price) {
        tokens -= price; ownedItems.push(id);
        if (type === 'bg') { activeEnv = name; setMultiplier(name); }
        else powerupStatus[name] = true;
        updateUI(); renderShop();
    }
};

function setMultiplier(env) {
    const m = { "White": 1, "Blue": 1.2, "Forest": 1.5, "Midnight": 3, "Void": 10 };
    envMultiplier = m[env] || 1;
}

// --- SKIN PAGINATION ---
function renderSkins() {
    const grid = document.getElementById("skinGrid");
    grid.innerHTML = "";
    const start = currentSkinPage * skinsPerPage;
    const pageSkins = skinData.slice(start, start + skinsPerPage);

    pageSkins.forEach(s => {
        const btn = document.createElement("button");
        const isLocked = highScore < s.req;
        btn.className = `skin-btn ${isLocked ? 'locked' : ''} ${selectedSkinId === s.id ? 'selected' : ''}`;
        btn.style.background = s.color === "rainbow" ? "linear-gradient(45deg,red,blue,green)" : (s.color === "void" ? "#000" : s.color);
        btn.onclick = () => { if(!isLocked) { playerColor = s.color; selectedSkinId = s.id; renderSkins(); } };
        grid.appendChild(btn);
    });
    document.getElementById("skinPageNum").innerText = `PAGE ${currentSkinPage + 1}`;
}

document.getElementById("nextSkinPage").onclick = () => {
    if ((currentSkinPage + 1) * skinsPerPage < skinData.length) { currentSkinPage++; renderSkins(); }
};
document.getElementById("prevSkinPage").onclick = () => {
    if (currentSkinPage > 0) { currentSkinPage--; renderSkins(); }
};

// --- KEYBINDS ---
function updateSettingsUI() {
    document.getElementById("bindJump").innerText = config.Jump.replace("Arrow","");
    document.getElementById("bindLeft").innerText = config.Left.replace("Arrow","");
    document.getElementById("bindRight").innerText = config.Right.replace("Arrow","");
}
['Jump','Left','Right'].forEach(act => {
    document.getElementById(`bind${act}`).onclick = () => { bindingKey = act; document.getElementById(`bind${act}`).innerText = "..."; };
});

// --- GAME ENGINE ---
function init() {
    platforms = []; items = []; cameraY = 0; maxHeight = 0;
    player = { x: 185, y: 540, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0 };
    platforms.push({ x: 0, y: 580, width: 400, height: 100, type: 'normal' }); // Massive floor
    
    for(let i=0; i<1500; i++) {
        let lastY = platforms[platforms.length - 1].y - (105 + Math.random() * 50);
        let type = Math.random() > 0.9 ? 'tramp' : (Math.random() > 0.8 ? 'ice' : (Math.random() > 0.7 ? 'crumble' : 'normal'));
        platforms.push({ x: Math.random() * 320, y: lastY, width: 85, height: 14, type, crack: 1, isCracking: false });
        if(Math.random() > 0.45) items.push({ x: Math.random() * 380, y: lastY - 30, collected: false });
    }
    gameActive = true; showMenu('none'); lastTime = performance.now(); loop();
}

function loop(t) {
    if (!gameActive) return;
    const dt = Math.min((t - lastTime) / 16.67, 1.5);
    lastTime = t;

    // Movement
    let friction = player.onIce ? 0.99 : 0.82;
    if (keys[config.Left]) player.velX -= 1.1 * dt;
    if (keys[config.Right]) player.velX += 1.1 * dt;
    player.velX *= Math.pow(friction, dt);
    player.x += player.velX * dt; player.y += player.velY * dt; player.velY += 0.58 * dt;

    if (player.x < -30) player.x = 400; if (player.x > 400) player.x = -30;

    // Collision
    let onIce = false;
    platforms.forEach(p => {
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 25 + player.velY && player.x + 30 > p.x && player.x < p.x + p.width) {
            if (p.type === 'tramp') { player.velY = -25; player.jumpCount = 1; }
            else { player.velY = 0; player.y = p.y - 30; player.jumpCount = 0; onIce = (p.type === 'ice'); if (p.type === 'crumble') p.isCracking = true; }
        }
        if (p.isCracking) p.crack -= 0.03 * dt;
    });
    player.onIce = onIce;
    platforms = platforms.filter(p => p.type !== 'crumble' || p.crack > 0);

    // Items
    items.forEach(it => {
        if (!it.collected) {
            let dx = (player.x + 15) - it.x, dy = (player.y + 15) - it.y;
            let d = Math.sqrt(dx*dx + dy*dy);
            if (powerupStatus.Magnet && d < 150) { it.x += (dx/d)*5 * dt; it.y += (dy/d)*5 * dt; }
            if (d < 35) { it.collected = true; tokens += (1 * envMultiplier); updateUI(); }
        }
    });

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    let score = Math.max(0, Math.floor((540 - player.y)/10));
    if (score > maxHeight) { maxHeight = score; document.getElementById("scoreBoard").innerText = `${maxHeight}m`; if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("highScore", highScore); updateUI(); } }
    if (player.y > cameraY + 750) { gameActive = false; showMenu('main'); }
    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0,0,400,600);
    const bgColors = { "White": "#fdfdfd", "Blue": "#e3f2fd", "Forest": "#e8f5e9", "Midnight": "#0a0a25", "Void": "#000" };
    ctx.fillStyle = bgColors[activeEnv];
    ctx.fillRect(0,0,400,600);

    ctx.save(); ctx.translate(0, -cameraY);
    
    // Draw Platforms
    platforms.forEach(p => {
        ctx.fillStyle = p.type === 'ice' ? "#00d2ff" : (p.type === 'tramp' ? "#ff1744" : (p.type === 'crumble' ? `rgba(255,100,0,${p.crack})` : "#222"));
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // Draw Tokens
    ctx.fillStyle = "#ffd700";
    items.forEach(it => { if(!it.collected) { ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, Math.PI*2); ctx.fill(); } });
    
    // Draw Player (ENFORCED TOP LAYER)
    ctx.fillStyle = playerColor === 'rainbow' ? `hsl(${Date.now()/10%360},100%,50%)` : playerColor;
    if(playerColor === 'void') { ctx.strokeStyle = "#fff"; ctx.strokeRect(player.x, player.y, 30, 30); }
    ctx.fillRect(player.x, player.y, 30, 30);
    
    ctx.restore();
}

function handleJump() {
    const limit = powerupStatus.DoubleJump ? 2 : 1;
    if (player.jumpCount < limit) { player.velY = -14.5; player.jumpCount++; }
}

window.onkeydown = (e) => {
    if (bindingKey) { config[bindingKey] = e.code; bindingKey = null; updateSettingsUI(); updateUI(); return; }
    if (e.code === config.Jump) handleJump();
    keys[e.code] = true;
};
window.onkeyup = (e) => keys[e.code] = false;

document.getElementById("leftBtn").ontouchstart = (e) => { e.preventDefault(); keys[config.Left] = true; };
document.getElementById("leftBtn").ontouchend = () => keys[config.Left] = false;
document.getElementById("rightBtn").ontouchstart = (e) => { e.preventDefault(); keys[config.Right] = true; };
document.getElementById("rightBtn").ontouchend = () => keys[config.Right] = false;
document.getElementById("jumpBtn").ontouchstart = (e) => { e.preventDefault(); handleJump(); };

function updateUI() {
    document.getElementById("tokenBoard").innerText = `🪙 ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `🏆 ${highScore}m`;
    localStorage.setItem("tokens", tokens);
}
updateUI();
