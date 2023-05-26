"use strict";
class Human extends Entity {
    constructor(living, movable) {
        super(living, movable);
        this.process = () => {
            // Code to be ran every frame goes here.
        };
        this.move = () => {
            return Vector2(0, 0);
        };
    }
}
