"use strict";
// Entity type constants for fast type identification (avoids constructor.name string comparison)
const ENTITY_TYPE_UNKNOWN = 0;
const ENTITY_TYPE_WOODCUTTER = 1;
const ENTITY_TYPE_FISHERMAN = 2;
const ENTITY_TYPE_MINER = 3;
const ENTITY_TYPE_FARMER = 4;
const ENTITY_TYPE_SHEEP = 5;
const ENTITY_TYPE_COW = 6;
const ENTITY_TYPE_WOLF = 7;
/**
 * The base class that all the entities inherit their components and behaviour from.
 */
class Entity {
    constructor(living, movable, viewColor, customGenome) {
        this.id = (Entity._nextId++).toString(36);
        this.entityType = ENTITY_TYPE_UNKNOWN;
        this.ticksAlive = 0;
        this.maxAge = 20000; // Max lifespan in ticks (scaled by lifespanGene)
        this.lastPathfindTime = 0;
        this.pathfindCooldown = 2000; // 2 seconds in milliseconds
        this.health = 100;
        this.hunger = 0;
        this.stateText = "Idle";
        this.gold = 0;
        this.ownsHouse = false;
        this.lastMatingTick = 0;
        this.matingCooldown = 4000;
        this.moveQueue = [];
        this.moveQueueIndex = 0;
        this.inventory = [];
        this.process = () => { }; // Called every frame
        this.move = (currentX, currentY) => { return Vector2(0, 0); }; // Called every frame to move the entity if possible
        this.isLiving = living;
        this.isMovable = movable;
        this.color = viewColor;
        if (!this.isMovable) {
            this.move = null;
        }
        // Initialize or inherit genome
        if (customGenome) {
            this.genome = customGenome;
        }
        else {
            this.genome = {
                lifespanGene: 0.8 + Math.random() * 0.4,
                hungerRateGene: 0.8 + Math.random() * 0.4,
                speedGene: 0.8 + Math.random() * 0.4
            };
        }
        // Apply genetic properties
        this.maxAge = Math.round(20000 * this.genome.lifespanGene);
        this.matingCooldown = 3000 + Math.random() * 2000;
        this.lastMatingTick = 0;
        // Add random jitter to cooldown length (1.5s to 2.5s) to prevent sync over time
        this.pathfindCooldown = 1500 + Math.random() * 1000;
        // Stagger initial check times so they start searching at different frames
        this.lastPathfindTime = performance.now() - Math.random() * this.pathfindCooldown;
    }
    getTotalItemCount() {
        return this.inventory.reduce((acc, entry) => acc + entry.count, 0);
    }
    eatFood() {
        var foodIdx = this.inventory.findIndex(entry => (entry.item.name === "Apple" || entry.item.name === "Fish" || entry.item.name === "Berry" || entry.item.name === "Wheat") && entry.count > 0);
        if (foodIdx !== -1) {
            var entry = this.inventory[foodIdx];
            entry.count--;
            if (entry.count <= 0) {
                this.inventory.splice(foodIdx, 1);
            }
            var hungerReduction = entry.item.goldValue * 10;
            this.hunger = Math.max(0, this.hunger - hungerReduction);
            return true;
        }
        return false;
    }
    static crossoverAndMutate(parentA, parentB) {
        // Crossover
        let lifespan = Math.random() < 0.5 ? parentA.genome.lifespanGene : parentB.genome.lifespanGene;
        let hunger = Math.random() < 0.5 ? parentA.genome.hungerRateGene : parentB.genome.hungerRateGene;
        let speed = Math.random() < 0.5 ? parentA.genome.speedGene : parentB.genome.speedGene;
        // Mutation (10% chance per gene, adjusting up to +/- 15%)
        if (Math.random() < 0.10)
            lifespan += (Math.random() - 0.5) * 0.3;
        if (Math.random() < 0.10)
            hunger += (Math.random() - 0.5) * 0.3;
        if (Math.random() < 0.10)
            speed += (Math.random() - 0.5) * 0.3;
        // Clamp values to valid genetic bounds
        lifespan = Math.max(0.5, Math.min(2.0, lifespan));
        hunger = Math.max(0.5, Math.min(2.0, hunger));
        speed = Math.max(0.5, Math.min(2.0, speed));
        return {
            lifespanGene: lifespan,
            hungerRateGene: hunger,
            speedGene: speed
        };
    }
    moveTo(startPos, endPos) {
        //@ts-ignore
        this.moveQueue = findWasmPath(startPos.x, startPos.y, endPos.x, endPos.y);
        this.moveQueueIndex = 0;
    }
    getRandomPos(currentX, currentY, radius = 10) {
        for (let attempt = 0; attempt < 30; attempt++) {
            var randomX = Math.floor(Math.random() * (radius * 2 + 1)) + (currentX - radius);
            var randomY = Math.floor(Math.random() * (radius * 2 + 1)) + (currentY - radius);
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
            if (world[randomX] && world[randomX][randomY] && world[randomX][randomY].canBeTraversed()) {
                return Vector2(randomX, randomY);
            }
        }
        return Vector2(currentX, currentY);
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
        var xMin = Math.max(0, currentX - maxRadius);
        var xMax = Math.min(X_TILES - 1, currentX + maxRadius);
        var yMin = Math.max(0, currentY - maxRadius);
        var yMax = Math.min(Y_TILES - 1, currentY + maxRadius);
        for (var d = 1; d <= maxRadius; d++) {
            // 1. Top row: y = currentY - d, x from currentX - d to currentX + d
            var y = currentY - d;
            if (y >= yMin) {
                var rowXMin = Math.max(xMin, currentX - d);
                var rowXMax = Math.min(xMax, currentX + d);
                for (var x = rowXMin; x <= rowXMax; x++) {
                    if (predicate(world[x][y], x, y)) {
                        return Vector2(x, y);
                    }
                }
            }
            // 2. Bottom row: y = currentY + d, x from currentX - d to currentX + d
            y = currentY + d;
            if (y <= yMax) {
                var rowXMin = Math.max(xMin, currentX - d);
                var rowXMax = Math.min(xMax, currentX + d);
                for (var x = rowXMin; x <= rowXMax; x++) {
                    if (predicate(world[x][y], x, y)) {
                        return Vector2(x, y);
                    }
                }
            }
            // 3. Left column: x = currentX - d, y from currentY - d + 1 to currentY + d - 1
            var x = currentX - d;
            if (x >= xMin) {
                var colYMin = Math.max(yMin, currentY - d + 1);
                var colYMax = Math.min(yMax, currentY + d - 1);
                for (var yVal = colYMin; yVal <= colYMax; yVal++) {
                    if (predicate(world[x][yVal], x, yVal)) {
                        return Vector2(x, yVal);
                    }
                }
            }
            // 4. Right column: x = currentX + d, y from currentY - d + 1 to currentY + d - 1
            x = currentX + d;
            if (x <= xMax) {
                var colYMin = Math.max(yMin, currentY - d + 1);
                var colYMax = Math.min(yMax, currentY + d - 1);
                for (var yVal = colYMin; yVal <= colYMax; yVal++) {
                    if (predicate(world[x][yVal], x, yVal)) {
                        return Vector2(x, yVal);
                    }
                }
            }
        }
        return null;
    }
}
Entity._nextId = 1;
