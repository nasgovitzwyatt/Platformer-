const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const mainMenu = document.getElementById("mainMenu");
const settingsModal = document.getElementById("settingsModal");
const skinMenu = document.getElementById("skinMenu");
const skinMenuBtn = document.getElementById("skinMenuBtn");
const settingsBtn = document.getElementById("settingsBtn");
const backBtn = document.getElementById("backToMenu");

// Settings Config
let config = {
    Jump: localStorage.getItem("keyJump") || "Space",
    Left: localStorage.getItem("keyLeft") || "ArrowLeft",
    Right: localStorage.getItem("keyRight") || "ArrowRight"
};

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
let highScore = localStorage.getItem("parkourHigh") || 0;
let playerColor = "#ff5722";
let hue = 0, windForce = 0; 

const JUMP_FORCE = -13.5; 
const BOUNCE_FORCE = -22; 
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false };
let platforms = [];
const keys = {};

// --- GUI NAVIGATION ---
startBtn.onclick = () => { init(); };

skinMenuBtn.onclick = () => { 
    skinMenu.style.display = skinMenu.style.display === "none" ? "block" : "none";
};

settingsBtn.onclick = () => { 
    mainMenu.style.display = "none";
    settingsModal.style.display = "flex";
};

backBtn.onclick = () => { 
    settingsModal.style.display = "none";
    mainMenu.style.display = "flex";
};

// --- REBINDING SYSTEM ---
let bindingAction = null;
const bindButtons = {
    Jump: document.getElementById("bindJump"),
    Left: document.getElementById("bindLeft"),
    Right: document.getElementById("bindRight")
};

// Initialize button text
Object.keys(bindButtons).forEach(action => {
    bindButtons[action].innerText = config[action];
    
    bindButtons[action].onclick = (e) => {
        // Clear any other active binding states
        Object.values(bindButtons).forEach(b => {
            b.classList.remove("waiting");
            b.innerText = config[Object.keys(bindButtons).find(key => bindButtons[key] === b)];
        });

        bindingAction = action;
        bindButtons[action].innerText = "...";
        bindButtons[action].classList.add("waiting");
        bindButtons[action].blur(); // Prevent spacebar from re-triggering click
    };
});

// --- INPUT HANDLING ---
window.addEventListener("keydown", e => {
    // If we are currently rebinding a key
    if (bindingAction) {
        e.preventDefault();
        
        const newKey = e.code;
        config[bindingAction] = newKey;
        localStorage.setItem("key" + bindingAction, newKey);
        
        bindButtons[bindingAction].innerText = newKey;
        bindButtons[bindingAction].classList.remove("waiting");
        
        bindingAction = null;
        return;
    }
    
    // Prevent scrolling for game keys
    if ([config.Jump, config.Left, config.Right, "ArrowUp", "Space"].includes(e.code)) {
        e.preventDefault();
    }
    
    // Player Jump
    if ((e.code === config.Jump || e.code === "ArrowUp") && !player.jumping && gameActive) {
        player.velY = JUMP_FORCE; player.jumping = true;
    }
    
    keys[e.code] = true;
});

window.addEventListener("keyup", e => {
    keys[e.code] = false;
});

// --- GAME LOGIC ---

function updateUI() {
    document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;
    const unlocks = [0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];
    const ids = ["skin-orange", "skin-blue", "skin-green", "skin-purple", "skin-gold", "skin-mint", "skin-striped", "skin-camo", "skin-ghost", "skin-lava", "skin-rainbow", "skin-neon", "skin-diamond", "skin-ruby", "skin-emerald", "skin-void"];
    
    ids.forEach((id, i) => {
        const btn = document.getElementById(id);
        if (btn) {
            if (highScore >= unlocks[i]) {
                btn.classList.remove("locked");
                btn.innerText = "SELECT";
            } else {
                btn.classList.add("locked");
                btn.innerText = unlocks[i] + "m";
            }
        }
    });
}

function changeSkin(color, req) {
    if (highScore >= req) {
        playerColor = color;
        skinMenu.style.display = "none";
    }
}

function init() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0;
    cameraY = 0; maxHeight = 0; windForce = 0;
    platforms = [{ x: 0, y: 580, width: 400, height: 20, speed: 0, type: 'normal', isCracking: false }];
    generatePlatforms();
    gameActive = true;
    
    mainMenu.style.display = "none";
    settingsModal.style.display = "none";
    skinMenu.style.display = "none"; 
    
    updateUI();
    update();
}

function generatePlatforms() {
    let lastY = platforms[platforms.length - 1].y;
    while (platforms.length < 500) {
        let gap = Math.min(48, (500 - lastY) / 100); 
        lastY -= (90 + gap) + Math.random() * 40; 
        let h = (500 - lastY) / 10;
        let type = 'normal', roll = Math.random();
        
        if (h > 40) {
            if (roll < 0.12) type = 'tramp'; 
            else if (roll < 0.28) type = 'crumble'; 
            else if (h > 140 && roll < 0.45) type = 'ice';
        }

        let moveSpeed = 0;
        if (h > 100 && Math.random() < 0.45) {
            moveSpeed = (Math.random() > 0.5 ? 2.2 : -2.2) + (h / 350);
        }

        platforms.push({
            x: Math.random() * 320, y: lastY,
            width: Math.max(40, 80 - (h / 35)), 
            height: 12, type: type, speed: moveSpeed, 
            crackTimer: 2500, isCracking: false
        });
    }
}

