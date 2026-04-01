const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menus = {
    main: document.getElementById("mainMenu"),
    shop: document.getElementById("shopMenu"),
    skins: document.getElementById("skinMenu"),
    settings: document.getElementById("settingsModal")
};

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
let player = { x: 185, y: 500, velX: 0, velY: 0, onIce: false };

function showMenu(key) {
    Object.values(menus).forEach(m => m.style.display = "none");
    if (menus[key]) menus[key].style.display = "flex";
    updateUI();
}

document.getElementById("startBtn").onclick = () => init();
document.getElementById("shopBtn").onclick = () => showMenu('shop');
document.getElementById("skinMenuBtn").onclick = () => showMenu('skins');
document.getElementById("settingsBtn").onclick = () => showMenu('settings');
document.querySelectorAll(".close-btn").forEach(btn => btn.onclick = () => showMenu('main'));

// Generate Skin Grid
const skinGrid = document.getElementById("skinGrid");
skinData.forEach(s => {
    const btn = document.createElement("button");
    btn.className = "skin-btn";
    btn.id = s.id;
    btn.style.backgroundColor = (s.color === "rainbow" || s.color === "void") ? "#333" : s.color;
    btn.onclick = (e) => {
        e.stopPropagation();
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
    skin
