const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game State
let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false, isPaused = false;
let highScore = localStorage.getItem("parkourHigh") || 0;
let playerColor = "#ff5722";
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false };
let platforms = [];
let keybinds = JSON.parse(localStorage.getItem("keybinds")) || { left: "KeyA", right: "KeyD", jump: "Space" };
const keys = {};
let rebindingKey = null;

const skins = [
    { color: "#ff5722", req: 0 }, { color: "#2196f3", req: 50 }, { color: "#4caf50", req: 100 },
    { color: "#9c27b0", req: 150 }, { color: "#ffcc00", req: 200 }, { color: "rainbow", req: 500 }
];

function startGame() {
    document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
    initGame();
}

function openSkins() {
    document.getElementById("mainGui").classList.add("hidden");
    const grid = document.getElementById("skinGrid");
    grid.innerHTML = "";
    skins.forEach(skin => {
        const div = document.createElement("div");
        div.className = `skin-item ${highScore < skin.req ? 'locked' : ''}`;
        div.style.background = skin.color === 'rainbow' ? 'linear-gradient(to right, red, purple)' : skin.color;
        div.onclick = () => { if(highScore >= skin.req) { playerColor = skin.color; closeOverlay(); } };
        grid.appendChild(div);
    });
    document.getElementById("skinsGui").classList.remove("hidden");
}

function openSettings() {
    document.getElementById("mainGui").classList.add("hidden");
    document.getElementById("settingsGui").classList.remove("hidden");
    updateBindLabels();
}

function closeOverlay() {
    document.querySelectorAll('.overlay').forEach(el => el.classList.add('hidden'));
    document.getElementById("mainGui").classList.remove("hidden");
}

function rebind(action) {
    rebindingKey = action;
    document.getElementById(`bind-${action}`).innerText = "...";
}

function updateBindLabels() {
    document.getElementById("bind-left").innerText = keybinds.left.replace("Key", "");
    document.getElementById("bind-right").innerText = keybinds.right.replace("Key", "");
    document.getElementById("bind-jump").innerText = keybinds.jump === "Space" ? "SPC" : keybinds.jump.replace("Key", "");
}

function initGame() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0; player.jumping = false;
    cameraY = 0; maxHeight = 0; gameActive = true; isPaused = false;
    platforms = [{ x: 0, y: 580, width: 400, height: 20 }];
    for(let i=0; i<300; i++) {
        platforms.push({ x: Math.random()*320, y: 580 - (i*120), width: 75, height: 12 });
    }
    requestAnimationFrame(mainLoop);
}

function mainLoop() {
    if (!gameActive || isPaused) return;
    update();
    draw();
    requestAnimationFrame(mainLoop);
}

function update() {
    if (keys[keybinds.left]) player.velX = -5;
    else if (keys[keybinds.right]) player.velX = 5;
    else player.velX *= 0.8;

    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

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
        document.getElementById("mainGui").classList.remove("hidden");
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(0, -cameraY);
    ctx.fillStyle = "#455a64";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
    ctx.fillStyle = playerColor === 'rainbow' ? `hsl(${Date.now()/10%360}, 100%, 50%)` : playerColor;
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
}

window.addEventListener("keydown", e => {
    if (rebindingKey) {
        keybinds[rebindingKey] = e.code;
        localStorage.setItem("keybinds", JSON.stringify(keybinds));
        rebindingKey = null; updateBindLabels(); return;
    }
    keys[e.code] = true;
    if (e.code === keybinds.jump && !player.jumping) { player.velY = -13; player.jumping = true; }
});
window.addEventListener("keyup", e => keys[e.code] = false);

document.getElementById("pauseBtn").onclick = () => {
    isPaused = !isPaused;
    if(!isPaused) requestAnimationFrame(mainLoop);
    document.getElementById("pauseBtn").innerText = isPaused ? "▶" : "⏸";
};

// Mobile Controls
const bindMobile = (id, key) => {
    const btn = document.getElementById(id);
    btn.ontouchstart = (e) => { e.preventDefault(); if(id === 'jumpBtn') { if(!player.jumping){player.velY=-13; player.jumping=true;} } else keys[keybinds[key]] = true; };
    btn.ontouchend = () => keys[keybinds[key]] = false;
};
bindMobile("leftBtn", "left"); bindMobile("rightBtn", "right"); bindMobile("jumpBtn", "jump");
