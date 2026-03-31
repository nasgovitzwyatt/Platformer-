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

const player = {
    x: 180, y: 500, width: 30, height: 30,
    velX: 0, velY: 0, jumping: false, onIce: false
};

let platforms = [];
const keys = {};

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

function init() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0;
    cameraY = 0; maxHeight = 0; windForce = 0;

    platforms = [{ x: 0, y: 580, width: 400, height: 20, type: 'normal' }];
    generatePlatforms();

    gameActive = true;
    update();
}

function generatePlatforms() {
    let y = 550;
    while (platforms.length < 100) {
        y -= 80 + Math.random() * 40;
        platforms.push({
            x: Math.random() * 320,
            y: y,
            width: 80,
            height: 12,
            type: 'normal'
        });
    }
}

function update() {
    if (!gameActive) return;

    player.velY += gravity;
    player.y += player.velY;

    platforms.forEach(p => {
        if (
            player.y + player.height > p.y &&
            player.y + player.height < p.y + 15 &&
            player.x + player.width > p.x &&
            player.x < p.x + p.width &&
            player.velY > 0
        ) {
            player.velY = JUMP_FORCE;
        }
    });

    if (player.y < canvas.height / 2) cameraY = player.y - canvas.height / 2;

    if (player.y > canvas.height + cameraY) gameOver();

    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(0, -cameraY);

    platforms.forEach(p => {
        ctx.fillStyle = "#455a64";
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });

    if (playerColor === "rainbow") {
        ctx.fillStyle = `hsl(${hue++},100%,50%)`;
    } else {
        ctx.fillStyle = playerColor;
    }

    ctx.fillRect(player.x, player.y, 30, 30);

    ctx.restore();
}

function gameOver() {
    gameActive = false;

    if (maxHeight > highScore) {
        highScore = maxHeight;
        localStorage.setItem("parkourHigh", highScore);
    }

    document.querySelector(".menu-title").innerText = "YOU FELL!";
    playBtn.innerText = "RETRY";
    menu.classList.remove("hidden");

    updateUI();
}

/* MENU BUTTONS */
playBtn.onclick = () => {
    menu.classList.add("hidden");
    init();
};

skinsBtn.onclick = () => {
    skinsPanel.classList.toggle("hidden");
};

/* CONTROLS */
window.addEventListener("keydown", e => {
    if (e.code === "Space") player.velY = JUMP_FORCE;
});
