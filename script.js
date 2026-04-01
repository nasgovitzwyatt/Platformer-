const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mainMenu = document.getElementById("mainMenu"), shopMenu = document.getElementById("shopMenu"),
      settingsModal = document.getElementById("settingsModal"), skinMenu = document.getElementById("skinMenu"),
      mobileControls = document.getElementById("mobileControls");

const bgMultipliers = { "White": 1, "Blue": 1.2, "Sunset": 1.5, "Space": 2 };

let tokens = parseFloat(localStorage.getItem("parkourTokens")) || 0;
let highScore = parseInt(localStorage.getItem("parkourHigh")) || 0;
let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["White", "Blue"];
let currentBGName = localStorage.getItem("currentBGName") || "White";
let playerColor = localStorage.getItem("playerColor") || "#ff5722";
let selectedSkinId = localStorage.getItem("selectedSkinId") || "skin-orange";

let config = { Jump: localStorage.getItem("keyJump") || "Space", Left: localStorage.getItem("keyLeft") || "ArrowLeft", Right: localStorage.getItem("keyRight") || "ArrowRight" };
let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
const JUMP_FORCE = -13.5, BOUNCE_FORCE = -22;
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false, conveyorForce: 0 };
let platforms = [], items = [], keys = {};

// Navigation
document.getElementById("startBtn").onclick = (e) => { e.stopPropagation(); init(); };
document.getElementById("shopBtn").onclick = (e) => { e.stopPropagation(); mainMenu.style.display = "none"; shopMenu.style.display = "flex"; updateUI(); };
document.getElementById("closeShop").onclick = (e) => { e.stopPropagation(); shopMenu.style.display = "none"; mainMenu.style.display = "flex"; };
document.getElementById("skinMenuBtn").onclick = (e) => { e.stopPropagation(); skinMenu.style.display = (skinMenu.style.display === "none" ? "block" : "none"); };
document.getElementById("settingsBtn").onclick = (e) => { e.stopPropagation(); mainMenu.style.display = "none"; settingsModal.style.display = "flex"; };
document.getElementById("backToMenu").onclick = (e) => { e.stopPropagation(); settingsModal.style.display = "none"; mainMenu.style.display = "flex"; };

function buyItem(type, name, price) {
    if (ownedItems.includes(name)) { if (type === 'bg') currentBGName = name; }
    else if (tokens >= price) { tokens -= price; ownedItems.push(name); if (type === 'bg') currentBGName = name; }
    localStorage.setItem("parkourTokens", tokens); localStorage.setItem("ownedItems", JSON.stringify(ownedItems));
    localStorage.setItem("currentBGName", currentBGName); updateUI();
}

