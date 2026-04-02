const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menus = {
    main: document.getElementById("mainMenu"),
    shop: document.getElementById("shopMenu"),
    skins: document.getElementById("skinMenu"),
    settings: document.getElementById("settingsModal")
};

// --- DATA & STATE ---
const skinData = [];
const colors = ["#ff5722", "#2196f3", "#4caf50", "#9c27b0", "#ffcc00", "#1de9b6", "#d84315", "#4b5320", "#ffffff", "#39ff14", "rainbow", "#b2ebf2", "#e91e63", "#2ecc71", "#00d2ff", "void"];
colors.forEach((c, i) => skinData.push({ id: `s${i}`, color: c, req: i * 60 }));

// Load progress or set defaults
let tokens = parseFloat(localStorage.getItem("tokens")) || 50;
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let playerColor = "#ff5722";
let selectedSkinId = "s0";

// Fixed Keybinding Logic
let config = JSON.parse(localStorage.getItem("controls")) || { Jump: "Space", Left: "ArrowLeft", Right: "ArrowRight" };
let bindingKey = null;

// Shop State
let activeEnv = "White";
let envMultiplier = 1;
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["bg-White"];
let powerupStatus = { DoubleJump: false, Magnet: false };

let platforms = [], items = [], keys = {}, gameActive = false, cameraY = 0, maxHeight = 0;
let player = { 
    x: 185, y: 500, velX: 0, velY: 0, 
    jumping: false, onIce: false, 
    jumpCount: 0 
};

// --- UI LOGIC ---
function showMenu(key) {
    Object.values(menus).forEach(m => m.style.display = "none");
    if (menus[key]) menus[key].style.display = "flex";
    if (key === 'settings') updateSettingsUI();
}

document.getElementById("startBtn").onclick = () => init();
document.getElementById("shopBtn").onclick = () => showMenu('shop');
document.getElementById("skinMenuBtn").onclick = () => showMenu('skins');
document.getElementById("settingsBtn").onclick = () => showMenu('settings');
document.querySelectorAll(".close-btn").forEach(btn => btn.onclick = () => {
    bindingKey = null; // Reset binding state if closed
    showMenu('main');
});

// Settings / Keybinding Logic
function updateSettingsUI() {
    document.getElementById("bindJump").innerText = config.Jump.replace("Arrow", "");
    document.getElementById("bindLeft").innerText = config.Left.replace("Arrow", "");
    document.getElementById("bindRight").innerText = config.Right.replace("Arrow", "");
}

const bindButtons = {
    Jump: document.getElementById("bindJump"),
    Left: document.getElementById("bindLeft"),
    Right: document.getElementById("bindRight")
};

Object.keys(bindButtons).forEach(action => {
    bindButtons[action].onclick = () => {
        bindingKey = action;
        bindButtons[action].innerText = "...";
    };
});

// Build Skin Cabinet
const skinGrid = document.getElementById("skinGrid");
skinData.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "skin-btn";
    btn.id = s.id;
    btn.style.background = s.color === "rainbow" ? "linear-gradient(to right, red, orange, yellow, green, blue, purple)" : (s.color === "void" ? "#000" : s.color);
    btn.onclick = () => { 
        if(highScore >= s.req) { 
            playerColor = s.color; 
            selectedSkinId = s.id; 
            updateUI(); 
        } 
    };
    skinGrid.appendChild(btn);
});

