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
let currentSkinPage = 0, currentEnvPage = 0;
const skinsPerPage = 8, envsPerPage = 4;
let activeEnv = "White", envMultiplier = 1;
let powerupStatus = JSON.parse(localStorage.getItem("powerups")) || { DoubleJump: false, Magnet: false, AntiGrav: false, GhostMode: false, Shield: false };
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["bg-White"];

let platforms = [], items = [], particles = [], debris = [], trailParticles = [], weatherParticles = [], keys = {};
let gameActive = false, cameraY = 0, maxHeight = 0, lastTime = 0, shake = 0;
let player = { x: 185, y: 540, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0, shieldActive: false };

// --- NEW ELITE HAZARDS STATE ---
let lavaY = 2000, lavaActive = false, lavaTimer = 0;
let missile = { x: -100, y: 0, active: false, speed: 0, warning: false, side: 'left' };

function notify(text) {
    const n = document.createElement("div");
    n.className = "unlock-notify";
    n.innerText = text;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

function showMenu(key) {
    Object.values(menus).forEach(m => { if(m) m.style.display = "none"; });
    if (key === 'none') { menus.ui.style.display = "flex"; menus.mobile.style.display = "flex"; }
    else if (menus[key]) menus[key].style.display = "flex";
    if (key === 'skins') renderSkins();
    if (key === 'shop') renderShop();
}

// --- ENGINE ---
function init() {
    platforms = []; items = []; debris = []; particles = []; trailParticles = []; weatherParticles = []; maxHeight = 0;
    lavaY = 1000; lavaActive = false; lavaTimer = 0; missile.active = false; shake = 0;
    platforms.push({ x: -100, y: 580, width: 600, height: 100, type: 'normal', moving: false, crack: 1 });
    player = { x: 185, y: 500, velX: 0, velY: 0, jumping: false, onIce: false, jumpCount: 0, shieldActive: powerupStatus.Shield };
    cameraY = 0;

    for(let i=0; i<2000; i++) {
        let diff = Math.min(i / 500, 1);
        let lastY = (platforms[platforms.length-1].y) - (110 + (diff * 50) + Math.random() * 40);
        let width = 85 - (diff * 40);
        let type = Math.random() > 0.9 ? 'tramp' : (Math.random() > 0.8 ? 'ice' : (Math.random() > 0.7 ? 'conveyor' : (Math.random() > 0.55 ? 'crumble' : 'normal')));
        platforms.push({ x: Math.random()*(400-width), y: lastY, width, height: 14, type, moving: Math.random()<(diff*0.85), dir: Math.random()>0.5?1:-1, speed: 1+(diff*4), crack: 1, isCracking: false });
        if (Math.random() < 0.40) items.push({ x: platforms[platforms.length-1].x + (width/2)-8, y: lastY-30, collected: false });
    }
    gameActive = true; showMenu('none'); lastTime = performance.now(); requestAnimationFrame(loop);
}

function loop(t) {
    if (!gameActive) return;
    const dt = Math.min((t - lastTime) / 16.67, 1.5);
    lastTime = t;

    if (shake > 0) shake -= 0.1 * dt;

    // --- LAVA BOSS LOGIC ---
    if (maxHeight > 0 && maxHeight % 1000 === 0 && !lavaActive) {
        lavaActive = true; lavaTimer = 1200; // 20 seconds at 60fps
        lavaY = cameraY + 700;
        notify("LAVA RISING! RUN!");
    }
    if (lavaActive) {
        lavaY -= 2.5 * dt; lavaTimer -= 1 * dt;
        if (lavaTimer <= 0) lavaActive = false;
        if (player.y + 30 > lavaY) {
            if (player.shieldActive) { player.velY = -30; player.shieldActive = false; lavaY += 100; }
            else { gameActive = false; showMenu('main'); }
        }
    }

    // --- MISSILE LOGIC ---
    if (!missile.active && Math.random() > 0.994) {
        missile.active = true; missile.warning = true; missile.side = Math.random() > 0.5 ? 'left' : 'right';
        missile.y = player.y - 100 + (Math.random()*200);
        setTimeout(() => { 
            missile.warning = false; missile.speed = missile.side === 'left' ? 12 : -12; 
            missile.x = missile.side === 'left' ? -50 : 450;
            shake = 2;
        }, 1500);
    }
    if (missile.active && !missile.warning) {
        missile.x += missile.speed * dt;
        if (missile.x > 500 || missile.x < -100) missile.active = false;
        // Collision
        if (Math.abs(player.x - missile.x) < 25 && Math.abs(player.y - missile.y) < 20) {
            gameActive = false; showMenu('main');
        }
    }

    // --- CORE PHYSICS ---
    let friction = player.onIce ? 0.998 : 0.82;
    if (keys[config.Left]) player.velX -= 1.1 * dt;
    if (keys[config.Right]) player.velX += 1.1 * dt;
    player.velX *= Math.pow(friction, dt);
    player.x += player.velX * dt; player.y += player.velY * dt; player.velY += (powerupStatus.AntiGrav ? 0.45 : 0.58) * dt;
    if (player.x < -30) player.x = 400; if (player.x > 400) player.x = -30;

    // --- COMET TRAIL ---
    if (selectedSkin.type === 'trail' && Math.random() > 0.3) {
        trailParticles.push({ x: player.x+15, y: player.y+15, vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2, life: 1.0, color: selectedSkin.val });
    }

    let onIce = false;
    platforms.forEach(p => {
        if (p.moving) { p.x += p.dir * p.speed * dt; if (p.x <= 0 || p.x + p.width >= 400) p.dir *= -1; }
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 20 + player.velY && player.x + 30 > p.x && player.x < p.x + p.width) {
            if (p.type === 'tramp') { player.velY = -28; player.jumpCount = 1; shake = 1.5; }
            else { 
                player.velY = 0; player.y = p.y - 30; player.jumpCount = 0; onIce = (p.type === 'ice'); 
                if (p.type === 'conveyor') player.velX += 4 * dt; 
                if (p.type === 'crumble') p.isCracking = true; 
                if (p.moving) player.x += p.dir * p.speed * dt; 
            }
        }
        if (p.isCracking) {
            p.crack -= 0.04 * dt;
            if (p.crack <= 0) {
                shake = 1;
                for(let i=0; i<12; i++) particles.push({ x: p.x+p.width/2, y: p.y, vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6, life: 1.0, color: "rgb(255,100,0)", size: Math.random()*4+2 });
                debris.push({x: p.x, y: p.y, w: p.width/2, h: p.height, vx: -2, vy: 1, rot: 0, vr: -0.1});
                debris.push({x: p.x+p.width/2, y: p.y, w: p.width/2, h: p.height, vx: 2, vy: 1, rot: 0, vr: 0.1});
            }
        }
    });
    player.onIce = onIce;
    platforms = platforms.filter(p => p.crack > 0);
    debris.forEach(d => { d.x += d.vx; d.y += d.vy; d.vy += 0.2; d.rot += d.vr; });
    trailParticles.forEach(tp => { tp.x += tp.vx; tp.y += tp.vy; tp.life -= 0.04; });
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.02; });
    
    particles = particles.filter(p => p.life > 0);
    trailParticles = trailParticles.filter(tp => tp.life > 0);

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    let score = Math.max(0, Math.floor((540 - player.y)/10));
    if (score > maxHeight) { 
        maxHeight = score; document.getElementById("scoreBoard").innerText = `${maxHeight}m`; 
        if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("highScore", highScore); }
    }
    if (player.y > cameraY + 850) { gameActive = false; showMenu('main'); }

    draw(); requestAnimationFrame(loop);
}

