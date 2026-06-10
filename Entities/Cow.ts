class Cow extends Entity {
    /** The radius of the search square that is used to find the cow's next position */
    radarLength: number = 8;

    constructor() {
        super(true, true, "#f5f5f5"); // Off-white/spotted background
        this.stateText = "Grazing";
    }

    move: ((currentX: number, currentY: number) => Vector2) | null = (currentX, currentY) => {
        // Hunger ticking
        this.hunger = Math.min(100, this.hunger + 0.25); // Slightly slower than sheep
        if (this.hunger >= 100) {
            this.health = Math.max(0, this.health - 2);
        } else {
            this.health = Math.min(100, this.health + 0.1);
        }

        if (this.health <= 0) {
            this.stateText = "Dead";
            return Vector2(0, 0);
        }

        var deviation: Vector2 = Vector2(0, 0);

        if (this.moveQueue.length > 0) {
            deviation.x = this.moveQueue[0].x - currentX;
            deviation.y = this.moveQueue[0].y - currentY;
            this.moveQueue.shift();
            return deviation;
        }

        // 1. Run away from Wolf (within 5 tiles) using constructor name to avoid load order issues
        var nearestWolf: Vector2 | null = null;
        for (var dx = -5; dx <= 5; dx++) {
            for (var dy = -5; dy <= 5; dy++) {
                var tx = currentX + dx;
                var ty = currentY + dy;
                if (world[tx] && world[tx][ty]) {
                    var tile = world[tx][ty];
                    if (tile.entities.some(e => e && e.constructor && e.constructor.name === "Wolf")) {
                        nearestWolf = Vector2(tx, ty);
                        break;
                    }
                }
            }
            if (nearestWolf) break;
        }

        if (nearestWolf) {
            this.stateText = "Fleeing Wolf!";
            var fleeDirX = currentX - nearestWolf.x;
            var fleeDirY = currentY - nearestWolf.y;
            var stepX = fleeDirX === 0 ? 0 : (fleeDirX > 0 ? 1 : -1);
            var stepY = fleeDirY === 0 ? 0 : (fleeDirY > 0 ? 1 : -1);
            
            var targetX = currentX + stepX;
            var targetY = currentY + stepY;
            if (world[targetX] && world[targetX][targetY] && world[targetX][targetY].canBeTraversed()) {
                return Vector2(stepX, stepY);
            } else {
                if (stepX !== 0 && world[currentX + stepX] && world[currentX + stepX][currentY] && world[currentX + stepX][currentY].canBeTraversed()) {
                    return Vector2(stepX, 0);
                }
                if (stepY !== 0 && world[currentX] && world[currentX][currentY + stepY] && world[currentX][currentY + stepY].canBeTraversed()) {
                    return Vector2(0, stepY);
                }
            }
        }

        // 2. If hungry, eat grass/wheat/shrub on current tile
        if (this.hunger > 30) {
            this.stateText = "Searching Food";
            var currentTile = world[currentX][currentY];
            var foodIdx = currentTile.worldObjects.findIndex(o => o.name === "shrub" || o.name === "wheat");
            if (foodIdx !== -1) {
                currentTile.worldObjects.splice(foodIdx, 1);
                this.hunger = Math.max(0, this.hunger - 50);
                //@ts-ignore
                drawTileToOffscreen(currentX, currentY);
                this.stateText = "Grazing";
                return Vector2(0, 0);
            }

            var nearestFood = this.findNearest(currentX, currentY, this.radarLength, (tile) => {
                return tile.worldObjects.some(o => o.name === "shrub" || o.name === "wheat");
            });

            if (nearestFood) {
                var now = performance.now();
                if (now - this.lastPathfindTime >= this.pathfindCooldown) {
                    this.lastPathfindTime = now;
                    this.moveTo(Vector2(currentX, currentY), nearestFood);
                }
            }
        }

        // 3. Wander around
        this.stateText = "Grazing";
        var now = performance.now();
        if (now - this.lastPathfindTime >= this.pathfindCooldown) {
            this.lastPathfindTime = now;
            var wanderPos = this.getRandomPos(currentX, currentY, 3);
            this.moveTo(Vector2(currentX, currentY), wanderPos);
        }

        return deviation;
    }
}
