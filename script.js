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
    "#795548", "#607d8b", "#f44336", "#8e24aa", "#9e9e9e", "#00bcd4", "#8bc34a", "#cddc39",
    "#ffeb3b", "#ff9800", "#ff5252", "#7c4dff", "#00e5ff", "#00c853", "#ff6d00", "#d500f9",
    "#3d5afe", "#1de9b6", "#ff1744", "#f50057", "#651fff", "#00e676", "#ffea00", "#000000"
];
colorList.forEach((c, i) => skinData.push({ id: `s${i}`, color: c, req: i * 40 }));

let tokens = parseFloat(localStorage.getItem("tokens")) || 0;
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let playerColor = "#ff5722";
let selectedSkinId = "s0";
let config = JSON.parse(localStorage.getItem("controls")) || { Jump: "Space", Left: "ArrowLeft", Right: "ArrowRight" };
let bindingKey = null;

let currentSkinPage = 0;
const skinsPerPage = 12;
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
    if (key === 'settings') updateSettingsUI();
}

document.getElementById("startBtn").onclick = () => init();
document.getElementById("shopBtn").onclick = () => showMenu('shop');
document.getElementById("skinMenuBtn").onclick = () => showMenu('skins');
document.getElementById("settingsBtn").onclick = () => showMenu('settings');
document.querySelectorAll(".close-btn").forEach(b => b.onclick = () => showMenu('main'));

function renderSkins() {
    const grid = document.getElementById("skinGrid");
    grid.innerHTML = "";
    const start = currentSkinPage * skinsPerPage;
    const pageSkins = skinData.slice(start, start + skinsPerPage);

    pageSkins.forEach(s => {
        const btn = document.createElement("button");
        btn.className = "skin-btn";
        const isLocked = highScore < s.req;
        if (isLocked) btn.classList.add("locked");
        if (selectedSkinId === s.id) btn.classList.add("selected");
        
        btn.style.background = s.color === "rainbow" ? "linear-gradient(45deg,red,blue,yellow)" : (s.color === "void" ? "#000" : s.color);
        btn.onclick = () => { if(!isLocked) { playerColor = s.color; selectedSkinId = s.id; renderSkins(); } };
        grid.appendChild(btn);
    });
    document.getElementById("skinPageNum").innerText = `PAGE ${currentSkinPage + 1}`;
}

document.getElementById("nextSkinPage").onclick = () => { if((currentSkinPage+1)*skinsPerPage < skinData.length) { currentSkinPage++; renderSkins(); } };
document.getElementById("prevSkinPage").onclick = () => { if(currentSkinPage > 0) { currentSkinPage--; renderSkins(); } };

// --- PHYSICS & PARTICLES ---
function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x + Math.random() * 80,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 5,
            size: Math.random() * 4 + 2,
            life: 1.0,
            color: color
        });
    }
}

function init() {
    platforms = []; items = []; particles = []; cameraY = 0; maxHeight = 0;
    player.x = 185; player.y = 540; player.velX = 0; player.velY = 0; player.jumpCount = 0;
    platforms.push({ x: 0, y: 580, width: 400, height: 40, type: 'normal', crack: 1, isCracking: false });
    
    for(let i=0; i<1000; i++) {
        let lastY = platforms[platforms.length - 1].y - (105 + Math.random() * 45);
        let r = Math.random();
        let type = 'normal';
        if (r > 0.90) type = 'tramp';
        else if (r > 0.82) type = 'ice';
        else if (r > 0.74) type = 'conveyor';
        else if (r > 0.66) type = 'crumble';
        
        platforms.push({ x: Math.random() * 320, y: lastY, width: 85, height: 14, type, crack: 1.0, isCracking: false });
        if(Math.random() > 0.8) items.push({ x: Math.random() * 380, y: lastY - 30, collected: false });
    }
    gameActive = true; showMenu('none'); lastTime = performance.now(); loop();
}

