/**
 * The base class that all the entities inherit their components and behaviour from.
 */
class Entity {
    isLiving: boolean;
    isMovable: boolean;

    process: () => void = () => {}; // Called every frame
    move: (() => Vector2) | null = () => {return Vector2(0,0)}; // Called every frame to move the entity if possible

    constructor(living: boolean, movable: boolean) {
        this.isLiving = living;
        this.isMovable = movable;

        if (!this.isMovable) {
            this.move = null;
        }
    }
}