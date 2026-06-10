"use strict";
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d", { alpha: false });
// CANVAS PROPERTIES
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const CANVAS_BG_COLOR = "#f0ffff";
const TILE_SIZE = 15;
const OUTLINE_THICKNESS = 2; // <DEPRECATED> Thickness of the lines that make up the box surrounding the mouse
var CAMERA_OFFSET = Vector2(0, 0);
// WORLD PROPERTIES
const WORLD_WIDTH = 960 * 5;
const WORLD_HEIGHT = 540 * 5;
const X_TILES = Math.floor(WORLD_WIDTH / TILE_SIZE);
const Y_TILES = Math.floor(WORLD_HEIGHT / TILE_SIZE);
var PAUSED = false;
const TILE_ENTITY_LIMIT = 2;
const TILE_ITEM_LIMIT = 10;
var MOVEMENT_DELAY = 15;
const INVENTORY_MAX_CAPACITY = 20;
canvas.height = CANVAS_HEIGHT;
canvas.width = CANVAS_WIDTH;
var tileInspectorDiv = document.getElementById("tileInspectorDiv");
var mousePos = { x: 0, y: 0 };
canvas.onpointermove = (e) => {
    var rect = e.target.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; //x position within the element.
    mousePos.y = e.clientY - rect.top; //y position within the element.
};
var entities = [];
var world = [];
var aStarGrid;
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
    // Initialise the 2D world array
    for (var x = 0; x < X_TILES; x++) {
        world[x] = [];
        for (var y = 0; y < Y_TILES; y++) {
            var tile = new WorldTile(x, y);
            if (Math.random() < 0.002 && tile.type != TileType.WATER && tile.type != TileType.DARK_WATER) {
                var h;
                var humanTypeRoll = Math.random();
                if (humanTypeRoll < 0.5) {
                    h = new Woodcutter();
                }
                else {
                    h = new Fisherman();
                }
                tile.addEntity(h);
                entities.push({ entity: h, pos: Vector2(x, y) });
            }
            world[x][y] = tile;
        }
    }
    // Set up the A* Grid
    var gridInput = [];
    for (var x = 0; x < X_TILES; x++) {
        var inputRow = [];
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
function drawTileToOffscreen(x, y) {
    var tile = world[x] ? world[x][y] : undefined;
    if (!tile)
        return;
    var screenX = x * TILE_SIZE;
    var screenY = y * TILE_SIZE;
    // Draw tile terrain color (ignore entities since they are dynamic)
    offscreenCtx.fillStyle = tile.type;
    offscreenCtx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
    // Draw worldObject sprite (like trees)
    var worldObjs = tile.worldObjects;
    var objLen = worldObjs.length;
    if (objLen > 0) {
        var spriteName = worldObjs[objLen - 1].name;
        var spriteImg = sprites.get(spriteName);
        if (spriteImg && spriteImg.complete) {
            offscreenCtx.drawImage(spriteImg, screenX, screenY, TILE_SIZE, TILE_SIZE);
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
init();
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
        for (var i = 0; i < entities.length; i++) {
            var ent = entities[i];
            var e = ent.entity;
            var pos = ent.pos;
            e.process();
            // Movement handler (Staggered to distribute heavy pathfinding load across MOVEMENT_DELAY frames)
            if (e.move != null && (ticks + i) % MOVEMENT_DELAY == 0) {
                var direction = e.move(pos.x, pos.y);
                if (direction.x != 0 || direction.y != 0) {
                    var targetX = pos.x + direction.x;
                    var targetY = pos.y + direction.y;
                    var targetTile = world[targetX] ? world[targetX][targetY] : undefined;
                    if (targetTile) {
                        var moveSuccess = targetTile.addEntity(e);
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
            if (rects.length === 0)
                continue;
            ctx.fillStyle = c;
            for (var i = 0; i < rects.length; i += 2) {
                ctx.fillRect(rects[i], rects[i + 1], TILE_SIZE, TILE_SIZE);
            }
        }
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
        // Draw yellow dashed pathfinding lines to destination
        ctx.strokeStyle = "rgba(255, 255, 0, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        for (var i = 0; i < entities.length; i++) {
            var ent = entities[i];
            var e = ent.entity;
            var pos = ent.pos;
            if (e.moveQueue.length > 0) {
                var targetNode = e.moveQueue[e.moveQueue.length - 1];
                var startX = Math.round((pos.x - CAMERA_OFFSET.x) * TILE_SIZE) + TILE_SIZE / 2;
                var startY = Math.round((pos.y - CAMERA_OFFSET.y) * TILE_SIZE) + TILE_SIZE / 2;
                var endX = Math.round((targetNode.x - CAMERA_OFFSET.x) * TILE_SIZE) + TILE_SIZE / 2;
                var endY = Math.round((targetNode.y - CAMERA_OFFSET.y) * TILE_SIZE) + TILE_SIZE / 2;
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]); // Reset line dash
    }
    else {
        // Fast path: blit terrain background and structures directly from the offscreen canvas
        var srcX = Math.round(CAMERA_OFFSET.x * TILE_SIZE);
        var srcY = Math.round(CAMERA_OFFSET.y * TILE_SIZE);
        ctx.drawImage(offscreenCanvas, srcX, srcY, CANVAS_WIDTH, CANVAS_HEIGHT, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Viewport culling loop over active entities (O(N) instead of scanning the full 2,304 tile grid)
        for (var i = 0; i < entities.length; i++) {
            var ent = entities[i];
            var pos = ent.pos;
            if (pos.x >= viewStartX && pos.x < viewEndX && pos.y >= viewStartY && pos.y < viewEndY) {
                var e = ent.entity;
                if (e instanceof Human && e.professionLetter != "") {
                    var screenX = Math.round((pos.x - CAMERA_OFFSET.x) * TILE_SIZE);
                    var screenY = Math.round((pos.y - CAMERA_OFFSET.y) * TILE_SIZE);
                    textValDraws.push(e.professionLetter);
                    textXDraws.push(screenX + (TILE_SIZE / 2));
                    textYDraws.push(screenY + (TILE_SIZE / 1.4));
                    textColorDraws.push("black");
                    textFontDraws.push("10px");
                }
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
            }
            else {
                ctx.font = "10px sans-serif";
            }
            ctx.fillStyle = textColorDraws[i];
            ctx.fillText(textValDraws[i], textXDraws[i], textYDraws[i]);
        }
    }
    // TODO: Fix the problem caused by the infinite world when drawing movement path debug lines
    // if (DEBUG_DRAW) {
    //     for (var ent of entities) {
    //         for (var move of ent.entity.moveQueue) {
    //             drawRect(move.x*TILE_SIZE,move.y*TILE_SIZE, TILE_SIZE,TILE_SIZE, "yellow");
    //         }
    //     }
    // }
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
