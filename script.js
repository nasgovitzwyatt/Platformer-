const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const menu = document.getElementById("menu");
const playBtn = document.getElementById("playBtn");
const skinsBtn = document.getElementById("skinsBtn");
const skinsPanel = document.getElementById("skinsPanel");

let gravity = 0.5, cameraY = 0, maxHeight = 0, gameActive = false;
let highScore = parseInt(localStorage.getItem("parkourHigh")) || 0;
let playerColor = "#ff5722";
let hue = 0;

const JUMP_FORCE = -13.5;
const BOUNCE_FORCE = -22;
const player = { x:180, y:500, width:30, height:30, velX:0, velY:0, jumping:false, onIce:false };
let platforms = [];
const keys = {};

const skinsData = [
    {id:"skin-orange", color:"#ff5722", unlock:0},
    {id:"skin-blue", color:"#2196f3", unlock:50},
    {id:"skin-green", color:"#4caf50", unlock:100},
    {id:"skin-purple", color:"#9c27b0", unlock:150},
    {id:"skin-gold", color:"#ffcc00", unlock:200},
    {id:"skin-mint", color:"#1de9b6", unlock:250},
    {id:"skin-striped", color:"striped", unlock:300},
    {id:"skin-camo", color:"camo", unlock:350},
    {id:"skin-ghost", color:"ghost", unlock:400},
    {id:"skin-lava", color:"lava", unlock:450},
    {id:"skin-rainbow", color:"rainbow", unlock:500},
    {id:"skin-neon", color:"neon", unlock:600},
    {id:"skin-diamond", color:"diamond", unlock:700},
    {id:"skin-ruby", color:"ruby", unlock:800},
    {id:"skin-emerald", color:"emerald", unlock:900},
    {id:"skin-void", color:"void", unlock:1000}
];

// ---------------- UI ----------------
function updateUI(){
    document.getElementById("highScoreBoard").innerText=`Best: ${highScore}m`;
    skinsData.forEach(skin=>{
        const btn = document.getElementById(skin.id);
        if(highScore >= skin.unlock){
            btn.classList.remove("locked");
            btn.innerText="SELECT";
            btn.onclick=()=>{ playerColor=skin.color; updateUI(); };
        } else {
            btn.classList.add("locked");
            btn.innerText=skin.unlock+"m";
            btn.onclick=null;
        }
        if(!btn.classList.contains("locked") && playerColor===skin.color) btn.classList.add("selected");
        else btn.classList.remove("selected");
    });
}

// ---------------- MENU ----------------
playBtn.onclick=()=>{ init(); }
skinsBtn.onclick=()=>{ skinsPanel.classList.toggle("hidden"); }

// ---------------- INIT ----------------
function init(){
    player.x=180; player.y=500; player.velX=0; player.velY=0;
    cameraY=0; maxHeight=0;
    platforms=[{ x:0, y:580, width:400, height:20, type:'normal', speed:0, isCracking:false }];
    generatePlatforms();

    gameActive=true;
    menu.classList.add("hidden");
    canvas.style.pointerEvents="auto";

    update();
}

// ---------------- PLATFORM GENERATION ----------------
function generatePlatforms(){
    let lastY=platforms[platforms.length-1].y;
    while(platforms.length<500){
        let gap=Math.min(48,(500-lastY)/100);
        lastY-=(90+gap)+Math.random()*40;
        let h=(500-lastY)/10;
        let type='normal';
        let roll=Math.random();
        if(h>40){
            if(roll<0.12) type='tramp';
            else if(roll<0.28) type='crumble';
            else if(h>140 && roll<0.45) type='ice';
        }
        let moveSpeed=0;
        if(h>100 && Math.random()<0.45) moveSpeed=(Math.random()>0.5?2.2:-2.2)+(h/350);

        platforms.push({
            x: Math.random()*320,
            y: lastY,
            width: Math.max(40,80-(h/35)),
            height: 12,
            type: type,
            speed: moveSpeed,
            crackTimer:2500,
            isCracking:false
        });
    }
}

