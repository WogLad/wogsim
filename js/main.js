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
// var entities: Entity[] = [];
var world = [];
function init() {
    ctx.fillStyle = CANVAS_BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Initialise the 2D world array
    for (var y = 0; y < Y_TILES; y++) {
        var row = [];
        for (var x = 0; x < X_TILES; x++) {
            var tile = new WorldTile(x, y);
            if (Math.random() < 0.002 && tile.type != TileType.WATER && tile.type != TileType.DARK_WATER) {
                tile.addEntity(new Human());
            }
            row.push(tile);
        }
        world.push(row);
    }
}
init();
// Main loop
var ticks = 0;
function mainProcess() {
    var entitiesProcessed = [];
    for (var y = 0; y < Y_TILES; y++) {
        for (var x = 0; x < X_TILES; x++) {
            var tile = world[y][x];
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
                        var moveSuccess = world[y + direction.y][x + direction.x].addEntity(e);
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
    for (var y = 0; y < Y_TILES; y++) {
        for (var x = 0; x < X_TILES; x++) {
            if (world[y][x].getColor() == null) {
                continue;
            }
            ctx.fillStyle = world[y][x].getColor();
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
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
