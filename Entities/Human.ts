class Human extends Entity {
    /** The letter that is displayed on the human to denote its assigned profession */
    professionLetter: string;
    /** The function that is called when a human has to find their next spot to move to for their profession */
    professionMover: (currentX: number, currentY: number) => Vector2 = (x,y) => {return Vector2(0,0)};

    constructor(professionLetter: string) {
        super(true, true, "red");
        this.professionLetter = professionLetter;
    }

    process: () => void = () => {
        // Code to be ran every frame goes here.
    }

    move: ((currentX: number, currentY: number) => Vector2) | null = (currentX, currentY) => {
        // Code to calculate the new position of the entity goes here.
        
        // DONE: Make the human walk towards the left.
        // DONE: Implement A* pathfinding for the humans to find food.

        var deviation: Vector2 = Vector2(0,0); // The change made to the current position of the entity

        if (this.moveQueue.length > 0) {
            deviation.x = this.moveQueue[0].x - currentX;
            deviation.y = this.moveQueue[0].y - currentY;
            this.moveQueue.shift(); // Removes the first grid node after moving to it (for A*)
        }
        else {
            this.moveTo(Vector2(currentX,currentY), this.professionMover(currentX, currentY)); // DONE: Change this to use a random movement function
        }

        // Prevents the entity from going out of bounds
        if (currentX + deviation.x < 0 || currentX + deviation.x > (X_TILES-1)) {
            deviation.x = 0;
        }
        if (currentY + deviation.y < 0 || currentY + deviation.y > (Y_TILES-1)) {
            deviation.y = 0;
        }

        return deviation; // Return the entity's deviation
    }
}