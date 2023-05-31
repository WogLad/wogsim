"use strict";
class Human extends Entity {
    constructor() {
        super(true, true, "#613f31");
        this.process = () => {
            // Code to be ran every frame goes here.
        };
        this.move = () => {
            // Code to calculate the new position of the entity goes here.
            // TODO: Make the human walk towards the left.
            // TODO: Implement A* pathfinding for the humans to find food.
            return Vector2(0, 0); // Return the entity's new position
        };
    }
}
