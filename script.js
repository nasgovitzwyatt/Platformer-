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

// --- DATA PERSISTENCE ---
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

// --- POWERUP STATE ---
let powerupStatus = JSON.parse(localStorage.getItem("powerupStatus")) || {
    DoubleJump: false, Magnet: false, SlowMo: false
};

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false, animationId;
const JUMP_FORCE = -13.5, BOUNCE_FORCE = -22;
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false, conveyorForce: 0 };
let platforms = [], items = [], keys = {}, wormholes = [], jumpCount = 0;

// --- NAVIGATION ---
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
    
    // BG Shop
    Object.keys(bgMultipliers).forEach(bg => {
        const p = document.getElementById(`price-${bg}`);
        if (p) {
            if (ownedItems.includes(bg)) {
                p.innerText = (currentBGName === bg) ? "EQUIPPED" : "EQUIP";
                p.parentElement.classList.toggle("selected", currentBGName === bg);
            }
        }
    });

    // Powerup Shop
    const powButtons = document.querySelectorAll("#shopMenu .shop-card:nth-child(2) .shop-item");
    powButtons.forEach(btn => {
        const spanText = btn.querySelector("span").innerText.replace(" ", "");
        if (ownedItems.includes(spanText)) {
            btn.querySelector(".price").innerText = powerupStatus[spanText] ? "ACTIVE" : "OFF";
            btn.classList.toggle("selected", powerupStatus[spanText]);
        }
    });

    // STRICT SKIN UNLOCK FIX
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
                btn.innerText = (selectedSkinId === s.id) ? "ACTIVE" : "SELECT"; 
                btn.classList.toggle("selected", selectedSkinId === s.id); 
            } else { 
                btn.classList.add("locked"); 
                btn.innerText = "🔒 " + s.req + "m"; 
                btn.classList.remove("selected");
            }
        }
    });
}

function changeSkin(color, req, id) {
    if (Number(highScore) >= req) { 
        playerColor = color; selectedSkinId = id; 
        localStorage.setItem("playerColor", color); 
        localStorage.setItem("selectedSkinId", id); 
        updateUI(); skinMenu.style.display = "none"; 
    }
}

window.addEventListener("keydown", e => {
    if ((e.code === config.Jump || e.code === "Space") && gameActive) { 
        if (!player.jumping) {
            player.velY = JUMP_FORCE; player.jumping = true; jumpCount = 1;
        } else if (powerupStatus.DoubleJump && jumpCount < 2) {
            player.velY = JUMP_FORCE; jumpCount = 2;
        }
    }
    keys[e.code] = true;
});
window.addEventListener("keyup", e => keys[e.code] = false);

function init() {
    cancelAnimationFrame(animationId);
    platforms = []; items = []; wormholes = [];
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0; 
    cameraY = 0; maxHeight = 0; jumpCount = 0;
    
    platforms.push({ x: 0, y: 580, width: 400, height: 20, type: 'normal', speed: 0, crackTimer: 1.0, isCracking: false }); 
    generatePlatforms(); 
    gameActive = true;
    mobileControls.style.pointerEvents = "none";
    mainMenu.style.display = "none"; shopMenu.style.display = "none";
    updateUI(); 
    update();
}

function generatePlatforms() {
    let lastY = platforms[0].y;
    for (let i = 0; i < 500; i++) {
        let heightM = (500 - lastY) / 10;
        let gapModifier = Math.min(55, heightM / 18);
        lastY -= (90 + gapModifier + Math.random() * 40);
        let roll = Math.random();

        if (roll < 0.01) {
            wormholes.push({ x: Math.random() * 340, y: lastY, width: 40, height: 40 });
            continue; 
        }

        let type = 'normal';
        let normalChance = Math.max(0.3, 0.65 - (heightM / 1800));
        if (roll > normalChance) {
            let subRoll = Math.random();
            if (subRoll < 0.35) type = 'tramp'; 
            else if (subRoll < 0.45) type = 'conveyor'; 
            else if (subRoll < 0.75) type = 'crumble'; 
            else type = 'ice';
        }
        let moveSpeed = (type !== 'conveyor' && Math.random() < 0.25) ? (1.5 + (heightM/600)) : 0;
        platforms.push({ 
            x: Math.random() * 300, y: lastY, width: Math.max(45, 80 - (heightM / 30)), 
            height: 12, type: type, speed: moveSpeed, beltDir: 1.5, crackTimer: 1.0, isCracking: false 
        });
        if (Math.random() < 0.3) items.push({ x: platforms[platforms.length-1].x + 35, y: lastY - 25, collected: false });
    }
}

