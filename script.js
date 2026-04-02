const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menus = {
    main: document.getElementById("mainMenu"),
    shop: document.getElementById("shopMenu"),
    skins: document.getElementById("skinMenu"),
    settings: document.getElementById("settingsModal"),
    ui: document.getElementById("ui"),
    mobile: document.getElementById("mobileControls")
};

// --- CREATIVE SKINS DATA ---
const skinData = [
    {id: 's0', type: 'color', val: '#ff5722', req: 0},
    {id: 's1', type: 'color', val: '#2196f3', req: 50},
    {id: 's2', type: 'pattern', val: 'galaxy', req: 150}, // Blue with white dots
    {id: 's3', type: 'pattern', val: 'matrix', req: 300}, // Black with green lines
    {id: 's4', type: 'color', val: '#ffffff', req: 400},
    {id: 's5', type: 'pattern', val: 'gold', req: 600},   // Shiny gold gradient
    {id: 's6', type: 'pattern', val: 'void', req: 800},   // Pure black + white stroke
    {id: 's7', type: 'pattern', val: 'neon', req: 1000},  // Pulsing magenta
];

let tokens = parseFloat(localStorage.getItem("tokens")) || 0; 
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let selectedSkin = skinData[0];
let config = JSON.parse(localStorage.getItem("controls")) || { Jump: "Space", Left: "ArrowLeft", Right: "ArrowRight" };
let bindingKey = null;

let currentSkinPage = 0;
let activeEnv = "White";
let envMultiplier = 1;
let powerupStatus = { DoubleJump: false, Magnet: false };
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["bg-White"];

let platforms = [], items = [], keys = {}, gameActive = false, cameraY = 0, maxHeight = 0;
let player = { x: 185, y: 550, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0 };
let lastTime = 0;

// --- UI LOGIC ---
function showMenu(key) {
    Object.values(menus).forEach(m => m.style.display = "none");
    if (key === 'none') {
        menus.ui.style.display = "flex";
        menus.mobile.style.display = "flex";
    } else if (menus[key]) {
        menus[key].style.display = "flex";
    }
    if (key === 'skins') renderSkins();
    if (key === 'shop') renderShop();
}

// Calibration Logic Fix
['Jump','Left','Right'].forEach(act => {
    document.getElementById(`bind${act}`).onclick = () => {
        bindingKey = act;
        document.getElementById(`bind${act}`).innerText = "...";
    };
});

window.onkeydown = (e) => {
    if (bindingKey) {
        config[bindingKey] = e.code;
        localStorage.setItem("controls", JSON.stringify(config));
        updateSettingsUI();
        bindingKey = null;
        return;
    }
    if (e.code === config.Jump) handleJump();
    keys[e.code] = true;
};
window.onkeyup = (e) => keys[e.code] = false;

function updateSettingsUI() {
    document.getElementById("bindJump").innerText = config.Jump.replace("Arrow","").toUpperCase();
    document.getElementById("bindLeft").innerText = config.Left.replace("Arrow","").toUpperCase();
    document.getElementById("bindRight").innerText = config.Right.replace("Arrow","").toUpperCase();
}

// --- SHOP & SKINS ---
function renderShop() {
    const envList = document.getElementById("envList");
    const techList = document.getElementById("techList");
    envList.innerHTML = ""; techList.innerHTML = "";
    const envs = [{n:'White', m:1, p:0}, {n:'Blue', m:2.5, p:50}, {n:'Void', m:50, p:500}];
    envs.forEach(e => {
        const isOwned = ownedItems.includes(`bg-${e.n}`);
        const btn = document.createElement("button");
        btn.className = `shop-item ${activeEnv === e.n ? 'equipped' : ''}`;
        btn.innerHTML = `<span>${e.n} (${e.m}x)</span> <span>${activeEnv === e.n ? 'EQUIP' : (isOwned ? 'OWNED' : e.p)}</span>`;
        btn.onclick = () => buyItem('bg', e.n, e.p);
        envList.appendChild(btn);
    });
}

function renderSkins() {
    const grid = document.getElementById("skinGrid");
    grid.innerHTML = "";
    skinData.forEach(s => {
        const btn = document.createElement("button");
        const locked = highScore < s.req;
        btn.className = `skin-btn ${locked ? 'locked' : ''} ${selectedSkin.id === s.id ? 'selected' : ''}`;
        btn.style.background = s.type === 'color' ? s.val : '#222';
        if (locked) btn.innerHTML = "🔒";
        btn.onclick = () => { if(!locked) { selectedSkin = s; renderSkins(); } };
        grid.appendChild(btn);
    });
}

window.buyItem = function(type, name, price) {
    const id = `${type}-${name}`;
    if (ownedItems.includes(id)) {
        if (type === 'bg') { activeEnv = name; envMultiplier = (name==='Void'?50:(name==='Blue'?2.5:1)); renderShop(); }
        return;
    }
    if (tokens >= price) {
        tokens -= price; ownedItems.push(id);
        updateUI(); renderShop();
    }
};

