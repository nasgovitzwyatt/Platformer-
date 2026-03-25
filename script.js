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
    while (platforms.length < 50) {
        lastY -= 120 + Math.random() * 40;
        let isMoving = (500 - lastY) / 10 > 100;
        platforms.push({
            x: Math.random() * 300, y: lastY,
            width: 80, height: 10,
            speed: isMoving ? (Math.random() > 0.5 ? 2 : -2) : 0
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

    // Boundary wrap (loop around sides)
    if (player.x < -30) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -30;

    // Platform logic
    platforms.forEach(plat => {
        if (plat.speed !== 0) {
            plat.x += plat.speed;
            if (plat.x < 0 || plat.x + plat.width > canvas.width) plat.speed *= -1;
        }
        // Collision check
        if (player.velY > 0 && player.y + 30 > plat.y && player.y + 30 < plat.y + 15 + player.velY &&
            player.x + 30 > plat.x && player.x < plat.x + plat.width) {
            player.jumping = false; 
            player.velY = 0; 
            player.y = plat.y - 30;
        }
    });

    if (player.y < canvas.height/2 + cameraY) cameraY = player.y - canvas.height/2;
    
    let curH = Math.max(0, Math.floor((500 - player.y) / 10));
    if (curH > maxHeight) {
        maxHeight = curH;
        document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`;
    }

    if (player.y > cameraY + canvas.height + 100) gameOver();

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -cameraY);
    
    // Draw Platforms
    ctx.fillStyle = "#455a64";
    platforms.forEach(p => {
        ctx.fillRect(p.x, p.y, p.width, p.height);
        if (p.speed !== 0) { // Add a little detail to moving platforms
            ctx.fillStyle = "#fb8c00";
            ctx.fillRect(p.x, p.y, 5, 10);
            ctx.fillStyle = "#455a64";
        }
    });

    // Draw Player
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

// Fixed Input Handlers
window.addEventListener("keydown", e => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault(); // Stop page scrolling
    }
    keys[e.code] = true;
    
    // Jump trigger
    if ((e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") && !player.jumping) {
        player.velY = -12;
        player.jumping = true;
    }
});

window.addEventListener("keyup", e => keys[e.code] = false);

startBtn.onclick = init;

// Touch controls for mobile
document.getElementById("jumpBtn").ontouchstart = (e) => {
    e.preventDefault();
    if(!player.jumping){player.velY=-12; player.jumping=true;} 
};
document.getElementById("leftBtn").ontouchstart = (e) => { e.preventDefault(); keys["ArrowLeft"] = true; };
document.getElementById("leftBtn").ontouchend = () => keys["ArrowLeft"] = false;
document.getElementById("rightBtn").ontouchstart = (e) => { e.preventDefault(); keys["ArrowRight"] = true; };
document.getElementById("rightBtn").ontouchend = () => keys["ArrowRight"] = false;
