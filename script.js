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

// --- EXOTIC SKINS DATA ---
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
    {id: 's9', n: 'Foggy', val: 'rgba(255,255,255,0.2)', req: 500, type: 'glass'},
    {id: 's10', n: 'Ocean', val: '#0077be', req: 550, type: 'color'},
    {id: 's11', n: 'Gradient', val: 'linear-gradient', req: 600, type: 'pattern'},
    {id: 's12', n: 'Void', val: 'void', req: 700, type: 'pattern'},
    {id: 's13', n: 'Comet', val: '#00ffff', req: 1000, type: 'trail'},
    {id: 's14', n: 'Phoenix', val: '#ff4500', req: 2500, type: 'trail'}, 
    {id: 's15', n: 'Abyss', val: '#4b0082', req: 3500, type: 'trail'},   
    {id: 's16', n: 'Cyber', val: '#39ff14', req: 5000, type: 'glitch'}  
];

const envs = [
    {n:'White', m:1, p:0}, {n:'Blue', m:2.5, p:50}, {n:'Forest', m:5, p:100}, 
    {n:'Lava', m:8, p:200}, {n:'Neon', m:15, p:350}, {n:'Void', m:50, p:500}
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
let powerupStatus = JSON.parse(localStorage.getItem("powerups")) || { DoubleJump: false, Magnet: false, AntiGrav: false, GhostMode: false, Shield: false };
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["bg-White"];

let platforms = [], items = [], particles = [], debris = [], trailParticles = [], weatherParticles = [], keys = {}, gameActive = false, cameraY = 0, maxHeight = 0;
let player = { x: 185, y: 540, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0, shieldActive: false };
let lastTime = 0;

function notify(text) {
    const n = document.createElement("div");
    n.className = "unlock-notify";
    n.innerText = text;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

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

// --- CALIBRATION ---
['Jump','Left','Right'].forEach(act => {
    const btn = document.getElementById(`bind${act}`);
    if(btn) btn.onclick = (e) => { e.stopPropagation(); bindingKey = act; btn.innerText = "WAITING..."; };
});

window.addEventListener("keydown", (e) => {
    if (bindingKey) {
        e.preventDefault(); 
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
    const bj = document.getElementById("bindJump");
    const bl = document.getElementById("bindLeft");
    const br = document.getElementById("bindRight");
    if(bj) bj.innerText = config.Jump.toUpperCase().replace("KEY","").replace("ARROW","");
    if(bl) bl.innerText = config.Left.toUpperCase().replace("KEY","").replace("ARROW","");
    if(br) br.innerText = config.Right.toUpperCase().replace("KEY","").replace("ARROW","");
}

// --- SHOP & SKINS ---
function renderShop() {
    const envList = document.getElementById("envList");
    const techList = document.getElementById("techList");
    if(!envList || !techList) return;
    envList.innerHTML = ""; techList.innerHTML = "";
    
    const start = currentEnvPage * envsPerPage;
    const visibleEnvs = envs.slice(start, start + envsPerPage);

    visibleEnvs.forEach(e => {
        const isOwned = ownedItems.includes(`bg-${e.n}`);
        const btn = document.createElement("button");
        btn.className = `shop-item ${activeEnv === e.n ? 'equipped' : ''}`;
        btn.innerHTML = `<span>${e.n} (${e.m}x)</span> <span>${activeEnv === e.n ? 'EQUIP' : (isOwned ? 'OWNED' : e.p)}</span>`;
        btn.onclick = () => buyItem('bg', e.n, e.p);
        envList.appendChild(btn);
    });
    
    const ep = document.getElementById("envPageNum");
    if(ep) ep.innerText = `${currentEnvPage + 1}/${Math.ceil(envs.length/envsPerPage)}`;

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

const ne = document.getElementById("nextEnvPage");
const pe = document.getElementById("prevEnvPage");
if(ne) ne.onclick = () => { if ((currentEnvPage + 1) * envsPerPage < envs.length) { currentEnvPage++; renderShop(); } };
if(pe) pe.onclick = () => { if (currentEnvPage > 0) { currentEnvPage--; renderShop(); } };

function renderSkins() {
    const grid = document.getElementById("skinGrid");
    if(!grid) return;
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
    const sp = document.getElementById("skinPageNum");
    if(sp) sp.innerText = `PAGE ${currentSkinPage + 1}`;
}

const ns = document.getElementById("nextSkinPage");
const ps = document.getElementById("prevSkinPage");
if(ns) ns.onclick = () => { if ((currentSkinPage + 1) * skinsPerPage < skinData.length) { currentSkinPage++; renderSkins(); } };
if(ps) ps.onclick = () => { if (currentSkinPage > 0) { currentSkinPage--; renderSkins(); } };

window.buyItem = function(type, name, price) {
    const id = `${type}-${name}`;
    if (ownedItems.includes(id)) {
        if (type === 'bg') { 
            activeEnv = name; 
            const found = envs.find(e => e.n === name);
            envMultiplier = found ? found.m : 1;
            renderShop(); 
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
    platforms = []; items = []; debris = []; particles = []; trailParticles = []; weatherParticles = []; maxHeight = 0;
    platforms.push({ x: -100, y: 580, width: 600, height: 100, type: 'normal', moving: false, crack: 1 });
    player = { x: 185, y: 500, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0, shieldActive: powerupStatus.Shield };
    cameraY = 0;

    for(let i=0; i<1500; i++) {
        let diff = Math.min(i / 300, 1);
        let lastY = (platforms[platforms.length-1].y) - (110 + (diff * 45) + Math.random() * 40);
        let width = 85 - (diff * 40);
        
        let type = 'normal';
        let r = Math.random();
        if (r > 0.90) type = 'tramp';
        else if (r > 0.80) type = 'ice';
        else if (r > 0.70) type = 'conveyor';
        else if (r > 0.55) type = 'crumble';

        platforms.push({ 
            x: Math.random() * (400 - width), y: lastY, width: width, height: 14, 
            type: type, moving: Math.random() < (diff * 0.8),
            dir: Math.random() > 0.5 ? 1 : -1, speed: 1 + (diff * 3.5),
            crack: 1, isCracking: false
        });
        if (Math.random() < 0.40) items.push({ x: platforms[platforms.length-1].x + (width/2) - 8, y: lastY - 30, collected: false });
    }
    gameActive = true; showMenu('none'); 
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function loop(t) {
    if (!gameActive) return;
    const dt = Math.min((t - lastTime) / 16.67, 1.5);
    lastTime = t;

    if (activeEnv === 'Forest' || activeEnv === 'Blue') {
        if (Math.random() > 0.8) {
            weatherParticles.push({
                x: Math.random() * 400, y: cameraY - 20,
                vy: activeEnv === 'Forest' ? 8 : 2, 
                vx: (Math.random() - 0.5) * 2,
                size: activeEnv === 'Forest' ? 1 : 3,
                type: activeEnv === 'Forest' ? 'rain' : 'snow'
            });
        }
    }

    let grav = powerupStatus.AntiGrav ? 0.45 : 0.58;
    let friction = player.onIce ? 0.998 : 0.82; 
    
    if (keys[config.Left]) player.velX -= 1.1 * dt;
    if (keys[config.Right]) player.velX += 1.1 * dt;
    player.velX *= Math.pow(friction, dt);
    player.x += player.velX * dt; player.y += player.velY * dt; player.velY += grav * dt;

    if (player.x < -30) player.x = 400; if (player.x > 400) player.x = -30;

    if (selectedSkin.type === 'trail' && Math.random() > 0.4) {
        trailParticles.push({
            x: player.x + 15, y: player.y + 15,
            vx: (Math.random()-0.5) * 2, vy: (Math.random()-0.5) * 2,
            life: 1.0, color: selectedSkin.val
        });
    }

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
                if (p.type === 'conveyor') player.velX += 4 * dt;
                if (p.type === 'crumble') p.isCracking = true;
                if (p.moving) player.x += p.dir * p.speed * dt;
            }
        }
        if (p.isCracking) {
            p.crack -= 0.04 * dt;
            if (p.crack <= 0) {
                // Particle Burst
                for(let i=0; i<15; i++) {
                    particles.push({
                        x: p.x + p.width/2,
                        y: p.y,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6,
                        life: 1.0,
                        color: "rgb(255, 120, 0)",
                        size: Math.random() * 4 + 2
                    });
                }
                debris.push({x: p.x, y: p.y, w: p.width/2, h: p.height, vx: -2, vy: 1, rot: 0, vr: -0.1});
                debris.push({x: p.x + p.width/2, y: p.y, w: p.width/2, h: p.height, vx: 2, vy: 1, rot: 0, vr: 0.1});
            }
        }
    });
    player.onIce = onIce;
    platforms = platforms.filter(p => p.crack > 0);
    debris.forEach(d => { d.x += d.vx; d.y += d.vy; d.vy += 0.2; d.rot += d.vr; });
    trailParticles.forEach(tp => { tp.x += tp.vx; tp.y += tp.vy; tp.life -= 0.03; });
    weatherParticles.forEach(wp => { wp.y += wp.vy; wp.x += wp.vx; });
    
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.02;
    });
    particles = particles.filter(p => p.life > 0);
    
    trailParticles = trailParticles.filter(tp => tp.life > 0);
    weatherParticles = weatherParticles.filter(wp => wp.y < cameraY + 650);

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
        skinData.forEach(s => { if (maxHeight >= s.req && highScore < s.req) notify(`NEW SKIN UNLOCKED: ${s.n}!`); });
        if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("highScore", highScore); }
    }
    
    if (player.y > cameraY + 850) {
        if (player.shieldActive) { player.velY = -30; player.shieldActive = false; notify("SHIELD USED!"); }
        else { gameActive = false; showMenu('main'); updateUI(); }
    }
    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bgs = { 
        White: "#fdfdfd", Blue: "#e3f2fd", Forest: "#e8f5e9", Lava: "#3e2723", 
        Neon: "#1a1a2e", Void: "#000", Mars: "#5d4037", Cyber: "#001a1a" 
    };
    ctx.fillStyle = bgs[activeEnv];
    ctx.fillRect(0,0,400,600);

    if (activeEnv === 'Neon' || activeEnv === 'Void') {
        let grad = ctx.createRadialGradient(200, 300, 0, 200, 300, 400);
        grad.addColorStop(0, "rgba(255,255,255,0.05)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,400,600);
    }

    ctx.save(); ctx.translate(0, -cameraY);
    weatherParticles.forEach(wp => {
        ctx.fillStyle = wp.type === 'rain' ? "#aab" : "#fff";
        ctx.fillRect(wp.x, wp.y, wp.size, wp.size * (wp.type === 'rain' ? 5 : 1));
    });

    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#00d2ff";
        else if (p.type === 'tramp') ctx.fillStyle = "#ff1744";
        else if (p.type === 'conveyor') {
            ctx.fillStyle = "#888888";
            ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.fillStyle = "rgba(255,255,255,0.2)";
            for(let i=0; i<p.width; i+=20) ctx.fillRect(p.x + ((i + Date.now()/15)%p.width), p.y + 4, 10, 6);
            return;
        }
        else if (p.type === 'crumble') {
            const r = 255 * (1 - p.crack), g = 255 * p.crack;
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

    particles.forEach(p => {
        ctx.save(); ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size); ctx.restore();
    });

    trailParticles.forEach(tp => {
        ctx.globalAlpha = tp.life; ctx.fillStyle = tp.color;
        ctx.beginPath(); ctx.arc(tp.x, tp.y, 4, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#ffd700";
    items.forEach(it => { if(!it.collected) { ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, Math.PI*2); ctx.fill(); } });
    
    let pX = player.x, pY = player.y;
    if (selectedSkin.type === 'glitch' && Math.random() > 0.9) {
        pX += (Math.random() - 0.5) * 10;
        ctx.fillStyle = "rgba(255,0,255,0.5)";
        ctx.fillRect(pX + 5, pY, 30, 30);
    }

    ctx.globalAlpha = powerupStatus.GhostMode ? 0.5 : 1.0;
    if (selectedSkin.type === 'glass') {
        ctx.fillStyle = selectedSkin.val; ctx.fillRect(pX, pY, 30, 30);
        ctx.strokeStyle = "black"; ctx.lineWidth = 3; ctx.strokeRect(pX, pY, 30, 30);
    } else if (selectedSkin.val === 'rainbow') {
        ctx.fillStyle = `hsl(${Date.now()/10%360}, 100%, 50%)`; ctx.fillRect(pX, pY, 30, 30);
    } else if (selectedSkin.val === 'void') {
        ctx.fillStyle = "black"; ctx.fillRect(pX, pY, 30, 30);
        ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.strokeRect(pX, pY, 30, 30);
    } else if (selectedSkin.val === 'linear-gradient') {
        let g = ctx.createLinearGradient(pX, pY, pX+30, pY+30);
        g.addColorStop(0, "#ff0080"); g.addColorStop(1, "#00baff");
        ctx.fillStyle = g; ctx.fillRect(pX, pY, 30, 30);
    } else {
        ctx.fillStyle = selectedSkin.val; ctx.fillRect(pX, pY, 30, 30);
    }
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
document.getElementById("leaderboardBtn").onclick = () => alert("Global Leaderboard: Syncing Elite Data...");
document.querySelectorAll(".close-btn").forEach(b => b.onclick = () => showMenu('main'));
document.getElementById("jumpBtn").ontouchstart = (e) => { e.preventDefault(); handleJump(); };

function updateUI() {
    document.getElementById("tokenBoard").innerText = `🪙 ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `🏆 ${highScore}m`;
    localStorage.setItem("tokens", tokens);
}

showMenu('main');
updateUI();
