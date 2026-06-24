import { X_TILES, Y_TILES, tile_type, tile_object, tile_item } from "./index";
import { spawnResourceWasm } from "./constants";

export function regenerateResourcesWasm(multiplier: f32): void {
    for (let k = 0; k < 50; k++) {
        let rx = Math.floor(Math.random() * X_TILES) as i32;
        let ry = Math.floor(Math.random() * Y_TILES) as i32;
        let idx = rx * Y_TILES + ry;
        
        // Only spawn if tile is empty of objects and items
        if (tile_object[idx] == 0 && tile_item[idx] == 0) {
            let type = tile_type[idx];
            spawnResourceWasm(rx, ry, type, multiplier);
        }
    }
}
