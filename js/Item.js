"use strict";
const ITEM_GOLD_VALUES = {
    "Wood": 1,
    "Stone": 2,
    "Berry": 2,
    "Apple": 3,
    "Wheat": 4,
    "Fish": 5,
    "Shell": 1
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
