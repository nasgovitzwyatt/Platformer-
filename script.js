const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mainMenu = document.getElementById("mainMenu"), 
      shopMenu = document.getElementById("shopMenu"),
      settingsModal = document.getElementById("settingsModal"), 
      skinMenu = document.getElementById("skinMenu"),
      mobileControls = document.getElementById("mobileControls");

const bgMultipliers = { 
    "White": 1, "Blue": 1.2, "Forest": 1.3, "Sunset": 1.6, 
    "Midnight": 2, "Space": 2.5, "Gold": 4, "Void": 10 
};

let tokens = parseFloat(localStorage.getItem("parkourTokens")) || 0;
let highScore = parseInt(localStorage.getItem("parkourHigh")) || 0;
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["White", "Blue"];
let currentBGName = localStorage.getItem("currentBGName") || "White";
let playerColor = localStorage.getItem("playerColor") || "#ff5722";
let selectedSkinId = localStorage.getItem("selectedSkinId") || "skin-orange";

let config = { 
    Jump: localStorage.getItem("keyJump") || "Space", 
    Left: localStorage.getItem("keyLeft") || "ArrowLeft", 
    Right: localStorage.getItem("keyRight") || "ArrowRight" 
};

let powerupStatus = JSON.parse(localStorage.getItem("powerupStatus")) || {
    DoubleJump: false, Magnet: false, SlowMo: false
};
let particles = [];

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false, animationId;
const JUMP_FORCE = -13.5, BOUNCE_FORCE = -22;
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false };
let platforms = [], items = [], keys = {}, wormholes = [], jumpCount = 0;

// Navigation
document.getElementById("startBtn").onclick = (e) => { e.stopPropagation(); init(); };
document.getElementById("shopBtn").onclick = (e) => { e.stopPropagation(); mainMenu.style.display = "none"; shopMenu.style.display = "flex"; updateUI(); };
document.getElementById("closeShop").onclick = (e) => { e.stopPropagation(); shopMenu.style.display = "none"; mainMenu.style.display = "flex"; };
document.getElementById("skinMenuBtn").onclick = (e) => { e.stopPropagation(); skinMenu.style.display = (skinMenu.style.display === "none" ? "block" : "none"); };
document.getElementById("settingsBtn").onclick = (e) => { e.stopPropagation(); mainMenu.style.display = "none"; settingsModal.style.display = "flex"; };
document.getElementById("backToMenu").onclick = (e) => { e.stopPropagation(); settingsModal.style.display = "none"; mainMenu.style.display = "flex"; };

function buyItem(type, name, price) {
    if (ownedItems.includes(name)) { 
        if (type === 'bg') currentBGName = name;
        else if (type === 'pow') {
            powerupStatus[name] = !powerupStatus[name];
            localStorage.setItem("powerupStatus", JSON.stringify(powerupStatus));
        }
    } else if (tokens >= price) { 
        tokens -= price; 
        ownedItems.push(name); 
        if (type === 'bg') currentBGName = name;
        if (type === 'pow') powerupStatus[name] = true;
        localStorage.setItem("powerupStatus", JSON.stringify(powerupStatus));
    }
    localStorage.setItem("parkourTokens", tokens); 
    localStorage.setItem("ownedItems", JSON.stringify(ownedItems));
    localStorage.setItem("currentBGName", currentBGName); 
    updateUI();
}

function updateUI() {
    highScore = parseInt(localStorage.getItem("parkourHigh")) || 0;
    document.getElementById("tokenBoard").innerText = `Tokens: ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;
    document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`;
    
    // Strict Skin Logic
    const skinData = [
        {id: "skin-orange", req: 0}, {id: "skin-blue", req: 50}, {id: "skin-green", req: 100}, {id: "skin-purple", req: 150},
        {id: "skin-gold", req: 200}, {id: "skin-mint", req: 250}, {id: "skin-lava", req: 300}, {id: "skin-camo", req: 350},
        {id: "skin-ghost", req: 400}, {id: "skin-neon", req: 450}, {id: "skin-rainbow", req: 500}, {id: "skin-diamond", req: 600},
        {id: "skin-ruby", req: 700}, {id: "skin-emerald", req: 800}, {id: "skin-electric", req: 900}, {id: "skin-void", req: 1000}
    ];

    skinData.forEach(s => {
        const btn = document.getElementById(s.id);
        if (btn) {
            if (Number(highScore) >= s.req) { 
                btn.classList.remove("locked"); 
                btn.innerText = (selectedSkinId === s.id) ? "ACTIVE" : s.req + "m"; 
                btn.classList.toggle("selected", selectedSkinId === s.id); 
            } else { 
                btn.classList.add("locked"); 
                btn.innerText = "🔒 " + s.req + "m"; 
            }
        }
    });
}

