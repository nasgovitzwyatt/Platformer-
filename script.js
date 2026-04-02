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

// --- ELITE SKINS DATA ---
const skinData = [
    {id: 's0', n: 'Red', val: '#ff0000', req: 50, type: 'color'},
    {id: 's1', n: 'Blue', val: '#0000ff', req: 100, type: 'color'},
    {id: 's2', n: 'Orange', val: '#ffae00', req: 150, type: 'color'},
    {id: 's3', n: 'Green', val: '#00ff00', req: 200, type: 'color'},
    {id: 's4', n: 'Bronze', val: '#cd7f32', req: 250, type: 'color'},
    {id: 's5', n: 'Silver', val: '#c0c0c0', req: 300, type: 'color'},
    {id: 's6', n: 'Gold', val: '#ffd700', req: 350, type: 'color'},
    {id: 's7', n: 'Rainbow', val: 'rainbow', req: 400, type: 'pattern'},
    {id: 's8', n: 'Space', val: '#1a1a2e', req: 450, type: 'pattern'},
    {id: 's9', n: 'Transparent', val: 'rgba(255,255,255,0.1)', req: 500, type: 'void'},
    {id: 's10', n: 'Ocean', val: '#0077be', req: 550, type: 'color'},
    {id: 's11', n: 'Gradient', val: 'linear-gradient', req: 600, type: 'pattern'},
    {id: 's12', n: 'Void', val: 'void', req: 700, type: 'pattern'},
    {id: 's13', n: 'Nebula', val: '#4b0082', req: 1000, type: 'pattern'},
    {id: 's14', n: 'Magma', val: '#ff4500', req: 1500, type: 'pattern'},
    {id: 's15', n: 'Matrix', val: '#003300', req: 2000, type: 'pattern'},
    {id: 's16', n: 'Diamond', val: '#b9f2ff', req: 3000, type: 'color'},
    {id: 's17', n: 'Solar', val: '#ffcc00', req: 4000, type: 'pattern'},
    {id: 's18', n: 'Dark Matter', val: '#000000', req: 5000, type: 'pattern'}
];

// --- STATE ---
let tokens = parseFloat(localStorage.getItem("tokens")) || 0; 
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let selectedSkin = skinData[0];
let config = JSON.parse(localStorage.getItem("controls")) || { Jump: "Space", Left: "ArrowLeft", Right: "ArrowRight" };
let bindingKey = null;
let currentSkinPage = 0;
const skinsPerPage = 8;
let currentEnvPage = 0;
const envsPerPage = 4;
let activeEnv = "White";
let envMultiplier = 1;
let powerupStatus = JSON.parse(localStorage.getItem("powerups")) || { DoubleJump: false, Magnet: false, AntiGrav: false, GhostMode: false, TokenSurge: false, SlowMo: false, Shield: false };
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["bg-White"];

let platforms = [], items = [], particles = [], debris = [], keys = {}, gameActive = false, cameraY = 0, maxHeight = 0;
let player = { x: 185, y: 540, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0, shieldActive: false };
let lastTime = 0;