function updateUI() {
    document.getElementById("tokenBoard").innerText = `Tokens: ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;
    
    ["White", "Blue", "Sunset", "Space"].forEach(bg => {
        const btn = document.getElementById(`btn-bg-${bg}`), priceSpan = document.getElementById(`price-${bg}`);
        if (btn) {
            btn.classList.toggle("selected", currentBGName === bg);
            priceSpan.innerText = (currentBGName === bg) ? "EQUIPPED" : (ownedItems.includes(bg) ? "EQUIP" : priceSpan.innerText);
        }
    });

    const skinData = [
        {id: "skin-orange", req: 0}, {id: "skin-blue", req: 50}, {id: "skin-green", req: 100}, {id: "skin-purple", req: 150},
        {id: "skin-gold", req: 200}, {id: "skin-mint", req: 250}, {id: "skin-lava", req: 300}, {id: "skin-camo", req: 350},
        {id: "skin-ghost", req: 400}, {id: "skin-neon", req: 450}, {id: "skin-rainbow", req: 500}, {id: "skin-diamond", req: 600},
        {id: "skin-ruby", req: 700}, {id: "skin-emerald", req: 800}, {id: "skin-electric", req: 900}, {id: "skin-void", req: 1000}
    ];
    skinData.forEach(s => {
        const btn = document.getElementById(s.id);
        if (btn) {
            if (highScore >= s.req) { btn.classList.remove("locked"); btn.innerText = (selectedSkinId === s.id) ? "ACTIVE" : "SELECT"; btn.classList.toggle("selected", selectedSkinId === s.id); }
            else { btn.classList.add("locked"); btn.innerText = "🔒 " + s.req + "m"; }
        }
    });
}

function changeSkin(color, req, id) {
    if (highScore >= req) { playerColor = color; selectedSkinId = id; localStorage.setItem("playerColor", color); localStorage.setItem("selectedSkinId", id); updateUI(); skinMenu.style.display = "none"; }
}

let bindingAction = null;
const bindButtons = { Jump: "bindJump", Left: "bindLeft", Right: "bindRight" };
Object.keys(bindButtons).forEach(action => {
    const btn = document.getElementById(bindButtons[action]);
    btn.onclick = (e) => { e.stopPropagation(); bindingAction = action; btn.innerText = "..."; btn.classList.add("waiting"); };
});

window.addEventListener("keydown", e => {
    if (bindingAction) {
        e.preventDefault(); config[bindingAction] = e.code; localStorage.setItem("key" + bindingAction, e.code);
        document.getElementById(bindButtons[bindingAction]).innerText = e.code.replace("Key", "").replace("Arrow", "");
        document.getElementById(bindButtons[bindingAction]).classList.remove("waiting");
        bindingAction = null; return;
    }
    if ((e.code === config.Jump || e.code === "Space" || e.code === "ArrowUp") && !player.jumping && gameActive) { player.velY = JUMP_FORCE; player.jumping = true; }
    keys[e.code] = true;
});
window.addEventListener("keyup", e => keys[e.code] = false);

function init() {
    player.x = 180; player.y = 500; player.velX = 0; player.velY = 0; cameraY = 0; maxHeight = 0;
    platforms = [{ x: 0, y: 580, width: 400, height: 20, type: 'normal' }]; items = [];
    generatePlatforms(); gameActive = true;
    mobileControls.style.pointerEvents = "none";
    mainMenu.style.display = "none"; shopMenu.style.display = "none"; settingsModal.style.display = "none";
    updateUI(); update();
}

function generatePlatforms() {
    let lastY = platforms[platforms.length - 1].y;
    for (let i = 0; i < 500; i++) {
        let heightM = (500 - lastY) / 10;
        let gapModifier = Math.min(55, heightM / 18);
        lastY -= (90 + gapModifier + Math.random() * 40);
        let type = 'normal', roll = Math.random();
        let normalChance = Math.max(0.3, 0.65 - (heightM / 1800));
        if (roll > normalChance) {
            let subRoll = Math.random();
            if (subRoll < 0.35) type = 'tramp'; else if (subRoll < 0.45) type = 'conveyor'; else if (subRoll < 0.75) type = 'crumble'; else type = 'ice';
        }
        let moveSpeed = (type !== 'conveyor' && Math.random() < 0.25) ? (1.5 + (heightM/600)) : 0;
        platforms.push({ x: Math.random() * 300, y: lastY, width: Math.max(45, 80 - (heightM / 30)), height: 12, type: type, speed: moveSpeed, beltDir: 1.5, crackTimer: 1.0, isCracking: false });
        if (Math.random() < 0.3) items.push({ x: platforms[platforms.length-1].x + 35, y: lastY - 25, collected: false });
    }
}

function update() {
    if (!gameActive) return;
    mobileControls.style.pointerEvents = "auto";
    if (keys[config.Left] || keys["ArrowLeft"]) player.velX -= player.onIce ? 0.3 : 1; 
    if (keys[config.Right] || keys["ArrowRight"]) player.velX += player.onIce ? 0.3 : 1;
    player.velX *= player.onIce ? 0.98 : 0.8; player.velX += player.conveyorForce; player.velY += gravity; player.x += player.velX; player.y += player.velY;
    if (player.x < -30) player.x = canvas.width; if (player.x > canvas.width) player.x = -30;
    player.conveyorForce = 0; player.onIce = false;

    platforms.forEach(plat => {
        if (player.velY > 0 && player.y + 30 > plat.y && player.y + 30 < plat.y + 15 + player.velY && player.x + 30 > plat.x && player.x < plat.x + plat.width) {
            if (plat.type === 'tramp') { player.velY = BOUNCE_FORCE; player.jumping = true; }
            else { player.velY = 0; player.y = plat.y - 30; player.jumping = false; if (plat.type === 'conveyor') player.conveyorForce = plat.beltDir; if (plat.type === 'ice') player.onIce = true; if (plat.type === 'crumble') plat.isCracking = true; }
        }
        if (plat.isCracking) plat.crackTimer -= 0.02;
        if (plat.speed) { plat.x += plat.speed; if (plat.x < 0 || plat.x > 320) plat.speed *= -1; }
    });
    platforms = platforms.filter(p => p.type !== 'crumble' || p.crackTimer > 0);
    items.forEach(item => { if (!item.collected && Math.abs(player.x - item.x) < 30 && Math.abs(player.y - item.y) < 30) { 
        item.collected = true; 
        let multi = bgMultipliers[currentBGName] || 1;
        tokens += (1 * multi); 
        localStorage.setItem("parkourTokens", tokens);
        updateUI(); 
    } });
    if (player.y < cameraY + 300) cameraY = player.y - 300;
    let h = Math.max(0, Math.floor((500 - player.y) / 10));
    if (h > maxHeight) { maxHeight = h; document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`; }
    if (player.y > cameraY + 750) gameOver();
    draw(); requestAnimationFrame(update);
}

