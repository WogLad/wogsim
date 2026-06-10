var canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
var ctx: CanvasRenderingContext2D = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;

// CANVAS PROPERTIES
const CANVAS_WIDTH: number = 960;
const CANVAS_HEIGHT: number = 540;
const CANVAS_BG_COLOR: string = "#f0ffff";
const TILE_SIZE: number = 15;
const OUTLINE_THICKNESS = 2; // <DEPRECATED> Thickness of the lines that make up the box surrounding the mouse
// WORLD PROPERTIES
const WORLD_WIDTH: number = 960 * 5;
const WORLD_HEIGHT: number = 540 * 5;
const X_TILES: number = Math.floor(WORLD_WIDTH / TILE_SIZE);
const Y_TILES: number = Math.floor(WORLD_HEIGHT / TILE_SIZE);
var CAMERA_OFFSET: Vector2 = Vector2(
    Math.floor(X_TILES / 2) - Math.floor(CANVAS_WIDTH / TILE_SIZE / 2),
    Math.floor(Y_TILES / 2) - Math.floor(CANVAS_HEIGHT / TILE_SIZE / 2)
);
var Stockpile: { [key: string]: number } = {
    wood: 0,
    fish: 0,
    stone: 0,
    wheat: 0,
    apple: 0,
    berry: 0
};
var STORAGE_POS: Vector2 = Vector2(Math.floor(X_TILES / 2), Math.floor(Y_TILES / 2));
var PAUSED: boolean = false;
const TILE_ENTITY_LIMIT: number = 2;
const TILE_ITEM_LIMIT: number = 10;
var MOVEMENT_DELAY: number = 15;
const INVENTORY_MAX_CAPACITY: number = 20;

canvas.height = CANVAS_HEIGHT;
canvas.width = CANVAS_WIDTH;

var tileInspectorDiv = document.getElementById("tileInspectorDiv");

var mousePos = { x: 0, y: 0 };
canvas.onpointermove = (e) => {
    var rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; //x position within the element.
    mousePos.y = e.clientY - rect.top;  //y position within the element.
}

var entities: EntityData[] = [];
var world: WorldTile[][] = [];
var aStarGrid: any;
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
            if (x === STORAGE_POS.x && y === STORAGE_POS.y) {
                tile.type = TileType.GROUND;
                tile.worldObjects = [new WorldObject("storage_pile")];
                tile.items = [];
            }
            else if (tile.type != TileType.WATER && tile.type != TileType.DARK_WATER) {
                var spawnRoll = Math.random();
                if (spawnRoll < 0.0015) { // 0.15% chance to spawn a Human
                    var h: Human;
                    var humanTypeRoll = Math.random();
                    if (humanTypeRoll < 0.25) {
                        h = new Woodcutter();
                    } else if (humanTypeRoll < 0.5) {
                        h = new Fisherman();
                    } else if (humanTypeRoll < 0.75) {
                        //@ts-ignore
                        h = new Miner();
                    } else {
                        //@ts-ignore
                        h = new Farmer();
                    }
                    tile.addEntity(h);
                    entities.push({ entity: h, pos: Vector2(x, y) });
                } else if (spawnRoll < 0.0025) { // 0.10% chance to spawn a Sheep
                    //@ts-ignore
                    var s = new Sheep();
                    tile.addEntity(s);
                    entities.push({ entity: s, pos: Vector2(x, y) });
                } else if (spawnRoll < 0.0028) { // 0.03% chance to spawn a Wolf
                    //@ts-ignore
                    var w = new Wolf();
                    tile.addEntity(w);
                    entities.push({ entity: w, pos: Vector2(x, y) });
                }
            }
            world[x][y] = tile;
        }
    }

    // Set up the A* Grid
    var gridInput: number[][] = [];
    for (var x = 0; x < X_TILES; x++) {
        var inputRow: number[] = [];
        for (var y = 0; y < Y_TILES; y++) {
            inputRow.push(Number(world[x][y].canBeTraversed()));
        }
        gridInput.push(inputRow);
    }
    //@ts-ignore - as the Graph class is part of the JS code, not the TS code
    aStarGrid = new Graph(gridInput, { diagonal: true });

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

    ctx.restore();
}

function drawTileToOffscreen(x: number, y: number): void {
    var tile = world[x] ? world[x][y] : undefined;
    if (!tile) return;

    var screenX = x * TILE_SIZE;
    var screenY = y * TILE_SIZE;

    // Draw tile terrain color (ignore entities since they are dynamic)
    offscreenCtx.fillStyle = tile.type as string;
    offscreenCtx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

    // Draw worldObject sprite
    var worldObjs = tile.worldObjects;
    var objLen = worldObjs.length;
    if (objLen > 0) {
        var spriteName = worldObjs[objLen - 1].name;
        var spriteImg = sprites.get(spriteName);
        if (spriteImg && spriteImg.complete) {
            offscreenCtx.drawImage(spriteImg, screenX, screenY, TILE_SIZE, TILE_SIZE);
        } else {
            drawProceduralObject(offscreenCtx, spriteName, screenX, screenY, TILE_SIZE);
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

init();

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
    const resources = ["wood", "fish", "stone", "wheat", "apple", "berry"];
    for (const res of resources) {
        if (!stockpileElements[res]) {
            stockpileElements[res] = document.getElementById("stockpile" + res.charAt(0).toUpperCase() + res.slice(1));
        }
        const el = stockpileElements[res];
        if (el) {
            el.innerText = Stockpile[res].toString();
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
            if (e.health <= 0) {
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
            // Movement handler (Staggered to distribute heavy pathfinding load across MOVEMENT_DELAY frames)
            if (e.move != null && (ticks + i) % MOVEMENT_DELAY == 0) {
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
        var srcX = Math.round(CAMERA_OFFSET.x * TILE_SIZE);
        var srcY = Math.round(CAMERA_OFFSET.y * TILE_SIZE);
        ctx.drawImage(
            offscreenCanvas,
            srcX, srcY, CANVAS_WIDTH, CANVAS_HEIGHT,
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
                } else if (e.constructor.name === "Wolf") {
                    ctx.fillStyle = "#666666"; // Dark grey
                } else {
                    ctx.fillStyle = "#ffdd80"; // Peach
                }
                ctx.fill();
                ctx.strokeStyle = "rgba(0,0,0,0.5)";
                ctx.lineWidth = 1;
                ctx.stroke();

                // Build entity text display
                var letter = "?";
                var textCol = "black";
                if (e instanceof Human && e.professionLetter != "") {
                    letter = e.professionLetter;
                } else if (e.constructor.name === "Sheep") {
                    letter = "S";
                } else if (e.constructor.name === "Wolf") {
                    letter = "X";
                    textCol = "#ff2222"; // Red X for wolf
                }

                textValDraws.push(letter);
                textXDraws.push(cx);
                textYDraws.push(cy + 3.5);
                textColorDraws.push(textCol);
                textFontDraws.push("bold 9px sans-serif");
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
        if (ticks == 1000000000) {
            ticks = 0;
        }
    }

    //@ts-ignore
    if (typeof TestTools !== "undefined") {
        //@ts-ignore
        TestTools.updateInspectorLive();
    }

    requestAnimationFrame(mainProcess);
}
requestAnimationFrame(mainProcess);