// --- NOTIFICATION SYSTEM ---
function notify(text) {
    const n = document.createElement("div");
    n.className = "unlock-notify";
    n.innerText = text;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

// --- UI & CALIBRATION ---
function showMenu(key) {
    Object.values(menus).forEach(m => { if(m) m.style.display = "none"; });
    if (key === 'none') {
        menus.ui.style.display = "flex";
        menus.mobile.style.display = "flex";
    } else if (menus[key]) {
        menus[key].style.display = "flex";
    }
    if (key === 'skins') renderSkins();
    if (key === 'shop') renderShop();
}

['Jump','Left','Right'].forEach(act => {
    const btn = document.getElementById(`bind${act}`);
    btn.onclick = (e) => {
        e.stopPropagation();
        bindingKey = act;
        btn.innerText = "WAITING...";
    };
});

window.addEventListener("keydown", (e) => {
    if (bindingKey) {
        e.preventDefault(); // FIX: Stops Space bar flicker
        config[bindingKey] = e.code;
        localStorage.setItem("controls", JSON.stringify(config));
        updateSettingsUI();
        bindingKey = null;
        return;
    }
    if (e.code === config.Jump) handleJump();
    keys[e.code] = true;
});

window.addEventListener("keyup", (e) => keys[e.code] = false);

function updateSettingsUI() {
    document.getElementById("bindJump").innerText = config.Jump.toUpperCase().replace("KEY","").replace("ARROW","");
    document.getElementById("bindLeft").innerText = config.Left.toUpperCase().replace("KEY","").replace("ARROW","");
    document.getElementById("bindRight").innerText = config.Right.toUpperCase().replace("KEY","").replace("ARROW","");
}

// --- SHOP & SKINS ---
function renderShop() {
    const envList = document.getElementById("envList");
    const techList = document.getElementById("techList");
    envList.innerHTML = ""; techList.innerHTML = "";
    
    const shopEnvs = [
        {n:'White', m:1, p:0}, {n:'Blue', m:2.5, p:50}, {n:'Forest', m:5, p:100}, 
        {n:'Lava', m:8, p:200}, {n:'Neon', m:15, p:350}, {n:'Void', m:50, p:500},
        {n:'Mars', m:75, p:1000}, {n:'Cyber', m:100, p:2500}
    ];

    const start = currentEnvPage * envsPerPage;
    shopEnvs.slice(start, start + envsPerPage).forEach(e => {
        const isOwned = ownedItems.includes(`bg-${e.n}`);
        const btn = document.createElement("button");
        btn.className = `shop-item ${activeEnv === e.n ? 'equipped' : ''}`;
        btn.innerHTML = `<span>${e.n} (${e.m}x)</span> <span>${activeEnv === e.n ? 'EQUIP' : (isOwned ? 'OWNED' : e.p)}</span>`;
        btn.onclick = () => buyItem('bg', e.n, e.p);
        envList.appendChild(btn);
    });

    const techs = [
        {id:'DoubleJump', n:'Double Jump', p:150}, 
        {id:'Magnet', n:'Token Magnet', p:250},
        {id:'AntiGrav', n:'Anti-Grav Boots', p:500},
        {id:'GhostMode', n:'Ghost Mode', p:750},
        {id:'Shield', n:'Elite Shield', p:2000}
    ];
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
    const start = currentSkinPage * skinsPerPage;
    const pageSkins = skinData.slice(start, start + skinsPerPage);
    
    pageSkins.forEach(s => {
        const btn = document.createElement("button");
        const locked = highScore < s.req;
        btn.className = `skin-btn ${locked ? 'locked' : ''} ${selectedSkin.id === s.id ? 'selected' : ''}`;
        
        if (s.val === 'rainbow') btn.style.background = "linear-gradient(45deg, red, yellow, green, blue)";
        else if (s.val === 'void') btn.style.background = "black";
        else btn.style.background = s.val;

        btn.onclick = () => { if(!locked) { selectedSkin = s; renderSkins(); } };
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

window.buyItem = function(type, name, price) {
    const id = `${type}-${name}`;
    if (ownedItems.includes(id)) {
        if (type === 'bg') { 
            activeEnv = name; 
            const eMap = {White:1, Blue:2.5, Forest:5, Lava:8, Neon:15, Void:50, Mars:75, Cyber:100};
            envMultiplier = eMap[name]; renderShop(); 
        }
        return;
    }
    if (tokens >= price) {
        tokens -= price; ownedItems.push(id);
        if (type === 'pow') powerupStatus[name] = true;
        localStorage.setItem("powerups", JSON.stringify(powerupStatus));
        updateUI(); renderShop();
    }
};

// --- ENGINE ---
function init() {
    platforms = []; items = []; debris = []; particles = []; maxHeight = 0;
    platforms.push({ x: -100, y: 580, width: 600, height: 100, type: 'normal', moving: false, crack: 1 });
    player = { x: 185, y: 500, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0, shieldActive: true };
    cameraY = 0;

    for(let i=0; i<1500; i++) {
        let diff = Math.min(i / 200, 1);
        let lastY = (platforms[platforms.length-1].y) - (110 + (diff * 45) + Math.random() * 40);
        let width = 85 - (diff * 40);
        let type = Math.random() > 0.85 ? 'tramp' : (Math.random() > 0.70 ? 'ice' : (Math.random() > 0.50 ? 'crumble' : 'normal'));

        let plat = { 
            x: Math.random() * (400 - width), y: lastY, width: width, height: 14, 
            type: type, moving: Math.random() < (diff * 0.8),
            dir: Math.random() > 0.5 ? 1 : -1, speed: 1 + (diff * 3.5),
            crack: 1, isCracking: false
        };
        platforms.push(plat);
        
        // FIX: Coins strictly 40% chance on platforms
        if (Math.random() < 0.40) {
            items.push({ x: plat.x + (plat.width/2) - 8, y: plat.y - 30, collected: false });
        }
    }
    gameActive = true; showMenu('none'); 
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function loop(t) {
    if (!gameActive) return;
    const dt = Math.min((t - lastTime) / 16.67, 1.5);
    lastTime = t;

    let grav = powerupStatus.AntiGrav ? 0.45 : 0.58;
    let friction = player.onIce ? 0.98 : 0.82;
    
    if (keys[config.Left]) player.velX -= 1.1 * dt;
    if (keys[config.Right]) player.velX += 1.1 * dt;
    player.velX *= Math.pow(friction, dt);
    player.x += player.velX * dt; player.y += player.velY * dt; player.velY += grav * dt;

    if (player.x < -30) player.x = 400; if (player.x > 400) player.x = -30;

    let onIce = false;
    platforms.forEach(p => {
        if (p.moving) {
            p.x += p.dir * p.speed * dt;
            if (p.x <= 0 || p.x + p.width >= 400) p.dir *= -1;
        }

        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 20 + player.velY && player.x + 30 > p.x && player.x < p.x + p.width) {
            if (p.type === 'tramp') { player.velY = -28; player.jumpCount = 1; }
            else { 
                player.velY = 0; player.y = p.y - 30; player.jumpCount = 0; 
                onIce = (p.type === 'ice');
                if (p.type === 'crumble') p.isCracking = true;
                if (p.moving) player.x += p.dir * p.speed * dt;
            }
        }
        if (p.isCracking) {
            p.crack -= 0.04 * dt;
            if (p.crack <= 0) {
                debris.push({x: p.x, y: p.y, w: p.width/2, h: p.height, vx: -2, vy: 1, rot: 0, vr: -0.1});
                debris.push({x: p.x + p.width/2, y: p.y, w: p.width/2, h: p.height, vx: 2, vy: 1, rot: 0, vr: 0.1});
            }
        }
    });
    platforms = platforms.filter(p => p.crack > 0);
    debris.forEach(d => { d.x += d.vx; d.y += d.vy; d.vy += 0.2; d.rot += d.vr; });
    debris = debris.filter(d => d.y < cameraY + 650);

    items.forEach(it => {
        if (!it.collected) {
            let dx = (player.x + 15) - it.x, dy = (player.y + 15) - it.y;
            let d = Math.sqrt(dx*dx + dy*dy);
            if (powerupStatus.Magnet && d < 160) { it.x += (dx/d)*7 * dt; it.y += (dy/d)*7 * dt; }
            if (d < 35) { it.collected = true; tokens += (1 * envMultiplier); updateUI(); }
        }
    });

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    
    let score = Math.max(0, Math.floor((540 - player.y)/10));
    if (score > maxHeight) { 
        maxHeight = score; 
        document.getElementById("scoreBoard").innerText = `${maxHeight}m`; 
        
        // UNLOCK NOTIFICATIONS
        skinData.forEach(s => {
            if (maxHeight >= s.req && highScore < s.req) {
                notify(`NEW SKIN UNLOCKED: ${s.n}!`);
            }
        });

        if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("highScore", highScore); }
    }
    
    if (player.y > cameraY + 850) {
        if (powerupStatus.Shield && player.shieldActive) {
            player.velY = -30;
            player.shieldActive = false;
            notify("SHIELD USED!");
        } else {
            gameActive = false; showMenu('main'); updateUI(); 
        }
    }
    
    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bgs = { White: "#fdfdfd", Blue: "#e3f2fd", Forest: "#e8f5e9", Lava: "#3e2723", Neon: "#1a1a2e", Void: "#000", Mars: "#5d4037", Cyber: "#001a1a" };
    ctx.fillStyle = bgs[activeEnv];
    ctx.fillRect(0,0,400,600);

    ctx.save(); ctx.translate(0, -cameraY);
    
    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#00d2ff";
        else if (p.type === 'tramp') ctx.fillStyle = "#ff1744";
        else if (p.type === 'crumble') {
            const r = 255 * (1 - p.crack);
            const g = 255 * p.crack;
            ctx.fillStyle = `rgb(${r},${g},0)`;
        }
        else ctx.fillStyle = "#333";
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    debris.forEach(d => {
        ctx.save(); ctx.translate(d.x + d.w/2, d.y + d.h/2); ctx.rotate(d.rot);
        ctx.fillStyle = "#ff5722"; ctx.fillRect(-d.w/2, -d.h/2, d.w, d.h);
        ctx.restore();
    });

    ctx.fillStyle = "#ffd700";
    items.forEach(it => { if(!it.collected) { ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, Math.PI*2); ctx.fill(); } });
    
    // Player Draw
    ctx.globalAlpha = powerupStatus.GhostMode ? 0.5 : 1.0;
    if (selectedSkin.val === 'rainbow') {
        ctx.fillStyle = `hsl(${Date.now()/10%360}, 100%, 50%)`;
    } else if (selectedSkin.val === 'void') {
        ctx.fillStyle = "black";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, 30, 30);
    } else {
        ctx.fillStyle = selectedSkin.val;
    }
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.globalAlpha = 1.0;
    
    ctx.restore();
}

function handleJump() {
    const limit = (powerupStatus.DoubleJump) ? 2 : 1;
    if (player.jumpCount < limit) { player.velY = -14.5; player.jumpCount++; }
}

document.getElementById("startBtn").onclick = () => init();
document.getElementById("shopBtn").onclick = () => showMenu('shop');
document.getElementById("skinMenuBtn").onclick = () => showMenu('skins');
document.getElementById("settingsBtn").onclick = () => showMenu('settings');
document.querySelectorAll(".close-btn").forEach(b => b.onclick = () => showMenu('main'));

document.getElementById("jumpBtn").ontouchstart = (e) => { e.preventDefault(); handleJump(); };

function updateUI() {
    document.getElementById("tokenBoard").innerText = `🪙 ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `🏆 ${highScore}m`;
    localStorage.setItem("tokens", tokens);
}

showMenu('main');
updateUI();
