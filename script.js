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
let config = { Jump: "Space", Left: "ArrowLeft", Right: "ArrowRight" };

// Shop State
let activeEnv = "White";
let envMultiplier = 1;
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["bg-White"];
let powerupStatus = { DoubleJump: false, Magnet: false };

let platforms = [], items = [], keys = {}, gameActive = false, cameraY = 0, maxHeight = 0;
let player = { 
    x: 185, y: 500, velX: 0, velY: 0, 
    jumping: false, onIce: false, 
    jumpCount: 0 // Track for Double Jump
};

// --- UI LOGIC ---
function showMenu(key) {
    Object.values(menus).forEach(m => m.style.display = "none");
    if (menus[key]) menus[key].style.display = "flex";
}

document.getElementById("startBtn").onclick = () => init();
document.getElementById("shopBtn").onclick = () => showMenu('shop');
document.getElementById("skinMenuBtn").onclick = () => showMenu('skins');
document.getElementById("settingsBtn").onclick = () => showMenu('settings');
document.querySelectorAll(".close-btn").forEach(btn => btn.onclick = () => showMenu('main'));

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
    
    // Update skin buttons
    skinData.forEach(s => {
        const btn = document.getElementById(s.id);
        if (btn) {
            btn.classList.toggle("locked", highScore < s.req);
            btn.classList.toggle("selected", selectedSkinId === s.id);
        }
    });

    // Save progress
    localStorage.setItem("tokens", tokens);
    localStorage.setItem("highScore", highScore);
    localStorage.setItem("ownedItems", JSON.stringify(ownedItems));
}

// --- SHOP LOGIC ---
window.buyItem = function(type, name, price) {
    const itemId = `${type}-${name}`;
    
    if (ownedItems.includes(itemId)) {
        // Equip logic
        if (type === 'bg') {
            activeEnv = name;
            setMultiplier(name);
            alert(`${name} Environment Equipped!`);
        } else {
            alert("Upgrade already active!");
        }
        return;
    }

    if (tokens >= price) {
        tokens -= price;
        ownedItems.push(itemId);
        if (type === 'bg') {
            activeEnv = name;
            setMultiplier(name);
        } else if (type === 'pow') {
            powerupStatus[name] = true;
        }
        updateUI();
        alert(`Purchased ${name}!`);
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
    
    // Base platform
    platforms.push({ x: 0, y: 580, width: 400, height: 20, type: 'normal' });
    
    for(let i=0; i<1500; i++) {
        let lastY = (platforms.length > 0 ? platforms[platforms.length-1].y : 580) - (95 + Math.random()*40);
        let r = Math.random();
        let type = 'normal';
        if (r > 0.85) type = 'ice';
        else if (r > 0.75) type = 'tramp';
        else if (r > 0.65) type = 'crumble';
        else if (r > 0.55) type = 'conveyor';
        
        platforms.push({ x: Math.random()*320, y: lastY, width: 80, height: 12, type: type, crack: 1.0, isCracking: false });
        
        if(Math.random() > 0.7) items.push({ x: Math.random()*380, y: lastY - 30, collected: false });
    }
    gameActive = true; 
    showMenu('none'); 
    loop();
}

function loop() {
    if (!gameActive) return;

    // Movement
    if (keys[config.Left]) player.velX -= player.onIce ? 0.05 : 1.3;
    if (keys[config.Right]) player.velX += player.onIce ? 0.05 : 1.3;
    player.velX *= player.onIce ? 0.99 : 0.7;
    player.x += player.velX; 
    player.y += player.velY; 
    player.velY += 0.5; // Gravity

    // Screen Wrap
    if (player.x < -30) player.x = 400; 
    if (player.x > 400) player.x = -30;

    // Platform Collision
    let touchingIce = false;
    platforms.forEach(p => {
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 15 + player.velY && player.x + 30 > p.x && player.x < p.x + p.width) {
            if (p.type === 'tramp') { 
                player.velY = -22; 
                player.jumping = true; 
                player.jumpCount = 1; // Count trampoline as a jump
            } else {
                player.velY = 0; 
                player.y = p.y - 30; 
                player.jumping = false;
                player.jumpCount = 0; // Reset jump count on ground
                if (p.type === 'ice') touchingIce = true;
                if (p.type === 'conveyor') player.velX += 4.5;
                if (p.type === 'crumble') p.isCracking = true;
            }
        }
        if (p.isCracking) p.crack -= 0.02;
    });
    player.onIce = touchingIce;
    platforms = platforms.filter(p => p.type !== 'crumble' || p.crack > 0);

    // Items & Magnet Powerup
    items.forEach(it => {
        if (!it.collected) {
            let dx = player.x + 15 - it.x;
            let dy = player.y + 15 - it.y;
            let d = Math.sqrt(dx*dx + dy*dy);

            // Magnet logic
            if (powerupStatus.Magnet && d < 150) {
                it.x += dx * 0.1;
                it.y += dy * 0.1;
            }

            if (d < 35) { 
                it.collected = true; 
                tokens += (1 * envMultiplier); 
                updateUI(); 
            }
        }
    });

    // Camera & Scoring
    if (player.y < cameraY + 300) cameraY = player.y - 300;
    maxHeight = Math.max(maxHeight, Math.floor((500 - player.y)/10));
    
    // Death condition
    if (player.y > cameraY + 800) { 
        gameActive = false; 
        if(maxHeight > highScore) highScore = maxHeight;
        updateUI();
        showMenu('main'); 
    }

    // Render
    draw();
    requestAnimationFrame(loop);
}

function draw() {
    ctx.clearRect(0,0,400,600);
    
    // Apply Background Color based on Environment
    const bgColors = { "White": "#f0f0f0", "Blue": "#e3f2fd", "Forest": "#e8f5e9", "Midnight": "#1a237e", "Void": "#000" };
    ctx.fillStyle = bgColors[activeEnv] || "#f0f0f0";
    ctx.fillRect(0, 0, 400, 600);

    ctx.save(); 
    ctx.translate(0, -cameraY);

    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#00f2fe"; 
        else if (p.type === 'tramp') ctx.fillStyle = "#ff0000"; 
        else if (p.type === 'conveyor') ctx.fillStyle = "#555"; 
        else if (p.type === 'crumble') ctx.fillStyle = `rgba(0, 255, 0, ${p.crack})`; 
        else ctx.fillStyle = "#222"; 
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    items.forEach(it => { 
        if(!it.collected) { 
            ctx.fillStyle = "#ffd700"; 
            ctx.beginPath(); 
            ctx.arc(it.x, it.y, 8, 0, Math.PI*2); 
            ctx.fill(); 
        } 
    });

    // Player Render
    ctx.fillStyle = playerColor === 'rainbow' ? `hsl(${Date.now()/10%360},100%,50%)` : (playerColor === 'void' ? "#000" : playerColor);
    if(playerColor === 'void') {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.strokeRect(player.x, player.y, 30, 30);
    }
    ctx.fillRect(player.x, player.y, 30, 30);
    
    ctx.restore();
}

function handleJump() {
    if (!gameActive) return;
    
    const maxJumps = powerupStatus.DoubleJump ? 2 : 1;
    
    if (player.jumpCount < maxJumps) {
        player.velY = -13.5;
        player.jumping = true;
        player.jumpCount++;
    }
}

// --- INPUTS ---
window.onkeydown = (e) => { 
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
