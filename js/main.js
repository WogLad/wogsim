"use strict";
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d", { alpha: false });
// CANVAS PROPERTIES
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const CANVAS_BG_COLOR = "#f0ffff";
const TILE_SIZE = 15;
const X_TILES = Math.floor(CANVAS_WIDTH / TILE_SIZE);
const Y_TILES = Math.floor(CANVAS_HEIGHT / TILE_SIZE);
const OUTLINE_THICKNESS = 2; // <DEPRECATED> Thickness of the lines that make up the box surrounding the mouse
// WORLD PROPERTIES
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
var world = new Map(); // The key will be the coords in the format {"x,y": WorldTile}
var aStarGrid;
var sprites = new Map();
function getImgElement(src) {
    var el = document.createElement("img");
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
function init() {
    ctx.textAlign = "center";
    ctx.imageSmoothingEnabled = false;
    drawRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, CANVAS_BG_COLOR);
    // Initialise the 2D world array
    for (var x = 0; x < X_TILES; x++) {
        for (var y = 0; y < Y_TILES; y++) {
            var tile = new WorldTile(x, y);
            if (Math.random() < 0.002 && tile.type != TileType.WATER && tile.type != TileType.DARK_WATER) {
                var h = new Woodcutter();
                tile.addEntity(h);
                entities.push({ entity: h, pos: Vector2(x, y) });
            }
            world.set(`${x},${y}`, tile);
        }
    }
    // Set up the A* Grid
    var gridInput = [];
    for (var x = 0; x < X_TILES; x++) {
        var inputRow = [];
        for (var y = 0; y < Y_TILES; y++) {
            inputRow.push(Number(world.get(`${x},${y}`).canBeTraversed()));
        }
        gridInput.push(inputRow);
    }
    //@ts-ignore - as the Graph class is part of the JS code, not the TS code
    aStarGrid = new Graph(gridInput, { diagonal: true });
    // Load in all the images
    sprites.set("tree", getImgElement("img/tree.png"));
}
init();
var DEBUG_DRAW = false;
// Main loop
var ticks = 0;
function mainProcess() {
    if (!PAUSED) {
        var entitiesProcessed = [];
        for (var x = 0; x < X_TILES; x++) {
            for (var y = 0; y < Y_TILES; y++) {
                var tile = world.get(`${x},${y}`);
                // The base code that runs for every entity in the world
                for (var e of tile.entities) {
                    if (entitiesProcessed.includes(e.id)) {
                        continue;
                    }
                    e.process();
                    // Movement handler
                    if (e.move != null && ticks % MOVEMENT_DELAY == 0) {
                        var direction = e.move(x, y);
                        if (direction.x != 0 || direction.y != 0) {
                            var moveSuccess = world.get(`${x + direction.x},${y + direction.y}`).addEntity(e);
                            if (moveSuccess) {
                                tile.removeEntity(tile.entities.indexOf(e)); // Removes the entity from the tile
                            }
                        }
                    }
                    if (e.isLiving) {
                        e.ticksAlive++;
                    }
                    entitiesProcessed.push(e.id);
                }
            }
        }
    }
    // DONE: Draw the entities.
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    for (var x = 0; x < X_TILES; x++) {
        for (var y = 0; y < Y_TILES; y++) {
            var worldTile = world.get(`${x},${y}`);
            if (DEBUG_DRAW) {
                if (worldTile.entities.length != 0) { // For entities
                    drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, "#0066ff");
                }
                else if (worldTile.worldObjects.length != 0) {
                    drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, "gray");
                }
                else if (worldTile.canBeTraversed()) { // For walkable surfaces
                    drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, "#00d92f");
                }
                else { // For non-walkable surfaces
                    drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, "#d4002e");
                }
                // TODO: Make a checbox UI to toggle the below code on/off
                // Draws the no. of items in the tile
                drawText(worldTile.items.length.toString(), (x * TILE_SIZE) + (TILE_SIZE / 2), (y * TILE_SIZE) + (TILE_SIZE / 1.5), "black");
            }
            else {
                var tileColor = worldTile.getColor();
                if (tileColor == null) {
                    continue;
                }
                drawRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE, tileColor);
                var topEntity = worldTile.entities[worldTile.entities.length - 1];
                if (topEntity instanceof Human && topEntity.professionLetter != "") {
                    ctx.font = "10px";
                    drawText(topEntity.professionLetter, (x * TILE_SIZE) + (TILE_SIZE / 2), (y * TILE_SIZE) + (TILE_SIZE / 1.4), "black");
                }
                // Draws the sprites of structures and objects
                if (worldTile.worldObjects.length > 0) {
                    // ctx.filter = "drop-shadow(2px 2px 2.5px black)";
                    ctx.drawImage(sprites.get(worldTile.worldObjects[worldTile.worldObjects.length - 1].name), x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                    // ctx.filter = "none";
                }
            }
        }
    }
    if (DEBUG_DRAW) {
        for (var ent of entities) {
            for (var move of ent.entity.moveQueue) {
                drawRect(move.x * TILE_SIZE, move.y * TILE_SIZE, TILE_SIZE, TILE_SIZE, "yellow");
            }
        }
    }
    // Draws a red box around the mouse onto the TileMap that follows the mouse
    ctx.strokeStyle = "red";
    ctx.strokeRect(Math.floor(mousePos.x / TILE_SIZE) * TILE_SIZE, Math.floor(mousePos.y / TILE_SIZE) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    // For the world ticks
    if (!PAUSED) {
        ticks++;
        if (ticks == 1000000000) {
            ticks = 0;
        }
    }
    requestAnimationFrame(mainProcess);
}
requestAnimationFrame(mainProcess);
