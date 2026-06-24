import { X_TILES, Y_TILES, grid, tile_type, tile_object, tile_item } from "./index";
import { getFBM, seedPerlin } from "./perlin";
import { spawnResourceWasm } from "./constants";

// TileType enum matches the JS side mapping
// 0=DARK_GRASS, 1=GRASS, 2=GROUND, 3=WATER, 4=DARK_WATER
// 5=SAND, 6=DESERT, 7=SWAMP, 8=SNOW
export function generateNoiseWorldWasm(seedOffset: i32): void {
    seedPerlin(seedOffset);
    for (let x = 0; x < X_TILES; x++) {
        for (let y = 0; y < Y_TILES; y++) {
            let elevation = getFBM(x, y, 4, 0.45, 2.1, 0.03);
            let moisture = getFBM(x + 5000, y + 5000, 3, 0.5, 2.0, 0.03);
            let type = 2; // GROUND default

            if (elevation < -0.3) type = 4; // DARK_WATER
            else if (elevation < -0.15) type = 3; // WATER
            else if (elevation < -0.08) type = 5; // SAND
            else if (elevation > 0.4) type = 8; // SNOW
            else {
                if (moisture < -0.2) type = 6; // DESERT
                else if (moisture < 0.2) {
                    if (elevation > 0.18) type = 2; // GROUND
                    else type = 1; // GRASS
                } else {
                    if (elevation < 0.05) type = 7; // SWAMP
                    else type = 0; // DARK_GRASS
                }
            }

            let idx = x * Y_TILES + y;
            tile_type[idx] = type;
            tile_object[idx] = 0; // 0 means OBJ_NONE
            tile_item[idx] = 0; // 0 means ITEM_NONE
            
            // Spawn initial resources
            spawnResourceWasm(x, y, type, 1.0);
        }
    }
}


// Command structure: [cmdType, x, y]
// cmdType: 0=TownHall, 1=Campfire, 2=Ground, 3=Fence, 4=Sheep, 5=Cow, 6=Woodcutter, 7=Fisherman, 8=Miner, 9=Farmer
var genBuffer = new Int32Array(500000);
var genSize: i32 = 0;

export function getGenBufferPointer(): usize {
    return genBuffer.dataStart;
}

export function getGenBufferSize(): i32 {
    return genSize;
}

function pushCmd(cmd: i32, x: i32, y: i32): void {
    if (genSize * 3 + 2 < genBuffer.length) {
        genBuffer[genSize * 3] = cmd;
        genBuffer[genSize * 3 + 1] = x;
        genBuffer[genSize * 3 + 2] = y;
        genSize++;
    }
}

function isWater(x: i32, y: i32): boolean {
    if (x < 0 || x >= X_TILES || y < 0 || y >= Y_TILES) return true;
    return grid[x * Y_TILES + y] == 0.0;
}

// Temporary storage for town halls to check distance
var townHallsX = new Int32Array(1000);
var townHallsY = new Int32Array(1000);
var townHallsCount: i32 = 0;

export function generateVillagesWasm(count: i32): void {
    genSize = 0;
    townHallsCount = 0;
    var generated = 0;
    var attempts = 0;
    var maxAttempts = count * 20;

    while (generated < count && attempts < maxAttempts) {
        attempts++;
        var cx = 15 + i32(Math.random() * (X_TILES - 30));
        var cy = 15 + i32(Math.random() * (Y_TILES - 30));

        if (isWater(cx, cy)) continue;

        var tooClose = false;
        for (var i = 0; i < townHallsCount; i++) {
            var dx = townHallsX[i] - cx;
            var dy = townHallsY[i] - cy;
            if (Math.abs(dx) <= 25 && Math.abs(dy) <= 25) {
                tooClose = true;
                break;
            }
        }
        if (tooClose) continue;

        townHallsX[townHallsCount] = cx;
        townHallsY[townHallsCount] = cy;
        townHallsCount++;

        pushCmd(0, cx, cy); // TownHall
        pushCmd(2, cx, cy); // Ground

        if (!isWater(cx + 3, cy)) {
            pushCmd(1, cx + 3, cy); // Campfire
            pushCmd(2, cx + 3, cy);
        }

        for (var r = -4; r <= 4; r++) {
            var tx = cx + r;
            var ty = cy;
            if (!isWater(tx, ty)) pushCmd(2, tx, ty); // Ground
            
            tx = cx;
            ty = cy + r;
            if (!isWater(tx, ty)) pushCmd(2, tx, ty); // Ground
        }

        var px = cx + 2;
        var py = cy + 2;
        for (var fx = px; fx <= px + 4; fx++) {
            for (var fy = py; fy <= py + 4; fy++) {
                if (fx == px || fx == px + 4 || fy == py || fy == py + 4) {
                    if (!(fx == cx && fy == cy)) {
                        pushCmd(3, fx, fy); // Fence
                    }
                }
            }
        }

        // Inner pen animals
        var penInnerX = [px + 1, px + 2, px + 1, px + 2];
        var penInnerY = [py + 1, py + 1, py + 2, py + 2];
        for (let i = 0; i < 4; i++) {
            var posx = penInnerX[i];
            var posy = penInnerY[i];
            if (!isWater(posx, posy)) {
                if (i < 2) pushCmd(4, posx, posy); // Sheep
                else pushCmd(5, posx, posy); // Cow
            }
        }

        // Villagers
        var vx = [-1, 1, -1, 1, -2, 2, -2, -2, -2, -1, 1, -2, -1, 0, 0, 0];
        var vy = [-1, -1, 1, 1, -2, -2, 2, -1, 1, -2, -2, 0, 0, -1, 1, -2];
        for (let i = 0; i < 16; i++) {
            var vposx = cx + vx[i];
            var vposy = cy + vy[i];
            if (!isWater(vposx, vposy)) {
                var cmd = 6 + (i % 4); // 6=Woodcutter, 7=Fisherman, 8=Miner, 9=Farmer
                pushCmd(cmd, vposx, vposy);
            }
        }

        generated++;
    }
}

export function spawnAllResourcesWasm(multiplier: f32): void {
    for (let x = 0; x < X_TILES; x++) {
        for (let y = 0; y < Y_TILES; y++) {
            let idx = x * Y_TILES + y;
            let type = tile_type[idx];
            spawnResourceWasm(x, y, type, multiplier);
        }
    }
}