function draw() {
    ctx.save();
    if (shake > 0) ctx.translate((Math.random()-0.5)*shake*10, (Math.random()-0.5)*shake*10);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const bgs = { White: "#fdfdfd", Blue: "#e3f2fd", Forest: "#e8f5e9", Lava: "#3e2723", Neon: "#1a1a2e", Void: "#000" };
    ctx.fillStyle = bgs[activeEnv]; ctx.fillRect(0,0,400,600);

    ctx.save(); ctx.translate(0, -cameraY);
    
    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#00d2ff";
        else if (p.type === 'tramp') ctx.fillStyle = "#ff1744";
        else if (p.type === 'conveyor') {
            ctx.fillStyle = "#888"; ctx.fillRect(p.x, p.y, p.width, p.height);
            ctx.fillStyle = "rgba(255,255,255,0.2)";
            for(let i=0; i<p.width; i+=20) ctx.fillRect(p.x+((i+Date.now()/15)%p.width), p.y+4, 10, 6);
        } else if (p.type === 'crumble') { ctx.fillStyle = `rgb(${255*(1-p.crack)},${255*p.crack},0)`; ctx.fillRect(p.x, p.y, p.width, p.height); }
        else { ctx.fillStyle = "#333"; ctx.fillRect(p.x, p.y, p.width, p.height); }
    });

    debris.forEach(d => { ctx.save(); ctx.translate(d.x+d.w/2, d.y+d.h/2); ctx.rotate(d.rot); ctx.fillStyle = "#ff5722"; ctx.fillRect(-d.w/2,-d.h/2,d.w,d.h); ctx.restore(); });
    particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); });
    trailParticles.forEach(tp => { ctx.globalAlpha = tp.life; ctx.fillStyle = tp.color; ctx.beginPath(); ctx.arc(tp.x, tp.y, 6*tp.life, 0, Math.PI*2); ctx.fill(); });
    ctx.globalAlpha = 1;

    // --- DRAW LAVA ---
    if (lavaActive) {
        ctx.fillStyle = "rgba(255, 30, 0, 0.8)";
        ctx.fillRect(0, lavaY, 400, 1000);
        ctx.fillStyle = "white"; ctx.fillRect(0, lavaY, 400, 5); // Lava edge
    }

    // --- DRAW MISSILE ---
    if (missile.active) {
        if (missile.warning) {
            ctx.fillStyle = "red"; ctx.font = "bold 40px Inter";
            ctx.fillText("!", missile.side === 'left' ? 20 : 360, missile.y + 20);
        } else {
            ctx.fillStyle = "grey"; ctx.fillRect(missile.x, missile.y, 40, 15);
            ctx.fillStyle = "red"; ctx.fillRect(missile.side === 'left' ? missile.x : missile.x + 35, missile.y, 5, 15);
        }
    }

    ctx.fillStyle = "#ffd700"; items.forEach(it => { if(!it.collected) { ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, Math.PI*2); ctx.fill(); } });
    
    // Player Draw
    ctx.globalAlpha = powerupStatus.GhostMode ? 0.5 : 1.0;
    if (selectedSkin.type === 'glass') { ctx.fillStyle = selectedSkin.val; ctx.fillRect(player.x, player.y, 30, 30); ctx.strokeStyle = "black"; ctx.lineWidth = 3; ctx.strokeRect(player.x, player.y, 30, 30); }
    else if (selectedSkin.val === 'rainbow') { ctx.fillStyle = `hsl(${Date.now()/10%360}, 100%, 50%)`; ctx.fillRect(player.x, player.y, 30, 30); }
    else { ctx.fillStyle = selectedSkin.val; ctx.fillRect(player.x, player.y, 30, 30); }
    
    ctx.restore(); ctx.restore();
}

