var canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
var ctx: CanvasRenderingContext2D = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;

// CANVAS PROPERTIES
const CANVAS_WIDTH: number = 960;
const CANVAS_HEIGHT: number = 540;
const CANVAS_BG_COLOR: string = "#f0ffff";
const TILE_SIZE: number = 15;
const OUTLINE_THICKNESS = 2; // <DEPRECATED> Thickness of the lines that make up the box surrounding the mouse
var CAMERA_OFFSET: Vector2 = Vector2(0,0);

// WORLD PROPERTIES
const WORLD_WIDTH: number = 960*5;
const WORLD_HEIGHT: number = 540*5;
const X_TILES: number = Math.floor(WORLD_WIDTH/TILE_SIZE);
const Y_TILES: number = Math.floor(WORLD_HEIGHT/TILE_SIZE);
var PAUSED: boolean = false;
const TILE_ENTITY_LIMIT: number = 2;
const TILE_ITEM_LIMIT: number = 10;
var MOVEMENT_DELAY: number = 15;
const INVENTORY_MAX_CAPACITY: number = 20;

canvas.height = CANVAS_HEIGHT;
canvas.width = CANVAS_WIDTH;

var tileInspectorDiv = document.getElementById("tileInspectorDiv");

var mousePos = {x:0, y:0};
canvas.onpointermove = (e) => {
    var rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; //x position within the element.
    mousePos.y = e.clientY - rect.top;  //y position within the element.
}

var entities: EntityData[] = [];
var world: Map<string, WorldTile> = new Map<string, WorldTile>(); // The key will be the coords in the format {"x,y": WorldTile}
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
    if (x >= (X_TILES - Math.floor(CANVAS_WIDTH/TILE_SIZE))+1 || x < 0) {
        return false;
    }
    if (y >= (Y_TILES - Math.floor(CANVAS_HEIGHT/TILE_SIZE))+1 || y < 0) {
        return false;
    }
    CAMERA_OFFSET.x = x;
    CAMERA_OFFSET.y = y;
    return true;
}

function init(): void {
    ctx.textAlign = "center";
    ctx.imageSmoothingEnabled = false;
    drawRect(0,0, CANVAS_WIDTH,CANVAS_HEIGHT, CANVAS_BG_COLOR);

    // Initialise the 2D world array
    for (var x = 0; x < X_TILES; x++) {
        for (var y = 0; y < Y_TILES; y++) {
            var tile: WorldTile = new WorldTile(x,y);
            if (Math.random() < 0.002 && tile.type != TileType.WATER && tile.type != TileType.DARK_WATER) {
                var h: Human = new Woodcutter();
                tile.addEntity(h);
                entities.push({entity: h, pos: Vector2(x,y)});
            }
            world.set(`${x},${y}`, tile);
        }
    }

    // Set up the A* Grid
    var gridInput: number[][] = [];
    for (var x = 0; x < X_TILES; x++) {
        var inputRow: number[] = [];
        for (var y = 0; y < Y_TILES; y++) {
            inputRow.push(Number((world.get(`${x},${y}`) as WorldTile).canBeTraversed()));
        }
        gridInput.push(inputRow);
    }
    //@ts-ignore - as the Graph class is part of the JS code, not the TS code
    aStarGrid = new Graph(gridInput, {diagonal: true});

    // Load in all the images
    sprites.set("tree", getImgElement("img/tree.png"));
}

init();

var DEBUG_DRAW = false;