function changeSkin(color, req, id) {
    if (Number(highScore) >= req) { 
        playerColor = color; selectedSkinId = id; 
        localStorage.setItem("playerColor", color); 
        localStorage.setItem("selectedSkinId", id); 
        updateUI();
    }
}

window.addEventListener("keydown", e => {
    if ((e.code === config.Jump || e.code === "Space") && gameActive) { 
        if (!player.jumping) {
            player.velY = JUMP_FORCE; player.jumping = true; jumpCount = 1;
            player.onIce = false;
        } else if (powerupStatus.DoubleJump && jumpCount < 2) {
            player.velY = JUMP_FORCE; jumpCount = 2;
            player.onIce = false;
        }
    }
    keys[e.code] = true;
});
window.addEventListener("keyup", e => keys[e.code] = false);

function init() {
    cancelAnimationFrame(animationId);
    platforms = []; items = []; wormholes = []; particles = [];
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0; 
    cameraY = 0; maxHeight = 0; jumpCount = 0; player.onIce = false;
    platforms.push({ x: 0, y: 580, width: 400, height: 20, type: 'normal', speed: 0, crackTimer: 1.0, isCracking: false }); 
    generatePlatforms(); 
    gameActive = true; mainMenu.style.display = "none"; updateUI(); update();
}

function generatePlatforms() {
    let lastY = platforms[0].y;
    for (let i = 0; i < 1200; i++) { 
        lastY -= (95 + Math.random() * 45);
        let roll = Math.random();
        if (roll < 0.035) { wormholes.push({ x: Math.random() * 340, y: lastY, width: 40, height: 40 }); continue; }
        let type = 'normal';
        if (roll > 0.6) {
            let sub = Math.random();
            if (sub < 0.25) type = 'tramp'; 
            else if (sub < 0.45) type = 'conveyor'; 
            else if (sub < 0.7) type = 'crumble'; 
            else type = 'ice';
        }
        platforms.push({ x: Math.random() * 300, y: lastY, width: 75, height: 12, type: type, speed: (Math.random() < 0.2 ? 2 : 0), beltDir: 1.5, crackTimer: 1.0, isCracking: false });
        if (Math.random() < 0.3) items.push({ x: Math.random() * 300, y: lastY - 25, collected: false });
    }
}

