"use strict";
const ITEM_GOLD_VALUES = {
    "Wood": 2,
    "Stone": 2,
    "Berry": 2,
    "Apple": 3,
    "Wheat": 4,
    "Fish": 3,
    "Shell": 1,
    "Tree Seed": 1,
    "Pine Seed": 1,
    "Palm Seed": 1,
    "Wheat Seed": 1,
    "Shrub Seed": 1,
    "Cactus Seed": 1
};
class Item {
    constructor(name) {
        this.name = name;
        this.goldValue = ITEM_GOLD_VALUES[name] || 0;
    }
}
class Tool extends Item {
    constructor(name) {
        super(name);
    }
}
