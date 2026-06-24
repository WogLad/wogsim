import { X_TILES, Y_TILES, grid, tile_type, tile_object, tile_item } from "./index";
import { tickWoodcutter } from "./ai";
import { MAX_ENTITIES } from "./constants";

export var entity_active = new Uint8Array(MAX_ENTITIES);
export var entity_type = new Uint8Array(MAX_ENTITIES); // 1=Woodcutter, 2=Fisherman, 3=Miner, 4=Farmer, 5=Sheep, 6=Cow, 7=Wolf
export var entity_x = new Int32Array(MAX_ENTITIES);
export var entity_y = new Int32Array(MAX_ENTITIES);
export var entity_health = new Float32Array(MAX_ENTITIES);
export var entity_hunger = new Float32Array(MAX_ENTITIES);
export var entity_age = new Int32Array(MAX_ENTITIES);
export var entity_state = new Uint8Array(MAX_ENTITIES);
export var entity_gold = new Int32Array(MAX_ENTITIES);

export function getEntityActivePointer(): usize { return entity_active.dataStart; }
export function getEntityTypePointer(): usize { return entity_type.dataStart; }
export function getEntityXPointer(): usize { return entity_x.dataStart; }
export function getEntityYPointer(): usize { return entity_y.dataStart; }
export function getEntityHealthPointer(): usize { return entity_health.dataStart; }
export function getEntityHungerPointer(): usize { return entity_hunger.dataStart; }

export function initEntities(): void {
    for(let i=0; i<MAX_ENTITIES; i++) {
        entity_active[i] = 0;
    }
}

export function spawnEntity(type: u8, x: i32, y: i32): i32 {
    for(let i=0; i<MAX_ENTITIES; i++) {
        if (entity_active[i] == 0) {
            entity_active[i] = 1;
            entity_type[i] = type;
            entity_x[i] = x;
            entity_y[i] = y;
            entity_health[i] = 100;
            entity_hunger[i] = 0;
            entity_age[i] = 0;
            entity_state[i] = 0; // Idle
            entity_gold[i] = 0;
            return i;
        }
    }
    return -1;
}

export function tickEntities(): void {
    for(let i=0; i<MAX_ENTITIES; i++) {
        if (entity_active[i] == 1) {
            entity_age[i]++;
            
            if (entity_type[i] == 1) { // Woodcutter
                tickWoodcutter(i);
            } else {
                // Simple random walk for now to test WASM entities
                let rx = (Math.random() * 3) - 1;
                let ry = (Math.random() * 3) - 1;
                let nx = entity_x[i] + Math.floor(rx) as i32;
                let ny = entity_y[i] + Math.floor(ry) as i32;
                
                if (nx >= 0 && nx < X_TILES && ny >= 0 && ny < Y_TILES) {
                    // Check if traversable
                    let type = tile_type[nx * Y_TILES + ny];
                    if (type != 3 && type != 4) { // Not water
                        entity_x[i] = nx;
                        entity_y[i] = ny;
                    }
                }
            }
        }
    }
}