function update() {
    if (!gameActive) return;

    let h = Math.max(0, Math.floor((500 - player.y) / 10));
    
    if (h >= 1000) {
        windForce = Math.sin(Date.now() / 1000) * 1.5;
        player.velX += windForce;
    }

    let friction = player.onIce ? 0.98 : 0.8;
    let accel = player.onIce ? 0.3 : 1;

    if (keys[config.Right]) player.velX += accel;
    else if (keys[config.Left]) player.velX -= accel;
    
    player.velX *= friction;
    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    if (player.x < -30) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -30;

    player.onIce = false; 

    platforms = platforms.filter(plat => {
        if (plat.isCracking) {
            plat.crackTimer -= 16.6;
            if (plat.crackTimer <= 0) return false;
        }
        if (player.velY > 0 && player.y + 30 > plat.y && player.y + 30 < plat.y + 15 + player.velY &&
            player.x + 30 > plat.x && player.x < plat.x + plat.width) {
            
            if (plat.type === 'tramp') {
                player.velY = BOUNCE_FORCE;
                player.jumping = true;
            } else {
                player.jumping = false; player.velY = 0; player.y = plat.y - 30;
                if (plat.type === 'ice') player.onIce = true;
                if (plat.type === 'crumble') plat.isCracking = true;
            }
        }
        if (plat.speed !== 0) {
            plat.x += plat.speed;
            if (plat.x < 0 || plat.x + plat.width > canvas.width) plat.speed *= -1;
        }
        return true;
    });

    if (player.y < canvas.height/2 + cameraY) cameraY = player.y - canvas.height/2;
    if (h > maxHeight) {
        maxHeight = h;
        document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`;
    }
    if (player.y > cameraY + canvas.height + 100) gameOver();

    hue++; 
    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -cameraY);
    
    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#80deea";
        else if (p.type === 'crumble') {
            let c = Math.floor((p.crackTimer / 2500) * 150);
            ctx.fillStyle = `rgb(${200 - c}, 100, 50)`;
        } 
        else if (p.type === 'tramp') ctx.fillStyle = "#e91e63";
        else ctx.fillStyle = "#455a64";
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    // Drawing player skins
    if (playerColor === 'rainbow') ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    else if (playerColor === 'striped') {
        let grad = ctx.createLinearGradient(player.x, player.y, player.x+30, player.y+30);
        grad.addColorStop(0, "#333"); grad.addColorStop(0.5, "#fff"); grad.addColorStop(1, "#333");
        ctx.fillStyle = grad;
    } else if (playerColor === 'ghost') {
        ctx.globalAlpha = 0.4; ctx.fillStyle = "white"; ctx.strokeStyle = "black";
        ctx.strokeRect(player.x, player.y, 30, 30);
    } else if (playerColor === 'camo') {
        ctx.fillStyle = "#4b5320"; ctx.fillRect(player.x, player.y, 30, 30);
        ctx.fillStyle = "#2b3010"; ctx.fillRect(player.x+5, player.y+5, 10, 10);
    } else if (playerColor === 'lava') {
        ctx.fillStyle = "#d84315"; ctx.fillRect(player.x, player.y, 30, 30);
        ctx.fillStyle = "#ffab00"; ctx.fillRect(player.x + (hue%20), player.y + (hue%15), 5, 5);
    } else if (playerColor === 'neon') {
        ctx.shadowBlur = 15; ctx.shadowColor = "#39ff14"; ctx.fillStyle = "#39ff14";
    } else if (playerColor === 'diamond') {
        ctx.fillStyle = "#b2ebf2"; ctx.fillRect(player.x, player.y, 30, 30);
        ctx.strokeStyle = "white"; ctx.strokeRect(player.x+5, player.y+5, 20, 20);
    } else if (playerColor === 'void') {
        ctx.fillStyle = "black"; ctx.fillRect(player.x, player.y, 30, 30);
        ctx.fillStyle = "white"; ctx.fillRect(player.x + Math.random()*25, player.y + Math.random()*25, 2, 2);
    } else ctx.fillStyle = playerColor;
    
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1.0;
    ctx.restore();
}

function gameOver() {
    gameActive = false;
    if (maxHeight > highScore) {
        highScore = maxHeight;
        localStorage.setItem("parkourHigh", highScore);
    }
    document.getElementById("statusText").innerText = "YOU FELL!";
    startBtn.innerText = "RETRY";
    mainMenu.style.display = "flex";
    updateUI();
}

// --- MOBILE BUTTONS ---
const setupBtn = (id, action) => {
    const btn = document.getElementById(id);
    btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (action === "Jump") { 
            if (!player.jumping && gameActive) { 
                player.velY = JUMP_FORCE; player.jumping = true; 
            } 
        }
        else keys[config[action]] = true;
    }, { passive: false });
    btn.addEventListener("touchend", (e) => { 
        e.preventDefault(); 
        keys[config[action]] = false; 
    }, { passive: false });
};

setupBtn("leftBtn", "Left");
setupBtn("rightBtn", "Right");
setupBtn("jumpBtn", "Jump");

updateUI();
