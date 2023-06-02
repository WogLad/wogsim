"use strict";
class Human extends Entity {
    constructor() {
        super(true, true, "red");
        this.process = () => {
            // Code to be ran every frame goes here.
        };
        this.move = (currentX, currentY) => {
            // Code to calculate the new position of the entity goes here.
            // DONE: Make the human walk towards the left.
            // TODO: Implement A* pathfinding for the humans to find food.
            var deviation = Vector2(0, 0); // The change made to the current position of the entity
            // deviation.x = 1; // TODO: Change this to use a random movement function
            if (this.moveQueue.length > 0) {
                deviation.x = this.moveQueue[0].x - currentX;
                deviation.y = this.moveQueue[0].y - currentY;
                this.moveQueue.shift(); // Removes the first grid node after moving to it (for A*)
            }
            // Prevents the entity from going out of bounds
            if (currentX + deviation.x < 0 || currentX + deviation.x > (world[0].length - 1)) {
                deviation.x = 0;
            }
            if (currentY + deviation.y < 0 || currentY + deviation.y > (world.length - 1)) {
                deviation.y = 0;
            }
            // console.log(deviation);
            return deviation; // Return the entity's deviation
        };
    }
}