// ---------------- GAME LOOP ----------------
function update(){
    if(!gameActive) return;

    let friction=player.onIce?0.98:0.8;
    let accel=player.onIce?0.3:1;
    if(keys["ArrowRight"]) player.velX+=accel;
    if(keys["ArrowLeft"]) player.velX-=accel;

    player.velX*=friction;
    player.velY+=gravity;
    player.x+=player.velX;
    player.y+=player.velY;

    if(player.x<-30) player.x=canvas.width;
    if(player.x>canvas.width) player.x=-30;

    player.onIce=false;

    platforms=platforms.filter(p=>{
        if(p.isCracking){ p.crackTimer-=16.6; if(p.crackTimer<=0) return false; }

        if(player.velY>0 && player.y+30>p.y && player.y+30<p.y+15+player.velY &&
           player.x+30>p.x && player.x<p.x+p.width){
            if(p.type==='tramp') player.velY=BOUNCE_FORCE;
            else{
                player.velY=0;
                player.y=p.y-30;
                if(p.type==='ice') player.onIce=true;
                if(p.type==='crumble') p.isCracking=true;
            }
            player.jumping=false;
        }

        if(p.speed!==0){
            p.x+=p.speed;
            if(p.x<0 || p.x+p.width>canvas.width) p.speed*=-1;
        }

        return true;
    });

    if(player.y<canvas.height/2+cameraY) cameraY=player.y-canvas.height/2;

    let h=Math.max(0,Math.floor((500-player.y)/10));
    if(h>maxHeight) maxHeight=h;
    document.getElementById("scoreBoard").innerText=`Height: ${maxHeight}m`;

    if(player.y>cameraY+canvas.height+100) gameOver();

    hue++;
    draw();
    requestAnimationFrame(update);
}

// ---------------- DRAW ----------------
function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(0,-cameraY);

    platforms.forEach(p=>{
        if(p.type==='ice') ctx.fillStyle="#80deea";
        else if(p.type==='crumble'){ let c=Math.floor((p.crackTimer/2500*150)); ctx.fillStyle=`rgb(${200-c},100,50)`; }
        else if(p.type==='tramp') ctx.fillStyle="#e91e63";
        else ctx.fillStyle="#455a64";
        ctx.fillRect(p.x,p.y,p.width,p.height);
    });

    ctx.fillStyle=playerColor==='striped'?'#fff':playerColor;
    ctx.fillRect(player.x,player.y,30,30);

    ctx.restore();
}

// ---------------- GAME OVER ----------------
function gameOver(){
    gameActive=false;
    canvas.style.pointerEvents="none";

    if(maxHeight>highScore){ highScore=maxHeight; localStorage.setItem("parkourHigh",highScore); }

    document.querySelector(".menu-title").innerText="YOU FELL!";
    playBtn.innerText="RETRY";
    menu.classList.remove("hidden");
    updateUI();
}

// ---------------- CONTROLS ----------------
window.addEventListener("keydown", e=>{
    if(["ArrowUp","Space"].includes(e.code) && !player.jumping){ player.velY=JUMP_FORCE; player.jumping=true; }
    keys[e.code]=true;
});
window.addEventListener("keyup", e=>keys[e.code]=false);

const setupBtn=(id,key)=>{
    const btn=document.getElementById(id);
    btn.addEventListener("touchstart", e=>{
        e.preventDefault();
        if(id==="jumpBtn" && !player.jumping) player.velY=JUMP_FORCE,player.jumping=true;
        else keys[key]=true;
    },{passive:false});
    btn.addEventListener("touchend", e=>{ e.preventDefault(); keys[key]=false; },{passive:false});
};
setupBtn("leftBtn","ArrowLeft");
setupBtn("rightBtn","ArrowRight");
setupBtn("jumpBtn","Space");

updateUI();
