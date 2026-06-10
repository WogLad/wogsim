"use strict";
/**
 * The base class that all the entities inherit their components and behaviour from.
 */
class Entity {
    constructor(living, movable, viewColor) {
        this.id = crypto.randomUUID();
        this.ticksAlive = 0;
        this.lastPathfindTime = 0;
        this.pathfindCooldown = 2000; // 2 seconds in milliseconds
        this.health = 100;
        this.hunger = 0;
        this.stateText = "Idle";
        this.gold = 0;
        this.ownsHouse = false;
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
        // Add random jitter to cooldown length (1.5s to 2.5s) to prevent sync over time
        this.pathfindCooldown = 1500 + Math.random() * 1000;
        // Stagger initial check times so they start searching at different frames
        this.lastPathfindTime = performance.now() - Math.random() * this.pathfindCooldown;
    }
    getTotalItemCount() {
        return this.inventory.reduce((acc, entry) => acc + entry.count, 0);
    }
    eatFood() {
        var foodIdx = this.inventory.findIndex(entry => (entry.item.name === "Apple" || entry.item.name === "Fish" || entry.item.name === "Berry") && entry.count > 0);
        if (foodIdx !== -1) {
            var entry = this.inventory[foodIdx];
            entry.count--;
            if (entry.count <= 0) {
                this.inventory.splice(foodIdx, 1);
            }
            this.hunger = Math.max(0, this.hunger - 30);
            return true;
        }
        return false;
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
        if (this.getTotalItemCount() + count > INVENTORY_MAX_CAPACITY) {
            return false;
        }
        var existing = this.inventory.find(entry => entry.item.name === item.name);
        if (existing) {
            existing.count += count;
        }
        else {
            this.inventory.push({ item: item, count: count });
        }
        return true;
    }
    findNearest(currentX, currentY, maxRadius, predicate) {
        var centerTile = world[currentX] ? world[currentX][currentY] : undefined;
        if (centerTile && predicate(centerTile, currentX, currentY)) {
            return Vector2(currentX, currentY);
        }
        for (var d = 1; d <= maxRadius; d++) {
            // 1. Top row: y = currentY - d, x from currentX - d to currentX + d
            var y = currentY - d;
            for (var x = currentX - d; x <= currentX + d; x++) {
                if (world[x] !== undefined && world[x][y] !== undefined) {
                    if (predicate(world[x][y], x, y)) {
                        return Vector2(x, y);
                    }
                }
            }
            // 2. Bottom row: y = currentY + d, x from currentX - d to currentX + d
            y = currentY + d;
            for (var x = currentX - d; x <= currentX + d; x++) {
                if (world[x] !== undefined && world[x][y] !== undefined) {
                    if (predicate(world[x][y], x, y)) {
                        return Vector2(x, y);
                    }
                }
            }
            // 3. Left column: x = currentX - d, y from currentY - d + 1 to currentY + d - 1
            var x = currentX - d;
            if (world[x] !== undefined) {
                for (var yVal = currentY - d + 1; yVal <= currentY + d - 1; yVal++) {
                    if (world[x][yVal] !== undefined) {
                        if (predicate(world[x][yVal], x, yVal)) {
                            return Vector2(x, yVal);
                        }
                    }
                }
            }
            // 4. Right column: x = currentX + d, y from currentY - d + 1 to currentY + d - 1
            x = currentX + d;
            if (world[x] !== undefined) {
                for (var yVal = currentY - d + 1; yVal <= currentY + d - 1; yVal++) {
                    if (world[x][yVal] !== undefined) {
                        if (predicate(world[x][yVal], x, yVal)) {
                            return Vector2(x, yVal);
                        }
                    }
                }
            }
        }
        return null;
    }
}
