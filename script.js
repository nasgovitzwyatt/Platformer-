const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameActive = false, isPaused = false, gravity = 0.5, cameraY = 0, maxHeight = 0;
let highScore = localStorage.getItem("parkourHigh") || 0;
let playerColor = "#ff5722";
let keys = {};
let player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false };
let platforms = [];

// Screen Management
function showScreen(screenId) {
    document.querySelectorAll('.overlay').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
    if(screenId === 'skinsGui') renderSkins();
}

function startGame() {
    document.getElementById('menu-container').classList.add('hidden');
    initGame();
}

function initGame() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0;
    cameraY = 0; maxHeight = 0; gameActive = true; isPaused = false;
    platforms = [{ x: 0, y: 580, width: 400, height: 20 }];
    for(let i=1; i<200; i++) {
        platforms.push({ x: Math.random()*320, y: 580 - (i*120), width: 80, height: 12 });
    }
    requestAnimationFrame(gameLoop);
}

function gameLoop() {
    if (!gameActive || isPaused) return;
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function update() {
    if (keys["KeyA"] || keys["ArrowLeft"]) player.velX = -5;
    else if (keys["KeyD"] || keys["ArrowRight"]) player.velX = 5;
    else player.velX *= 0.8;

    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    // Platform Collisions
    platforms.forEach(p => {
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 15 && player.x + 30 > p.x && player.x < p.x + p.width) {
            player.jumping = false; player.velY = 0; player.y = p.y - 30;
        }
    });

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    let h = Math.max(0, Math.floor((500 - player.y)/10));
    if (h > maxHeight) maxHeight = h;

    document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`;
    document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;

    if (player.y > cameraY + 650) {
        gameActive = false;
        if(maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("parkourHigh", highScore); }
        document.getElementById("guiTitle").innerText = "YOU FELL!";
        document.getElementById("menu-container").classList.remove('hidden');
        showScreen('mainGui');
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -cameraY);
    ctx.fillStyle = "#455a64";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
    ctx.fillStyle = playerColor;
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
}

function togglePause() {
    isPaused = !isPaused;
    if(!isPaused) gameLoop();
    document.getElementById("pauseBtn").innerText = isPaused ? "▶" : "⏸";
}

// Input Handlers
window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if((e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") && !player.jumping) {
        player.velY = -13; player.jumping = true;
    }
});
window.addEventListener("keyup", e => keys[e.code] = false);

// Skin rendering
function renderSkins() {
    const grid = document.getElementById("skinGrid");
    grid.innerHTML = "";
    const skinColors = ["#ff5722", "#2196f3", "#4caf50", "#ffcc00", "#9c27b0"];
    skinColors.forEach(c => {
        const d = document.createElement("div");
        d.className = "skin-box";
        d.style.background = c;
        d.onclick = () => { playerColor = c; showScreen('mainGui'); };
        grid.appendChild(d);
    });
}
