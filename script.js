const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameActive = false, isPaused = false, cameraY = 0, maxHeight = 0;
let highScore = localStorage.getItem("parkourHigh") || 0;
let playerColor = "#ff5722";
let player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false };
let platforms = [];
let keys = {};

// --- MENU LOGIC ---
function startGame() {
    document.getElementById("menu-system").classList.add("hidden");
    initGame();
}

function openSkins() {
    document.getElementById("mainGui").classList.add("hidden");
    document.getElementById("skinsGui").classList.remove("hidden");
    // Simple skin picker
    const grid = document.getElementById("skinGrid");
    grid.innerHTML = "";
    ["#ff5722", "#2196f3", "#4caf50"].forEach(color => {
        let div = document.createElement("div");
        div.style.width = "50px"; div.style.height = "50px"; div.style.background = color;
        div.style.margin = "5px"; div.style.cursor = "pointer";
        div.onclick = () => { playerColor = color; backToMain(); };
        grid.appendChild(div);
    });
}

function openSettings() {
    document.getElementById("mainGui").classList.add("hidden");
    document.getElementById("settingsGui").classList.remove("hidden");
}

function backToMain() {
    document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
    document.getElementById("mainGui").classList.remove("hidden");
}

// --- GAME LOGIC ---
function initGame() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0;
    cameraY = 0; maxHeight = 0; gameActive = true; isPaused = false;
    platforms = [{ x: 0, y: 580, width: 400, height: 20 }];
    for(let i=1; i<100; i++) platforms.push({ x: Math.random()*320, y: 580-(i*120), width: 80, height: 12 });
    requestAnimationFrame(loop);
}

function loop() {
    if (!gameActive || isPaused) return;
    update();
    draw();
    requestAnimationFrame(loop);
}

function update() {
    if (keys["ArrowLeft"] || keys["KeyA"]) player.velX = -5;
    else if (keys["ArrowRight"] || keys["KeyD"]) player.velX = 5;
    else player.velX *= 0.8;

    player.velY += 0.5; // Gravity
    player.x += player.velX; player.y += player.velY;

    platforms.forEach(p => {
        if (player.velY > 0 && player.y+30 > p.y && player.y+30 < p.y+15 && player.x+30 > p.x && player.x < p.x+p.width) {
            player.jumping = false; player.velY = 0; player.y = p.y-30;
        }
    });

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    let h = Math.max(0, Math.floor((500 - player.y)/10));
    if (h > maxHeight) maxHeight = h;

    document.getElementById("scoreBoard").innerText = h + "m";
    document.getElementById("highScoreBoard").innerText = "Best: " + highScore + "m";

    if (player.y > cameraY + 650) endGame();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(0, -cameraY);
    ctx.fillStyle = "#455a64";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.width, p.height));
    ctx.fillStyle = playerColor;
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
}

function endGame() {
    gameActive = false;
    if (maxHeight > highScore) { highScore = maxHeight; localStorage.setItem("parkourHigh", highScore); }
    document.getElementById("menu-system").classList.remove("hidden");
    backToMain();
    document.querySelector("h1").innerText = "YOU FELL!";
}

function togglePause() { 
    isPaused = !isPaused; 
    if(!isPaused) requestAnimationFrame(loop);
    document.getElementById("pauseBtn").innerText = isPaused ? "▶" : "⏸";
}

window.onkeydown = (e) => {
    keys[e.code] = true;
    if ((e.code === "Space" || e.code === "ArrowUp") && !player.jumping) { player.velY = -13; player.jumping = true; }
};
window.onkeyup = (e) => keys[e.code] = false;
