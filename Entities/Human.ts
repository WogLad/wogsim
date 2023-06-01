class Human extends Entity {
    constructor() {
        super(true, true, "red");
    }

    process: () => void = () => {
        // Code to be ran every frame goes here.
    }

    move: ((currentX: number, currentY: number) => Vector2) | null = (currentX, currentY) => {
        // Code to calculate the new position of the entity goes here.
        
        // DONE: Make the human walk towards the left.
        // TODO: Implement A* pathfinding for the humans to find food.

        var deviation: Vector2 = Vector2(0,0); // The change made to the current position of the entity

        deviation.x = 1;
        // deviation.y = -1;

        // Prevents the entity from going out of bounds
        if (currentX + deviation.x < 0 || currentX + deviation.x > (world[0].length-1)) {
            deviation.x = 0;
        }
        if (currentY + deviation.y < 0 || currentY + deviation.y > (world.length-1)) {
            deviation.y = 0;
        }

        return deviation; // Return the entity's deviation
    }
}