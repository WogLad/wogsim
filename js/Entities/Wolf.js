"use strict";
class Wolf extends Entity {
    constructor(customGenome) {
        super(true, true, "gray", customGenome);
        /** The radius of the search square that is used to find the wolf's prey */
        this.radarLength = 15;
        this.move = (currentX, currentY) => {
            // Hunger ticking scaled by hungerRateGene
            this.hunger = Math.min(100, this.hunger + 0.03 * this.genome.hungerRateGene);
            if (this.hunger >= 100) {
                this.health = Math.max(0, this.health - 1);
            }
            else {
                this.health = Math.min(100, this.health + 0.1);
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
            // Mating check
            let receptive = this.ticksAlive > 2000 && this.hunger < 40 && (this.ticksAlive - this.lastMatingTick > this.matingCooldown);
            //@ts-ignore
            let currentLimit = (typeof MAX_ENTITIES_LIMIT !== "undefined") ? MAX_ENTITIES_LIMIT : 150;
            if (receptive && entities.length < currentLimit) {
                let partnerPos = this.findNearest(currentX, currentY, 12, (tile) => {
                    for (var ei = 0; ei < tile.entities.length; ei++) {
                        var e = tile.entities[ei];
                        if (e !== this && e.entityType === ENTITY_TYPE_WOLF && e.isLiving) {
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
                        let partner = partnerTile.entities.find(e => e !== this && e.entityType === ENTITY_TYPE_WOLF && e.isLiving);
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
                                            let baby = new Wolf(babyGenome);
                                            bTile.addEntity(baby);
                                            entities.push({ entity: baby, pos: Vector2(bx, by) });
                                            incrementEntityCount(baby);
                                            this.lastMatingTick = this.ticksAlive;
                                            partner.lastMatingTick = partner.ticksAlive;
                                            this.hunger = Math.min(100, this.hunger + 50);
                                            partner.hunger = Math.min(100, partner.hunger + 50);
                                            this.stateText = "Hunting";
                                            partner.stateText = "Hunting";
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
            // 1. Scan for nearest Sheep or Cow in radar range using findNearest
            var nearestPreyPos = null;
            var nearestPreyEntity = null;
            nearestPreyPos = this.findNearest(currentX, currentY, this.radarLength, (tile) => {
                for (var ei = 0; ei < tile.entities.length; ei++) {
                    var ent = tile.entities[ei];
                    if (ent.entityType === ENTITY_TYPE_SHEEP || ent.entityType === ENTITY_TYPE_COW) {
                        return true;
                    }
                }
                return false;
            });
            if (nearestPreyPos) {
                var preyTile = world[nearestPreyPos.x][nearestPreyPos.y];
                for (var ei = 0; ei < preyTile.entities.length; ei++) {
                    var ent = preyTile.entities[ei];
                    if (ent.entityType === ENTITY_TYPE_SHEEP || ent.entityType === ENTITY_TYPE_COW) {
                        nearestPreyEntity = ent;
                        break;
                    }
                }
            }
            // 2. If prey found, hunt it
            if (nearestPreyPos && nearestPreyEntity) {
                var preyType = nearestPreyEntity.entityType === ENTITY_TYPE_SHEEP ? "Sheep" : "Cow";
                var minDistance = Math.max(Math.abs(currentX - nearestPreyPos.x), Math.abs(currentY - nearestPreyPos.y));
                if (minDistance <= 1) {
                    // Adjacent! Eat the prey
                    this.stateText = "Eating " + preyType;
                    var preyTile = world[nearestPreyPos.x][nearestPreyPos.y];
                    var indexOnTile = preyTile.entities.indexOf(nearestPreyEntity);
                    if (indexOnTile !== -1) {
                        // Swap-and-pop for tile entity removal
                        var lastIdx = preyTile.entities.length - 1;
                        if (indexOnTile !== lastIdx) {
                            preyTile.entities[indexOnTile] = preyTile.entities[lastIdx];
                        }
                        preyTile.entities.length = lastIdx;
                    }
                    //@ts-ignore
                    var indexInGlobal = entities.findIndex(d => d.entity === nearestPreyEntity);
                    if (indexInGlobal !== -1) {
                        // Swap-and-pop for global entities array
                        //@ts-ignore
                        var lastGlobal = entities.length - 1;
                        if (indexInGlobal !== lastGlobal) {
                            //@ts-ignore
                            entities[indexInGlobal] = entities[lastGlobal];
                        }
                        //@ts-ignore
                        entities.length = lastGlobal;
                        //@ts-ignore
                        decrementEntityCount(nearestPreyEntity);
                    }
                    this.hunger = 0;
                    return Vector2(0, 0); // Remain on tile to finish eating
                }
                else {
                    // Chase
                    this.stateText = "Hunting " + preyType;
                    var now = performance.now();
                    if (now - this.lastPathfindTime >= this.pathfindCooldown) {
                        this.lastPathfindTime = now;
                        this.moveTo(Vector2(currentX, currentY), nearestPreyPos);
                    }
                }
            }
            else {
                // 3. Otherwise, wander
                this.stateText = "Wandering";
                var now = performance.now();
                if (now - this.lastPathfindTime >= this.pathfindCooldown) {
                    this.lastPathfindTime = now;
                    var wanderPos = this.getRandomPos(currentX, currentY, 5);
                    this.moveTo(Vector2(currentX, currentY), wanderPos);
                }
            }
            return deviation;
        };
        this.entityType = ENTITY_TYPE_WOLF;
        this.stateText = "Hunting";
        // Wolves reproduce much slower than their prey in nature (longer mating cooldown)
        this.matingCooldown = 15000 + Math.random() * 5000;
    }
}
