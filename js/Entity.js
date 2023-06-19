"use strict";
/**
 * The base class that all the entities inherit their components and behaviour from.
 */
class Entity {
    constructor(living, movable, viewColor) {
        this.id = crypto.randomUUID();
        this.ticksAlive = 0;
        this.moveQueue = [];
        this.inventory = [];
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
    getRandomPos(currentX, currentY, radius = 10) {
        var randomX = Math.floor(Math.random() * ((currentX + radius) - (currentX - radius))) + (currentX - radius);
        var randomY = Math.floor(Math.random() * ((currentY + radius) - (currentY - radius))) + (currentY - radius);
        if (randomX < 0) {
            randomX = 0;
        }
        if (randomX > X_TILES - 1) {
            randomX = X_TILES - 1;
        }
        if (randomY < 0) {
            randomY = 0;
        }
        if (randomY > Y_TILES - 1) {
            randomY = Y_TILES - 1;
        }
        return Vector2(randomX, randomY);
    }
    addToInventory(item, count = 1) {
        if (this.inventory.length >= INVENTORY_MAX_CAPACITY) {
            return false;
        }
        for (var i = 0; i < count; i++) {
            this.inventory.push(item);
        }
        return true;
    }
}
