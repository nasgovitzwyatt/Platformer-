const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menus = {
    main: document.getElementById("mainMenu"),
    shop: document.getElementById("shopMenu"),
    skins: document.getElementById("skinMenu"),
    settings: document.getElementById("settingsModal")
};
const mobileControls = document.getElementById("mobileControls");

const skinData = [
    {id: "s1", color: "#ff5722", req: 0}, {id: "s2", color: "#2196f3", req: 50},
    {id: "s3", color: "#4caf50", req: 100}, {id: "s4", color: "#9c27b0", req: 150},
    {id: "s5", color: "#ffcc00", req: 200}, {id: "s6", color: "#1de9b6", req: 250},
    {id: "s7", color: "#d84315", req: 300}, {id: "s8", color: "#4b5320", req: 350},
    {id: "s9", color: "#ffffff", req: 400}, {id: "s10", color: "#39ff14", req: 450},
    {id: "s11", color: "rainbow", req: 500}, {id: "s12", color: "#b2ebf2", req: 600},
    {id: "s13", color: "#e91e63", req: 700}, {id: "s14", color: "#2ecc71", req: 800},
    {id: "s15", color: "#00d2ff", req: 900}, {id: "s16", color: "void", req: 1000}
];

let tokens = parseFloat(localStorage.getItem("parkourTokens")) || 0;
let highScore = parseInt(localStorage.getItem("parkourHigh")) || 0;
let playerColor = localStorage.getItem("playerColor") || "#ff5722";
let selectedSkinId = localStorage.getItem("selectedSkinId") || "s1";
let config = { Jump: "Space", Left: "ArrowLeft", Right: "ArrowRight" };
let keys = {}, platforms = [], gameActive = false, cameraY = 0, maxHeight = 0;
let player = { x: 185, y: 500, velX: 0, velY: 0, jumping: false, onIce: false };

function showMenu(key) {
    Object.values(menus).forEach(m => m.style.display = "none");
    if (menus[key]) {
        menus[key].style.display = "flex";
        mobileControls.style.display = "none"; // Hide controls in menu
    } else {
        mobileControls.style.display = "flex"; // Show controls during game
    }
    updateUI();
}

document.getElementById("startBtn").onclick = (e) => { e.preventDefault(); init(); };
document.getElementById("shopBtn").onclick = (e) => { e.preventDefault(); showMenu('shop'); };
document.getElementById("skinMenuBtn").onclick = (e) => { e.preventDefault(); showMenu('skins'); };
document.getElementById("settingsBtn").onclick = (e) => { e.preventDefault(); showMenu('settings'); };
document.querySelectorAll(".close-btn").forEach(btn => {
    btn.onclick = (e) => { e.preventDefault(); showMenu('main'); };
});

// Skin Grid Generation
const skinGrid = document.getElementById("skinGrid");
skinData.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "skin-btn";
    btn.id = s.id;
    btn.style.backgroundColor = (s.color === "rainbow" || s.color === "void") ? "#333" : s.color;
    btn.onclick = (e) => {
        e.preventDefault();
        if (highScore >= s.req) {
            playerColor = s.color;
            selectedSkinId = s.id;
            localStorage.setItem("playerColor", s.color);
            localStorage.setItem("selectedSkinId", s.id);
            updateUI();
        }
    };
    skinGrid.appendChild(btn);
});

function updateUI() {
    document.getElementById("tokenBoard").innerText = `🪙 ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `🏆 ${highScore}m`;
    document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`;
    skinData.forEach(s => {
        const btn = document.getElementById(s.id);
        if (highScore >= s.req) {
            btn.classList.remove("locked");
            btn.classList.toggle("selected", selectedSkinId === s.id);
        } else { btn.classList.add("locked"); btn.innerText = "🔒"; }
    });
}

// Keybind Logic
["Jump", "Left", "Right"].forEach(action => {
    const btn = document.getElementById("bind" + action);
    btn.onclick = (e) => {
        e.preventDefault();
        btn.innerText = "...";
        const listen = (event) => {
            event.preventDefault();
            config[action] = event.code;
            btn.innerText = event.code.replace("Arrow", "");
            window.removeEventListener("keydown", listen);
        };
        window.addEventListener("keydown", listen);
    };
});

function init() {
    platforms = []; cameraY = 0; maxHeight = 0;
    player.x = 185; player.y = 500; player.velX = 0; player.velY = 0;
    platforms.push({ x: 0, y: 580, width: 400, height: 20, type: 'normal' });
    for(let i=0; i<1000; i++) {
        let lastY = platforms[platforms.length-1].y - (95 + Math.random()*45);
        let type = Math.random() > 0.8 ? 'ice' : 'normal';
        platforms.push({ x: Math.random()*320, y: lastY, width: 80, height: 12, type: type });
    }
    gameActive = true;
    showMenu('none');
    loop();
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
            player.velY = 0; player.y = p.y - 30; player.jumping = false;
            if (p.type === 'ice') touchingIce = true;
        }
    });
    player.onIce = touchingIce;

    if (player.y < cameraY + 300) cameraY = player.y - 300;
    maxHeight = Math.max(maxHeight, Math.floor((500 - player.y)/10));
    if (player.y > cameraY + 800) { gameActive = false; showMenu('main'); }

    ctx.clearRect(0,0,400,600);
    ctx.save(); ctx.translate(0, -cameraY);
    platforms.forEach(p => {
        ctx.fillStyle = p.type === 'ice' ? "#00f2fe" : "#4caf50";
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
    ctx.fillStyle = playerColor === 'rainbow' ? `hsl(${Date.now()/10%360},100%,50%)` : playerColor;
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.restore();
    requestAnimationFrame(loop);
}

window.onkeydown = (e) => { 
    if (e.code === config.Jump && gameActive && !player.jumping) {
        player.velY = -13.5; player.jumping = true;
    }
    keys[e.code] = true; 
};
window.onkeyup = (e) => keys[e.code] = false;

document.getElementById("leftBtn").ontouchstart = (e) => { e.preventDefault(); keys[config.Left] = true; };
document.getElementById("leftBtn").ontouchend = () => keys[config.Left] = false;
document.getElementById("rightBtn").ontouchstart = (e) => { e.preventDefault(); keys[config.Right] = true; };
document.getElementById("rightBtn").ontouchend = () => keys[config.Right] = false;
document.getElementById("jumpBtn").ontouchstart = (e) => { 
    e.preventDefault(); 
    if (gameActive && !player.jumping) { player.velY = -13.5; player.jumping = true; }
};

showMenu('main');
