const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const overlay = document.getElementById("overlay");

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
let highScore = localStorage.getItem("parkourHigh") || 0;
document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;

const JUMP_FORCE = -13.5;
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false };
let platforms = [];
const keys = {};

function init() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0; player.jumping = false;
    cameraY = 0; maxHeight = 0;
    platforms = [{ x: 0, y: 580, width: 400, height: 20, type: 'normal' }];
    generatePlatforms();
    gameActive = true;
    overlay.style.display = "none";
    update();
}

function generatePlatforms() {
    let lastY = 580;
    for (let i = 0; i < 500; i++) {
        lastY -= 100 + Math.random() * 40;
        platforms.push({
            x: Math.random() * 320,
            y: lastY,
            width: 80,
            height: 12
        });
    }
}

function update() {
    if (!gameActive) return;

    if (keys["ArrowRight"] || keys["KeyD"]) player.velX = 5;
    else if (keys["ArrowLeft"] || keys["KeyA"]) player.velX = -5;
    else player.velX *= 0.8;

    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    // Screen Wrap
    if (player.x < -30) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -30;

    // Collisions
    platforms.forEach(p => {
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 15 + player.velY &&
            player.x + 30 > p.x && player.x < p.x + p.width) {
            player.jumping = false; player.velY = 0; player.y = p.y - 30;
        }
    });

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    
    let h = Math.max(0, Math.floor((500 - player.y) / 10));
    if (h > maxHeight) {
        maxHeight = h;
        document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`;
    }

    if (player.y > cameraY + 650) gameOver();

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -cameraY);
    ctx.fillStyle = "#455a64";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
    ctx.fillStyle = "#ff5722";
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
}

function gameOver() {
    gameActive = false;
    if (maxHeight > highScore) {
        highScore = maxHeight;
        localStorage.setItem("parkourHigh", highScore);
        document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;
    }
    document.getElementById("statusText").innerText = "YOU FELL!";
    startBtn.innerText = "RETRY";
    overlay.style.display = "block";
}

// Controls
window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if ((e.code === "Space" || e.code === "ArrowUp") && !player.jumping) {
        player.velY = JUMP_FORCE; player.jumping = true;
    }
});
window.addEventListener("keyup", e => keys[e.code] = false);

startBtn.onclick = init;

// Mobile Buttons
const setupBtn = (id, code) => {
    const btn = document.getElementById(id);
    btn.ontouchstart = (e) => {
        e.preventDefault();
        if (id === "jumpBtn") {
            if (!player.jumping) { player.velY = JUMP_FORCE; player.jumping = true; }
        } else keys[code] = true;
    };
    btn.ontouchend = () => keys[code] = false;
};
setupBtn("leftBtn", "KeyA");
setupBtn("rightBtn", "KeyD");
setupBtn("jumpBtn", "Space");
