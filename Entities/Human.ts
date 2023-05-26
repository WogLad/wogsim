class Human extends Entity {
    constructor(living: boolean, movable: boolean) {
        super(living, movable);
    }

    process: () => void = () => {
        // Code to be ran every frame goes here.
    }

    move: (() => Vector2) | null = () => {
        // Code to calculate the new position of the entity goes here.
        console.log(1);

        return Vector2(0,0); // Return the entity's new position
    }
}