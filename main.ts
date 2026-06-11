var canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
var ctx: CanvasRenderingContext2D = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;

// CANVAS PROPERTIES
var CANVAS_WIDTH: number = window.innerWidth;
var CANVAS_HEIGHT: number = window.innerHeight;
const CANVAS_BG_COLOR: string = "#f0ffff";
const BASE_TILE_SIZE: number = 15;
var TILE_SIZE: number = 15;
const OUTLINE_THICKNESS = 2; // <DEPRECATED> Thickness of the lines that make up the box surrounding the mouse
// WORLD PROPERTIES
const X_TILES: number = 320;
const Y_TILES: number = 180;
const WORLD_WIDTH: number = X_TILES * BASE_TILE_SIZE;
const WORLD_HEIGHT: number = Y_TILES * BASE_TILE_SIZE;
var CAMERA_OFFSET: Vector2 = Vector2(
    Math.floor(X_TILES / 2) - Math.floor(CANVAS_WIDTH / TILE_SIZE / 2),
    Math.floor(Y_TILES / 2) - Math.floor(CANVAS_HEIGHT / TILE_SIZE / 2)
);
var activeStockpile: { [key: string]: number } | null = null;
var activeStockpileName: string = "📦 Select a Town Hall to view Stockpile";
var STORAGE_POS: Vector2 = Vector2(Math.floor(X_TILES / 2), Math.floor(Y_TILES / 2));
var PAUSED: boolean = false;
const TILE_ENTITY_LIMIT: number = 2;
const TILE_ITEM_LIMIT: number = 10;
var MOVEMENT_DELAY: number = 15;
const INVENTORY_MAX_CAPACITY: number = 20;

// Village settings and spawn configuration
var townHallPositions: Vector2[] = [];
var HUMAN_SPAWN_INTERVAL: number = 100; // Tweak this value to change runtime spawn rate (lower = faster spawn)
var MAX_ENTITIES_LIMIT: number = 5000; // Maximum number of concurrent entities in the world to maintain high performance

canvas.height = CANVAS_HEIGHT;
canvas.width = CANVAS_WIDTH;

window.addEventListener("resize", () => {
    CANVAS_WIDTH = window.innerWidth;
    CANVAS_HEIGHT = window.innerHeight;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    setCameraOffset(CAMERA_OFFSET.x, CAMERA_OFFSET.y);
});

var tileInspectorDiv = document.getElementById("tileInspectorDiv");

var mousePos = { x: 0, y: 0 };
canvas.onpointermove = (e) => {
    var rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; //x position within the element.
    mousePos.y = e.clientY - rect.top;  //y position within the element.
}

var inspectedHouseOwnerId: string | null = null;

var entities: EntityData[] = [];
var world: WorldTile[][] = [];
var wasmExports: any = null;
var wasmMemory: WebAssembly.Memory | null = null;

function findWasmPath(startX: number, startY: number, endX: number, endY: number): { x: number, y: number }[] {
    if (!wasmExports || !wasmMemory) return [];
    var success = wasmExports.findPath(startX, startY, endX, endY);
    if (!success) return [];
    var length = wasmExports.getResultPathLength();
    var ptr = wasmExports.getResultPathPointer();
    var int32Array = new Int32Array(wasmMemory.buffer, ptr, length * 2);
    var path: { x: number, y: number }[] = [];
    for (var i = 0; i < length; i++) {
        path.push({ x: int32Array[i * 2], y: int32Array[i * 2 + 1] });
    }
    return path;
}

var sprites: Map<string, HTMLImageElement> = new Map<string, HTMLImageElement>();

var offscreenCanvas: HTMLCanvasElement = document.createElement("canvas");
var offscreenCtx: CanvasRenderingContext2D = offscreenCanvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;
offscreenCanvas.width = WORLD_WIDTH;
offscreenCanvas.height = WORLD_HEIGHT;

function getImgElement(src: string, onLoadCallback?: () => void): HTMLImageElement {
    var el: HTMLImageElement = document.createElement("img");
    if (onLoadCallback) {
        el.onload = onLoadCallback;
    }
    el.src = src;
    return el;
}

