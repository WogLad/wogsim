class Sheep extends Entity {
    /** The radius of the search square that is used to find the sheep's next position */
    radarLength: number = 8;
    /** Tracks whether this sheep is inside a fenced pen (updated each move tick) */
    isPenned: boolean = false;
    /** Timestamp of last successful feed from town hall stockpile */
    lastFeedTime: number = 0;

    constructor() {
        super(true, true, "white");
        this.stateText = "Grazing";
        // Stagger initial feed timers so all animals don't hit the stockpile simultaneously
        this.lastFeedTime = performance.now() - Math.random() * 20000;
    }

    move: ((currentX: number, currentY: number) => Vector2) | null = (currentX, currentY) => {
        // Detect if this sheep is inside a fenced pen by checking adjacent tiles
        this.isPenned = false;
        var checkOffsets = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
        for (var ci = 0; ci < checkOffsets.length; ci++) {
            var nx = currentX + checkOffsets[ci][0];
            var ny = currentY + checkOffsets[ci][1];
            if (world[nx] && world[nx][ny] && world[nx][ny].worldObjects.some(o => o.name === "fence")) {
                this.isPenned = true;
                break;
            }
        }

        // Hunger ticking
        this.hunger = Math.min(100, this.hunger + 0.03);
        if (this.hunger >= 100) {
            this.health = Math.max(0, this.health - 2);
        } else {
            this.health = Math.min(100, this.health + 0.1);
        }

        // Penned animals eat from the nearest town hall stockpile every 20 seconds
        if (this.isPenned) {
            var feedNow = performance.now();
            if (feedNow - this.lastFeedTime >= 20000) {
                // Find nearest town_hall that has food
                var hallPos = this.findNearest(currentX, currentY, 20, (tile) => {
                    return tile.worldObjects.some(o =>
                        o.name === "town_hall" &&
                        o.stockpile !== undefined &&
                        ((o.stockpile["wheat"] || 0) > 0 || (o.stockpile["apple"] || 0) > 0 || (o.stockpile["berry"] || 0) > 0)
                    );
                });
                if (hallPos) {
                    var hallTile = world[hallPos.x][hallPos.y];
                    var hallObj = hallTile.worldObjects.find(o => o.name === "town_hall" && o.stockpile !== undefined);
                    if (hallObj && hallObj.stockpile) {
                        var sp = hallObj.stockpile;
                        if ((sp["wheat"] || 0) > 0) {
                            sp["wheat"]--;
                        } else if ((sp["apple"] || 0) > 0) {
                            sp["apple"]--;
                        } else {
                            sp["berry"]--;
                        }
                        this.hunger = Math.max(0, this.hunger - 40);
                        this.lastFeedTime = feedNow;
                        this.stateText = "Grazing";
                    }
                } else {
                    // No food available in stockpile — animal goes hungry
                    this.stateText = "Hungry";
                }
            }
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

        // 1. Check if there is a Wolf nearby (within 6 tiles) using constructor name to avoid load order issues
        var nearestWolf: Vector2 | null = null;
        for (var dx = -6; dx <= 6; dx++) {
            for (var dy = -6; dy <= 6; dy++) {
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
            
            // Check if target tile is traversable
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

        // 2. If hungry and NOT penned, graze on shrub or wheat in the wild
        if (this.hunger > 30 && !this.isPenned) {
            this.stateText = "Searching Food";
            var currentTile = world[currentX][currentY];
            var foodIdx = currentTile.worldObjects.findIndex(o => o.name === "shrub" || o.name === "wheat");
            if (foodIdx !== -1) {
                currentTile.worldObjects.splice(foodIdx, 1);
                this.hunger = Math.max(0, this.hunger - 40);
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

        // 3. Otherwise, wander
        this.stateText = "Grazing";
        var now = performance.now();
        if (now - this.lastPathfindTime >= this.pathfindCooldown) {
            this.lastPathfindTime = now;
            var wanderPos = this.getRandomPos(currentX, currentY, 4);
            this.moveTo(Vector2(currentX, currentY), wanderPos);
        }

        return deviation;
    }
}
