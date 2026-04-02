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

// --- DATA ---
const skinData = [
    {id: 's0', type: 'color', val: '#ff5722', req: 0},
    {id: 's1', type: 'color', val: '#2196f3', req: 50},
    {id: 's2', type: 'pattern', val: 'galaxy', req: 150},
    {id: 's3', type: 'pattern', val: 'matrix', req: 300},
    {id: 's4', type: 'color', val: '#ffffff', req: 450},
    {id: 's5', type: 'pattern', val: 'gold', req: 600},
    {id: 's6', type: 'pattern', val: 'void', req: 800},
    {id: 's7', type: 'pattern', val: 'neon', req: 1000},
    {id: 's8', type: 'color', val: '#e91e63', req: 1200},
    {id: 's9', type: 'color', val: '#00bcd4', req: 1400}
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

let platforms = [], items = [], particles = [], debris = [], keys = {}, gameActive = false, cameraY = 0, maxHeight = 0;
let player = { x: 185, y: 540, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0 };
let lastTime = 0;

// --- UI ---
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

function renderShop() {
    const envList = document.getElementById("envList");
    const techList = document.getElementById("techList");
    envList.innerHTML = ""; techList.innerHTML = "";
    
    const envs = [
        {n:'White', m:1, p:0}, {n:'Blue', m:2.5, p:50}, {n:'Forest', m:5, p:100}, 
        {n:'Lava', m:8, p:200}, {n:'Neon', m:15, p:350}, {n:'Void', m:50, p:500}
    ];

    envs.forEach(e => {
        const isOwned = ownedItems.includes(`bg-${e.n}`);
        const btn = document.createElement("button");
        btn.className = `shop-item ${activeEnv === e.n ? 'equipped' : ''}`;
        btn.innerHTML = `<span>${e.n} (${e.m}x)</span> <span>${activeEnv === e.n ? 'EQUIP' : (isOwned ? 'OWNED' : e.p)}</span>`;
        btn.onclick = () => buyItem('bg', e.n, e.p);
        envList.appendChild(btn);
    });

    const techs = [{id:'DoubleJump', n:'Double Jump', p:150}, {id:'Magnet', n:'Token Magnet', p:250}];
    techs.forEach(t => {
        const isOwned = ownedItems.includes(`pow-${t.id}`);
        const btn = document.createElement("button");
        btn.className = "shop-item";
        btn.innerHTML = `<span>${t.n}</span> <span>${isOwned ? 'ACTIVE' : t.p}</span>`;
        btn.onclick = () => buyItem('pow', t.id, t.p);
        techList.appendChild(btn);
    });
}

function renderSkins() {
    const grid = document.getElementById("skinGrid");
    grid.innerHTML = "";
    skinData.forEach(s => {
        const btn = document.createElement("button");
        const locked = highScore < s.req;
        btn.className = `skin-btn ${locked ? 'locked' : ''} ${selectedSkin.id === s.id ? 'selected' : ''}`;
        btn.style.background = s.type === 'color' ? s.val : '#333';
        btn.onclick = () => { if(!locked) { selectedSkin = s; renderSkins(); } };
        grid.appendChild(btn);
    });
}

window.buyItem = function(type, name, price) {
    const id = `${type}-${name}`;
    if (ownedItems.includes(id)) {
        if (type === 'bg') { 
            activeEnv = name; 
            const eMap = {White:1, Blue:2.5, Forest:5, Lava:8, Neon:15, Void:50};
            envMultiplier = eMap[name]; 
            renderShop(); 
        }
        return;
    }
    if (tokens >= price) {
        tokens -= price; ownedItems.push(id);
        if (type === 'pow') powerupStatus[name] = true;
        updateUI(); renderShop();
    }
};

// --- ENGINE ---
function createDebris(p) {
    // Split platform in half
    debris.push({x: p.x, y: p.y, w: p.width/2, h: p.height, vx: -2, vy: 1, rot: 0, vr: -0.1});
    debris.push({x: p.x + p.width/2, y: p.y, w: p.width/2, h: p.height, vx: 2, vy: 1, rot: 0, vr: 0.1});
    // Create particles
    for(let i=0; i<10; i++){
        particles.push({
            x: p.x + Math.random()*p.width, y: p.y, 
            vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, 
            life: 1.0, color: '#ff5722'
        });
    }
}

function init() {
    platforms = []; items = []; debris = []; particles = []; maxHeight = 0;
    platforms.push({ x: 0, y: 580, width: 400, height: 20, type: 'normal' });
    player = { x: 185, y: 540, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0 };
    cameraY = 0;

    for(let i=0; i<800; i++) {
        let diff = Math.min(i / 150, 1);
        let lastY = (platforms[platforms.length-1].y) - (110 + (diff * 45) + Math.random() * 40);
        let width = 85 - (diff * 40);
        
        let type = 'normal';
        let r = Math.random();
        if (r > 0.85) type = 'tramp';
        else if (r > 0.70) type = 'ice';
        else if (r > 0.50) type = 'crumble';

        platforms.push({ 
            x: Math.random() * (400 - width), y: lastY, width: width, height: 14, 
            type: type, moving: Math.random() < (diff * 0.8),
            dir: Math.random() > 0.5 ? 1 : -1, speed: 1 + (diff * 3),
            crack: 1, isCracking: false
        });

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

    // Platforms
    let onIce = false;
    platforms.forEach(p => {
        if (p.moving) {
            p.x += p.dir * p.speed * dt;
            if (p.x <= 0 || p.x + p.width >= 400) p.dir *= -1;
        }

        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 20 + player.velY && player.x + 30 > p.x && player.x < p.x + p.width) {
            if (p.type === 'tramp') { player.velY = -27; player.jumpCount = 1; }
            else { 
                player.velY = 0; player.y = p.y - 30; player.jumpCount = 0; 
                onIce = (p.type === 'ice');
                if (p.type === 'crumble') p.isCracking = true;
                if (p.moving) player.x += p.dir * p.speed * dt;
            }
        }
        if (p.isCracking) {
            p.crack -= 0.04 * dt;
            if (p.crack <= 0) createDebris(p);
        }
    });
    platforms = platforms.filter(p => p.crack > 0);

    // Debris & Particles
    debris.forEach(d => { d.x += d.vx; d.y += d.vy; d.vy += 0.2; d.rot += d.vr; });
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.02; });
    debris = debris.filter(d => d.y < cameraY + 650);
    particles = particles.filter(p => p.life > 0);

    // Items
    items.forEach(it => {
        if (!it.collected) {
            let dx = (player.x + 15) - it.x, dy = (player.y + 15) - it.y;
            let d = Math.sqrt(dx*dx + dy*dy);
            if (powerupStatus.Magnet && d < 150) { it.x += (dx/d)*6 * dt; it.y += (dy/d)*6 * dt; }
            if (d < 35) { it.collected = true; tokens += (1 * envMultiplier); updateUI(); }
        }
    });

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    let score = Math.max(0, Math.floor((540 - player.y)/10));
    if (score > maxHeight) { 
        maxHeight = score; 
        document.getElementById("scoreBoard").innerText = `${maxHeight}m`; 
        if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("highScore", highScore); }
    }
    if (player.y > cameraY + 850) { gameActive = false; showMenu('main'); updateUI(); }
    
    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bgs = { White: "#fdfdfd", Blue: "#e3f2fd", Forest: "#e8f5e9", Lava: "#3e2723", Neon: "#1a1a2e", Void: "#000" };
    ctx.fillStyle = bgs[activeEnv];
    ctx.fillRect(0,0,400,600);

    ctx.save(); ctx.translate(0, -cameraY);
    
    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#00d2ff";
        else if (p.type === 'tramp') ctx.fillStyle = "#ff1744";
        else if (p.type === 'crumble') {
            // GREEN TO ORANGE TO RED
            const r = 255 * (1 - p.crack);
            const g = 255 * p.crack;
            ctx.fillStyle = `rgb(${r},${g},0)`;
        }
        else ctx.fillStyle = "#333";
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    debris.forEach(d => {
        ctx.save();
        ctx.translate(d.x + d.w/2, d.y + d.h/2);
        ctx.rotate(d.rot);
        ctx.fillStyle = "#ff5722";
        ctx.fillRect(-d.w/2, -d.h/2, d.w, d.h);
        ctx.restore();
    });

    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#ffd700";
    items.forEach(it => { if(!it.collected) { ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, Math.PI*2); ctx.fill(); } });
    
    // Player
    ctx.fillStyle = selectedSkin.type === 'color' ? selectedSkin.val : '#222';
    if (selectedSkin.val === 'galaxy') {
        ctx.fillStyle = '#1a237e'; ctx.fillRect(player.x, player.y, 30, 30);
        ctx.fillStyle = '#fff'; for(let i=0; i<5; i++) ctx.fillRect(player.x + (i*5)%25, player.y + (i*7)%25, 2, 2);
    } else if (selectedSkin.val === 'matrix') {
        ctx.fillStyle = '#000'; ctx.fillRect(player.x, player.y, 30, 30);
        ctx.fillStyle = '#0f0'; ctx.fillRect(player.x+5, player.y+2, 2, 20);
    } else if (selectedSkin.val === 'gold') {
        let g = ctx.createLinearGradient(player.x, player.y, player.x+30, player.y+30);
        g.addColorStop(0, '#ffd700'); g.addColorStop(1, '#ff8f00'); ctx.fillStyle = g;
    }
    if (selectedSkin.type !== 'pattern' || (selectedSkin.val !== 'galaxy' && selectedSkin.val !== 'matrix')) ctx.fillRect(player.x, player.y, 30, 30);
    if (selectedSkin.val === 'void') { ctx.strokeStyle = "#fff"; ctx.strokeRect(player.x, player.y, 30, 30); }
    
    ctx.restore();
}

function handleJump() {
    const limit = (ownedItems.includes('pow-DoubleJump') || powerupStatus.DoubleJump) ? 2 : 1;
    if (player.jumpCount < limit) { player.velY = -14.5; player.jumpCount++; }
}

document.getElementById("startBtn").onclick = () => init();
document.getElementById("shopBtn").onclick = () => showMenu('shop');
document.getElementById("skinMenuBtn").onclick = () => showMenu('skins');
document.getElementById("settingsBtn").onclick = () => showMenu('settings');
document.querySelectorAll(".close-btn").forEach(b => b.onclick = () => showMenu('main'));

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