// Main loop
var ticks: number = 0;
function mainProcess(): void {
    if (!PAUSED) {
        var entitiesProcessed: string[] = [];
        for (var x = 0; x < X_TILES; x++) {
            for (var y = 0; y < Y_TILES; y++) {
                var tile: WorldTile = world.get(`${x},${y}`) as WorldTile;
                // The base code that runs for every entity in the world
                for (var e of tile.entities) {
                    if (entitiesProcessed.includes(e.id)) {
                        continue;
                    }
                    e.process();
                    // Movement handler
                    if (e.move != null && ticks % MOVEMENT_DELAY == 0) {
                        var direction: Vector2 = e.move(x,y);
                        if (direction.x != 0 || direction.y != 0) {
                            var moveSuccess: boolean = (world.get(`${x+direction.x},${y+direction.y}`) as WorldTile).addEntity(e);
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
    ctx.clearRect(0,0, CANVAS_WIDTH,CANVAS_HEIGHT);
    for (var x = 0+CAMERA_OFFSET.x; x < Math.floor(CANVAS_WIDTH/TILE_SIZE)+CAMERA_OFFSET.x; x++) {
        for (var y = 0+CAMERA_OFFSET.y; y < Math.floor(CANVAS_HEIGHT/TILE_SIZE)+CAMERA_OFFSET.y; y++) {
            var worldTile: WorldTile = world.get(`${x},${y}`) as WorldTile;
            if (DEBUG_DRAW) {
                if (worldTile.entities.length != 0) { // For entities
                    drawRect((x-CAMERA_OFFSET.x)*TILE_SIZE,(y-CAMERA_OFFSET.y)*TILE_SIZE, TILE_SIZE,TILE_SIZE, "#0066ff");
                }
                else if (worldTile.worldObjects.length != 0) {
                    drawRect((x-CAMERA_OFFSET.x)*TILE_SIZE,(y-CAMERA_OFFSET.y)*TILE_SIZE, TILE_SIZE,TILE_SIZE, "gray");
                }
                else if (worldTile.canBeTraversed()) { // For walkable surfaces
                    drawRect((x-CAMERA_OFFSET.x)*TILE_SIZE,(y-CAMERA_OFFSET.y)*TILE_SIZE, TILE_SIZE,TILE_SIZE, "#00d92f");
                }
                else { // For non-walkable surfaces
                    drawRect((x-CAMERA_OFFSET.x)*TILE_SIZE,(y-CAMERA_OFFSET.y)*TILE_SIZE, TILE_SIZE,TILE_SIZE, "#d4002e");
                }

                // TODO: Make a checbox UI to toggle the below code on/off
                // Draws the no. of items in the tile
                drawText(worldTile.items.length.toString(), ((x-CAMERA_OFFSET.x)*TILE_SIZE)+(TILE_SIZE/2), ((y-CAMERA_OFFSET.y)*TILE_SIZE)+(TILE_SIZE/1.5), "black");
            }
            else {
                if (worldTile.getColor() == null) {
                    continue;
                }
                drawRect((x-CAMERA_OFFSET.x)*TILE_SIZE,(y-CAMERA_OFFSET.y)*TILE_SIZE, TILE_SIZE,TILE_SIZE, worldTile.getColor() as string);

                var topEntity: Entity = worldTile.entities[worldTile.entities.length-1];
                if (topEntity instanceof Human && topEntity.professionLetter != "") {
                    ctx.font = "10px";
                    drawText(topEntity.professionLetter, ((x-CAMERA_OFFSET.x)*TILE_SIZE)+(TILE_SIZE/2), ((y-CAMERA_OFFSET.y)*TILE_SIZE)+(TILE_SIZE/1.4), "black");
                }

                // Draws the sprites of structures and objects
                if (worldTile.worldObjects.length > 0) {
                    ctx.drawImage(sprites.get(worldTile.worldObjects[worldTile.worldObjects.length-1].name) as HTMLImageElement, (x-CAMERA_OFFSET.x)*TILE_SIZE, (y-CAMERA_OFFSET.y)*TILE_SIZE, TILE_SIZE, TILE_SIZE);
                }
            }
            
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
    ctx.strokeStyle = "red";
    ctx.strokeRect(Math.floor(mousePos.x/TILE_SIZE)*TILE_SIZE, Math.floor(mousePos.y/TILE_SIZE)*TILE_SIZE, TILE_SIZE, TILE_SIZE);

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