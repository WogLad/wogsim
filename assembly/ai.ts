import { entity_type, entity_x, entity_y, entity_health, entity_hunger, entity_age, entity_state, entity_active } from "./entities";
import { tile_type, tile_object, tile_item, Y_TILES, X_TILES } from "./index";
import { MAX_ENTITIES, OBJ_TREE, OBJ_PINE, OBJ_PALM, OBJ_CACTUS, OBJ_NONE, ITEM_WOOD } from "./constants";

export var entity_inventory_item = new Uint8Array(MAX_ENTITIES * 5);
export var entity_inventory_count = new Uint8Array(MAX_ENTITIES * 5);

export function getEntityInventoryItemPointer(): usize { return entity_inventory_item.dataStart; }
export function getEntityInventoryCountPointer(): usize { return entity_inventory_count.dataStart; }

function getDistance(x1: i32, y1: i32, x2: i32, y2: i32): i32 {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2) as i32;
}

function findNearestObject(ex: i32, ey: i32, objType1: i32, objType2: i32, objType3: i32, objType4: i32, radius: i32): i32 {
    let nearestIdx = -1;
    let minD = radius + 1;

    for (let r = 1; r <= radius; r++) {
        for (let dx = -r; dx <= r; dx++) {
            for (let dy = -r; dy <= r; dy++) {
                if (Math.abs(dx) == r || Math.abs(dy) == r) {
                    let nx = ex + dx;
                    let ny = ey + dy;
                    if (nx >= 0 && nx < X_TILES && ny >= 0 && ny < Y_TILES) {
                        let idx = nx * Y_TILES + ny;
                        let obj = tile_object[idx];
                        if (obj == objType1 || obj == objType2 || obj == objType3 || obj == objType4) {
                            return idx;
                        }
                    }
                }
            }
        }
    }
    return -1;
}

export function tickWoodcutter(id: i32): void {
    let ex = entity_x[id];
    let ey = entity_y[id];

    // If on a tree, chop it
    let idx = ex * Y_TILES + ey;
    let obj = tile_object[idx];
    if (obj == OBJ_TREE || obj == OBJ_PINE || obj == OBJ_PALM || obj == OBJ_CACTUS) {
        tile_object[idx] = OBJ_NONE;
        
        // Add wood to inventory
        for (let s = 0; s < 5; s++) {
            let invIdx = id * 5 + s;
            if (entity_inventory_item[invIdx] == ITEM_WOOD || entity_inventory_item[invIdx] == 0) {
                entity_inventory_item[invIdx] = ITEM_WOOD;
                entity_inventory_count[invIdx]++;
                break;
            }
        }
        return; // stay on tile
    }

    // Find nearest tree
    let targetIdx = findNearestObject(ex, ey, OBJ_TREE, OBJ_PINE, OBJ_PALM, OBJ_CACTUS, 10);
    if (targetIdx != -1) {
        let tx = targetIdx / Y_TILES;
        let ty = targetIdx % Y_TILES;
        
        // Step towards tx, ty
        let dx = tx - ex;
        let dy = ty - ey;
        
        let nx = ex;
        let ny = ey;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            nx += dx > 0 ? 1 : -1;
        } else {
            ny += dy > 0 ? 1 : -1;
        }

        if (nx >= 0 && nx < X_TILES && ny >= 0 && ny < Y_TILES) {
            let nType = tile_type[nx * Y_TILES + ny];
            if (nType != 3 && nType != 4) { // Not water
                entity_x[id] = nx;
                entity_y[id] = ny;
            }
        }
    } else {
        // Random wander
        let rx = (Math.random() * 3) - 1;
        let ry = (Math.random() * 3) - 1;
        let nx = ex + Math.floor(rx) as i32;
        let ny = ey + Math.floor(ry) as i32;
        
        if (nx >= 0 && nx < X_TILES && ny >= 0 && ny < Y_TILES) {
            let nType = tile_type[nx * Y_TILES + ny];
            if (nType != 3 && nType != 4) { // Not water
                entity_x[id] = nx;
                entity_y[id] = ny;
            }
        }
    }
}
