"use strict";
class Woodcutter extends Human {
    constructor() {
        super("W");
        this.addToInventory(new Tool("Stone Axe"));
    }
}