// --- REST OF SHOP/CALIBRATION LOGIC REMAINS UNCHANGED ---
['Jump','Left','Right'].forEach(act => { const btn = document.getElementById(`bind${act}`); if(btn) btn.onclick = (e) => { e.stopPropagation(); bindingKey = act; btn.innerText = "WAITING..."; }; });
window.addEventListener("keydown", (e) => { if (bindingKey) { e.preventDefault(); config[bindingKey] = e.code; localStorage.setItem("controls", JSON.stringify(config)); updateSettingsUI(); bindingKey = null; return; } if (e.code === config.Jump) handleJump(); keys[e.code] = true; });
window.addEventListener("keyup", (e) => keys[e.code] = false);
function handleJump() { if (player.jumpCount < (powerupStatus.DoubleJump ? 2 : 1)) { player.velY = -14.5; player.jumpCount++; } }
function updateUI() { document.getElementById("tokenBoard").innerText = `🪙 ${Math.floor(tokens)}`; document.getElementById("highScoreBoard").innerText = `🏆 ${highScore}m`; localStorage.setItem("tokens", tokens); }
document.getElementById("startBtn").onclick = () => init();
document.getElementById("shopBtn").onclick = () => showMenu('shop');
document.getElementById("skinMenuBtn").onclick = () => showMenu('skins');
document.getElementById("settingsBtn").onclick = () => showMenu('settings');
document.querySelectorAll(".close-btn").forEach(b => b.onclick = () => showMenu('main'));
showMenu('main'); updateUI();
