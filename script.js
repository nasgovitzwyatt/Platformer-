function update() {
    if (!gameActive) return;
    mobileControls.style.pointerEvents = "auto";
    
    // --- THE FIX: RESET ICE STATE EVERY FRAME ---
    player.onIce = false; 
    
    let speedMult = powerupStatus.SlowMo ? 0.7 : 1.0;

    // Movement Input
    if (keys[config.Left] || keys["ArrowLeft"]) {
        player.velX -= (player.onIce ? 0.3 : 1.2) * speedMult; 
    }
    if (keys[config.Right] || keys["ArrowRight"]) {
        player.velX += (player.onIce ? 0.3 : 1.2) * speedMult;
    }

    // --- THE FIX: BETTER FRICTION ---
    // If on ice, keep 98% of speed (slide). If normal, keep only 70% (stop fast).
    let friction = player.onIce ? 0.98 : 0.7;
    player.velX *= friction; 
    
    // Cap maximum horizontal speed so it doesn't feel floaty
    if (Math.abs(player.velX) > 10) player.velX = Math.sign(player.velX) * 10;

    player.x += player.velX; 
    player.y += player.velY * speedMult;
    player.velY += gravity * speedMult;
    
    if (player.x < -30) player.x = canvas.width; 
    if (player.x > canvas.width) player.x = -30;

    // Wormhole Check
    wormholes.forEach((wh, index) => {
        if (Math.abs(player.x - wh.x) < 35 && Math.abs(player.y - wh.y) < 35) {
            player.y -= 1500; cameraY -= 1500;
            platforms.push({ x: player.x - 20, y: player.y + 50, width: 100, height: 12, type: 'normal', speed: 0, crackTimer: 1.0, isCracking: false });
            wormholes.splice(index, 1);
        }
    });

    // Platform Collisions
    platforms.forEach(plat => {
        if (player.velY > 0 && player.y + 30 > plat.y && player.y + 30 < plat.y + 15 + player.velY && 
            player.x + 30 > plat.x && player.x < plat.x + plat.width) {
            
            if (plat.type === 'tramp') { 
                player.velY = BOUNCE_FORCE; 
                player.jumping = true; 
                jumpCount = 1; 
            } else { 
                player.velY = 0; 
                player.y = plat.y - 30; 
                player.jumping = false; 
                jumpCount = 0;
                
                // --- THE FIX: ONLY TRIGGER ICE IF TYPE IS ICE ---
                if (plat.type === 'ice') {
                    player.onIce = true;
                } else {
                    player.onIce = false;
                }

                if (plat.type === 'conveyor') player.velX += plat.beltDir; 
                if (plat.type === 'crumble') plat.isCracking = true; 
            }
        }
        if (plat.isCracking) plat.crackTimer -= 0.02;
        if (plat.speed) { plat.x += plat.speed * speedMult; if (plat.x < 0 || plat.x > 320) plat.speed *= -1; }
    });
    
    platforms = platforms.filter(p => p.type !== 'crumble' || p.crackTimer > 0);

    // Magnet/Items
    items.forEach(item => { 
        if (!item.collected) {
            let dist = Math.sqrt(Math.pow(player.x - item.x, 2) + Math.pow(player.y - item.y, 2));
            if (powerupStatus.Magnet && dist < 150) {
                item.x += (player.x - item.x) * 0.1; item.y += (player.y - item.y) * 0.1;
            }
            if (dist < 35) {
                item.collected = true; 
                tokens += (bgMultipliers[currentBGName] || 1); 
                localStorage.setItem("parkourTokens", tokens); 
                updateUI(); 
            }
        }
    });
    
    if (player.y < cameraY + 300) cameraY = player.y - 300;
    let ch = Math.max(0, Math.floor((500 - player.y) / 10));
    if (ch > maxHeight) { maxHeight = ch; document.getElementById("scoreBoard").innerText = `Height: ${maxHeight}m`; }
    if (player.y > cameraY + 750) gameOver();
    
    draw(); 
    animationId = requestAnimationFrame(update);
}