function update() {
    if (!gameActive) return;
    let timeScale = powerupStatus.SlowMo ? 0.7 : 1.0;
    
    // Void Skin Particles
    if (selectedSkinId === "skin-void") {
        for(let i=0; i<3; i++) {
            particles.push({
                x: player.x + 15 + (Math.random()-0.5)*20, y: player.y + 15 + (Math.random()-0.5)*20,
                vx: (Math.random()-0.5)*2, vy: (Math.random()-0.5)*2, life: 1.0, color: Math.random() > 0.5 ? "#7b1fa2" : "#000000"
            });
        }
    }
    particles.forEach((p, i) => { p.x += p.vx; p.y += p.vy; p.life -= 0.04; if(p.life <= 0) particles.splice(i, 1); });

    // Movement Physics
    if (keys[config.Left] || keys["ArrowLeft"]) player.velX -= (player.onIce ? 0.05 : 1.3); 
    if (keys[config.Right] || keys["ArrowRight"]) player.velX += (player.onIce ? 0.05 : 1.3);
    
    let f = player.onIce ? 0.999 : 0.7; // Ice Physics
    player.velX *= f;
    player.x += player.velX; 
    player.y += player.velY * timeScale;
    player.velY += gravity * timeScale;
    
    if (player.x < -30) player.x = canvas.width; if (player.x > canvas.width) player.x = -30;

    // Wormhole Collision
    wormholes.forEach((wh, index) => {
        if (Math.abs(player.x - wh.x) < 35 && Math.abs(player.y - wh.y) < 35) {
            player.y -= 1500; cameraY -= 1500; wormholes.splice(index, 1);
            platforms.push({ x: player.x-20, y: player.y+50, width: 100, height: 12, type: 'normal', speed: 0, crackTimer: 1.0, isCracking: false });
        }
    });

    let touchingIce = false;
    platforms.forEach(p => {
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 15 + player.velY && player.x + 30 > p.x && player.x < p.x + p.width) {
            if (p.type === 'tramp') { player.velY = BOUNCE_FORCE; player.jumping = true; }
            else {
                player.velY = 0; player.y = p.y - 30; player.jumping = false; jumpCount = 0;
                if (p.type === 'ice') touchingIce = true;
                if (p.type === 'conveyor') player.velX += 4;
                if (p.type === 'crumble') p.isCracking = true;
            }
        }
        if (p.speed) { p.x += p.speed; if (p.x < 0 || p.x > 320) p.speed *= -1; }
        if (p.isCracking) p.crackTimer -= 0.02;
    });
    player.onIce = touchingIce;
    platforms = platforms.filter(p => p.type !== 'crumble' || p.crackTimer > 0);

    items.forEach(it => {
        if (!it.collected) {
            let d = Math.sqrt((player.x-it.x)**2 + (player.y-it.y)**2);
            if (powerupStatus.Magnet && d < 160) { it.x += (player.x-it.x)*0.2; it.y += (player.y-it.y)*0.2; }
            if (d < 35) { it.collected = true; tokens += bgMultipliers[currentBGName] || 1; localStorage.setItem("parkourTokens", tokens); updateUI(); }
        }
    });
    
    if (player.y < cameraY + 300) cameraY = player.y - 300;
    maxHeight = Math.max(maxHeight, Math.floor((500 - player.y) / 10));
    if (player.y > cameraY + 750) gameOver();
    draw(); animationId = requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (currentBGName === "White") { grad.addColorStop(0, "#fff"); grad.addColorStop(1, "#ddd"); }
    else if (currentBGName === "Void") { grad.addColorStop(0, "#000"); grad.addColorStop(1, "#111"); }
    else { grad.addColorStop(0, "#222"); grad.addColorStop(1, "#000"); }
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save(); ctx.translate(0, -cameraY);
    particles.forEach(p => { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 4, 4); });
    ctx.globalAlpha = 1.0;
    wormholes.forEach(wh => { ctx.fillStyle = "#00ffff"; ctx.shadowBlur = 20; ctx.shadowColor = "#00ffff"; ctx.beginPath(); ctx.ellipse(wh.x + 20, wh.y + 20, 15, 25, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; });
    platforms.forEach(p => { ctx.fillStyle = (p.type === 'tramp') ? "#ff4081" : (p.type === 'ice' ? "#b2ebf2" : (p.type === 'conveyor' ? "#bdbdbd" : "#455a64")); ctx.fillRect(p.x, p.y, p.width, p.height); });
    items.forEach(it => { if (!it.collected) { ctx.fillStyle = "#ffd600"; ctx.beginPath(); ctx.arc(it.x+5, it.y+5, 8, 0, Math.PI*2); ctx.fill(); } });
    
    if (selectedSkinId === 'skin-void') {
        let p = Math.abs(Math.sin(Date.now() / 400)); ctx.fillStyle = "#000"; ctx.strokeStyle = `rgb(${120*p}, 0, ${200*p})`; ctx.lineWidth = 4; ctx.fillRect(player.x, player.y, 30, 30); ctx.strokeRect(player.x, player.y, 30, 30);
    } else if (playerColor === 'rainbow') {
        ctx.fillStyle = `hsl(${(Date.now() / 10) % 360}, 100%, 50%)`; ctx.fillRect(player.x, player.y, 30, 30);
    } else { ctx.fillStyle = playerColor; ctx.fillRect(player.x, player.y, 30, 30); }
    ctx.restore();
}

function gameOver() { gameActive = false; cancelAnimationFrame(animationId); if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("parkourHigh", highScore.toString()); } mainMenu.style.display = "flex"; updateUI(); }

const setupBtn = (id, act) => {
    const btn = document.getElementById(id); if (!btn) return;
    btn.ontouchstart = (e) => { e.preventDefault(); if (act === "Jump" && gameActive) { if (!player.jumping) { player.velY = JUMP_FORCE; player.jumping = true; jumpCount = 1; } else if (powerupStatus.DoubleJump && jumpCount < 2) { player.velY = JUMP_FORCE; jumpCount = 2; } } else keys[config[act]] = true; };
    btn.ontouchend = () => keys[config[act]] = false;
};
setupBtn("leftBtn", "Left"); setupBtn("rightBtn", "Right"); setupBtn("jumpBtn", "Jump");
updateUI();
