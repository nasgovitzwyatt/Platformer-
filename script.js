const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const playBtn = document.getElementById("playBtn");
const skinsBtn = document.getElementById("skinsBtn");
const skinsPanel = document.getElementById("skinsPanel");

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
let highScore = localStorage.getItem("parkourHigh") || 0;
let playerColor = "#ff5722";
let hue = 0, windForce = 0;

const JUMP_FORCE = -13.5;
const BOUNCE_FORCE = -22;

const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false };
let platforms = [];
const keys = {};

// ---------------------------
// UI & Skins
// ---------------------------
function updateUI() {
    document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;
}

function changeSkin(color, req) {
    if (highScore >= req) {
        playerColor = color;
        document.querySelectorAll(".skin-btn").forEach(b => b.classList.remove("selected"));
        event.target.classList.add("selected");
    }
}

// ---------------------------
// Game Initialization
// ---------------------------
function init() {
    player.x = 180; 
    player.y = 500; 
    player.velX = 0; 
    player.velY = 0;
    cameraY = 0; 
    maxHeight = 0; 
    windForce = 0;

    // FLOOR PLATFORM
    platforms = [{
        x: 0, y: 580, width: 400, height: 20, type: 'normal', speed: 0, isCracking: false
    }];

    generatePlatforms();

    gameActive = true;
    menu.classList.add("hidden");
    canvas.style.pointerEvents = "auto";

    update();
}

function generatePlatforms() {
    let lastY = platforms[platforms.length - 1].y;
    while (platforms.length < 500) {
        let gap = Math.min(48, (500 - lastY) / 100);
        lastY -= (90 + gap) + Math.random() * 40;

        let h = (500 - lastY) / 10;
        let type = 'normal';
        let roll = Math.random();

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
            x: Math.random() * 320, 
            y: lastY,
            width: Math.max(40, 80 - (h / 35)), 
            height: 12, 
            type: type, 
            speed: moveSpeed, 
            crackTimer: 2500, 
            isCracking: false
        });
    }
}

// ---------------------------
// Game Loop
// ---------------------------
function update() {
    if (!gameActive) return;

    let friction = player.onIce ? 0.98 : 0.8;
    let accel = player.onIce ? 0.3 : 1;
    if (keys["ArrowRight"]) player.velX += accel;
    if (keys["ArrowLeft"]) player.velX -= accel;

    player.velX *= friction;
    player.velY += gravity;

    player.x += player.velX;
    player.y += player.velY;

    if (player.x < -30) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -30;

    player.onIce = false;

    platforms = platforms.filter(p => {
        if (p.isCracking) { p.crackTimer -= 16.6; if (p.crackTimer <= 0) return false; }

        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 15 + player.velY &&
            player.x + 30 > p.x && player.x < p.x + p.width) {

            if (p.type === 'tramp') player.velY = BOUNCE_FORCE;
            else {
                player.velY = 0;
                player.y = p.y - 30;
                if (p.type === 'ice') player.onIce = true;
                if (p.type === 'crumble') p.isCracking = true;
            }
            player.jumping = false;
        }

        if (p.speed !== 0) {
            p.x += p.speed;
            if (p.x < 0 || p.x + p.width > canvas.width) p.speed *= -1;
        }
        return true;
    });

    if (player.y < canvas.height / 2 + cameraY) cameraY = player.y - canvas.height / 2;

    let h = Math.max(0, Math.floor((500 - player.y) / 10));
    if (h > maxHeight) maxHeight = h;
    document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`;

    if (player.y > cameraY + canvas.height + 100) gameOver();

    hue++;
    draw();
    requestAnimationFrame(update);
}

// ---------------------------
// Draw
// ---------------------------
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -cameraY);

    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#80deea";
        else if (p.type === 'crumble') {
            let c = Math.floor((p.crackTimer / 2500) * 150);
            ctx.fillStyle = `rgb(${200 - c},100,50)`;
        } else if (p.type === 'tramp') ctx.fillStyle = "#e91e63";
        else ctx.fillStyle = "#455a64";

        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    if (playerColor === 'rainbow') ctx.fillStyle = `hsl(${hue},100%,50%)`;
    else ctx.fillStyle = playerColor;

    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
}

// ---------------------------
// Game Over
// ---------------------------
function gameOver() {
    gameActive = false;
    canvas.style.pointerEvents = "none";

    if (maxHeight > highScore) {
        highScore = maxHeight;
        localStorage.setItem("parkourHigh", highScore);
    }

    document.querySelector(".menu-title").innerText = "YOU FELL!";
    playBtn.innerText = "RETRY";
    menu.classList.remove("hidden");

    updateUI();
}

// ---------------------------
// Controls
// ---------------------------
window.addEventListener("keydown", e => {
    if (["ArrowUp","Space"].includes(e.code) && !player.jumping) {
        player.velY = JUMP_FORCE; player.jumping = true;
    }
    keys[e.code] = true;
});
window.addEventListener("keyup", e => keys[e.code] = false);

const setupBtn = (id, key) => {
    const btn = document.getElementById(id);
    btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (id === "jumpBtn" && !player.jumping) player.velY = JUMP_FORCE, player.jumping = true;
        else keys[key] = true;
    }, { passive: false });
    btn.addEventListener("touchend", (e) => { e.preventDefault(); keys[key] = false; }, { passive: false });
};
setupBtn("leftBtn","ArrowLeft");
setupBtn("rightBtn","ArrowRight");
setupBtn("jumpBtn","Space");

// ---------------------------
// Menu Buttons
// ---------------------------
playBtn.onclick = init;
skinsBtn.onclick = () => skinsPanel.classList.toggle("hidden");

updateUI();
