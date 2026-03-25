const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const overlay = document.getElementById("overlay");

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
let highScore = localStorage.getItem("parkourHigh") || 0;
let playerColor = "#ff5722";
let hue = 0; 

const JUMP_FORCE = -13.5; 
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false };
let platforms = [];
const keys = {};

// --- UI & SKINS ---
function updateUI() {
    document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;
    const unlocks = [0, 50, 100, 150, 200, 500];
    const ids = ["skin-orange", "skin-blue", "skin-green", "skin-purple", "skin-gold", "skin-rainbow"];
    
    ids.forEach((id, i) => {
        const btn = document.getElementById(id);
        if (highScore >= unlocks[i]) {
            btn.classList.remove("locked");
            btn.innerText = "SELECT";
        } else {
            btn.classList.add("locked");
            btn.innerText = unlocks[i] + "m";
        }
    });
}

function changeSkin(color, req) {
    if (highScore >= req) {
        playerColor = color;
    }
}

// --- GAME LOGIC ---
function init() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0;
    cameraY = 0; maxHeight = 0;
    platforms = [{ x: 0, y: 580, width: 400, height: 20, speed: 0, type: 'normal', isCracking: false }];
    generatePlatforms();
    gameActive = true;
    overlay.style.display = "none";
    updateUI();
    update();
}

function generatePlatforms() {
    let lastY = platforms[platforms.length - 1].y;
    while (platforms.length < 250) {
        let difficultyGap = Math.min(45, (500 - lastY) / 100); 
        lastY -= (90 + difficultyGap) + Math.random() * 40; 
        let h = (500 - lastY) / 10;
        let type = 'normal';
        let roll = Math.random();

        if (h > 60) {
            if (roll < 0.25) type = 'crumble'; 
            else if (h > 140 && roll < 0.45) type = 'ice';
        }

        let moveSpeed = 0;
        if (h > 100 && Math.random() < 0.4) {
            moveSpeed = (Math.random() > 0.5 ? 2 : -2) + (h / 300);
        }

        platforms.push({
            x: Math.random() * 320, y: lastY,
            width: Math.max(45, 80 - (h / 25)), 
            height: 12, type: type, speed: moveSpeed, 
            crackTimer: 2500, isCracking: false
        });
    }
}

function update() {
    if (!gameActive) return;

    let friction = player.onIce ? 0.98 : 0.8;
    let accel = player.onIce ? 0.3 : 1;

    if (keys["ArrowRight"] || keys["KeyD"]) player.velX += accel;
    else if (keys["ArrowLeft"] || keys["KeyA"]) player.velX -= accel;
    
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
            player.jumping = false; player.velY = 0; player.y = plat.y - 30;
            if (plat.type === 'ice') player.onIce = true;
            if (plat.type === 'crumble') plat.isCracking = true;
        }
        if (plat.speed !== 0) {
            plat.x += plat.speed;
            if (plat.x < 0 || plat.x + plat.width > canvas.width) plat.speed *= -1;
        }
        return true;
    });

    if (player.y < canvas.height/2 + cameraY) cameraY = player.y - canvas.height/2;
    let curH = Math.max(0, Math.floor((500 - player.y) / 10));
    if (curH > maxHeight) {
        maxHeight = curH;
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
        else ctx.fillStyle = "#455a64";
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    if (playerColor === 'rainbow') ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
    else ctx.fillStyle = playerColor;
    
    ctx.fillRect(player.x, player.y, 30, 30);
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
    overlay.style.display = "block";
    updateUI();
}

// --- INPUT HANDLERS (PC & MOBILE) ---

// 1. Prevent the "Pull-to-Refresh" and "Scrolling" gestures on mobile
window.addEventListener("touchmove", (e) => {
    if (gameActive) e.preventDefault();
}, { passive: false });

// 2. PC Keyboard Controls
window.addEventListener("keydown", e => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
    if ((e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") && !player.jumping) {
        player.velY = JUMP_FORCE; player.jumping = true;
    }
});
window.addEventListener("keyup", e => keys[e.code] = false);

// 3. Start/Retry Button Fix
const handleStart = (e) => {
    e.preventDefault();
    if (!gameActive) init();
};
startBtn.addEventListener("touchstart", handleStart, { passive: false });
startBtn.onclick = init;

// 4. Mobile D-Pad Logic
const setupMobileBtn = (id, key) => {
    const btn = document.getElementById(id);
    if (!btn) return;

    btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (id === "jumpBtn") {
            if (!player.jumping) { player.velY = JUMP_FORCE; player.jumping = true; }
        } else {
            keys[key] = true;
        }
    }, { passive: false });

    btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        keys[key] = false;
    }, { passive: false });
};

setupMobileBtn("leftBtn", "ArrowLeft");
setupMobileBtn("rightBtn", "ArrowRight");
setupMobileBtn("jumpBtn", "Space");

// 5. Skin Button Fix
document.querySelectorAll('.skin-btn').forEach(btn => {
    btn.addEventListener("touchstart", (e) => {
        btn.click(); // Manually trigger select
    }, { passive: true });
});

updateUI(); 
