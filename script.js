const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mainMenu = document.getElementById("mainMenu"), 
      shopMenu = document.getElementById("shopMenu"),
      settingsModal = document.getElementById("settingsModal"), 
      skinMenu = document.getElementById("skinMenu"),
      mobileControls = document.getElementById("mobileControls");

const bgMultipliers = { 
    "White": 1, "Blue": 1.2, "Forest": 1.3, "Sunset": 1.6, 
    "Midnight": 2, "Space": 2.5, "Gold": 4, "Void": 10 
};

// --- DATA PERSISTENCE FIX ---
let tokens = parseFloat(localStorage.getItem("parkourTokens")) || 0;
// Force High Score to be a Number
let highScore = parseInt(localStorage.getItem("parkourHigh")) || 0;

let ownedItems = JSON.parse(localStorage.getItem("ownedItems")) || ["White", "Blue"];
let currentBGName = localStorage.getItem("currentBGName") || "White";
let playerColor = localStorage.getItem("playerColor") || "#ff5722";
let selectedSkinId = localStorage.getItem("selectedSkinId") || "skin-orange";

let config = { 
    Jump: localStorage.getItem("keyJump") || "Space", 
    Left: localStorage.getItem("keyLeft") || "ArrowLeft", 
    Right: localStorage.getItem("keyRight") || "ArrowRight" 
};

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
const JUMP_FORCE = -13.5, BOUNCE_FORCE = -22;
const player = { x: 180, y: 500, width: 30, height: 30, velX: 0, velY: 0, jumping: false, onIce: false, conveyorForce: 0 };
let platforms = [], items = [], keys = {};

// --- NAVIGATION ---
document.getElementById("startBtn").onclick = (e) => { e.stopPropagation(); init(); };
document.getElementById("shopBtn").onclick = (e) => { e.stopPropagation(); mainMenu.style.display = "none"; shopMenu.style.display = "flex"; updateUI(); };
document.getElementById("closeShop").onclick = (e) => { e.stopPropagation(); shopMenu.style.display = "none"; mainMenu.style.display = "flex"; };
document.getElementById("skinMenuBtn").onclick = (e) => { e.stopPropagation(); skinMenu.style.display = (skinMenu.style.display === "none" ? "block" : "none"); };
document.getElementById("settingsBtn").onclick = (e) => { e.stopPropagation(); mainMenu.style.display = "none"; settingsModal.style.display = "flex"; };
document.getElementById("backToMenu").onclick = (e) => { e.stopPropagation(); settingsModal.style.display = "none"; mainMenu.style.display = "flex"; };

function buyItem(type, name, price) {
    if (ownedItems.includes(name)) { 
        if (type === 'bg') currentBGName = name; 
    } else if (tokens >= price) { 
        tokens -= price; 
        ownedItems.push(name); 
        if (type === 'bg') currentBGName = name; 
    }
    localStorage.setItem("parkourTokens", tokens); 
    localStorage.setItem("ownedItems", JSON.stringify(ownedItems));
    localStorage.setItem("currentBGName", currentBGName); 
    updateUI();
}

function updateUI() {
    // Ensure we are working with numbers
    highScore = parseInt(localStorage.getItem("parkourHigh")) || 0;
    
    document.getElementById("tokenBoard").innerText = `Tokens: ${Math.floor(tokens)}`;
    document.getElementById("highScoreBoard").innerText = `Best: ${highScore}m`;
    document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`;
    
    // Background Shop Update
    Object.keys(bgMultipliers).forEach(bg => {
        const btn = document.getElementById(`btn-bg-${bg}`), 
              priceSpan = document.getElementById(`price-${bg}`);
        if (btn) {
            btn.classList.toggle("selected", currentBGName === bg);
            if (ownedItems.includes(bg)) {
                priceSpan.innerText = (currentBGName === bg) ? "EQUIPPED" : "EQUIP";
            }
        }
    });

    // --- SKIN UNLOCK SYSTEM FIX ---
    const skinData = [
        {
