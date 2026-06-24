"use strict";
class Sheep extends Entity {
    constructor(customGenome) {
        super(true, true, "white", customGenome);
        /** The radius of the search square that is used to find the sheep's next position */
        this.radarLength = 8;
        /** Tracks whether this sheep is inside a fenced pen (updated each move tick) */
        this.isPenned = false;
        /** Timestamp of last successful feed from town hall stockpile */
        this.lastFeedTime = 0;
        this.move = (currentX, currentY) => {
            // Detect if this sheep is inside a fenced pen by checking adjacent tiles
            this.isPenned = false;
            var checkOffsets = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
            for (var ci = 0; ci < checkOffsets.length; ci++) {
                var nx = currentX + checkOffsets[ci][0];
                var ny = currentY + checkOffsets[ci][1];
                if (world[nx] && world[nx][ny] && world[nx][ny].worldObjects.some(o => o.name === "fence")) {
                    this.isPenned = true;
                    break;
                }
            }
            // Hunger ticking scaled by hungerRateGene
            this.hunger = Math.min(100, this.hunger + 0.03 * this.genome.hungerRateGene);
            if (this.hunger >= 100) {
                this.health = Math.max(0, this.health - 2);
            }
            else {
                this.health = Math.min(100, this.health + 0.1);
            }
            // Penned animals eat from the nearest town hall stockpile every 20 seconds
            if (this.isPenned) {
                var feedNow = performance.now();
                if (feedNow - this.lastFeedTime >= 20000) {
                    // Find nearest town_hall that has surplus food
                    var hallPos = this.findNearest(currentX, currentY, 20, (tile) => {
                        return tile.worldObjects.some(o => o.name === "town_hall" &&
                            o.stockpile !== undefined &&
                            ((o.stockpile["wheat"] || 0) > 5 || (o.stockpile["apple"] || 0) > 5 || (o.stockpile["berry"] || 0) > 5));
                    });
                    if (hallPos) {
                        var hallTile = world[hallPos.x][hallPos.y];
                        var hallObj = hallTile.worldObjects.find(o => o.name === "town_hall" && o.stockpile !== undefined);
                        if (hallObj && hallObj.stockpile) {
                            var sp = hallObj.stockpile;
                            if ((sp["wheat"] || 0) > 5) {
                                sp["wheat"]--;
                            }
                            else if ((sp["apple"] || 0) > 5) {
                                sp["apple"]--;
                            }
                            else {
                                sp["berry"]--;
                            }
                            this.hunger = Math.max(0, this.hunger - 40);
                            this.lastFeedTime = feedNow;
                            this.stateText = "Grazing";
                        }
                    }
                    else {
                        // Try to graze locally on grass or swamp tile
                        var currentTile = world[currentX][currentY];
                        if (currentTile.type === TileType.GRASS || currentTile.type === TileType.DARK_GRASS || currentTile.type === TileType.SWAMP) {
                            this.hunger = Math.max(0, this.hunger - 30);
                            this.lastFeedTime = feedNow;
                            this.stateText = "Grazing Grass";
                        }
                        else {
                            // No food available in stockpile and no grass — animal goes hungry
                            this.stateText = "Hungry";
                        }
                    }
                }
            }
            if (this.health <= 0) {
                this.stateText = "Dead";
                return Vector2(0, 0);
            }
            var deviation = Vector2(0, 0);
            if (this.moveQueue.length > this.moveQueueIndex) {
                deviation.x = this.moveQueue[this.moveQueueIndex].x - currentX;
                deviation.y = this.moveQueue[this.moveQueueIndex].y - currentY;
                this.moveQueueIndex++;
                if (this.moveQueueIndex >= this.moveQueue.length) {
                    this.moveQueue.length = 0;
                    this.moveQueueIndex = 0;
                }
                return deviation;
            }
            // 1. Check if there is a Wolf nearby (within 6 tiles) using findNearest for efficiency
            var nearestWolf = this.findNearest(currentX, currentY, 6, (tile) => {
                for (var ei = 0; ei < tile.entities.length; ei++) {
                    if (tile.entities[ei].entityType === ENTITY_TYPE_WOLF)
                        return true;
                }
                return false;
            });
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
                }
                else {
                    if (stepX !== 0 && world[currentX + stepX] && world[currentX + stepX][currentY] && world[currentX + stepX][currentY].canBeTraversed()) {
                        return Vector2(stepX, 0);
                    }
                    if (stepY !== 0 && world[currentX] && world[currentX][currentY + stepY] && world[currentX][currentY + stepY].canBeTraversed()) {
                        return Vector2(0, stepY);
                    }
                }
            }
            // Mating check
            let receptive = this.ticksAlive > 2000 && this.hunger < 40 && (this.ticksAlive - this.lastMatingTick > this.matingCooldown);
            //@ts-ignore
            let currentLimit = (typeof MAX_ENTITIES_LIMIT !== "undefined") ? MAX_ENTITIES_LIMIT : 150;
            if (receptive && entities.length < currentLimit) {
                let partnerPos = this.findNearest(currentX, currentY, 8, (tile) => {
                    for (var ei = 0; ei < tile.entities.length; ei++) {
                        var e = tile.entities[ei];
                        if (e !== this && e.entityType === ENTITY_TYPE_SHEEP && e.isLiving) {
                            let isPartnerPenned = e.isPenned;
                            if (isPartnerPenned !== this.isPenned)
                                continue;
                            let isPartnerReceptive = e.ticksAlive > 2000 && e.hunger < 40 && (e.ticksAlive - e.lastMatingTick > e.matingCooldown);
                            if (isPartnerReceptive)
                                return true;
                        }
                    }
                    return false;
                });
                if (partnerPos) {
                    this.stateText = "Seeking Mate";
                    if (Math.abs(currentX - partnerPos.x) <= 1 && Math.abs(currentY - partnerPos.y) <= 1) {
                        let partnerTile = world[partnerPos.x][partnerPos.y];
                        let partner = partnerTile.entities.find(e => e !== this && e.entityType === ENTITY_TYPE_SHEEP && e.isLiving);
                        if (partner) {
                            let spawned = false;
                            for (let dx = -1; dx <= 1 && !spawned; dx++) {
                                for (let dy = -1; dy <= 1 && !spawned; dy++) {
                                    let bx = currentX + dx;
                                    let by = currentY + dy;
                                    if (world[bx] && world[bx][by]) {
                                        let bTile = world[bx][by];
                                        //@ts-ignore
                                        let entLimit = (typeof TILE_ENTITY_LIMIT !== "undefined") ? TILE_ENTITY_LIMIT : 2;
                                        if (bTile.canBeTraversed() && bTile.entities.length < entLimit && bTile.worldObjects.length === 0) {
                                            let babyGenome = Entity.crossoverAndMutate(this, partner);
                                            let baby = new Sheep(babyGenome);
                                            baby.isPenned = this.isPenned;
                                            bTile.addEntity(baby);
                                            entities.push({ entity: baby, pos: Vector2(bx, by) });
                                            incrementEntityCount(baby);
                                            this.lastMatingTick = this.ticksAlive;
                                            partner.lastMatingTick = partner.ticksAlive;
                                            this.hunger = Math.min(100, this.hunger + 40);
                                            partner.hunger = Math.min(100, partner.hunger + 40);
                                            this.stateText = "Grazing";
                                            partner.stateText = "Grazing";
                                            spawned = true;
                                            //@ts-ignore
                                            if (typeof TestTools !== "undefined") {
                                                //@ts-ignore
                                                TestTools.updateStats();
                                            }
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        return Vector2(0, 0);
                    }
                    else {
                        var now = performance.now();
                        if (now - this.lastPathfindTime >= this.pathfindCooldown) {
                            this.lastPathfindTime = now;
                            this.moveTo(Vector2(currentX, currentY), partnerPos);
                        }
                        return Vector2(0, 0);
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
        };
        this.entityType = ENTITY_TYPE_SHEEP;
        this.stateText = "Grazing";
        // Stagger initial feed timers so all animals don't hit the stockpile simultaneously
        this.lastFeedTime = performance.now() - Math.random() * 20000;
    }
}
