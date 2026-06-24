import { Y_TILES, X_TILES, tile_object, tile_item } from "./index";

export const MAX_ENTITIES = 500000;

// Object Type Enums
export const OBJ_NONE = 0;
export const OBJ_TREE = 1;
export const OBJ_PINE = 2;
export const OBJ_PALM = 3;
export const OBJ_CACTUS = 4;
export const OBJ_SHRUB = 5;
export const OBJ_WHEAT = 6;
export const OBJ_REED = 7;
export const OBJ_STONE = 8;
export const OBJ_CAMPFIRE = 9;
export const OBJ_TOWNHALL = 10;
export const OBJ_HOUSE = 11;
export const OBJ_STORAGE = 12;
export const OBJ_FENCE = 13;
export const OBJ_FISH = 14;

export const ITEM_NONE = 0;
export const ITEM_APPLE = 1;
export const ITEM_BERRY = 2;
export const ITEM_SHELL = 3;
export const ITEM_WOOD = 4;

export function spawnResourceWasm(x: i32, y: i32, type: i32, multiplier: f32): void {
    let rand = Math.random() / multiplier;
    let idx = x * Y_TILES + y;
    
    if (type == 0) { // DARK_GRASS
        if (rand < 0.40) tile_object[idx] = OBJ_TREE;
        else if (rand < 0.50) tile_item[idx] = ITEM_APPLE;
    } 
    else if (type == 1) { // GRASS
        if (rand < 0.08) tile_object[idx] = OBJ_WHEAT;
        else if (rand < 0.16) tile_object[idx] = OBJ_SHRUB;
        else if (rand < 0.22) tile_item[idx] = ITEM_APPLE;
    } 
    else if (type == 6) { // DESERT
        if (rand < 0.15) tile_object[idx] = OBJ_CACTUS;
    } 
    else if (type == 7) { // SWAMP
        if (rand < 0.25) tile_object[idx] = OBJ_REED;
        else if (rand < 0.40) tile_item[idx] = ITEM_BERRY;
    } 
    else if (type == 3 || type == 4) { // WATER
        if (rand < 0.08) tile_object[idx] = OBJ_FISH;
    } 
    else if (type == 8) { // SNOW
        if (rand < 0.15) tile_object[idx] = OBJ_STONE;
        else if (rand < 0.25) tile_object[idx] = OBJ_PINE;
    } 
    else if (type == 5) { // SAND
        if (rand < 0.05) tile_object[idx] = OBJ_PALM;
        else if (rand < 0.15) tile_item[idx] = ITEM_SHELL;
    }
}
