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

        var newPos: Vector2 = Vector2(0,0);

        newPos.x = -1; // For left movement

        // Prevents the entity from going out of bounds
        if (currentX <= 0 || currentX >= (world[0].length-1)) {
            newPos.x = 0;
        }
        if (currentY <= 0 || currentY >= (world.length-1)) {
            newPos.y = 0;
        }

        return newPos; // Return the entity's new position
    }
}