// --- GAME ENGINE ---
function init() {
    platforms = []; items = []; maxHeight = 0;
    // Start Floor - Fixed at bottom
    platforms.push({ x: 0, y: 580, width: 400, height: 20, type: 'normal' });
    player = { x: 185, y: 550, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0 };
    cameraY = 0; 

    // Procedural Generation with Dynamic Difficulty
    for(let i=0; i<1000; i++) {
        let diff = Math.min(i / 100, 1); // 0 to 1 scaling difficulty
        let lastY = (platforms.length ? platforms[platforms.length-1].y : 580) - (100 + (diff * 40) + Math.random() * 30);
        
        let width = 80 - (diff * 30); // Platforms get smaller
        let type = 'normal';
        let r = Math.random();
        
        if (r > 0.9) type = 'tramp';
        else if (r > 0.8) type = 'ice';
        else if (r > 0.7 && diff > 0.3) type = 'moving'; // Moving platforms start after some height
        
        platforms.push({ 
            x: Math.random() * (400 - width), 
            y: lastY, 
            width: width, 
            height: 12, 
            type: type, 
            dir: 1, 
            speed: 1 + (diff * 2) 
        });

        // More coins based on multiplier
        if (Math.random() > 0.4) items.push({ x: Math.random() * 380, y: lastY - 30, collected: false });
    }

    gameActive = true; showMenu('none'); 
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function loop(t) {
    if (!gameActive) return;
    const dt = Math.min((t - lastTime) / 16.67, 1.5);
    lastTime = t;

    // Movement
    let friction = player.onIce ? 0.98 : 0.82;
    if (keys[config.Left]) player.velX -= 1.1 * dt;
    if (keys[config.Right]) player.velX += 1.1 * dt;
    player.velX *= Math.pow(friction, dt);
    player.x += player.velX * dt; player.y += player.velY * dt; player.velY += 0.58 * dt;

    if (player.x < -30) player.x = 400; if (player.x > 400) player.x = -30;

    // Platform logic
    let onIce = false;
    platforms.forEach(p => {
        // Moving Platform Logic
        if (p.type === 'moving') {
            p.x += p.dir * p.speed * dt;
            if (p.x <= 0 || p.x + p.width >= 400) p.dir *= -1;
        }

        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 20 + player.velY && player.x + 30 > p.x && player.x < p.x + p.width) {
            if (p.type === 'tramp') { player.velY = -26; player.jumpCount = 1; }
            else { 
                player.velY = 0; player.y = p.y - 30; player.jumpCount = 0; 
                onIce = (p.type === 'ice');
                if (p.type === 'moving') player.x += p.dir * p.speed * dt;
            }
        }
    });
    player.onIce = onIce;

    // Coins
    items.forEach(it => {
        if (!it.collected) {
            let d = Math.sqrt((player.x+15 - it.x)**2 + (player.y+15 - it.y)**2);
            if (d < 35) { it.collected = true; tokens += (1 * envMultiplier); updateUI(); }
        }
    });

    // Camera follow
    if (player.y < cameraY + 300) cameraY = player.y - 300;
    
    let score = Math.max(0, Math.floor((550 - player.y)/10));
    if (score > maxHeight) { 
        maxHeight = score; 
        document.getElementById("scoreBoard").innerText = `${maxHeight}m`; 
        if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("highScore", highScore); }
    }
    
    if (player.y > cameraY + 800) { gameActive = false; showMenu('main'); updateUI(); }
    
    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bgs = { "White": "#fdfdfd", "Blue": "#e3f2fd", "Void": "#000" };
    ctx.fillStyle = bgs[activeEnv];
    ctx.fillRect(0,0,400,600);

    ctx.save(); ctx.translate(0, -cameraY);
    platforms.forEach(p => {
        if (p.type === 'moving') ctx.fillStyle = "#9c27b0";
        else if (p.type === 'ice') ctx.fillStyle = "#00d2ff";
        else if (p.type === 'tramp') ctx.fillStyle = "#ff1744";
        else ctx.fillStyle = "#333";
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // Coins
    ctx.fillStyle = "#ffd700";
    items.forEach(it => { if(!it.collected) { ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, Math.PI*2); ctx.fill(); } });
    
    // Creative Skin Draw
    if (selectedSkin.type === 'color') ctx.fillStyle = selectedSkin.val;
    else if (selectedSkin.val === 'galaxy') {
        ctx.fillStyle = '#1a237e';
        ctx.fillRect(player.x, player.y, 30, 30);
        ctx.fillStyle = '#fff';
        for(let i=0; i<5; i++) ctx.fillRect(player.x + (i*5)%25, player.y + (i*7)%25, 2, 2);
    } else if (selectedSkin.val === 'matrix') {
        ctx.fillStyle = '#000';
        ctx.fillRect(player.x, player.y, 30, 30);
        ctx.fillStyle = '#0f0';
        ctx.fillRect(player.x+5, player.y+2, 2, 20);
    } else if (selectedSkin.val === 'gold') {
        let g = ctx.createLinearGradient(player.x, player.y, player.x+30, player.y+30);
        g.addColorStop(0, '#ffd700'); g.addColorStop(1, '#ff8f00');
        ctx.fillStyle = g;
    }
    
    if (selectedSkin.type !== 'pattern' || selectedSkin.val !== 'galaxy') ctx.fillRect(player.x, player.y, 30, 30);
    if (selectedSkin.val === 'void') { ctx.strokeStyle = "#fff"; ctx.strokeRect(player.x, player.y, 30, 30); }
    
    ctx.restore();
}

function handleJump() {
    const limit = powerupStatus.DoubleJump ? 2 : 1;
    if (player.jumpCount < limit) { player.velY = -14; player.jumpCount++; }
}

document.getElementById("startBtn").onclick = () => init();
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

showMenu('main');
updateUI();
