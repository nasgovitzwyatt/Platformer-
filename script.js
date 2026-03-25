const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game Constants
const gravity = 0.5;
const friction = 0.8;
let cameraY = 0;
let maxHeight = 0;

// Player Object
const player = {
    x: 180,
    y: 500,
    width: 30,
    height: 30,
    speed: 5,
    velX: 0,
    velY: 0,
    jumping: false,
    color: "#ff5722"
};

// Platforms
let platforms = [
    { x: 0, y: 580, width: 400, height: 20 }, // Starting floor
    { x: 150, y: 450, width: 100, height: 10 },
    { x: 50, y: 320, width: 100, height: 10 },
    { x: 250, y: 200, width: 100, height: 10 },
    { x: 100, y: 80, width: 100, height: 10 }
];

// Generate more platforms as we go up
function generatePlatforms() {
    let lastY = platforms[platforms.length - 1].y;
    while (platforms.length < 20) {
        lastY -= 120 + Math.random() * 50;
        platforms.push({
            x: Math.random() * 300,
            y: lastY,
            width: 80 + Math.random() * 40,
            height: 10
        });
    }
}

// Input handling
const keys = {};
document.addEventListener("keydown", (e) => keys[e.code] = true);
document.addEventListener("keyup", (e) => keys[e.code] = false);

function update() {
    // Left/Right Movement
    if (keys["ArrowRight"]) { if (player.velX < player.speed) player.velX++; }
    if (keys["ArrowLeft"]) { if (player.velX > -player.speed) player.velX--; }
    
    // Jump
    if (keys["ArrowUp"] || keys["Space"]) {
        if (!player.jumping) {
            player.velY = -12;
            player.jumping = true;
        }
    }

    player.velX *= friction;
    player.velY += gravity;
    player.x += player.velX;
    player.y += player.velY;

    // Canvas Boundaries
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

    // Platform Collision
    platforms.forEach(plat => {
        if (player.velY > 0 && 
            player.y + player.height > plat.y && 
            player.y + player.height < plat.y + plat.height + player.velY &&
            player.x + player.width > plat.x && 
            player.x < plat.x + plat.width) {
            player.jumping = false;
            player.velY = 0;
            player.y = plat.y - player.height;
        }
    });

    // Camera Logic: Follow the player upward
    if (player.y < canvas.height / 2 + cameraY) {
        cameraY = player.y - canvas.height / 2;
    }

    // Score / Height
    let currentHeight = Math.floor((500 - player.y) / 10);
    if (currentHeight > maxHeight) {
        maxHeight = currentHeight;
        document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`;
    }

    // Game Over if you fall off the bottom of the camera
    if (player.y > cameraY + canvas.height) {
        alert("You fell! Final Height: " + maxHeight + "m");
        location.reload();
    }

    generatePlatforms();
    draw();
    requestAnimationFrame(update);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(0, -cameraY); // Move the world based on the camera

    // Draw Platforms
    ctx.fillStyle = "#455a64";
    platforms.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
    });

    // Draw Player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    ctx.restore();
}

update();
