"use strict";
/**
 * The base class that all the entities inherit their components and behaviour from.
 */
class Entity {
    constructor(living, movable, viewColor) {
        this.ticksAlive = 0;
        this.process = () => { }; // Called every frame
        this.move = () => { return Vector2(0, 0); }; // Called every frame to move the entity if possible
        this.isLiving = living;
        this.isMovable = movable;
        this.color = viewColor;
        if (!this.isMovable) {
            this.move = null;
        }
    }
}