function loop(t) {
    if (!gameActive) return;
    const dt = Math.min((t - lastTime) / 16.67, 1.5);
    lastTime = t;

    // Movement
    let friction = player.onIce ? 0.99 : 0.82; 
    let accel = player.onIce ? 0.3 : 1.0;
    if (keys[config.Left]) player.velX -= accel * dt;
    if (keys[config.Right]) player.velX += accel * dt;
    player.velX *= Math.pow(friction, dt);
    player.x += player.velX * dt; player.y += player.velY * dt; player.velY += 0.55 * dt;
    if (player.x < -30) player.x = 400; if (player.x > 400) player.x = -30;

    // Collisions
    let onIce = false;
    platforms.forEach(p => {
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 20 + player.velY && player.x + 30 > p.x && player.x < p.x + p.width) {
            if (p.type === 'tramp') { player.velY = -24; player.jumpCount = 1; }
            else {
                player.velY = 0; player.y = p.y - 30; player.jumpCount = 0;
                if (p.type === 'ice') onIce = true;
                if (p.type === 'conveyor') player.velX += 3.8 * dt;
                if (p.type === 'crumble') p.isCracking = true;
            }
        }
        if (p.isCracking) {
            p.crack -= 0.03 * dt;
            if (p.crack <= 0) createParticles(p.x, p.y, "#ff5722"); // Break particles
        }
    });
    player.onIce = onIce;
    platforms = platforms.filter(p => p.type !== 'crumble' || p.crack > 0);

    // Particles Update
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.02 * dt;
    });
    particles = particles.filter(p => p.life > 0);

    items.forEach(it => {
        if (!it.collected) {
            let dx = (player.x + 15) - it.x, dy = (player.y + 15) - it.y;
            let d = Math.sqrt(dx*dx + dy*dy);
            if (powerupStatus.Magnet && d < 140) { it.x += (dx/d)*4.5 * dt; it.y += (dy/d)*4.5 * dt; }
            if (d < 35) { it.collected = true; tokens += (1 * envMultiplier); updateUI(); }
        }
    });

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    let currentScore = Math.max(0, Math.floor((540 - player.y)/10));
    if (currentScore > maxHeight) {
        maxHeight = currentScore;
        document.getElementById("scoreBoard").innerText = `${maxHeight}m`;
        if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("highScore", highScore); document.getElementById("highScoreBoard").innerText = `🏆 ${highScore}m`; }
    }
    if (player.y > cameraY + 700) { gameActive = false; showMenu('main'); }
    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0,0,400,600);
    const bg = { "White": "#f5f5f5", "Blue": "#e3f2fd", "Forest": "#e8f5e9", "Midnight": "#0a0a25", "Void": "#000" };
    ctx.fillStyle = bg[activeEnv] || "#f5f5f5";
    ctx.fillRect(0,0,400,600);

    ctx.save(); ctx.translate(0, -cameraY);

    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#00d2ff";
        else if (p.type === 'tramp') ctx.fillStyle = "#ff1744"; 
        else if (p.type === 'conveyor') ctx.fillStyle = "#78909c";
        else if (p.type === 'crumble') {
            // GREEN TO ORANGE TO RED (Warmer Color Logic)
            const r = 255 * (1 - p.crack);
            const g = 255 * p.crack;
            ctx.fillStyle = `rgb(${r + 139 * p.crack}, ${g + 195 * p.crack * 0.5}, ${74 * p.crack})`;
        }
        else ctx.fillStyle = "#2c2c2c";
        ctx.fillRect(p.x, p.y, p.width, p.height);
        
        // Removed the "line" artifact by rendering full rectangles for specialty blocks
        if(p.type === 'ice') { ctx.fillStyle = "rgba(255,255,255,0.4)"; ctx.fillRect(p.x, p.y, p.width, 2); }
    });

    // Draw Particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = "#ffd700";
    items.forEach(it => { if(!it.collected) { ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, Math.PI*2); ctx.fill(); } });
    
    ctx.fillStyle = playerColor === 'rainbow' ? `hsl(${Date.now()/10%360},100%,50%)` : playerColor;
    if(playerColor === 'void') { ctx.strokeStyle = "#fff"; ctx.strokeRect(player.x, player.y, 30, 30); }
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
}

function handleJump() {
    const limit = powerupStatus.DoubleJump ? 2 : 1;
    if (player.jumpCount < limit) { player.velY = -13.5; player.jumpCount++; }
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
