const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menus = {
    main: document.getElementById("mainMenu"),
    shop: document.getElementById("shopMenu"),
    skins: document.getElementById("skinMenu"),
    settings: document.getElementById("settingsModal")
};

// 16+ Professional Skins
const skinData = [];
const colors = ["#ff5722", "#2196f3", "#4caf50", "#9c27b0", "#ffcc00", "#1de9b6", "#d84315", "#4b5320", "#ffffff", "#39ff14", "rainbow", "#b2ebf2", "#e91e63", "#2ecc71", "#00d2ff", "void"];
colors.forEach((c, i) => skinData.push({ id: `s${i}`, color: c, req: i * 60 }));

let tokens = 50; // Starting tokens
let highScore = 0;
let playerColor = "#ff5722";
let selectedSkinId = "s0";
let config = { Jump: "Space", Left: "ArrowLeft", Right: "ArrowRight" };
let powerupStatus = { DoubleJump: false, Magnet: false };
let platforms = [], items = [], keys = {}, gameActive = false, cameraY = 0, maxHeight = 0;
let player = { x: 185, y: 500, velX: 0, velY: 0, jumping: false, onIce: false };

function showMenu(key) {
    Object.values(menus).forEach(m => m.style.display = "none");
    if (menus[key]) menus[key].style.display = "flex";
}

document.getElementById("startBtn").onclick = () => init();
document.getElementById("shopBtn").onclick = () => showMenu('shop');
document.getElementById("skinMenuBtn").onclick = () => showMenu('skins');
document.getElementById("settingsBtn").onclick = () => showMenu('settings');
document.querySelectorAll(".close-btn").forEach(btn => btn.onclick = () => showMenu('main'));

// Build Skin Cabinet
const skinGrid = document.getElementById("skinGrid");
skinData.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "skin-btn";
    btn.id = s.id;
    btn.style.background = s.color === "rainbow" ? "linear-gradient(to right, red, orange, yellow, green, blue, purple)" : (s.color === "void" ? "#000" : s.color);
    btn.onclick = () => { if(highScore >= s.req) { playerColor = s.color; selectedSkinId = s.id; updateUI(); } };
    skinGrid.appendChild(btn);
});

function updateUI() {
    document.getElementById("tokenBoard").innerText = `🪙 ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `🏆 ${highScore}m`;
    document.getElementById("scoreBoard").innerText = `${maxHeight}m`;
    skinData.forEach(s => {
        const btn = document.getElementById(s.id);
        btn.classList.toggle("locked", highScore < s.req);
        btn.classList.toggle("selected", selectedSkinId === s.id);
    });
}

function init() {
    platforms = []; items = []; cameraY = 0; maxHeight = 0;
    player.x = 185; player.y = 500; player.velX = 0; player.velY = 0;
    platforms.push({ x: 0, y: 580, width: 400, height: 20, type: 'normal' });
    
    for(let i=0; i<1500; i++) {
        let lastY = platforms[platforms.length-1].y - (95 + Math.random()*40);
        let r = Math.random();
        let type = 'normal'; // Black
        if (r > 0.8) type = 'ice'; // Blue
        else if (r > 0.7) type = 'tramp'; // Red
        else if (r > 0.6) type = 'crumble'; // Green
        else if (r > 0.5) type = 'conveyor'; // Grey
        
        platforms.push({ x: Math.random()*320, y: lastY, width: 80, height: 12, type: type, crack: 1.0 });
        
        // Token Spawning
        if(Math.random() > 0.7) items.push({ x: Math.random()*380, y: lastY - 30, collected: false });
    }
    gameActive = true; showMenu('none'); loop();
}

function loop() {
    if (!gameActive) return;
    if (keys[config.Left]) player.velX -= player.onIce ? 0.05 : 1.3;
    if (keys[config.Right]) player.velX += player.onIce ? 0.05 : 1.3;
    player.velX *= player.onIce ? 0.999 : 0.7;
    player.x += player.velX; player.y += player.velY; player.velY += 0.5;
    if (player.x < -30) player.x = 400; if (player.x > 400) player.x = -30;

    let touchingIce = false;
    platforms.forEach(p => {
        if (player.velY > 0 && player.y + 30 > p.y && player.y + 30 < p.y + 15 + player.velY && player.x + 30 > p.x && player.x < p.x + p.width) {
            if (p.type === 'tramp') { player.velY = -22; player.jumping = true; }
            else {
                player.velY = 0; player.y = p.y - 30; player.jumping = false;
                if (p.type === 'ice') touchingIce = true;
                if (p.type === 'conveyor') player.velX += 4.5;
                if (p.type === 'crumble') p.isCracking = true;
            }
        }
        if (p.isCracking) p.crack -= 0.02;
    });
    player.onIce = touchingIce;
    platforms = platforms.filter(p => p.type !== 'crumble' || p.crack > 0);

    items.forEach(it => {
        if (!it.collected) {
            let d = Math.sqrt((player.x-it.x)**2 + (player.y-it.y)**2);
            if (d < 35) { it.collected = true; tokens += 1; updateUI(); }
        }
    });

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    maxHeight = Math.max(maxHeight, Math.floor((500 - player.y)/10));
    if (player.y > cameraY + 800) { gameActive = false; showMenu('main'); }

    ctx.clearRect(0,0,400,600);
    ctx.save(); ctx.translate(0, -cameraY);
    platforms.forEach(p => {
        if (p.type === 'ice') ctx.fillStyle = "#00f2fe"; // Blue
        else if (p.type === 'tramp') ctx.fillStyle = "#ff0000"; // Red
        else if (p.type === 'conveyor') ctx.fillStyle = "#555"; // Grey
        else if (p.type === 'crumble') ctx.fillStyle = `rgb(${255 * (1-p.crack)}, ${255 * p.crack}, 0)`; // Green -> Red
        else ctx.fillStyle = "#222"; // Normal Black
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
    items.forEach(it => { if(!it.collected) { ctx.fillStyle = "#ffd700"; ctx.beginPath(); ctx.arc(it.x, it.y, 8, 0, Math.PI*2); ctx.fill(); } });
    ctx.fillStyle = playerColor === 'rainbow' ? `hsl(${Date.now()/10%360},100%,50%)` : (playerColor === 'void' ? "#000" : playerColor);
    if(playerColor === 'void') ctx.strokeStyle = "#fff", ctx.lineWidth = 2, ctx.strokeRect(player.x, player.y, 30, 30);
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
    requestAnimationFrame(loop);
}

window.onkeydown = (e) => { 
    if (e.code === config.Jump && gameActive && !player.jumping) { player.velY = -13.5; player.jumping = true; }
    keys[e.code] = true; 
};
window.onkeyup = (e) => keys[e.code] = false;

document.getElementById("leftBtn").ontouchstart = (e) => { e.preventDefault(); keys[config.Left] = true; };
document.getElementById("leftBtn").ontouchend = () => keys[config.Left] = false;
document.getElementById("rightBtn").ontouchstart = (e) => { e.preventDefault(); keys[config.Right] = true; };
document.getElementById("rightBtn").ontouchend = () => keys[config.Right] = false;
document.getElementById("jumpBtn").ontouchstart = (e) => { e.preventDefault(); if (gameActive && !player.jumping) { player.velY = -13.5; player.jumping = true; } };

updateUI();