function drawRect(x: number, y: number, width: number, height: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

function drawText(text: string, x: number, y: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

function setCameraOffset(x: number, y: number): boolean {
    var maxOffsetX = X_TILES - CANVAS_WIDTH / TILE_SIZE;
    var maxOffsetY = Y_TILES - CANVAS_HEIGHT / TILE_SIZE;

    if (x < 0) x = 0;
    if (x > maxOffsetX) x = maxOffsetX;
    if (y < 0) y = 0;
    if (y > maxOffsetY) y = maxOffsetY;

    CAMERA_OFFSET.x = x;
    CAMERA_OFFSET.y = y;
    return true;
}

function init(): void {
    ctx.textAlign = "center";
    ctx.imageSmoothingEnabled = false;
    drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_BG_COLOR);

    // Initialise the 2D world array
    for (var x = 0; x < X_TILES; x++) {
        world[x] = [];
        for (var y = 0; y < Y_TILES; y++) {
            var tile: WorldTile = new WorldTile(x, y);
            if (tile.type != TileType.WATER && tile.type != TileType.DARK_WATER) {
                var spawnRoll = Math.random();
                if (spawnRoll < 0.0010) { // 0.10% chance to spawn a Sheep
                    //@ts-ignore
                    var s = new Sheep();
                    tile.addEntity(s);
                    entities.push({ entity: s, pos: Vector2(x, y) });
                } else if (spawnRoll < 0.0013) { // 0.03% chance to spawn a Wolf
                    //@ts-ignore
                    var w = new Wolf();
                    tile.addEntity(w);
                    entities.push({ entity: w, pos: Vector2(x, y) });
                }
            }
            world[x][y] = tile;
        }
    }

    // Sync the A* Grid to WASM (Pre-village)
    for (var x = 0; x < X_TILES; x++) {
        for (var y = 0; y < Y_TILES; y++) {
            wasmExports.setGridWeight(x, y, Number(world[x][y].canBeTraversed()));
        }
    }

    // Generate 50 village settlements across the map using WASM
    wasmExports.generateVillagesWasm(50);
    var genSize = wasmExports.getGenBufferSize();
    var genPtr = wasmExports.getGenBufferPointer();
    var genArray = new Int32Array(wasmMemory!.buffer, genPtr, genSize * 3);

    for (var i = 0; i < genSize; i++) {
        var cmd = genArray[i * 3];
        var gx = genArray[i * 3 + 1];
        var gy = genArray[i * 3 + 2];
        var tile = world[gx][gy];

        if (cmd === 0) { // TownHall
            townHallPositions.push(Vector2(gx, gy));
            tile.worldObjects = [new WorldObject("town_hall")];
        } else if (cmd === 1) { // Campfire
            tile.worldObjects = [new WorldObject("campfire")];
        } else if (cmd === 2) { // Ground
            tile.type = TileType.GROUND;
            tile.worldObjects = tile.worldObjects.filter(o => o.name === "town_hall" || o.name === "campfire" || o.name === "house");
        } else if (cmd === 3) { // Fence
            tile.worldObjects = [new WorldObject("fence")];
            tile.items = [];
        } else if (cmd >= 4 && cmd <= 9) { // Entities
            tile.entities = [];
            tile.worldObjects = [];
            let ent: any;
            //@ts-ignore
            if (cmd === 4) ent = new Sheep();
            //@ts-ignore
            else if (cmd === 5) ent = new Cow();
            else if (cmd === 6) ent = new Woodcutter();
            else if (cmd === 7) ent = new Fisherman();
            //@ts-ignore
            else if (cmd === 8) ent = new Miner();
            //@ts-ignore
            else if (cmd === 9) ent = new Farmer();

            if (ent) {
                tile.addEntity(ent);
                entities.push({ entity: ent, pos: Vector2(gx, gy) });
            }
        }
    }

    // Sync the A* Grid to WASM again (Post-village)
    for (var x = 0; x < X_TILES; x++) {
        for (var y = 0; y < Y_TILES; y++) {
            wasmExports.setGridWeight(x, y, Number(world[x][y].canBeTraversed()));
        }
    }

    // Load in all the images and trigger offscreen redraw when loaded
    sprites.set("tree", getImgElement("img/tree.png", () => {
        drawEntireWorldToOffscreen();
    }));

    // Perform initial draw of terrain backgrounds to offscreen canvas
    drawEntireWorldToOffscreen();
}



function drawProceduralObject(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, size: number): void {
    ctx.save();

    // Center calculations
    var cx = x + size / 2;
    var cy = y + size / 2;

    if (name === "tree") {
        // Fallback tree: trunk + green circle
        ctx.fillStyle = "#5c4033"; // Brown trunk
        ctx.fillRect(cx - size * 0.1, y + size * 0.5, size * 0.2, size * 0.5);
        ctx.fillStyle = "darkgreen";
        ctx.beginPath();
        ctx.arc(cx, y + size * 0.4, size * 0.35, 0, Math.PI * 2);
        ctx.fill();
    }
    else if (name === "storage_pile") {
        // Draw a nice chest/crate or pile of items
        ctx.fillStyle = "#8b5a2b"; // Brown box
        ctx.fillRect(x + size * 0.15, y + size * 0.25, size * 0.7, size * 0.65);

        ctx.fillStyle = "#cd853f"; // Lid highlight
        ctx.fillRect(x + size * 0.15, y + size * 0.25, size * 0.7, size * 0.18);

        ctx.fillStyle = "#ffd700"; // Gold latch
        ctx.fillRect(cx - size * 0.08, y + size * 0.4, size * 0.16, size * 0.15);
    }
    else if (name === "pine_tree") {
        // Pine tree: brown trunk + stacked green triangles
        ctx.fillStyle = "#4a3328"; // Trunk
        ctx.fillRect(cx - size * 0.08, y + size * 0.7, size * 0.16, size * 0.3);

        ctx.fillStyle = "#1e3f20"; // Dark pine green
        // Bottom triangle
        ctx.beginPath();
        ctx.moveTo(x + size * 0.15, y + size * 0.75);
        ctx.lineTo(x + size * 0.85, y + size * 0.75);
        ctx.lineTo(cx, y + size * 0.4);
        ctx.closePath();
        ctx.fill();

        // Top triangle
        ctx.beginPath();
        ctx.moveTo(x + size * 0.25, y + size * 0.45);
        ctx.lineTo(x + size * 0.75, y + size * 0.45);
        ctx.lineTo(cx, y + size * 0.1);
        ctx.closePath();
        ctx.fill();
    }
    else if (name === "palm_tree") {
        // Palm tree: curved trunk + green fronds
        ctx.strokeStyle = "#8b5a2b";
        ctx.lineWidth = size * 0.12;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx, y + size);
        ctx.quadraticCurveTo(x + size * 0.3, y + size * 0.5, cx - size * 0.1, y + size * 0.3);
        ctx.stroke();

        ctx.fillStyle = "#2e8b57"; // Sea green
        var lx = cx - size * 0.1;
        var ly = y + size * 0.3;

        var fronds = [
            { tx: lx - size * 0.35, ty: ly + size * 0.1 },
            { tx: lx - size * 0.4, ty: ly - size * 0.15 },
            { tx: lx, ty: ly - size * 0.3 },
            { tx: lx + size * 0.35, ty: ly - size * 0.15 },
            { tx: lx + size * 0.3, ty: ly + size * 0.15 }
        ];

        for (var f of fronds) {
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.quadraticCurveTo((lx + f.tx) / 2, (ly + f.ty) / 2 - size * 0.1, f.tx, f.ty);
            ctx.lineWidth = size * 0.08;
            ctx.strokeStyle = "#2e8b57";
            ctx.stroke();
        }
    }
    else if (name === "cactus") {
        // Cactus: green trunk and arms
        ctx.fillStyle = "#2d7a47";
        // Main stem
        ctx.fillRect(cx - size * 0.12, y + size * 0.2, size * 0.24, size * 0.8);

        // Left arm
        ctx.fillRect(x + size * 0.15, y + size * 0.45, size * 0.2, size * 0.12);
        ctx.fillRect(x + size * 0.15, y + size * 0.25, size * 0.12, size * 0.2);

        // Right arm
        ctx.fillRect(cx, y + size * 0.35, size * 0.25, size * 0.12);
        ctx.fillRect(x + size * 0.7, y + size * 0.15, size * 0.12, size * 0.2);
    }
    else if (name === "shrub") {
        ctx.fillStyle = "#228b22";
        ctx.beginPath();
        ctx.arc(cx - size * 0.15, y + size * 0.65, size * 0.25, 0, Math.PI * 2);
        ctx.arc(cx + size * 0.15, y + size * 0.65, size * 0.25, 0, Math.PI * 2);
        ctx.arc(cx, y + size * 0.4, size * 0.28, 0, Math.PI * 2);
        ctx.fill();
    }
    else if (name === "wheat") {
        // Golden stalks
        ctx.strokeStyle = "#daa520";
        ctx.lineWidth = 1.5;
        var stalks = [-size * 0.2, 0, size * 0.2];
        for (var s of stalks) {
            ctx.beginPath();
            ctx.moveTo(cx + s, y + size);
            ctx.quadraticCurveTo(cx + s * 1.5, y + size * 0.5, cx + s * 0.8, y + size * 0.2);
            ctx.stroke();

            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.arc(cx + s * 0.8, y + size * 0.2, 2, 0, Math.PI * 2);
            ctx.arc(cx + s * 1.0, y + size * 0.35, 1.5, 0, Math.PI * 2);
            ctx.arc(cx + s * 0.6, y + size * 0.5, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    else if (name === "reed") {
        ctx.strokeStyle = "#3cb371";
        ctx.lineWidth = 1.2;
        var reedOffsets = [-size * 0.25, -size * 0.05, size * 0.15];
        for (var ro of reedOffsets) {
            ctx.beginPath();
            ctx.moveTo(cx + ro, y + size);
            ctx.quadraticCurveTo(cx + ro + size * 0.1, y + size * 0.4, cx + ro - size * 0.05, y + size * 0.1);
            ctx.stroke();
        }
    }
    else if (name === "fish") {
        ctx.fillStyle = "#4682b4";
        ctx.beginPath();
        ctx.ellipse(cx, cy + size * 0.05, size * 0.22, size * 0.1, Math.PI / 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx - size * 0.18, cy + size * 0.02);
        ctx.lineTo(cx - size * 0.32, cy - size * 0.1);
        ctx.lineTo(cx - size * 0.32, cy + size * 0.15);
        ctx.closePath();
        ctx.fill();
    }
    else if (name === "stone") {
        ctx.fillStyle = "#808080";
        ctx.beginPath();
        ctx.arc(cx - size * 0.15, y + size * 0.7, size * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#a9a9a9";
        ctx.beginPath();
        ctx.arc(cx + size * 0.1, y + size * 0.65, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
    }
    else if (name === "town_hall") {
        // Red brick wall structure
        ctx.fillStyle = "#8b2635"; // Brick red/maroon
        ctx.fillRect(x + size * 0.1, y + size * 0.35, size * 0.8, size * 0.55);
        // Roof
        ctx.fillStyle = "#3b4a5a"; // Slate grey
        ctx.beginPath();
        ctx.moveTo(x + size * 0.05, y + size * 0.35);
        ctx.lineTo(x + size * 0.95, y + size * 0.35);
        ctx.lineTo(cx, y + size * 0.05);
        ctx.closePath();
        ctx.fill();
        // Door
        ctx.fillStyle = "#3e2723"; // Dark wood
        ctx.fillRect(cx - size * 0.15, y + size * 0.6, size * 0.3, size * 0.3);
        // Gold lock latch
        ctx.fillStyle = "#ffd700";
        ctx.fillRect(cx - size * 0.03, y + size * 0.72, size * 0.06, size * 0.08);
        // Windows
        ctx.fillStyle = "#e0f7fa"; // Light cyan window
        ctx.fillRect(x + size * 0.22, y + size * 0.45, size * 0.14, size * 0.14);
        ctx.fillRect(x + size * 0.64, y + size * 0.45, size * 0.14, size * 0.14);
    }
    else if (name === "house") {
        // Cottage house
        ctx.fillStyle = "#cd853f"; // Wood siding
        ctx.fillRect(x + size * 0.15, y + size * 0.42, size * 0.7, size * 0.48);
        // Red triangular roof
        ctx.fillStyle = "#b22222";
        ctx.beginPath();
        ctx.moveTo(x + size * 0.1, y + size * 0.42);
        ctx.lineTo(x + size * 0.9, y + size * 0.42);
        ctx.lineTo(cx, y + size * 0.15);
        ctx.closePath();
        ctx.fill();
        // Door
        ctx.fillStyle = "#4e342e";
        ctx.fillRect(cx - size * 0.1, y + size * 0.62, size * 0.2, size * 0.28);
        // Small square window
        ctx.fillStyle = "#ffeb3b";
        ctx.fillRect(x + size * 0.24, y + size * 0.5, size * 0.12, size * 0.12);
    }
    else if (name === "campfire") {
        // Campfire: ring of stones
        ctx.fillStyle = "#757575";
        for (var angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
            var sx = cx + Math.cos(angle) * size * 0.3;
            var sy = cy + Math.sin(angle) * size * 0.3;
            ctx.beginPath();
            ctx.arc(sx, sy, size * 0.08, 0, Math.PI * 2);
            ctx.fill();
        }
        // Crossed logs
        ctx.strokeStyle = "#5d4037";
        ctx.lineWidth = size * 0.08;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.2, cy + size * 0.1);
        ctx.lineTo(cx + size * 0.2, cy - size * 0.1);
        ctx.moveTo(cx + size * 0.2, cy + size * 0.1);
        ctx.lineTo(cx - size * 0.2, cy - size * 0.1);
        ctx.stroke();
        // Red/orange fire flame in center
        ctx.fillStyle = "#ff3d00"; // Deep orange
        ctx.beginPath();
        ctx.arc(cx, cy - size * 0.05, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffeb3b"; // Bright yellow
        ctx.beginPath();
        ctx.arc(cx, cy - size * 0.07, size * 0.08, 0, Math.PI * 2);
        ctx.fill();
    }
    else if (name === "fence") {
        // Horizontal rails & vertical posts
        ctx.strokeStyle = "#8d6e63"; // Medium brown
        ctx.lineWidth = size * 0.09;
        ctx.lineCap = "square";

        ctx.beginPath();
        // Vertical Posts
        ctx.moveTo(x + size * 0.2, y);
        ctx.lineTo(x + size * 0.2, y + size);
        ctx.moveTo(x + size * 0.8, y);
        ctx.lineTo(x + size * 0.8, y + size);

        // Horizontal Rails
        ctx.moveTo(x, y + size * 0.3);
        ctx.lineTo(x + size, y + size * 0.3);
        ctx.moveTo(x, y + size * 0.7);
        ctx.lineTo(x + size, y + size * 0.7);
        ctx.stroke();
    }

    ctx.restore();
}

function drawTileToOffscreen(x: number, y: number): void {
    var tile = world[x] ? world[x][y] : undefined;
    if (!tile) return;

    var screenX = x * BASE_TILE_SIZE;
    var screenY = y * BASE_TILE_SIZE;

    // Draw tile terrain color (ignore entities since they are dynamic)
    offscreenCtx.fillStyle = tile.type as string;
    offscreenCtx.fillRect(screenX, screenY, BASE_TILE_SIZE, BASE_TILE_SIZE);

    // Draw worldObject sprite
    var worldObjs = tile.worldObjects;
    var objLen = worldObjs.length;
    if (objLen > 0) {
        var spriteName = worldObjs[objLen - 1].name;
        var spriteImg = sprites.get(spriteName);
        if (spriteImg && spriteImg.complete) {
            offscreenCtx.drawImage(spriteImg, screenX, screenY, BASE_TILE_SIZE, BASE_TILE_SIZE);
        } else {
            drawProceduralObject(offscreenCtx, spriteName, screenX, screenY, BASE_TILE_SIZE);
        }
    }
}

function drawEntireWorldToOffscreen(): void {
    offscreenCtx.imageSmoothingEnabled = false;
    offscreenCtx.fillStyle = CANVAS_BG_COLOR;
    offscreenCtx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    for (var x = 0; x < X_TILES; x++) {
        for (var y = 0; y < Y_TILES; y++) {
            drawTileToOffscreen(x, y);
        }
    }
}



var DEBUG_DRAW = false;

// FPS Counter Variables
var lastFpsUpdate: number = performance.now();
var frameCount: number = 0;
var fps: number = 0;
var fpsElement: HTMLElement | null = null;

var drawBuckets: { [color: string]: number[] } = {};
var spriteImgDraws: HTMLImageElement[] = [];
var spriteXDraws: number[] = [];
var spriteYDraws: number[] = [];

var textValDraws: string[] = [];
var textXDraws: number[] = [];
var textYDraws: number[] = [];
var textColorDraws: string[] = [];
var textFontDraws: (string | undefined)[] = [];

var screenXCoords: number[] = new Array(200);
var screenYCoords: number[] = new Array(200);

function clearDrawBuffers(): void {
    for (var key in drawBuckets) {
        drawBuckets[key].length = 0;
    }
    spriteImgDraws.length = 0;
    spriteXDraws.length = 0;
    spriteYDraws.length = 0;
    textValDraws.length = 0;
    textXDraws.length = 0;
    textYDraws.length = 0;
    textColorDraws.length = 0;
    textFontDraws.length = 0;
}

var stockpileElements: { [key: string]: HTMLElement | null } = {};
function updateStockpileUI() {
    const groupEl = document.getElementById("stockpileGroup");
    if (groupEl) {
        if (activeStockpile) {
            groupEl.classList.remove("hidden");
        } else {
            groupEl.classList.add("hidden");
            return;
        }
    }

    const resources = ["wood", "fish", "stone", "wheat", "apple", "berry", "gold"];
    const labelEl = document.querySelector("#stockpileGroup label") as HTMLElement;
    if (labelEl && labelEl.innerText !== activeStockpileName) {
        labelEl.innerText = activeStockpileName;
    }
    for (const res of resources) {
        if (!stockpileElements[res]) {
            stockpileElements[res] = document.getElementById("stockpile" + res.charAt(0).toUpperCase() + res.slice(1));
        }
        const el = stockpileElements[res];
        if (el) {
            el.innerText = (activeStockpile && activeStockpile[res] !== undefined ? activeStockpile[res] : 0).toString();
        }
    }
}

// Main loop
var ticks: number = 0;
function mainProcess(): void {
    // Calculate FPS
    if (!fpsElement) {
        fpsElement = document.getElementById("fpsCounter");
    }
    var now = performance.now();
    frameCount++;
    if (now - lastFpsUpdate >= 500) {
        fps = Math.round((frameCount * 1000) / (now - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = now;
        if (fpsElement) {
            fpsElement.innerText = `${fps} FPS`;
            if (fps >= 50) {
                fpsElement.style.color = "#00ffcc";
                fpsElement.style.borderColor = "rgba(0, 255, 204, 0.3)";
            } else if (fps >= 30) {
                fpsElement.style.color = "#ffcc00";
                fpsElement.style.borderColor = "rgba(255, 204, 0, 0.3)";
            } else {
                fpsElement.style.color = "#ff3366";
                fpsElement.style.borderColor = "rgba(255, 51, 102, 0.3)";
            }
        }
    }

    if (!PAUSED) {
        updateStockpileUI();

        for (var i = 0; i < entities.length; i++) {
            var ent = entities[i];
            var e = ent.entity;
            var pos = ent.pos;

            // Handle death
            if (e.health <= 0 || (e.isLiving && e.ticksAlive >= e.maxAge)) {
                if (e.isLiving && e.ticksAlive >= e.maxAge) {
                    e.health = 0;
                    e.stateText = "Dead (Old Age)";
                }
                var oldTile = world[pos.x][pos.y];
                oldTile.removeEntity(oldTile.entities.indexOf(e));
                entities.splice(i, 1);
                i--;
                //@ts-ignore
                if (typeof TestTools !== "undefined") {
                    //@ts-ignore
                    TestTools.updateStats();
                    //@ts-ignore
                    if (TestTools.inspectedEntity === e) {
                        //@ts-ignore
                        TestTools.inspectedEntity = null;
                        //@ts-ignore
                        TestTools.updateInspector();
                    }
                }
                continue;
            }

            e.process();
            // Movement handler (Staggered to distribute heavy pathfinding load across speedGene-based frames)
            var moveDelay = Math.round(15 * (e.genome ? e.genome.speedGene : 1.0));
            if (e.move != null && (ticks + i) % moveDelay == 0) {
                var direction: Vector2 = e.move(pos.x, pos.y);
                if (direction.x != 0 || direction.y != 0) {
                    var targetX = pos.x + direction.x;
                    var targetY = pos.y + direction.y;
                    var targetTile = world[targetX] ? world[targetX][targetY] : undefined;
                    if (targetTile) {
                        var moveSuccess: boolean = targetTile.addEntity(e);
                        if (moveSuccess) {
                            var oldTile = world[pos.x][pos.y];
                            oldTile.removeEntity(oldTile.entities.indexOf(e)); // Removes the entity from the tile
                            pos.x = targetX;
                            pos.y = targetY;
                        }
                    }
                }
            }
            if (e.isLiving) {
                e.ticksAlive++;
            }
        }
    }

    // DONE: Draw the entities.
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.imageSmoothingEnabled = false; // Must be re-applied every frame — clearRect can reset it in some browsers
    clearDrawBuffers();

    var viewStartX = Math.max(0, Math.floor(CAMERA_OFFSET.x));
    var viewEndX = Math.min(X_TILES, Math.ceil(CAMERA_OFFSET.x + CANVAS_WIDTH / TILE_SIZE) + 1);
    var viewStartY = Math.max(0, Math.floor(CAMERA_OFFSET.y));
    var viewEndY = Math.min(Y_TILES, Math.ceil(CAMERA_OFFSET.y + CANVAS_HEIGHT / TILE_SIZE) + 1);

    if (DEBUG_DRAW) {
        // Pre-calculate screen X and Y coordinates to bypass Math.round inside nested loops
        var viewWidth = viewEndX - viewStartX;
        for (var i = 0; i < viewWidth; i++) {
            screenXCoords[i] = Math.round((viewStartX + i - CAMERA_OFFSET.x) * TILE_SIZE);
        }
        var viewHeight = viewEndY - viewStartY;
        for (var i = 0; i < viewHeight; i++) {
            screenYCoords[i] = Math.round((viewStartY + i - CAMERA_OFFSET.y) * TILE_SIZE);
        }

        for (var x = viewStartX; x < viewEndX; x++) {
            var column = world[x];
            if (!column) continue;
            var screenX = screenXCoords[x - viewStartX];
            for (var y = viewStartY; y < viewEndY; y++) {
                var worldTile = column[y];
                if (!worldTile) continue;
                var screenY = screenYCoords[y - viewStartY];

                var color: string | null = null;
                var tEntities = worldTile.entities;
                var entityLen = tEntities.length;
                if (entityLen != 0) {
                    color = "#0066ff";
                } else if (worldTile.worldObjects.length != 0) {
                    color = "gray";
                } else if (worldTile.canBeTraversed()) {
                    color = "#00d92f";
                } else {
                    color = "#d4002e";
                }

                if (!drawBuckets[color]) {
                    drawBuckets[color] = [];
                }
                drawBuckets[color].push(screenX, screenY);

                textValDraws.push(worldTile.items.length.toString());
                textXDraws.push(screenX + (TILE_SIZE / 2));
                textYDraws.push(screenY + (TILE_SIZE / 1.5));
                textColorDraws.push("black");
                textFontDraws.push(undefined);
            }
        }

        // Draw all backgrounds in batches by color to avoid fillStyle thrashing
        for (var c in drawBuckets) {
            var rects = drawBuckets[c];
            if (rects.length === 0) continue;
            ctx.fillStyle = c;
            for (var i = 0; i < rects.length; i += 2) {
                ctx.fillRect(rects[i], rects[i + 1], TILE_SIZE, TILE_SIZE);
            }
        }

        // Draw path tile highlights for all entities inside the viewport
        ctx.fillStyle = "rgba(255, 255, 0, 0.4)";
        ctx.beginPath();
        for (var i = 0; i < entities.length; i++) {
            var ent = entities[i];
            var e = ent.entity;
            var path = e.moveQueue;
            for (var p = 0; p < path.length; p++) {
                var node = path[p];
                if (node.x >= viewStartX && node.x < viewEndX && node.y >= viewStartY && node.y < viewEndY) {
                    var screenX = Math.round((node.x - CAMERA_OFFSET.x) * TILE_SIZE);
                    var screenY = Math.round((node.y - CAMERA_OFFSET.y) * TILE_SIZE);
                    ctx.rect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                }
            }
        }
        ctx.fill();

        // Draw concentric search rings for visible entities to reflect the ring search pattern (square concentric rings)
        ctx.strokeStyle = "rgba(0, 255, 204, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var i = 0; i < entities.length; i++) {
            var ent = entities[i];
            var pos = ent.pos;
            if (pos.x >= viewStartX && pos.x < viewEndX && pos.y >= viewStartY && pos.y < viewEndY) {
                var screenX = Math.round((pos.x - CAMERA_OFFSET.x) * TILE_SIZE);
                var screenY = Math.round((pos.y - CAMERA_OFFSET.y) * TILE_SIZE);

                // Draw concentric square search rings matching the Chebyshev distance search pattern
                ctx.rect(screenX - 3 * TILE_SIZE, screenY - 3 * TILE_SIZE, 7 * TILE_SIZE, 7 * TILE_SIZE);
                ctx.rect(screenX - 6 * TILE_SIZE, screenY - 6 * TILE_SIZE, 13 * TILE_SIZE, 13 * TILE_SIZE);
                ctx.rect(screenX - 10 * TILE_SIZE, screenY - 10 * TILE_SIZE, 21 * TILE_SIZE, 21 * TILE_SIZE);
            }
        }
        ctx.stroke();

        // Draw yellow dashed pathfinding lines along the entire A* path steps
        ctx.strokeStyle = "rgba(255, 240, 0, 0.95)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        for (var i = 0; i < entities.length; i++) {
            var ent = entities[i];
            var e = ent.entity;
            var pos = ent.pos;
            var path = e.moveQueue;
            if (path.length > 0) {
                var startX = Math.round((pos.x - CAMERA_OFFSET.x) * TILE_SIZE) + TILE_SIZE / 2;
                var startY = Math.round((pos.y - CAMERA_OFFSET.y) * TILE_SIZE) + TILE_SIZE / 2;
                ctx.moveTo(startX, startY);

                for (var p = 0; p < path.length; p++) {
                    var node = path[p];
                    var nextX = Math.round((node.x - CAMERA_OFFSET.x) * TILE_SIZE) + TILE_SIZE / 2;
                    var nextY = Math.round((node.y - CAMERA_OFFSET.y) * TILE_SIZE) + TILE_SIZE / 2;
                    ctx.lineTo(nextX, nextY);
                }
            }
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
    } else {
        // Fast path: blit terrain background and structures directly from the offscreen canvas
        var srcX = Math.round(CAMERA_OFFSET.x * BASE_TILE_SIZE);
        var srcY = Math.round(CAMERA_OFFSET.y * BASE_TILE_SIZE);
        var srcW = Math.round((CANVAS_WIDTH / TILE_SIZE) * BASE_TILE_SIZE);
        var srcH = Math.round((CANVAS_HEIGHT / TILE_SIZE) * BASE_TILE_SIZE);
        ctx.drawImage(
            offscreenCanvas,
            srcX, srcY, srcW, srcH,
            0, 0, CANVAS_WIDTH, CANVAS_HEIGHT
        );

        // Viewport culling loop over active entities (O(N) instead of scanning the full 2,304 tile grid)
        for (var i = 0; i < entities.length; i++) {
            var ent = entities[i];
            var pos = ent.pos;
            if (pos.x >= viewStartX && pos.x < viewEndX && pos.y >= viewStartY && pos.y < viewEndY) {
                var e = ent.entity;
                var screenX = Math.round((pos.x - CAMERA_OFFSET.x) * TILE_SIZE);
                var screenY = Math.round((pos.y - CAMERA_OFFSET.y) * TILE_SIZE);
                var cx = screenX + TILE_SIZE / 2;
                var cy = screenY + TILE_SIZE / 2;

                if (e.id === inspectedHouseOwnerId) {
                    ctx.beginPath();
                    ctx.arc(cx, cy, TILE_SIZE * 0.8, 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(255, 255, 0, 0.5)";
                    ctx.fill();
                    ctx.strokeStyle = "yellow";
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }

                // Draw entity background circle for high aesthetic readability
                ctx.beginPath();
                ctx.arc(cx, cy, TILE_SIZE * 0.42, 0, Math.PI * 2);
                if (e instanceof Woodcutter) {
                    ctx.fillStyle = "#ff7b7b"; // Soft red
                } else if (e instanceof Fisherman) {
                    ctx.fillStyle = "#7bc0ff"; // Soft blue
                } else if (e.constructor.name === "Miner") {
                    ctx.fillStyle = "#d0d0d0"; // Soft grey
                } else if (e.constructor.name === "Farmer") {
                    ctx.fillStyle = "#e5ff82"; // Soft yellow-green
                } else if (e.constructor.name === "Sheep") {
                    ctx.fillStyle = "#ffffff"; // Soft white
                } else if (e.constructor.name === "Cow") {
                    ctx.fillStyle = "#f5f5f5"; // Off-white
                } else if (e.constructor.name === "Wolf") {
                    ctx.fillStyle = "#666666"; // Dark grey
                } else {
                    ctx.fillStyle = "#ffdd80"; // Peach
                }
                ctx.fill();
                ctx.strokeStyle = "rgba(0,0,0,0.5)";
                ctx.lineWidth = 1;
                ctx.stroke();

                // Draw black cow spots procedurally
                if (e.constructor.name === "Cow") {
                    ctx.fillStyle = "#333333";
                    ctx.beginPath();
                    ctx.arc(cx - TILE_SIZE * 0.18, cy - TILE_SIZE * 0.15, TILE_SIZE * 0.12, 0, Math.PI * 2);
                    ctx.arc(cx + TILE_SIZE * 0.2, cy + TILE_SIZE * 0.12, TILE_SIZE * 0.14, 0, Math.PI * 2);
                    ctx.arc(cx - TILE_SIZE * 0.05, cy + TILE_SIZE * 0.2, TILE_SIZE * 0.1, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Build entity text display
                var letter = "?";
                var textCol = "black";
                if (e instanceof Human && e.professionLetter != "") {
                    letter = e.professionLetter;
                } else if (e.constructor.name === "Sheep") {
                    letter = "S";
                } else if (e.constructor.name === "Cow") {
                    letter = "C";
                    textCol = "#111111";
                } else if (e.constructor.name === "Wolf") {
                    letter = "X";
                    textCol = "#ff2222"; // Red X for wolf
                }

                textValDraws.push(letter);
                textXDraws.push(cx);
                textYDraws.push(cy + TILE_SIZE * 0.23);
                textColorDraws.push(textCol);
                textFontDraws.push(`bold ${Math.max(6, Math.round(TILE_SIZE * 0.6))}px sans-serif`);
            }
        }
    }

    // Draw all letters and item counts
    if (textValDraws.length > 0) {
        ctx.textAlign = "center";
        for (var i = 0; i < textValDraws.length; i++) {
            var font = textFontDraws[i];
            if (font) {
                ctx.font = font;
            } else {
                ctx.font = "10px sans-serif";
            }
            ctx.fillStyle = textColorDraws[i];
            ctx.fillText(textValDraws[i], textXDraws[i], textYDraws[i]);
        }
    }


    // Draws a red box around the mouse onto the TileMap that follows the mouse
    var hoveredTileX = Math.floor(mousePos.x / TILE_SIZE + CAMERA_OFFSET.x);
    var hoveredTileY = Math.floor(mousePos.y / TILE_SIZE + CAMERA_OFFSET.y);

    var testToolsPreviewDrawn = false;
    //@ts-ignore
    if (typeof TestTools !== "undefined") {
        //@ts-ignore
        testToolsPreviewDrawn = TestTools.drawPreview(hoveredTileX, hoveredTileY);
    }

    if (!testToolsPreviewDrawn) {
        ctx.strokeStyle = "red";
        ctx.strokeRect(
            Math.round((hoveredTileX - CAMERA_OFFSET.x) * TILE_SIZE),
            Math.round((hoveredTileY - CAMERA_OFFSET.y) * TILE_SIZE),
            TILE_SIZE,
            TILE_SIZE
        );
    }

    // For the world ticks
    if (!PAUSED) {
        ticks++;
        if (ticks == 1000000000) { // TO DO: Handle this properly, there's a better way to do this.
            ticks = 0;
        }

        //@ts-ignore
        if (typeof TestTools !== "undefined") {
            //@ts-ignore
            TestTools.recordPopulationSample();
        }

        // Rescue Spawner to prevent total extinction (runs every 300 ticks)
        if (ticks % 300 === 0) {
            // 1. Human Village Extinction Rescue
            for (let thPos of townHallPositions) {
                let villageHumans = entities.filter(d => d.entity instanceof Human &&
                    Math.max(Math.abs(d.pos.x - thPos.x), Math.abs(d.pos.y - thPos.y)) <= 45
                );

                if (villageHumans.length < 2 && entities.length < MAX_ENTITIES_LIMIT) {
                    let spawned = false;
                    for (let dx = -2; dx <= 2 && !spawned; dx++) {
                        for (let dy = -2; dy <= 2 && !spawned; dy++) {
                            if (dx === 0 && dy === 0) continue;
                            let vx = thPos.x + dx;
                            let vy = thPos.y + dy;
                            if (world[vx] && world[vx][vy]) {
                                let tile = world[vx][vy];
                                if (tile.canBeTraversed() && tile.entities.length < TILE_ENTITY_LIMIT && tile.worldObjects.length === 0) {
                                    let roll = Math.floor(Math.random() * 4);
                                    let villager: Human;
                                    if (roll === 0) villager = new Woodcutter();
                                    else if (roll === 1) villager = new Fisherman();
                                    else if (roll === 2) {
                                        //@ts-ignore
                                        villager = new Miner();
                                    } else {
                                        //@ts-ignore
                                        villager = new Farmer();
                                    }
                                    tile.addEntity(villager);
                                    entities.push({ entity: villager, pos: Vector2(vx, vy) });
                                    spawned = true;

                                    //@ts-ignore
                                    if (typeof TestTools !== "undefined") {
                                        //@ts-ignore
                                        TestTools.updateStats();
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // 2. Wild Animals Extinction Rescue
            let sheepCount = entities.filter(d => d.entity.constructor.name === "Sheep").length;
            let cowCount = entities.filter(d => d.entity.constructor.name === "Cow").length;
            let wolfCount = entities.filter(d => d.entity.constructor.name === "Wolf").length;

            if (sheepCount < 4 && entities.length < MAX_ENTITIES_LIMIT) {
                spawnWildAnimal("Sheep");
            }
            if (cowCount < 4 && entities.length < MAX_ENTITIES_LIMIT) {
                spawnWildAnimal("Cow");
            }
            if (wolfCount < 2 && entities.length < MAX_ENTITIES_LIMIT) {
                spawnWildAnimal("Wolf");
            }
        }
    }

    //@ts-ignore
    if (typeof TestTools !== "undefined") {
        //@ts-ignore
        TestTools.updateInspectorLive();
    }

    requestAnimationFrame(mainProcess);
}
declare var wasmBase64: string;

async function loadWasm() {
    let buffer: ArrayBuffer;
    try {
        if (typeof wasmBase64 !== "undefined") {
            const binaryString = atob(wasmBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            buffer = bytes.buffer;
        } else {
            const response = await fetch('build/release.wasm');
            buffer = await response.arrayBuffer();
        }
    } catch (e) {
        console.error("Failed to load WASM:", e);
        return;
    }

    const module = await WebAssembly.instantiate(buffer, {
        env: {
            abort: () => console.log("Abort called from wasm"),
            seed: () => Date.now() * Math.random()
        }
    });
    wasmExports = module.instance.exports;
    wasmMemory = wasmExports.memory;
    wasmExports.initWorld(X_TILES, Y_TILES);
    init();
    requestAnimationFrame(mainProcess);
}
loadWasm();

function spawnWildAnimal(type: string): void {
    let spawned = false;
    for (let attempts = 0; attempts < 100 && !spawned; attempts++) {
        let rx = Math.floor(Math.random() * X_TILES);
        let ry = Math.floor(Math.random() * Y_TILES);
        if (world[rx] && world[rx][ry]) {
            let tile = world[rx][ry];
            if (tile.type !== TileType.WATER && tile.type !== TileType.DARK_WATER && tile.entities.length < TILE_ENTITY_LIMIT && tile.worldObjects.length === 0) {
                let animal: Entity;
                if (type === "Sheep") {
                    //@ts-ignore
                    animal = new Sheep();
                } else if (type === "Cow") {
                    //@ts-ignore
                    animal = new Cow();
                } else {
                    //@ts-ignore
                    animal = new Wolf();
                }
                tile.addEntity(animal);
                entities.push({ entity: animal, pos: Vector2(rx, ry) });
                spawned = true;

                //@ts-ignore
                if (typeof TestTools !== "undefined") {
                    //@ts-ignore
                    TestTools.updateStats();
                }
            }
        }
    }
}