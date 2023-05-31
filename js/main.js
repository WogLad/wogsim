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
function process() {
    for (var y = 0; y < Y_TILES; y++) {
        for (var x = 0; x < X_TILES; x++) {
            var tile = world[y][x];
            // The base code that runs for every entity in the world
            tile.entities.forEach(e => {
                e.process();
                if (e.move != null) {
                    e.move();
                }
                if (e.isLiving) {
                    e.ticksAlive++;
                }
            });
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
    requestAnimationFrame(process);
}
requestAnimationFrame(process);
