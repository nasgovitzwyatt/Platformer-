const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const overlay = document.getElementById("overlay");

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
let highScore = localStorage.getItem("parkourHigh") || 0;
document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;

const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false };
let platforms = [];
const keys = {};

function init() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0;
    cameraY = 0; maxHeight = 0;
    platforms = [{ x: 0, y: 580, width: 400, height: 20, speed: 0 }];
    generatePlatforms();
    gameActive = true;
    overlay.style.display = "none";
    update();
}

function generatePlatforms() {
    let lastY = platforms[platforms.length - 1].y;
    while (platforms.length < 30) {
        lastY -= 120 + Math.random() * 40;
        let isMoving = (500 - lastY) / 10 > 100; // Moving platforms after 100m
        platforms.push({
            x: Math.random() * 300, y: lastY,
            width: 80, height: 10,
            speed: isMoving ? (Math.random() > 0.5 ? 2 : -2) : 0
        });
    }
}

function update() {
    if (!gameActive) return;

    if (keys["ArrowRight"]) player.velX = 5;
    else if (keys["ArrowLeft"]) player.velX = -5;
    else player.velX *= 0.8;

    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    // Platform logic & Moving Platforms
    platforms.forEach(plat => {
        if (plat.speed !== 0) {
            plat.x += plat.speed;
            if (plat.x < 0 || plat.x + plat.width > canvas.width) plat.speed *= -1;
        }
        if (player.velY > 0 && player.y + 30 > plat.y && player.y + 30 < plat.y + 10 + player.velY &&
            player.x + 30 > plat.x && player.x < plat.x + plat.width) {
            player.jumping = false; player.velY = 0; player.y = plat.y - 30;
        }
    });

    if (player.y < canvas.height/2 + cameraY) cameraY = player.y - canvas.height/2;
    
    let curH = Math.max(0, Math.floor((500 - player.y) / 10));
    if (curH > maxHeight) {
        maxHeight = curH;
        document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`;
    }

    if (player.y > cameraY + canvas.height) gameOver();

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

// Input Handlers
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);
startBtn.onclick = init;
document.getElementById("jumpBtn").ontouchstart = () => { if(!player.jumping){player.velY=-12; player.jumping=true;} };
document.getElementById("leftBtn").ontouchstart = () => keys["ArrowLeft"] = true;
document.getElementById("leftBtn").ontouchend = () => keys["ArrowLeft"] = false;
document.getElementById("rightBtn").ontouchstart = () => keys["ArrowRight"] = true;
document.getElementById("rightBtn").ontouchend = () => keys["ArrowRight"] = false;
