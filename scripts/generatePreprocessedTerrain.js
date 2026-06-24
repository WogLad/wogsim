import fs from 'fs';

// Re-implementation of Perlin noise from joeiddon/perlin
const perlin = {
    gradients: {},
    rand_vect: function(){
        let theta = Math.random() * 2 * Math.PI;
        return {x: Math.cos(theta), y: Math.sin(theta)};
    },
    dot_prod_grid: function(x, y, vx, vy){
        let g_vect;
        let d_vect = {x: x - vx, y: y - vy};
        if (this.gradients[[vx,vy]]){
            g_vect = this.gradients[[vx,vy]];
        } else {
            g_vect = this.rand_vect();
            this.gradients[[vx, vy]] = g_vect;
        }
        return d_vect.x * g_vect.x + d_vect.y * g_vect.y;
    },
    smootherstep: function(x){
        return 6*Math.pow(x, 5) - 15*Math.pow(x, 4) + 10*Math.pow(x, 3);
    },
    interp: function(x, a, b){
        return a + this.smootherstep(x) * (b-a);
    },
    seed: function(){
        this.gradients = {};
    },
    get: function(x, y){
        let x0 = Math.floor(x);
        let x1 = x0 + 1;
        let y0 = Math.floor(y);
        let y1 = y0 + 1;

        let sx = x - x0;
        let sy = y - y0;

        let n0, n1, ix0, ix1, value;
        n0 = this.dot_prod_grid(x, y, x0, y0);
        n1 = this.dot_prod_grid(x, y, x1, y0);
        ix0 = this.interp(sx, n0, n1);

        n0 = this.dot_prod_grid(x, y, x0, y1);
        n1 = this.dot_prod_grid(x, y, x1, y1);
        ix1 = this.interp(sx, n0, n1);

        value = this.interp(sy, ix0, ix1);
        return value;
    }
};

function getFBM(x, y, octaves, persistence, lacunarity, scale) {
    let total = 0;
    let frequency = scale;
    let amplitude = 1.0;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
        total += perlin.get(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    return total / maxValue;
}

const X_TILES = 960;
const Y_TILES = 540;

const TileType = {
    DARK_GRASS: 0,
    GRASS: 1,
    GROUND: 2,
    WATER: 3,
    DARK_WATER: 4,
    SAND: 5,
    DESERT: 6,
    SWAMP: 7,
    SNOW: 8
};

function getTileType(x, y) {
    var elevation = getFBM(x, y, 4, 0.45, 2.1, 0.03);
    var moisture = getFBM(x + 5000, y + 5000, 3, 0.5, 2.0, 0.03);

    if (elevation < -0.3) {
        return TileType.DARK_WATER;
    }
    else if (elevation < -0.15) {
        return TileType.WATER;
    }
    else if (elevation < -0.08) {
        return TileType.SAND;
    }
    else if (elevation > 0.4) {
        return TileType.SNOW;
    }
    else {
        if (moisture < -0.2) {
            return TileType.DESERT;
        }
        else if (moisture < 0.2) {
            if (elevation > 0.18) {
                return TileType.GROUND;
            } else {
                return TileType.GRASS;
            }
        }
        else {
            if (elevation < 0.05) {
                return TileType.SWAMP;
            } else {
                return TileType.DARK_GRASS;
            }
        }
    }
}

// Generate the grid column by column
console.log("Generating 960x540 preprocessed world biomes...");
const runs = [];
let currentType = -1;
let currentRun = 0;

for (let x = 0; x < X_TILES; x++) {
    for (let y = 0; y < Y_TILES; y++) {
        const type = getTileType(x, y);
        if (type === currentType) {
            currentRun++;
        } else {
            if (currentType !== -1) {
                runs.push(`${currentType}_${currentRun}`);
            }
            currentType = type;
            currentRun = 1;
        }
    }
}
if (currentRun > 0) {
    runs.push(`${currentType}_${currentRun}`);
}

const compressed = runs.join(",");
console.log(`Generated compressed terrain string: length=${compressed.length} characters`);

// Write to preprocessedTerrain.ts
fs.writeFileSync('preprocessedTerrain.ts', `var PREPROCESSED_TERRAIN: string = "${compressed}";\n`);
console.log("Successfully wrote preprocessedTerrain.ts");
