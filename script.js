const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const overlay = document.getElementById("overlay");

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
let highScore = localStorage.getItem("parkourHigh") || 0;
document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;

// Boosted jump power from -12 to -13.5 to reach higher platforms
const JUMP_FORCE = -13.5; 
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false };
let platforms = [];
const keys = {};

function init() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0;
    cameraY = 0; maxHeight = 0;
    platforms = [{ x: 0, y: 580, width: 400, height: 20, speed: 0, type: 'normal' }];
    generatePlatforms();
    gameActive = true;
    overlay.style.display = "none";
    update();
}

function generatePlatforms() {
    let lastY = platforms[platforms.length - 1].y;
    while (platforms.length < 100) {
        // Narrowed the gap (max 140 instead of 160) so platforms are always reachable
        lastY -= 100 + Math.random() * 40; 
        let heightMeters = (500 - lastY) / 10;
        
        let type = 'normal';
        if (heightMeters > 140 && Math.random() > 0.5) type = 'ice';

        platforms.push({
            x: Math.random() * 300, y: lastY,
            width: 80, height: 12,
            type: type,
            speed: heightMeters > 100 ? (Math.random() > 0.5 ? 2 : -2) : 0
        });
    }
}

function update() {
    if (!gameActive) return;

    // Movement Logic with Slippery Physics
    let currentFriction = player.onIce ? 0.98 : 0.8;
    let accel = player.onIce ? 0.3 : 1;

    if (keys["ArrowRight"] || keys["KeyD"]) player.velX += accel;
    else if (keys["ArrowLeft"] || keys["KeyA"]) player.velX -= accel;
    
    player.velX *= currentFriction;
    // Cap speed so ice doesn't launch you too fast
    if (player.velX > 6) player.velX = 6;
    if (player.velX < -6) player.velX = -6;

    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    if (player.x < -30) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -30;

    player.onIce = false; // Reset every frame

    platforms.forEach(plat => {
        if (plat.speed !== 0) {
            plat.x += plat.speed;
            if (plat.x < 0 || plat.x + plat.width > canvas.width) plat.speed *= -1;
        }

        if (player.velY > 0 && player.y + 30 > plat.y && player.y + 30 < plat.y + 15 + player.velY &&
            player.x + 30 > plat.x && player.x < plat.x + plat.width) {
            player.jumping = false; 
            player.velY = 0; 
            player.y = plat.y - 30;
            if (plat.type === 'ice') player.onIce = true;
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
    
    platforms.forEach(p => {
        // Blue for Ice, Grey for Normal
        ctx.fillStyle = p.type === 'ice' ? "#80deea" : "#455a64";
        ctx.fillRect(p.x, p.y, p.width, p.height);
        
        // Add a "shimmer" to ice platforms
        if (p.type === 'ice') {
            ctx.fillStyle = "rgba(255,255,255,0.5)";
            ctx.fillRect(p.x, p.y, p.width, 3);
        }
    });

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

window.addEventListener("keydown", e => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
    if ((e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") && !player.jumping) {
        player.velY = JUMP_FORCE;
        player.jumping = true;
    }
});

window.addEventListener("keyup", e => keys[e.code] = false);
startBtn.onclick = init;

// Touch controls
const handleTouch = (id, key, active) => {
    document.getElementById(id).ontouchstart = (e) => { e.preventDefault(); keys[key] = active; if(id==='jumpBtn'&&!player.jumping){player.velY=JUMP_FORCE; player.jumping=true;}};
    document.getElementById(id).ontouchend = (e) => { e.preventDefault(); keys[key] = !active; };
};
handleTouch("leftBtn", "ArrowLeft", true);
handleTouch("rightBtn", "ArrowRight", true);
document.getElementById("jumpBtn").ontouchstart = (e) => { e.preventDefault(); if(!player.jumping){player.velY=JUMP_FORCE; player.jumping=true;} };
