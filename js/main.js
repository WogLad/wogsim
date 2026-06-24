"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d", { alpha: false });
// CANVAS PROPERTIES
var CANVAS_WIDTH = window.innerWidth;
var CANVAS_HEIGHT = window.innerHeight;
const CANVAS_BG_COLOR = "#f0ffff";
const BASE_TILE_SIZE = 15;
var TILE_SIZE = 15;
const OUTLINE_THICKNESS = 2; // <DEPRECATED> Thickness of the lines that make up the box surrounding the mouse
// WORLD PROPERTIES
const RANDOM_WORLD_SEED = false;
const X_TILES = 320 * 3;
const Y_TILES = 180 * 3;
const WORLD_WIDTH = X_TILES * BASE_TILE_SIZE;
const WORLD_HEIGHT = Y_TILES * BASE_TILE_SIZE;
var CAMERA_OFFSET = Vector2(Math.floor(X_TILES / 2) - Math.floor(CANVAS_WIDTH / TILE_SIZE / 2), Math.floor(Y_TILES / 2) - Math.floor(CANVAS_HEIGHT / TILE_SIZE / 2));
const STARTING_VILLAGE_COUNT = 100;
var activeStockpile = null;
var activeStockpileName = "📦 Select a Town Hall to view Stockpile";
var STORAGE_POS = Vector2(Math.floor(X_TILES / 2), Math.floor(Y_TILES / 2));
var PAUSED = false;
var SIMULATION_SPEED = 1;
const TILE_ENTITY_LIMIT = 100;
const TILE_ITEM_LIMIT = 10;
var MOVEMENT_DELAY = 15;
const INVENTORY_MAX_CAPACITY = 20;
// Village settings and spawn configuration
var townHallPositions = [];
var HUMAN_SPAWN_INTERVAL = 100; // Tweak this value to change runtime spawn rate (lower = faster spawn)
var MAX_ENTITIES_LIMIT = 500000; // Maximum number of concurrent entities in the world
var RESOURCE_SPAWN_MULTIPLIER = 1.0; // Multiplier for natural resource spawning density
// Cached entity type counters for O(1) population checks (updated on spawn/death)
var entityCounts = {
    woodcutter: 0,
    fisherman: 0,
    miner: 0,
    farmer: 0,
    sheep: 0,
    cow: 0,
    wolf: 0,
    total: 0
};
function incrementEntityCount(e) {
    entityCounts.total++;
    switch (e.entityType) {
        case ENTITY_TYPE_WOODCUTTER:
            entityCounts.woodcutter++;
            break;
        case ENTITY_TYPE_FISHERMAN:
            entityCounts.fisherman++;
            break;
        case ENTITY_TYPE_MINER:
            entityCounts.miner++;
            break;
        case ENTITY_TYPE_FARMER:
            entityCounts.farmer++;
            break;
        case ENTITY_TYPE_SHEEP:
            entityCounts.sheep++;
            break;
        case ENTITY_TYPE_COW:
            entityCounts.cow++;
            break;
        case ENTITY_TYPE_WOLF:
            entityCounts.wolf++;
            break;
    }
}
function decrementEntityCount(e) {
    entityCounts.total--;
    switch (e.entityType) {
        case ENTITY_TYPE_WOODCUTTER:
            entityCounts.woodcutter--;
            break;
        case ENTITY_TYPE_FISHERMAN:
            entityCounts.fisherman--;
            break;
        case ENTITY_TYPE_MINER:
            entityCounts.miner--;
            break;
        case ENTITY_TYPE_FARMER:
            entityCounts.farmer--;
            break;
        case ENTITY_TYPE_SHEEP:
            entityCounts.sheep--;
            break;
        case ENTITY_TYPE_COW:
            entityCounts.cow--;
            break;
        case ENTITY_TYPE_WOLF:
            entityCounts.wolf--;
            break;
    }
}
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
    var rect = e.target.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; //x position within the element.
    mousePos.y = e.clientY - rect.top; //y position within the element.
};
var inspectedHouseOwnerId = null;
var entities = [];
var world = [];
var wasmExports = null;
var wasmMemory = null;
function findWasmPath(startX, startY, endX, endY, outBuffer) {
    if (!wasmExports || !wasmMemory)
        return 0;
    var success = wasmExports.findPath(startX, startY, endX, endY);
    if (!success)
        return 0;
    var length = wasmExports.getResultPathLength();
    if (length == 0)
        return 0;
    // Max length supported by outBuffer is outBuffer.length / 2
    var safeLength = Math.min(length, Math.floor(outBuffer.length / 2));
    var ptr = wasmExports.getResultPathPointer();
    // Set the buffer natively without creating intermediate JS arrays
    var wasmView = new Int32Array(wasmMemory.buffer, ptr, safeLength * 2);
    outBuffer.set(wasmView, 0);
    return safeLength;
}
var sprites = new Map();
var offscreenCanvas = document.createElement("canvas");
var offscreenCtx = offscreenCanvas.getContext("2d", { alpha: false });
offscreenCanvas.width = WORLD_WIDTH;
offscreenCanvas.height = WORLD_HEIGHT;
function getImgElement(src, onLoadCallback) {
    var el = document.createElement("img");
    if (onLoadCallback) {
        el.onload = onLoadCallback;
    }
    el.src = src;
    return el;
}
function drawRect(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}
function drawText(text, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}
function setCameraOffset(x, y) {
    var maxOffsetX = X_TILES - CANVAS_WIDTH / TILE_SIZE;
    var maxOffsetY = Y_TILES - CANVAS_HEIGHT / TILE_SIZE;
    if (x < 0)
        x = 0;
    if (x > maxOffsetX)
        x = maxOffsetX;
    if (y < 0)
        y = 0;
    if (y > maxOffsetY)
        y = maxOffsetY;
    CAMERA_OFFSET.x = x;
    CAMERA_OFFSET.y = y;
    return true;
}
function init() {
    ctx.textAlign = "center";
    ctx.imageSmoothingEnabled = false;
    drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_BG_COLOR);
    var usePreprocessed = !RANDOM_WORLD_SEED;
    var decodedTypes = [];
    if (usePreprocessed) {
        if (typeof PREPROCESSED_TERRAIN === "undefined") {
            console.warn("PREPROCESSED_TERRAIN not found! Falling back to random generation.");
            usePreprocessed = false;
        }
        else {
            let totalTiles = 0;
            const runs = PREPROCESSED_TERRAIN.split(",");
            for (let i = 0; i < runs.length; i++) {
                const parts = runs[i].split("_");
                if (parts.length === 2) {
                    totalTiles += parseInt(parts[1]);
                }
            }
            if (totalTiles !== X_TILES * Y_TILES) {
                console.warn(`PREPROCESSED_TERRAIN size (${totalTiles}) does not match current world size (${X_TILES * Y_TILES}). Falling back to random generation.`);
                usePreprocessed = false;
            }
            else {
                const TILE_TYPES = [
                    TileType.DARK_GRASS,
                    TileType.GRASS,
                    TileType.GROUND,
                    TileType.WATER,
                    TileType.DARK_WATER,
                    TileType.SAND,
                    TileType.DESERT,
                    TileType.SWAMP,
                    TileType.SNOW
                ];
                for (let i = 0; i < runs.length; i++) {
                    const parts = runs[i].split("_");
                    const typeIndex = parseInt(parts[0]);
                    const count = parseInt(parts[1]);
                    const typeStr = TILE_TYPES[typeIndex];
                    for (let c = 0; c < count; c++) {
                        decodedTypes.push(typeStr);
                    }
                }
            }
        }
    }
    if (!usePreprocessed) {
        wasmExports.generateNoiseWorldWasm(Math.floor(Math.random() * 10000));
    }
    var tileTypePtr = wasmExports.getTileTypePointer();
    var tileTypeArray = new Int32Array(wasmMemory.buffer, tileTypePtr, X_TILES * Y_TILES);
    // Initialise the 2D world array
    var decodedIdx = 0;
    const TILE_TYPES = [
        TileType.DARK_GRASS,
        TileType.GRASS,
        TileType.GROUND,
        TileType.WATER,
        TileType.DARK_WATER,
        TileType.SAND,
        TileType.DESERT,
        TileType.SWAMP,
        TileType.SNOW
    ];
    var objPtr = wasmExports.getTileObjectPointer();
    var objArr = new Int32Array(wasmMemory.buffer, objPtr, X_TILES * Y_TILES);
    var itemPtr = wasmExports.getTileItemPointer();
    var itemArr = new Int32Array(wasmMemory.buffer, itemPtr, X_TILES * Y_TILES);
    const OBJ_NAMES = [
        "", "tree", "pine_tree", "palm_tree", "cactus", "shrub", "wheat", "reed",
        "stone", "campfire", "town_hall", "house", "storage_pile", "fence", "fish"
    ];
    const ITEM_NAMES = [
        "", "Apple", "Berry", "Shell", "Wood"
    ];
    for (var x = 0; x < X_TILES; x++) {
        world[x] = [];
        for (var y = 0; y < Y_TILES; y++) {
            var tile;
            let idx = x * Y_TILES + y;
            if (usePreprocessed) {
                let typeStr = decodedTypes[decodedIdx++];
                tile = new WorldTile(x, y, typeStr);
                // Also write to WASM memory to keep it in sync for future WASM use
                tileTypeArray[idx] = TILE_TYPES.indexOf(typeStr);
            }
            else {
                let typeInt = tileTypeArray[idx];
                tile = new WorldTile(x, y, TILE_TYPES[typeInt]);
            }
            world[x][y] = tile;
        }
    }
    if (usePreprocessed) {
        // Spawn resources in WASM since we just populated the tile types
        wasmExports.spawnAllResourcesWasm(RESOURCE_SPAWN_MULTIPLIER);
    }
    // Sync WASM generated resources into JS WorldTiles
    for (var x = 0; x < X_TILES; x++) {
        for (var y = 0; y < Y_TILES; y++) {
            let idx = x * Y_TILES + y;
            let tile = world[x][y];
            // Sync objects from WASM
            let objId = objArr[idx];
            if (objId > 0)
                tile.worldObjects.push(new WorldObject(OBJ_NAMES[objId]));
            let itemId = itemArr[idx];
            if (itemId > 0)
                tile.items.push(new Item(ITEM_NAMES[itemId]));
            // Initial animal spawning logic (JS-based for now)
            if (tile.type != TileType.WATER && tile.type != TileType.DARK_WATER) {
                var spawnRoll = Math.random();
                if (spawnRoll < 0.0007) { // 0.07% chance to spawn a Sheep
                    //@ts-ignore
                    var s = new Sheep();
                    tile.addEntity(s);
                    entities.push({ entity: s, pos: Vector2(x, y) });
                    incrementEntityCount(s);
                }
                else if (spawnRoll < 0.0014) { // 0.07% chance to spawn a Cow
                    //@ts-ignore
                    var c = new Cow();
                    tile.addEntity(c);
                    entities.push({ entity: c, pos: Vector2(x, y) });
                    incrementEntityCount(c);
                }
                else if (spawnRoll < 0.0017) { // 0.03% chance to spawn a Wolf
                    //@ts-ignore
                    var w = new Wolf();
                    tile.addEntity(w);
                    entities.push({ entity: w, pos: Vector2(x, y) });
                    incrementEntityCount(w);
                }
            }
        }
    }
    // Sync the A* Grid to WASM (Pre-village)
    for (var x = 0; x < X_TILES; x++) {
        for (var y = 0; y < Y_TILES; y++) {
            wasmExports.setGridWeight(x, y, Number(world[x][y].canBeTraversed()));
        }
    }
    // Generate 50 village settlements across the map using WASM
    wasmExports.generateVillagesWasm(STARTING_VILLAGE_COUNT);
    var genSize = wasmExports.getGenBufferSize();
    var genPtr = wasmExports.getGenBufferPointer();
    var genArray = new Int32Array(wasmMemory.buffer, genPtr, genSize * 3);
    for (var i = 0; i < genSize; i++) {
        var cmd = genArray[i * 3];
        var gx = genArray[i * 3 + 1];
        var gy = genArray[i * 3 + 2];
        var tile = world[gx][gy];
        if (cmd === 0) { // TownHall
            townHallPositions.push(Vector2(gx, gy));
            tile.worldObjects = [new WorldObject("town_hall")];
        }
        else if (cmd === 1) { // Campfire
            tile.worldObjects = [new WorldObject("campfire")];
        }
        else if (cmd === 2) { // Ground
            tile.type = TileType.GROUND;
            tile.worldObjects = tile.worldObjects.filter(o => o.name === "town_hall" || o.name === "campfire" || o.name === "house");
            tile.updateTraversable();
        }
        else if (cmd === 3) { // Fence
            tile.worldObjects = [new WorldObject("fence")];
            tile.items = [];
            tile.updateTraversable();
        }
        else if (cmd >= 4 && cmd <= 9) { // Entities
            tile.entities = [];
            tile.worldObjects = [];
            let ent;
            //@ts-ignore
            if (cmd === 4)
                ent = new Sheep();
            //@ts-ignore
            else if (cmd === 5)
                ent = new Cow();
            else if (cmd === 6)
                ent = new Woodcutter();
            else if (cmd === 7)
                ent = new Fisherman();
            //@ts-ignore
            else if (cmd === 8)
                ent = new Miner();
            //@ts-ignore
            else if (cmd === 9)
                ent = new Farmer();
            if (ent) {
                tile.addEntity(ent);
                entities.push({ entity: ent, pos: Vector2(gx, gy) });
                incrementEntityCount(ent);
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
function drawProceduralObject(ctx, name, x, y, size) {
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
function drawTileToOffscreen(x, y) {
    var tile = world[x] ? world[x][y] : undefined;
    if (!tile)
        return;
    var screenX = x * BASE_TILE_SIZE;
    var screenY = y * BASE_TILE_SIZE;
    // Draw tile terrain color (ignore entities since they are dynamic)
    offscreenCtx.fillStyle = tile.type;
    offscreenCtx.fillRect(screenX, screenY, BASE_TILE_SIZE, BASE_TILE_SIZE);
    // Draw worldObject sprite
    var worldObjs = tile.worldObjects;
    var objLen = worldObjs.length;
    if (objLen > 0) {
        var spriteName = worldObjs[objLen - 1].name;
        var spriteImg = sprites.get(spriteName);
        if (spriteImg && spriteImg.complete) {
            offscreenCtx.drawImage(spriteImg, screenX, screenY, BASE_TILE_SIZE, BASE_TILE_SIZE);
        }
        else {
            drawProceduralObject(offscreenCtx, spriteName, screenX, screenY, BASE_TILE_SIZE);
        }
    }
}
function drawEntireWorldToOffscreen() {
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
var lastFpsUpdate = performance.now();
var frameCount = 0;
var fps = 0;
var fpsElement = null;
var drawBuckets = {};
var spriteImgDraws = [];
var spriteXDraws = [];
var spriteYDraws = [];
var textValDraws = [];
var textXDraws = [];
var textYDraws = [];
var textColorDraws = [];
var textFontDraws = [];
var screenXCoords = new Array(200);
var screenYCoords = new Array(200);
function clearDrawBuffers() {
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
var stockpileElements = {};
function updateStockpileUI() {
    const groupEl = document.getElementById("stockpileGroup");
    if (groupEl) {
        if (activeStockpile) {
            groupEl.classList.remove("hidden");
        }
        else {
            groupEl.classList.add("hidden");
            return;
        }
    }
    const resources = [
        "wood", "fish", "stone", "wheat", "apple", "berry", "gold",
        "tree_seed", "pine_seed", "palm_seed", "wheat_seed", "shrub_seed", "cactus_seed"
    ];
    const labelEl = document.querySelector("#stockpileGroup label");
    if (labelEl && labelEl.innerText !== activeStockpileName) {
        labelEl.innerText = activeStockpileName;
    }
    for (const res of resources) {
        if (!stockpileElements[res]) {
            // Mapping stockpile resource key to HTML element ID, e.g. "tree_seed" -> "stockpileTreeSeed"
            const idSuffix = res.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
            stockpileElements[res] = document.getElementById("stockpile" + idSuffix);
        }
        const el = stockpileElements[res];
        if (el) {
            el.innerText = (activeStockpile && activeStockpile[res] !== undefined ? activeStockpile[res] : 0).toString();
        }
    }
}
// Main loop
var ticks = 0;
function mainProcess() {
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
            }
            else if (fps >= 30) {
                fpsElement.style.color = "#ffcc00";
                fpsElement.style.borderColor = "rgba(255, 204, 0, 0.3)";
            }
            else {
                fpsElement.style.color = "#ff3366";
                fpsElement.style.borderColor = "rgba(255, 51, 102, 0.3)";
            }
        }
    }
    if (!PAUSED) {
        updateStockpileUI();
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
            if (!column)
                continue;
            var screenX = screenXCoords[x - viewStartX];
            for (var y = viewStartY; y < viewEndY; y++) {
                var worldTile = column[y];
                if (!worldTile)
                    continue;
                var screenY = screenYCoords[y - viewStartY];
                var color = null;
                var tEntities = worldTile.entities;
                var entityLen = tEntities.length;
                if (entityLen != 0) {
                    color = "#0066ff";
                }
                else if (worldTile.worldObjects.length != 0) {
                    color = "gray";
                }
                else if (worldTile.canBeTraversed()) {
                    color = "#00d92f";
                }
                else {
                    color = "#d4002e";
                }
                if (!drawBuckets[color]) {
                    drawBuckets[color] = [];
                }
                drawBuckets[color].push(screenX, screenY);
                textValDraws.push(worldTile.entities.length.toString());
                textXDraws.push(screenX + (TILE_SIZE / 2));
                textYDraws.push(screenY + (TILE_SIZE / 1.5));
                textColorDraws.push("black");
                textFontDraws.push(undefined);
            }
        }
        // Draw all backgrounds in batches by color to avoid fillStyle thrashing
        for (var c in drawBuckets) {
            var rects = drawBuckets[c];
            if (rects.length === 0)
                continue;
            ctx.fillStyle = c;
            for (var i = 0; i < rects.length; i += 2) {
                ctx.fillRect(rects[i], rects[i + 1], TILE_SIZE, TILE_SIZE);
            }
        }
        // Draw path tile highlights for all entities inside the viewport
        ctx.fillStyle = "rgba(255, 255, 0, 0.4)";
        ctx.beginPath();
        for (var x = Math.max(0, viewStartX); x <= Math.min(X_TILES - 1, viewEndX); x++) {
            for (var y = Math.max(0, viewStartY); y <= Math.min(Y_TILES - 1, viewEndY); y++) {
                var tileEntities = world[x][y].entities;
                for (var i = 0; i < tileEntities.length; i++) {
                    var e = tileEntities[i];
                    var pathBuffer = e.moveQueue;
                    var pathLength = e.moveQueueLength;
                    for (var p = 0; p < pathLength; p++) {
                        var nodeX = pathBuffer[p * 2];
                        var nodeY = pathBuffer[p * 2 + 1];
                        if (nodeX >= viewStartX && nodeX < viewEndX && nodeY >= viewStartY && nodeY < viewEndY) {
                            var screenX = Math.round((nodeX - CAMERA_OFFSET.x) * TILE_SIZE);
                            var screenY = Math.round((nodeY - CAMERA_OFFSET.y) * TILE_SIZE);
                            ctx.rect(screenX, screenY, TILE_SIZE, TILE_SIZE);
                        }
                    }
                }
            }
        }
        ctx.fill();
        // Draw concentric search rings for visible entities to reflect the ring search pattern (square concentric rings)
        ctx.strokeStyle = "rgba(0, 255, 204, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var x = Math.max(0, viewStartX); x <= Math.min(X_TILES - 1, viewEndX); x++) {
            for (var y = Math.max(0, viewStartY); y <= Math.min(Y_TILES - 1, viewEndY); y++) {
                var tileEntities = world[x][y].entities;
                for (var i = 0; i < tileEntities.length; i++) {
                    var screenX = Math.round((x - CAMERA_OFFSET.x) * TILE_SIZE);
                    var screenY = Math.round((y - CAMERA_OFFSET.y) * TILE_SIZE);
                    // Draw concentric square search rings matching the Chebyshev distance search pattern
                    ctx.rect(screenX - 3 * TILE_SIZE, screenY - 3 * TILE_SIZE, 7 * TILE_SIZE, 7 * TILE_SIZE);
                    ctx.rect(screenX - 6 * TILE_SIZE, screenY - 6 * TILE_SIZE, 13 * TILE_SIZE, 13 * TILE_SIZE);
                    ctx.rect(screenX - 10 * TILE_SIZE, screenY - 10 * TILE_SIZE, 21 * TILE_SIZE, 21 * TILE_SIZE);
                }
            }
        }
        ctx.stroke();
        // Draw yellow dashed pathfinding lines along the entire A* path steps
        ctx.strokeStyle = "rgba(255, 240, 0, 0.95)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 3]);
        ctx.beginPath();
        for (var x = Math.max(0, viewStartX); x <= Math.min(X_TILES - 1, viewEndX); x++) {
            for (var y = Math.max(0, viewStartY); y <= Math.min(Y_TILES - 1, viewEndY); y++) {
                var tileEntities = world[x][y].entities;
                for (var i = 0; i < tileEntities.length; i++) {
                    var e = tileEntities[i];
                    var pathBuffer = e.moveQueue;
                    var pathLength = e.moveQueueLength;
                    if (pathLength > 0) {
                        var startX = Math.round((x - CAMERA_OFFSET.x) * TILE_SIZE) + TILE_SIZE / 2;
                        var startY = Math.round((y - CAMERA_OFFSET.y) * TILE_SIZE) + TILE_SIZE / 2;
                        ctx.moveTo(startX, startY);
                        for (var p = 0; p < pathLength; p++) {
                            var nodeX = pathBuffer[p * 2];
                            var nodeY = pathBuffer[p * 2 + 1];
                            var nextX = Math.round((nodeX - CAMERA_OFFSET.x) * TILE_SIZE) + TILE_SIZE / 2;
                            var nextY = Math.round((nodeY - CAMERA_OFFSET.y) * TILE_SIZE) + TILE_SIZE / 2;
                            ctx.lineTo(nextX, nextY);
                        }
                    }
                }
            }
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
    }
    else {
        // Fast path: blit terrain background and structures directly from the offscreen canvas
        var srcX = Math.round(CAMERA_OFFSET.x * BASE_TILE_SIZE);
        var srcY = Math.round(CAMERA_OFFSET.y * BASE_TILE_SIZE);
        var srcW = Math.round((CANVAS_WIDTH / TILE_SIZE) * BASE_TILE_SIZE);
        var srcH = Math.round((CANVAS_HEIGHT / TILE_SIZE) * BASE_TILE_SIZE);
        ctx.drawImage(offscreenCanvas, srcX, srcY, srcW, srcH, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Viewport culling loop over active tiles (O(V) instead of O(N) over all entities)
        // Skip entity drawing when zoomed out so far that entities are sub-pixel
        if (TILE_SIZE >= 4) {
            var entityFont = `bold ${Math.max(6, Math.round(TILE_SIZE * 0.6))}px sans-serif`;
            for (var x = Math.max(0, viewStartX); x <= Math.min(X_TILES - 1, viewEndX); x++) {
                for (var y = Math.max(0, viewStartY); y <= Math.min(Y_TILES - 1, viewEndY); y++) {
                    var tileEntities = world[x][y].entities;
                    for (var i = 0; i < tileEntities.length; i++) {
                        var e = tileEntities[i];
                        var screenX = Math.round((x - CAMERA_OFFSET.x) * TILE_SIZE);
                        var screenY = Math.round((y - CAMERA_OFFSET.y) * TILE_SIZE);
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
                        var eType = e.entityType;
                        if (eType === ENTITY_TYPE_WOODCUTTER) {
                            ctx.fillStyle = "#ff7b7b"; // Soft red
                        }
                        else if (eType === ENTITY_TYPE_FISHERMAN) {
                            ctx.fillStyle = "#7bc0ff"; // Soft blue
                        }
                        else if (eType === ENTITY_TYPE_MINER) {
                            ctx.fillStyle = "#d0d0d0"; // Soft grey
                        }
                        else if (eType === ENTITY_TYPE_FARMER) {
                            ctx.fillStyle = "#e5ff82"; // Soft yellow-green
                        }
                        else if (eType === ENTITY_TYPE_SHEEP) {
                            ctx.fillStyle = "#ffffff"; // Soft white
                        }
                        else if (eType === ENTITY_TYPE_COW) {
                            ctx.fillStyle = "#f5f5f5"; // Off-white
                        }
                        else if (eType === ENTITY_TYPE_WOLF) {
                            ctx.fillStyle = "#666666"; // Dark grey
                        }
                        else {
                            ctx.fillStyle = "#ffdd80"; // Peach
                        }
                        ctx.fill();
                        ctx.strokeStyle = "rgba(0,0,0,0.5)";
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        // Draw black cow spots procedurally
                        if (eType === ENTITY_TYPE_COW) {
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
                        }
                        else if (eType === ENTITY_TYPE_SHEEP) {
                            letter = "S";
                        }
                        else if (eType === ENTITY_TYPE_COW) {
                            letter = "C";
                            textCol = "#111111";
                        }
                        else if (eType === ENTITY_TYPE_WOLF) {
                            letter = "X";
                            textCol = "#ff2222"; // Red X for wolf
                        }
                        textValDraws.push(letter);
                        textXDraws.push(cx);
                        textYDraws.push(cy + TILE_SIZE * 0.23);
                        textColorDraws.push(textCol);
                        textFontDraws.push(entityFont);
                    }
                }
            }
        } // end TILE_SIZE >= 4 check
    }
    // Draw all letters and item counts
    if (textValDraws.length > 0) {
        ctx.textAlign = "center";
        for (var i = 0; i < textValDraws.length; i++) {
            var font = textFontDraws[i];
            if (font) {
                ctx.font = font;
            }
            else {
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
        ctx.strokeRect(Math.round((hoveredTileX - CAMERA_OFFSET.x) * TILE_SIZE), Math.round((hoveredTileY - CAMERA_OFFSET.y) * TILE_SIZE), TILE_SIZE, TILE_SIZE);
    }
    // For the world ticks
    if (!PAUSED) {
        for (let speedStep = 0; speedStep < SIMULATION_SPEED; speedStep++) {
            // 1. Update entities
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
                    var tileIdx = oldTile.entities.indexOf(e);
                    if (tileIdx !== -1) {
                        // Swap-and-pop for tile entities array
                        var lastIdx = oldTile.entities.length - 1;
                        if (tileIdx !== lastIdx) {
                            oldTile.entities[tileIdx] = oldTile.entities[lastIdx];
                        }
                        oldTile.entities.length = lastIdx;
                    }
                    // Swap-and-pop for global entities array (O(1) instead of O(N) splice)
                    var lastGlobal = entities.length - 1;
                    if (i !== lastGlobal) {
                        entities[i] = entities[lastGlobal];
                    }
                    entities.length = lastGlobal;
                    i--;
                    decrementEntityCount(e);
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
                // Movement handler (Staggered to distribute heavy pathfinding load across speedGene-based frames)
                if (e.moveDelay === undefined) {
                    var baseDelay = 15;
                    if (entities.length > 30000)
                        baseDelay = 60;
                    else if (entities.length > 20000)
                        baseDelay = 30;
                    else if (entities.length > 10000)
                        baseDelay = 20;
                    e.moveDelay = Math.round(baseDelay * (e.genome ? e.genome.speedGene : 1.0));
                }
                if (e.move != null && (ticks + i) % e.moveDelay == 0) {
                    var direction = e.move(pos.x, pos.y);
                    if (direction.x != 0 || direction.y != 0) {
                        var targetX = pos.x + direction.x;
                        var targetY = pos.y + direction.y;
                        var targetTile = world[targetX] ? world[targetX][targetY] : undefined;
                        if (targetTile) {
                            var moveSuccess = targetTile.addEntity(e);
                            if (moveSuccess) {
                                var oldTile = world[pos.x][pos.y];
                                var rmIdx = oldTile.entities.indexOf(e);
                                if (rmIdx !== -1) {
                                    // Swap-and-pop for tile entity removal
                                    var lastIdx = oldTile.entities.length - 1;
                                    if (rmIdx !== lastIdx) {
                                        oldTile.entities[rmIdx] = oldTile.entities[lastIdx];
                                    }
                                    oldTile.entities.length = lastIdx;
                                }
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
            // 2. World ticks increment and spawner checks
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
                var totalHumans = entityCounts.woodcutter + entityCounts.fisherman + entityCounts.miner + entityCounts.farmer;
                if (totalHumans < townHallPositions.length * 4) {
                    // Only do per-village checks when human count is very low
                    for (let thIdx = 0; thIdx < townHallPositions.length; thIdx++) {
                        let thPos = townHallPositions[thIdx];
                        // Count nearby humans with a quick scan of entities near this town hall
                        let nearbyHumans = 0;
                        for (let ei = 0; ei < entities.length && nearbyHumans < 2; ei++) {
                            var d = entities[ei];
                            if (d.entity instanceof Human &&
                                Math.abs(d.pos.x - thPos.x) <= 45 &&
                                Math.abs(d.pos.y - thPos.y) <= 45) {
                                nearbyHumans++;
                            }
                        }
                        if (nearbyHumans < 2 && entities.length < MAX_ENTITIES_LIMIT) {
                            let spawned = false;
                            for (let dx = -2; dx <= 2 && !spawned; dx++) {
                                for (let dy = -2; dy <= 2 && !spawned; dy++) {
                                    if (dx === 0 && dy === 0)
                                        continue;
                                    let vx = thPos.x + dx;
                                    let vy = thPos.y + dy;
                                    if (world[vx] && world[vx][vy]) {
                                        let tile = world[vx][vy];
                                        if (tile.canBeTraversed() && tile.entities.length < TILE_ENTITY_LIMIT && tile.worldObjects.length === 0) {
                                            let roll = Math.floor(Math.random() * 4);
                                            let villager;
                                            if (roll === 0)
                                                villager = new Woodcutter();
                                            else if (roll === 1)
                                                villager = new Fisherman();
                                            else if (roll === 2) {
                                                //@ts-ignore
                                                villager = new Miner();
                                            }
                                            else {
                                                //@ts-ignore
                                                villager = new Farmer();
                                            }
                                            tile.addEntity(villager);
                                            entities.push({ entity: villager, pos: Vector2(vx, vy) });
                                            incrementEntityCount(villager);
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
                }
                // 2. Wild Animals Extinction Rescue (using cached counters — O(1))
                if (entityCounts.sheep < 15 && entities.length < MAX_ENTITIES_LIMIT) {
                    spawnWildAnimalPair("Sheep");
                }
                if (entityCounts.cow < 15 && entities.length < MAX_ENTITIES_LIMIT) {
                    spawnWildAnimalPair("Cow");
                }
                if (entityCounts.wolf < 8 && entities.length < MAX_ENTITIES_LIMIT) {
                    spawnWildAnimalPair("Wolf");
                }
            }
            // Resource Regeneration (runs every 100 ticks)
            if (ticks % 100 === 0) {
                wasmExports.regenerateResourcesWasm(RESOURCE_SPAWN_MULTIPLIER);
                // Temporary sync back to JS WorldTile until Phase 2 is complete
                const OBJ_NAMES = [
                    "", "tree", "pine_tree", "palm_tree", "cactus", "shrub", "wheat", "reed",
                    "stone", "campfire", "town_hall", "house", "storage_pile", "fence", "fish"
                ];
                const ITEM_NAMES = [
                    "", "Apple", "Berry", "Shell", "Wood"
                ];
                var objPtr = wasmExports.getTileObjectPointer();
                var objArr = new Int32Array(wasmMemory.buffer, objPtr, X_TILES * Y_TILES);
                var itemPtr = wasmExports.getTileItemPointer();
                var itemArr = new Int32Array(wasmMemory.buffer, itemPtr, X_TILES * Y_TILES);
                for (let x = 0; x < X_TILES; x++) {
                    for (let y = 0; y < Y_TILES; y++) {
                        let idx = x * Y_TILES + y;
                        let tile = world[x][y];
                        let objId = objArr[idx];
                        if (objId > 0 && tile.worldObjects.length === 0) {
                            tile.worldObjects.push(new WorldObject(OBJ_NAMES[objId]));
                            //@ts-ignore
                            if (typeof drawTileToOffscreen === "function")
                                drawTileToOffscreen(x, y);
                        }
                        let itemId = itemArr[idx];
                        if (itemId > 0 && tile.items.length === 0) {
                            tile.items.push(new Item(ITEM_NAMES[itemId]));
                            //@ts-ignore
                            if (typeof drawTileToOffscreen === "function")
                                drawTileToOffscreen(x, y);
                        }
                    }
                }
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
function loadWasm() {
    return __awaiter(this, void 0, void 0, function* () {
        let buffer;
        try {
            if (typeof wasmBase64 !== "undefined") {
                const binaryString = atob(wasmBase64);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                buffer = bytes.buffer;
            }
            else {
                const response = yield fetch('build/release.wasm');
                buffer = yield response.arrayBuffer();
            }
        }
        catch (e) {
            console.error("Failed to load WASM:", e);
            return;
        }
        const module = yield WebAssembly.instantiate(buffer, {
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
    });
}
loadWasm();
function spawnWildAnimalPair(type) {
    let spawned = false;
    for (let attempts = 0; attempts < 100 && !spawned; attempts++) {
        let rx = Math.floor(Math.random() * X_TILES);
        let ry = Math.floor(Math.random() * Y_TILES);
        if (world[rx] && world[rx][ry]) {
            let tile = world[rx][ry];
            if (tile.type !== TileType.WATER && tile.type !== TileType.DARK_WATER && tile.entities.length < TILE_ENTITY_LIMIT && tile.worldObjects.length === 0) {
                // Find a nearby tile for the partner
                let partnerTile = null;
                let px = 0, py = 0;
                let dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
                for (let dir of dirs) {
                    let tx = rx + dir[0];
                    let ty = ry + dir[1];
                    if (world[tx] && world[tx][ty]) {
                        let t = world[tx][ty];
                        if (t.type !== TileType.WATER && t.type !== TileType.DARK_WATER && t.entities.length < TILE_ENTITY_LIMIT && t.worldObjects.length === 0) {
                            partnerTile = t;
                            px = tx;
                            py = ty;
                            break;
                        }
                    }
                }
                if (partnerTile) {
                    let animal1;
                    let animal2;
                    if (type === "Sheep") {
                        //@ts-ignore
                        animal1 = new Sheep();
                        //@ts-ignore
                        animal2 = new Sheep();
                    }
                    else if (type === "Cow") {
                        //@ts-ignore
                        animal1 = new Cow();
                        //@ts-ignore
                        animal2 = new Cow();
                    }
                    else {
                        //@ts-ignore
                        animal1 = new Wolf();
                        //@ts-ignore
                        animal2 = new Wolf();
                    }
                    tile.addEntity(animal1);
                    entities.push({ entity: animal1, pos: Vector2(rx, ry) });
                    incrementEntityCount(animal1);
                    partnerTile.addEntity(animal2);
                    entities.push({ entity: animal2, pos: Vector2(px, py) });
                    incrementEntityCount(animal2);
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
