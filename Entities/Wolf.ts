class Wolf extends Entity {
    /** The radius of the search square that is used to find the wolf's prey */
    radarLength: number = 15;

    constructor(customGenome?: Genome) {
        super(true, true, "gray", customGenome);
        this.stateText = "Hunting";
        // Wolves reproduce much slower than their prey in nature (longer mating cooldown)
        this.matingCooldown = 15000 + Math.random() * 5000;
    }

    move: ((currentX: number, currentY: number) => Vector2) | null = (currentX, currentY) => {
        // Hunger ticking scaled by hungerRateGene
        this.hunger = Math.min(100, this.hunger + 0.03 * this.genome.hungerRateGene);
        if (this.hunger >= 100) {
            this.health = Math.max(0, this.health - 1);
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

        // Mating check
        let receptive = this.ticksAlive > 2000 && this.hunger < 40 && (this.ticksAlive - this.lastMatingTick > this.matingCooldown);
        //@ts-ignore
        let currentLimit = (typeof MAX_ENTITIES_LIMIT !== "undefined") ? MAX_ENTITIES_LIMIT : 150;
        if (receptive && entities.length < currentLimit) {
            let partnerPos = this.findNearest(currentX, currentY, 12, (tile) => {
                return tile.entities.some(e => {
                    if (e !== this && e instanceof Wolf && e.isLiving) {
                        let isPartnerReceptive = e.ticksAlive > 2000 && e.hunger < 40 && (e.ticksAlive - e.lastMatingTick > e.matingCooldown);
                        return isPartnerReceptive;
                    }
                    return false;
                });
            });
            
            if (partnerPos) {
                this.stateText = "Seeking Mate";
                
                if (Math.abs(currentX - partnerPos.x) <= 1 && Math.abs(currentY - partnerPos.y) <= 1) {
                    let partnerTile = world[partnerPos.x][partnerPos.y];
                    let partner = partnerTile.entities.find(e => e !== this && e instanceof Wolf && e.isLiving) as Wolf;
                    
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
                } else {
                    var now = performance.now();
                    if (now - this.lastPathfindTime >= this.pathfindCooldown) {
                        this.lastPathfindTime = now;
                        this.moveTo(Vector2(currentX, currentY), partnerPos);
                    }
                    return Vector2(0, 0);
                }
            }
        }

        // 1. Scan for nearest Sheep or Cow in radar range
        var nearestPreyPos: Vector2 | null = null;
        var nearestPreyEntity: Entity | null = null;
        var minDistance = Infinity;

        for (var dx = -this.radarLength; dx <= this.radarLength; dx++) {
            for (var dy = -this.radarLength; dy <= this.radarLength; dy++) {
                var tx = currentX + dx;
                var ty = currentY + dy;
                if (world[tx] && world[tx][ty]) {
                    var tile = world[tx][ty];
                    for (var ent of tile.entities) {
                        if (ent && ent.constructor && (ent.constructor.name === "Sheep" || ent.constructor.name === "Cow")) {
                            var dist = Math.max(Math.abs(dx), Math.abs(dy));
                            if (dist < minDistance) {
                                minDistance = dist;
                                nearestPreyPos = Vector2(tx, ty);
                                nearestPreyEntity = ent;
                            }
                        }
                    }
                }
            }
        }

        // 2. If prey found, hunt it
        if (nearestPreyPos && nearestPreyEntity) {
            var preyType = nearestPreyEntity.constructor.name;
            if (minDistance <= 1) {
                // Adjacent! Eat the prey
                this.stateText = "Eating " + preyType;
                var preyTile = world[nearestPreyPos.x][nearestPreyPos.y];
                var indexOnTile = preyTile.entities.indexOf(nearestPreyEntity);
                if (indexOnTile !== -1) {
                    preyTile.removeEntity(indexOnTile);
                }
                
                //@ts-ignore
                var indexInGlobal = entities.findIndex(d => d.entity === nearestPreyEntity);
                if (indexInGlobal !== -1) {
                    //@ts-ignore
                    entities.splice(indexInGlobal, 1);
                }

                this.hunger = 0;
                return Vector2(0, 0); // Remain on tile to finish eating
            } else {
                // Chase
                this.stateText = "Hunting " + preyType;
                var now = performance.now();
                if (now - this.lastPathfindTime >= this.pathfindCooldown) {
                    this.lastPathfindTime = now;
                    this.moveTo(Vector2(currentX, currentY), nearestPreyPos);
                }
            }
        } else {
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
    }
}
