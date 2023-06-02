"use strict";
/**
 * The base class that all the entities inherit their components and behaviour from.
 */
class Entity {
    constructor(living, movable, viewColor) {
        this.id = crypto.randomUUID();
        this.ticksAlive = 0;
        this.moveQueue = [];
        this.process = () => { }; // Called every frame
        this.move = (currentX, currentY) => { return Vector2(0, 0); }; // Called every frame to move the entity if possible
        this.isLiving = living;
        this.isMovable = movable;
        this.color = viewColor;
        if (!this.isMovable) {
            this.move = null;
        }
    }
    moveTo(startPos, endPos) {
        //@ts-ignore
        this.moveQueue = astar.search(aStarGrid, aStarGrid.grid[startPos.x][startPos.y], aStarGrid.grid[endPos.x][endPos.y]);
    }
    getRandomPos() {
        return Vector2(Math.floor(Math.random() * X_TILES), Math.floor(Math.random() * Y_TILES));
    }
}