function draw() {
    let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (currentBGName === "White") { grad.addColorStop(0, "#fff"); grad.addColorStop(1, "#ddd"); }
    else if (currentBGName === "Blue") { grad.addColorStop(0, "#4facfe"); grad.addColorStop(1, "#00f2fe"); }
    else if (currentBGName === "Sunset") { grad.addColorStop(0, "#ff8c00"); grad.addColorStop(1, "#ff0080"); }
    else if (currentBGName === "Space") { grad.addColorStop(0, "#0f0c29"); grad.addColorStop(1, "#24243e"); }
    ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save(); ctx.translate(0, -cameraY);
    platforms.forEach(p => {
        if (p.type === 'tramp') ctx.fillStyle = "#e91e63"; else if (p.type === 'conveyor') ctx.fillStyle = "#757575"; else if (p.type === 'ice') ctx.fillStyle = "#80deea"; else if (p.type === 'crumble') ctx.fillStyle = `rgb(${255 * (1-p.crackTimer)}, ${150 * p.crackTimer}, 50)`; else ctx.fillStyle = "#455a64";
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
    items.forEach(item => { if (!item.collected) { ctx.fillStyle = "#ffeb3b"; ctx.beginPath(); ctx.arc(item.x+5, item.y+5, 8, 0, Math.PI*2); ctx.fill(); } });
    if (playerColor === 'rainbow') ctx.fillStyle = `hsl(${(Date.now() / 10) % 360}, 100%, 50%)`; else if (playerColor === 'lava') { ctx.fillStyle = "#d84315"; ctx.shadowBlur = 10; ctx.shadowColor = "#ffeb3b"; } else if (playerColor === 'electric') { ctx.fillStyle = "#00d2ff"; ctx.shadowBlur = 15; ctx.shadowColor = "#fff"; } else if (playerColor === 'ghost') { ctx.globalAlpha = 0.4; ctx.fillStyle = "white"; } else if (playerColor === 'neon') { ctx.fillStyle = "#39ff14"; ctx.shadowBlur = 15; ctx.shadowColor = "#39ff14"; } else { ctx.fillStyle = playerColor; }
    ctx.fillRect(player.x, player.y, 30, 30);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1.0; ctx.restore();
}

function gameOver() { gameActive = false; mainMenu.style.display = "flex"; mobileControls.style.pointerEvents = "none"; updateUI(); }
const setupBtn = (id, act) => {
    const btn = document.getElementById(id);
    btn.ontouchstart = (e) => { e.preventDefault(); if (act === "Jump") { if (!player.jumping && gameActive) { player.velY = JUMP_FORCE; player.jumping = true; } } else keys[config[act]] = true; };
    btn.ontouchend = () => keys[config[act]] = false;
};
setupBtn("leftBtn", "Left"); setupBtn("rightBtn", "Right"); setupBtn("jumpBtn", "Jump");
updateUI();
