/**
 * The base class that all the entities inherit their components and behaviour from.
 */
class Entity {
    id: string = crypto.randomUUID();
    ticksAlive: number = 0;
    color: string;
    
    isLiving: boolean;
    isMovable: boolean;

    process: () => void = () => {}; // Called every frame
    move: ((currentX: number, currentY: number) => Vector2) | null = (currentX: number, currentY: number) => {return Vector2(0,0)}; // Called every frame to move the entity if possible

    constructor(living: boolean, movable: boolean, viewColor: string) {
        this.isLiving = living;
        this.isMovable = movable;
        this.color = viewColor;

        if (!this.isMovable) {
            this.move = null;
        }
    }
}