function update() {
    if (!gameActive) return;
    mobileControls.style.pointerEvents = "auto";
    let speedMult = powerupStatus.SlowMo ? 0.7 : 1.0;

    if (keys[config.Left] || keys["ArrowLeft"]) player.velX -= (player.onIce ? 0.3 : 1) * speedMult; 
    if (keys[config.Right] || keys["ArrowRight"]) player.velX += (player.onIce ? 0.3 : 1) * speedMult;
    player.velX *= (player.onIce ? 0.98 : 0.8); 
    player.x += player.velX; 
    player.y += player.velY * speedMult;
    player.velY += gravity * speedMult;
    
    if (player.x < -30) player.x = canvas.width; if (player.x > canvas.width) player.x = -30;

    wormholes.forEach((wh, index) => {
        if (Math.abs(player.x - wh.x) < 35 && Math.abs(player.y - wh.y) < 35) {
            player.y -= 1500; cameraY -= 1500;
            platforms.push({ x: player.x - 20, y: player.y + 50, width: 100, height: 12, type: 'normal', speed: 0, crackTimer: 1.0, isCracking: false });
            wormholes.splice(index, 1);
        }
    });

    platforms.forEach(plat => {
        if (player.velY > 0 && player.y + 30 > plat.y && player.y + 30 < plat.y + 15 + player.velY && 
            player.x + 30 > plat.x && player.x < plat.x + plat.width) {
            if (plat.type === 'tramp') { player.velY = BOUNCE_FORCE; player.jumping = true; jumpCount = 1; } 
            else { 
                player.velY = 0; player.y = plat.y - 30; player.jumping = false; jumpCount = 0;
                if (plat.type === 'conveyor') player.velX += plat.beltDir; 
                if (plat.type === 'ice') player.onIce = true; 
                if (plat.type === 'crumble') plat.isCracking = true; 
            }
        }
        if (plat.isCracking) plat.crackTimer -= 0.02;
        if (plat.speed) { plat.x += plat.speed * speedMult; if (plat.x < 0 || plat.x > 320) plat.speed *= -1; }
    });
    
    platforms = platforms.filter(p => p.type !== 'crumble' || p.crackTimer > 0);

    items.forEach(item => { 
        if (!item.collected) {
            let dist = Math.sqrt(Math.pow(player.x - item.x, 2) + Math.pow(player.y - item.y, 2));
            if (powerupStatus.Magnet && dist < 150) {
                item.x += (player.x - item.x) * 0.1; item.y += (player.y - item.y) * 0.1;
            }
            if (dist < 35) {
                item.collected = true; tokens += bgMultipliers[currentBGName] || 1; 
                localStorage.setItem("parkourTokens", tokens); updateUI(); 
            }
        }
    });
    
    if (player.y < cameraY + 300) cameraY = player.y - 300;
    let ch = Math.max(0, Math.floor((500 - player.y) / 10));
    if (ch > maxHeight) { maxHeight = ch; document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`; }
    if (player.y > cameraY + 750) gameOver();
    
    draw(); 
    animationId = requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (currentBGName === "White") { grad.addColorStop(0, "#fff"); grad.addColorStop(1, "#ddd"); }
    else if (currentBGName === "Blue") { grad.addColorStop(0, "#4facfe"); grad.addColorStop(1, "#00f2fe"); }
    else if (currentBGName === "Forest") { grad.addColorStop(0, "#134e5e"); grad.addColorStop(1, "#71b280"); }
    else if (currentBGName === "Sunset") { grad.addColorStop(0, "#ff8c00"); grad.addColorStop(1, "#ff0080"); }
    else if (currentBGName === "Midnight") { grad.addColorStop(0, "#232526"); grad.addColorStop(1, "#414345"); }
    else if (currentBGName === "Space") { grad.addColorStop(0, "#0f0c29"); grad.addColorStop(1, "#24243e"); }
    else if (currentBGName === "Gold") { grad.addColorStop(0, "#bf953f"); grad.addColorStop(1, "#fcf6ba"); }
    else if (currentBGName === "Void") { grad.addColorStop(0, "#000"); grad.addColorStop(1, "#111"); }
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.save(); ctx.translate(0, -cameraY);
    
    wormholes.forEach(wh => {
        let pulse = 5 + Math.sin(Date.now() / 100) * 5;
        ctx.fillStyle = "#00ffff"; ctx.shadowBlur = 15 + pulse; ctx.shadowColor = "#00ffff";
        ctx.beginPath(); ctx.ellipse(wh.x + 20, wh.y + 20, 15 + pulse/2, 20 + pulse, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "white"; ctx.beginPath(); ctx.ellipse(wh.x + 20, wh.y + 20, 8, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
    });

    platforms.forEach(p => {
        if (p.type === 'tramp') ctx.fillStyle = "#e91e63"; 
        else if (p.type === 'conveyor') ctx.fillStyle = "#757575"; 
        else if (p.type === 'ice') ctx.fillStyle = "#80deea"; 
        else if (p.type === 'crumble') ctx.fillStyle = `rgb(${255 * (1-p.crackTimer)}, ${150 * p.crackTimer}, 50)`; 
        else ctx.fillStyle = "#455a64";
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
    
    items.forEach(item => { if (!item.collected) { ctx.fillStyle = "#ffeb3b"; ctx.beginPath(); ctx.arc(item.x+5, item.y+5, 8, 0, Math.PI*2); ctx.fill(); } });
    
    ctx.fillStyle = (playerColor === 'rainbow') ? `hsl(${(Date.now() / 10) % 360}, 100%, 50%)` : playerColor;
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
}

function gameOver() { 
    gameActive = false; cancelAnimationFrame(animationId);
    if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("parkourHigh", highScore.toString()); }
    mainMenu.style.display = "flex"; updateUI(); 
}

const setupBtn = (id, act) => {
    const btn = document.getElementById(id);
    btn.ontouchstart = (e) => { 
        e.preventDefault(); 
        if (act === "Jump" && gameActive) {
            if (!player.jumping) { player.velY = JUMP_FORCE; player.jumping = true; jumpCount = 1; }
            else if (powerupStatus.DoubleJump && jumpCount < 2) { player.velY = JUMP_FORCE; jumpCount = 2; }
        } else keys[config[act]] = true; 
    };
    btn.ontouchend = () => keys[config[act]] = false;
};
setupBtn("leftBtn", "Left"); setupBtn("rightBtn", "Right"); setupBtn("jumpBtn", "Jump");
updateUI();
