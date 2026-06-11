interface Genome {
    lifespanGene: number;      // 0.6 to 1.4 (scales base lifespan of 20000 ticks)
    hungerRateGene: number;    // 0.6 to 1.4 (multiplier for hunger ticking speed)
    speedGene: number;         // 0.6 to 1.4 (multiplier for movement cooldown delay)
}

/**
 * The base class that all the entities inherit their components and behaviour from.
 */
class Entity {
    id: string = crypto.randomUUID();
    ticksAlive: number = 0;
    maxAge: number = 20000; // Max lifespan in ticks (scaled by lifespanGene)
    color: string;
    
    lastPathfindTime: number = 0;
    pathfindCooldown: number = 2000; // 2 seconds in milliseconds
    
    isLiving: boolean;
    isMovable: boolean;

    health: number = 100;
    hunger: number = 0;
    stateText: string = "Idle";
    gold: number = 0;
    ownsHouse: boolean = false;

    // Genetic Properties
    genome: Genome;
    lastMatingTick: number = 0;
    matingCooldown: number = 4000;

    moveQueue: GridNode[] = [];
    inventory: { item: Item, count: number }[] = [];

    process: () => void = () => {}; // Called every frame
    move: ((currentX: number, currentY: number) => Vector2) | null = (currentX: number, currentY: number) => {return Vector2(0,0)}; // Called every frame to move the entity if possible

    getTotalItemCount(): number {
        return this.inventory.reduce((acc, entry) => acc + entry.count, 0);
    }

    eatFood(): boolean {
        var foodIdx = this.inventory.findIndex(entry => 
            (entry.item.name === "Apple" || entry.item.name === "Fish" || entry.item.name === "Berry") && entry.count > 0
        );
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

    constructor(living: boolean, movable: boolean, viewColor: string, customGenome?: Genome) {
        this.isLiving = living;
        this.isMovable = movable;
        this.color = viewColor;

        if (!this.isMovable) {
            this.move = null;
        }

        // Initialize or inherit genome
        if (customGenome) {
            this.genome = customGenome;
        } else {
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

    static crossoverAndMutate(parentA: Entity, parentB: Entity): Genome {
        // Crossover
        let lifespan = Math.random() < 0.5 ? parentA.genome.lifespanGene : parentB.genome.lifespanGene;
        let hunger = Math.random() < 0.5 ? parentA.genome.hungerRateGene : parentB.genome.hungerRateGene;
        let speed = Math.random() < 0.5 ? parentA.genome.speedGene : parentB.genome.speedGene;

        // Mutation (10% chance per gene, adjusting up to +/- 15%)
        if (Math.random() < 0.10) lifespan += (Math.random() - 0.5) * 0.3;
        if (Math.random() < 0.10) hunger += (Math.random() - 0.5) * 0.3;
        if (Math.random() < 0.10) speed += (Math.random() - 0.5) * 0.3;

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

    moveTo(startPos: Vector2, endPos: Vector2) {
        //@ts-ignore
        this.moveQueue = findWasmPath(startPos.x, startPos.y, endPos.x, endPos.y);
    }

    getRandomPos(currentX: number, currentY: number, radius: number = 10): Vector2 {
        for (let attempt = 0; attempt < 30; attempt++) {
            var randomX = Math.floor(Math.random() * (radius * 2 + 1)) + (currentX - radius);
            var randomY = Math.floor(Math.random() * (radius * 2 + 1)) + (currentY - radius);
            if (randomX < 0) { randomX = 0; }
            if (randomX > X_TILES-1) { randomX = X_TILES-1; }
            if (randomY < 0) { randomY = 0; }
            if (randomY > Y_TILES-1) { randomY = Y_TILES-1; }
            if (world[randomX] && world[randomX][randomY] && world[randomX][randomY].canBeTraversed()) {
                return Vector2(randomX, randomY);
            }
        }
        return Vector2(currentX, currentY);
    }

    addToInventory(item: Item, count: number = 1): boolean {
        if (this.getTotalItemCount() + count > INVENTORY_MAX_CAPACITY) {
            return false;
        }
        var existing = this.inventory.find(entry => entry.item.name === item.name);
        if (existing) {
            existing.count += count;
        } else {
            this.inventory.push({ item: item, count: count });
        }
        return true;
    }

    findNearest(currentX: number, currentY: number, maxRadius: number, predicate: (tile: WorldTile, x: number, y: number) => boolean): Vector2 | null {
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