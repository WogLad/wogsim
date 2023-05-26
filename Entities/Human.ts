class Human extends Entity {
    constructor() {
        super(true, true);
    }

    process: () => void = () => {
        // Code to be ran every frame goes here.
    }

    move: (() => Vector2) | null = () => {
        // Code to calculate the new position of the entity goes here.
        // console.log(this.ticksAlive);

        return Vector2(0,0); // Return the entity's new position
    }
}