function updateUI() {
    document.getElementById("tokenBoard").innerText = `🪙 ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `🏆 ${highScore}m`;
    document.getElementById("scoreBoard").innerText = `${maxHeight}m`;
    
    skinData.forEach(s => {
        const btn = document.getElementById(s.id);
        if (btn) {
            btn.classList.toggle("locked", highScore < s.req);
            btn.classList.toggle("selected", selectedSkinId === s.id);
        }
    });

    localStorage.setItem("tokens", tokens);
    localStorage.setItem("highScore", highScore);
    localStorage.setItem("ownedItems", JSON.stringify(ownedItems));
    localStorage.setItem("controls", JSON.stringify(config));
}

// --- SHOP LOGIC ---
window.buyItem = function(type, name, price) {
    const itemId = `${type}-${name}`;
    if (ownedItems.includes(itemId)) {
        if (type === 'bg') {
            activeEnv = name;
            setMultiplier(name);
            alert(`${name} Environment Equipped!`);
        }
        return;
    }
    if (tokens >= price) {
        tokens -= price;
        ownedItems.push(itemId);
        if (type === 'bg') { activeEnv = name; setMultiplier(name); }
        else if (type === 'pow') { powerupStatus[name] = true; }
        updateUI();
    } else {
        alert("Not enough tokens!");
    }
};

function setMultiplier(env) {
    const mappy = { "White": 1, "Blue": 1.2, "Forest": 1.5, "Midnight": 3, "Void": 10 };
    envMultiplier = mappy[env] || 1;
}

// --- GAME LOGIC ---
function init() {
    platforms = []; items = []; cameraY = 0; maxHeight = 0;
    player.x = 185; player.y = 500; player.velX = 0; player.velY = 0; player.jumpCount = 0;
    
    platforms.push({ x: 0, y: 580, width: 400, height: 20, type: 'normal' });
    
    for(let i=0; i<1500; i++) {
        let lastY = (platforms.length > 0 ? platforms[platforms.length-1].y : 580) - (100 + Math.random()*50);
        let r = Math.random();
        let type = 'normal';
        if (r > 0.88) type = 'ice';
        else if (r > 0.78) type = 'tramp';
        else if (r > 0.68) type = 'crumble';
        else if (r > 0.58) type = 'conveyor';
        
        platforms.push({ x: Math.random()*320, y: lastY, width: 80, height: 14, type: type, crack: 1.0, isCracking: false });
        if(Math.random() > 0.7) items.push({ x: Math.random()*380, y: lastY - 30, collected: false });
    }
    gameActive = true; 
    showMenu('none'); 
    loop();
}

function loop() {
    if (!gameActive) return;

    // Smoother Physics
    if (keys[config.Left]) player.velX -= player.onIce ? 0.1 : 0.8;
    if (keys[config.Right]) player.velX += player.onIce ? 0.1 : 0.8;
    
    player.velX *= player.onIce ? 0.98 : 0.85; // Increased friction to reduce "speeding"
    player.x += player.velX; 
    player.y += player.velY; 
    player.velY += 0.45; // Slightly lower gravity for better control

    if (player.x < -30) player.x = 400; 
    if (player.x > 400) player.x = -30;

    let touchingIce = false;
    platforms.forEach(p => {
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 15 + player.velY && player.x + 30 > p.x && player.x < p.x + p.width) {
            if (p.type === 'tramp') { 
                player.velY = -18; // Adjusted bounce height
                player.jumping = true; 
                player.jumpCount = 1;
            } else {
                player.velY = 0; 
                player.y = p.y - 30; 
                player.jumping = false;
                player.jumpCount = 0; 
                if (p.type === 'ice') touchingIce = true;
                if (p.type === 'conveyor') player.velX += 3;
                if (p.type === 'crumble') p.isCracking = true;
            }
        }
        if (p.isCracking) p.crack -= 0.03;
    });
    player.onIce = touchingIce;
    platforms = platforms.filter(p => p.type !== 'crumble' || p.crack > 0);

    // Item Collection
    items.forEach(it => {
        if (!it.collected) {
            let dx = player.x + 15 - it.x;
            let dy = player.y + 15 - it.y;
            let d = Math.sqrt(dx*dx + dy*dy);
            if (powerupStatus.Magnet && d < 120) { it.x += dx * 0.08; it.y += dy * 0.08; }
            if (d < 30) { it.collected = true; tokens += (1 * envMultiplier); updateUI(); }
        }
    });

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    maxHeight = Math.max(maxHeight, Math.floor((500 - player.y)/10));
    
    if (player.y > cameraY + 800) { 
        gameActive = false; 
        if(maxHeight > highScore) highScore = maxHeight;
        updateUI();
        showMenu('main'); 
    }

    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0,0,400,600);
    const bgColors = { "White": "#f0f0f0", "Blue": "#e3f2fd", "Forest": "#e8f5e9", "Midnight": "#0a0a20", "Void": "#000" };
    ctx.fillStyle = bgColors[activeEnv] || "#f0f0f0";
    ctx.fillRect(0, 0, 400, 600);

    ctx.save(); 
    ctx.translate(0, -cameraY);

    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#00f2fe"; 
        else if (p.type === 'tramp') ctx.fillStyle = "#ff3b3b"; 
        else if (p.type === 'conveyor') ctx.fillStyle = "#666"; 
        else if (p.type === 'crumble') ctx.fillStyle = `rgba(76, 175, 80, ${p.crack})`; 
        else ctx.fillStyle = "#222"; 
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    items.forEach(it => { 
        if(!it.collected) { 
            ctx.fillStyle = "#ffd700"; ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, Math.PI*2); ctx.fill(); 
        } 
    });

    ctx.fillStyle = playerColor === 'rainbow' ? `hsl(${Date.now()/10%360},100%,50%)` : (playerColor === 'void' ? "#000" : playerColor);
    if(playerColor === 'void') { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.strokeRect(player.x, player.y, 30, 30); }
    ctx.fillRect(player.x, player.y, 30, 30);
    
    ctx.restore();
}

function handleJump() {
    if (!gameActive) return;
    const maxJumps = powerupStatus.DoubleJump ? 2 : 1;
    if (player.jumpCount < maxJumps) {
        player.velY = -12; // Lowered jump force for better control
        player.jumping = true;
        player.jumpCount++;
    }
}

// --- UPDATED INPUT HANDLER ---
window.onkeydown = (e) => { 
    // Handle Keybinding
    if (bindingKey) {
        config[bindingKey] = e.code;
        bindingKey = null;
        updateSettingsUI();
        updateUI();
        return;
    }

    if (e.code === config.Jump) handleJump();
    keys[e.code] = true; 
};

window.onkeyup = (e) => keys[e.code] = false;

document.getElementById("leftBtn").ontouchstart = (e) => { e.preventDefault(); keys[config.Left] = true; };
document.getElementById("leftBtn").ontouchend = () => keys[config.Left] = false;
document.getElementById("rightBtn").ontouchstart = (e) => { e.preventDefault(); keys[config.Right] = true; };
document.getElementById("rightBtn").ontouchend = () => keys[config.Right] = false;
document.getElementById("jumpBtn").ontouchstart = (e) => { e.preventDefault(); handleJump(); };

updateUI();
