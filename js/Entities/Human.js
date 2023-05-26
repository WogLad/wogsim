"use strict";
class Human extends Entity {
    constructor() {
        super(true, true);
        this.process = () => {
            // Code to be ran every frame goes here.
        };
        this.move = () => {
            // Code to calculate the new position of the entity goes here.
            // console.log(this.ticksAlive);
            return Vector2(0, 0); // Return the entity's new position
        };
    }
}
