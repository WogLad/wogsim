var canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
var ctx: CanvasRenderingContext2D = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;

// CANVAS PROPERTIES
const CANVAS_WIDTH: number = 960;
const CANVAS_HEIGHT: number = 540;
const CANVAS_BG_COLOR: string = "#f0ffff";
const TILE_SIZE: number = 15;
const OUTLINE_THICKNESS = 2; // <DEPRECATED> Thickness of the lines that make up the box surrounding the mouse
var CAMERA_OFFSET: Vector2 = Vector2(0, 0);

// WORLD PROPERTIES
const WORLD_WIDTH: number = 960 * 5;
const WORLD_HEIGHT: number = 540 * 5;
const X_TILES: number = Math.floor(WORLD_WIDTH / TILE_SIZE);
const Y_TILES: number = Math.floor(WORLD_HEIGHT / TILE_SIZE);
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

function getImgElement(src: string): HTMLImageElement {
    var el: HTMLImageElement = document.createElement("img");
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
    if (x >= (X_TILES - Math.floor(CANVAS_WIDTH / TILE_SIZE)) + 1 || x < 0) {
        return false;
    }
    if (y >= (Y_TILES - Math.floor(CANVAS_HEIGHT / TILE_SIZE)) + 1 || y < 0) {
        return false;
    }
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
            if (Math.random() < 0.002 && tile.type != TileType.WATER && tile.type != TileType.DARK_WATER) {
                var h: Human;
                var humanTypeRoll: number = Math.random();
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

    // Load in all the images
    sprites.set("tree", getImgElement("img/tree.png"));
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
        for (var i = 0; i < entities.length; i++) {
            var ent = entities[i];
            var e = ent.entity;
            var pos = ent.pos;
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

    var viewStartX = CAMERA_OFFSET.x;
    var viewEndX = Math.floor(CANVAS_WIDTH / TILE_SIZE) + CAMERA_OFFSET.x;
    var viewStartY = CAMERA_OFFSET.y;
    var viewEndY = Math.floor(CANVAS_HEIGHT / TILE_SIZE) + CAMERA_OFFSET.y;

    for (var x = viewStartX; x < viewEndX; x++) {
        var column = world[x];
        if (!column) continue;
        var screenX = (x - viewStartX) * TILE_SIZE;
        for (var y = viewStartY; y < viewEndY; y++) {
            var worldTile = column[y];
            if (!worldTile) continue;
            var screenY = (y - viewStartY) * TILE_SIZE;

            var color: string | null = null;
            if (DEBUG_DRAW) {
                if (worldTile.entities.length != 0) {
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
            } else {
                color = worldTile.getColor();
                if (color) {
                    if (!drawBuckets[color]) {
                        drawBuckets[color] = [];
                    }
                    drawBuckets[color].push(screenX, screenY);
                }

                var topEntity = worldTile.entities[worldTile.entities.length - 1];
                if (topEntity instanceof Human && topEntity.professionLetter != "") {
                    textValDraws.push(topEntity.professionLetter);
                    textXDraws.push(screenX + (TILE_SIZE / 2));
                    textYDraws.push(screenY + (TILE_SIZE / 1.4));
                    textColorDraws.push("black");
                    textFontDraws.push("10px");
                }

                if (worldTile.worldObjects.length > 0) {
                    var spriteImg = sprites.get(worldTile.worldObjects[worldTile.worldObjects.length - 1].name);
                    if (spriteImg) {
                        spriteImgDraws.push(spriteImg);
                        spriteXDraws.push(screenX);
                        spriteYDraws.push(screenY);
                    }
                }
            }
        }
    }

    // 1. Draw all backgrounds in batches by color to avoid fillStyle thrashing
    for (var c in drawBuckets) {
        var rects = drawBuckets[c];
        if (rects.length === 0) continue;
        ctx.fillStyle = c;
        for (var i = 0; i < rects.length; i += 2) {
            ctx.fillRect(rects[i], rects[i + 1], TILE_SIZE, TILE_SIZE);
        }
    }

    // 2. Draw all worldObject sprites
    for (var i = 0; i < spriteImgDraws.length; i++) {
        ctx.drawImage(spriteImgDraws[i], spriteXDraws[i], spriteYDraws[i], TILE_SIZE, TILE_SIZE);
    }

    // 3. Draw all letters and item counts
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

    // TODO: Fix the problem caused by the infinite world when drawing movement path debug lines
    // if (DEBUG_DRAW) {
    //     for (var ent of entities) {
    //         for (var move of ent.entity.moveQueue) {
    //             drawRect(move.x*TILE_SIZE,move.y*TILE_SIZE, TILE_SIZE,TILE_SIZE, "yellow");
    //         }
    //     }
    // }

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