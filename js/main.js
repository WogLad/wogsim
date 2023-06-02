"use strict";
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
// CANVAS PROPERTIES
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
const CANVAS_BG_COLOR = "#f0ffff";
const TILE_SIZE = 15;
const X_TILES = Math.floor(CANVAS_WIDTH / TILE_SIZE);
const Y_TILES = Math.floor(CANVAS_HEIGHT / TILE_SIZE);
const OUTLINE_THICKNESS = 2; // <DEPRECATED> Thickness of the lines that make up the box surrounding the mouse
// WORLD PROPERTIES
const TILE_ENTITY_LIMIT = 2;
var MOVEMENT_DELAY = 20;
canvas.height = CANVAS_HEIGHT;
canvas.width = CANVAS_WIDTH;
var mousePos = { x: 0, y: 0 };
canvas.onpointermove = (e) => {
    var rect = e.target.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; //x position within the element.
    mousePos.y = e.clientY - rect.top; //y position within the element.
};
var entities = [];
var world = new Map(); // The key will be the coords in the format {"x,y": WorldTile}
var aStarGrid;
function init() {
    ctx.fillStyle = CANVAS_BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Initialise the 2D world array
    for (var x = 0; x < X_TILES; x++) {
        for (var y = 0; y < Y_TILES; y++) {
            var tile = new WorldTile(x, y);
            if (Math.random() < 0.002 && tile.type != TileType.WATER && tile.type != TileType.DARK_WATER) {
                var h = new Human();
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
}
init();
var DEBUG_DRAW = false;
// Main loop
var ticks = 0;
function mainProcess() {
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
    // DONE: Draw the entities.
    ctx.fillStyle = CANVAS_BG_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var x = 0; x < X_TILES; x++) {
        for (var y = 0; y < Y_TILES; y++) {
            if (DEBUG_DRAW) {
                if (world.get(`${x},${y}`).entities.length != 0) { // For entities
                    ctx.fillStyle = "#0066ff";
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
                else if (world.get(`${x},${y}`).canBeTraversed()) { // For walkable surfaces
                    ctx.fillStyle = "#00d92f";
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
                else { // For non-walkable surfaces
                    ctx.fillStyle = "#d4002e";
                    ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
            else {
                if (world.get(`${x},${y}`).getColor() == null) {
                    continue;
                }
                ctx.fillStyle = world.get(`${x},${y}`).getColor();
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    if (DEBUG_DRAW) {
        for (var ent of entities) {
            for (var move of ent.entity.moveQueue) {
                ctx.fillStyle = "yellow";
                ctx.fillRect(move.x * TILE_SIZE, move.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    // Draws a red box around the mouse onto the TileMap that follows the mouse
    ctx.strokeStyle = "red";
    ctx.strokeRect(Math.floor(mousePos.x / TILE_SIZE) * TILE_SIZE, Math.floor(mousePos.y / TILE_SIZE) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    // For the world ticks
    ticks++;
    if (ticks == 1000000000) {
        ticks = 0;
    }
    requestAnimationFrame(mainProcess);
}
requestAnimationFrame(mainProcess);
