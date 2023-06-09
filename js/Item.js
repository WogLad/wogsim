"use strict";
class Item {
    constructor(name) {
        this.name = name;
    }
}
class Tool extends Item {
    constructor(name) {
        super(name);
    }
}
