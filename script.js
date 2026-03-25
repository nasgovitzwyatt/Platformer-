const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("startBtn");
const overlay = document.getElementById("overlay");

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
let highScore = localStorage.getItem("parkourHigh") || 0;
document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;

const JUMP_FORCE = -13.5; 
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false };
let platforms = [];
const keys = {};

function init() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0;
    cameraY = 0; maxHeight = 0;
    platforms = [{ x: 0, y: 580, width: 400, height: 20, speed: 0, type: 'normal', isCracking: false }];
    generatePlatforms();
    gameActive = true;
    overlay.style.display = "none";
    update();
}

function generatePlatforms() {
    let lastY = platforms[platforms.length - 1].y;
    while (platforms.length < 200) {
        let difficultyGap = Math.min(45, (500 - lastY) / 100); 
        lastY -= (90 + difficultyGap) + Math.random() * 40; 
        
        let heightMeters = (500 - lastY) / 10;
        let type = 'normal';
        let roll = Math.random();

        // Determine Type
        if (heightMeters > 60) {
            if (roll < 0.25) type = 'crumble'; 
            else if (heightMeters > 140 && roll < 0.45) type = 'ice';
        }

        // Determine Movement (The Fix: Only 40% move after 100m)
        let moveSpeed = 0;
        if (heightMeters > 100 && Math.random() < 0.4) {
            moveSpeed = (Math.random() > 0.5 ? 2 : -2) + (heightMeters / 300);
        }

        platforms.push({
            x: Math.random() * 320, y: lastY,
            width: Math.max(45, 80 - (heightMeters / 25)), 
            height: 12,
            type: type,
            speed: moveSpeed, 
            crackTimer: 2500,
            isCracking: false
        });
    }
}

function update() {
    if (!gameActive) return;

    let currentFriction = player.onIce ? 0.98 : 0.8;
    let accel = player.onIce ? 0.3 : 1;

    if (keys["ArrowRight"] || keys["KeyD"]) player.velX += accel;
    else if (keys["ArrowLeft"] || keys["KeyA"]) player.velX -= accel;
    
    player.velX *= currentFriction;
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
            player.jumping = false; 
            player.velY = 0; 
            player.y = plat.y - 30;
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
            let colorVal = Math.floor((p.crackTimer / 2500) * 150);
            ctx.fillStyle = `rgb(${200 - colorVal}, 100, 50)`;
        } 
        else ctx.fillStyle = "#455a64";

        ctx.fillRect(p.x, p.y, p.width, p.height);

        if (p.isCracking) {
            ctx.strokeStyle = "white";
            ctx.beginPath();
            ctx.moveTo(p.x + Math.random()*p.width, p.y);
            ctx.lineTo(p.x + Math.random()*p.width, p.y + 10);
            ctx.stroke();
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

// Touch controls for mobile
const handleTouch = (id, key, active) => {
    const btn = document.getElementById(id);
    btn.addEventListener("touchstart", (e) => { 
        e.preventDefault(); 
        keys[key] = active; 
        if(id === 'jumpBtn' && !player.jumping) {
            player.velY = JUMP_FORCE; 
            player.jumping = true;
        }
    });
    btn.addEventListener("touchend", (e) => { 
        e.preventDefault(); 
        keys[key] = !active; 
    });
};
handleTouch("leftBtn", "ArrowLeft", true);
handleTouch("rightBtn", "ArrowRight", true);
handleTouch("jumpBtn", "Space", true);
