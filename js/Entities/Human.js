"use strict";
class Human extends Entity {
    constructor(professionLetter, customGenome) {
        super(true, true, "red", customGenome);
        /** The function that is called when a human has to find their next spot to move to for their profession */
        this.professionMover = (x, y) => { return Vector2(0, 0); };
        this.process = () => {
            // Code to be ran every frame goes here.
        };
        this.move = (currentX, currentY) => {
            // Survival needs ticking scaled by hungerRateGene
            this.hunger = Math.min(100, this.hunger + 0.05 * this.genome.hungerRateGene);
            if (this.hunger > 50) {
                this.eatFood();
            }
            if (this.hunger >= 100) {
                this.health = Math.max(0, this.health - 2);
            }
            else {
                this.health = Math.min(100, this.health + 0.2); // Slow regeneration
            }
            if (this.health <= 0) {
                this.stateText = "Dead";
                return Vector2(0, 0);
            }
            var deviation = Vector2(0, 0); // The change made to the current position of the entity
            if (this.moveQueueLength > this.moveQueueIndex) {
                deviation.x = this.moveQueue[this.moveQueueIndex * 2] - currentX;
                deviation.y = this.moveQueue[this.moveQueueIndex * 2 + 1] - currentY;
                this.moveQueueIndex++;
                if (this.moveQueueIndex >= this.moveQueueLength) {
                    this.moveQueueLength = 0;
                    this.moveQueueIndex = 0;
                }
            }
            else {
                // Resource drop-off override
                var hasResources = this.inventory.some(entry => !(entry.item instanceof Tool) && entry.count > 0);
                var isFull = this.getTotalItemCount() >= INVENTORY_MAX_CAPACITY;
                // Mating check
                let receptive = this.ticksAlive > 3000 && this.hunger < 40 && (this.ticksAlive - this.lastMatingTick > this.matingCooldown);
                let isBusy = this.hunger > 80 || hasResources;
                //@ts-ignore
                let currentLimit = (typeof MAX_ENTITIES_LIMIT !== "undefined") ? MAX_ENTITIES_LIMIT : 150;
                if (receptive && !isBusy && entities.length < currentLimit) {
                    let partnerPos = this.findNearest(currentX, currentY, 15, (tile) => {
                        return tile.entities.some(e => {
                            if (e !== this && e instanceof Human && e.isLiving) {
                                let isPartnerReceptive = e.ticksAlive > 3000 && e.hunger < 40 && (e.ticksAlive - e.lastMatingTick > e.matingCooldown);
                                return isPartnerReceptive;
                            }
                            return false;
                        });
                    });
                    if (partnerPos) {
                        this.stateText = "Seeking Mate";
                        if (Math.abs(currentX - partnerPos.x) <= 1 && Math.abs(currentY - partnerPos.y) <= 1) {
                            let partnerTile = world[partnerPos.x][partnerPos.y];
                            let partner = partnerTile.entities.find(e => e !== this && e instanceof Human && e.isLiving);
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
                                                let babyLetter = Math.random() < 0.5 ? this.professionLetter : partner.professionLetter;
                                                if (Math.random() < 0.20) {
                                                    // Use cached entity counters instead of looping over all entities (O(1) vs O(N))
                                                    let counts = {
                                                        W: entityCounts.woodcutter,
                                                        F: entityCounts.fisherman,
                                                        M: entityCounts.miner,
                                                        P: entityCounts.farmer
                                                    };
                                                    let minProf = "W";
                                                    let minVal = Infinity;
                                                    for (let prof of ["W", "F", "M", "P"]) {
                                                        if (counts[prof] < minVal) {
                                                            minVal = counts[prof];
                                                            minProf = prof;
                                                        }
                                                    }
                                                    babyLetter = minProf;
                                                }
                                                let baby;
                                                if (babyLetter === "W")
                                                    baby = new Woodcutter(babyGenome);
                                                else if (babyLetter === "F")
                                                    baby = new Fisherman(babyGenome);
                                                else if (babyLetter === "M")
                                                    baby = new Miner(babyGenome);
                                                else
                                                    baby = new Farmer(babyGenome);
                                                bTile.addEntity(baby);
                                                entities.push({ entity: baby, pos: Vector2(bx, by) });
                                                incrementEntityCount(baby);
                                                this.lastMatingTick = this.ticksAlive;
                                                partner.lastMatingTick = partner.ticksAlive;
                                                this.stateText = "Idle";
                                                partner.stateText = "Idle";
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
                if (this.hunger > 80 || (hasResources && (isFull || this.stateText === "Returning to Storage" || this.stateText === "Finding Food"))) {
                    if (this.hunger > 80)
                        this.stateText = "Finding Food";
                    else
                        this.stateText = "Returning to Storage";
                    // Locate the nearest town hall or storage pile in a 40-tile radius
                    var nearestStoragePos = this.findNearest(currentX, currentY, 40, (tile) => {
                        return tile.worldObjects.some(o => o.name === "town_hall" || o.name === "storage_pile");
                    });
                    //@ts-ignore
                    var targetPos = nearestStoragePos || STORAGE_POS;
                    // Check if adjacent to target storage pos (Chebyshev distance <= 1)
                    if (Math.abs(currentX - targetPos.x) <= 1 && Math.abs(currentY - targetPos.y) <= 1) {
                        if (this.stateText === "Finding Food")
                            this.stateText = "Eating";
                        else
                            this.stateText = "Depositing Resources";
                        var targetTile = world[targetPos.x] ? world[targetPos.x][targetPos.y] : null;
                        var storageObj = targetTile ? targetTile.worldObjects.find(o => o.name === "town_hall" || o.name === "storage_pile") : null;
                        for (var entry of this.inventory) {
                            if (!(entry.item instanceof Tool)) {
                                var nameLower = entry.item.name.toLowerCase();
                                var key = nameLower.replace(" ", "_");
                                if (storageObj && storageObj.stockpile) {
                                    if (key in storageObj.stockpile) {
                                        storageObj.stockpile[key] += entry.count;
                                    }
                                    else {
                                        storageObj.stockpile.wood += entry.count;
                                    }
                                }
                                this.gold += entry.item.goldValue * entry.count;
                            }
                        }
                        this.inventory = this.inventory.filter(entry => entry.item instanceof Tool);
                        // Withdraw seeds from stockpile if available
                        if (storageObj && storageObj.stockpile) {
                            var sp = storageObj.stockpile;
                            if (this.professionLetter === "W") {
                                for (var seedKey of ["tree_seed", "pine_seed", "palm_seed", "cactus_seed"]) {
                                    while ((sp[seedKey] || 0) > 0 && this.getTotalItemCount() < INVENTORY_MAX_CAPACITY) {
                                        sp[seedKey]--;
                                        var itemName = seedKey.replace("_", " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                                        this.addToInventory(new Item(itemName));
                                    }
                                }
                            }
                            else if (this.professionLetter === "P") {
                                for (var seedKey of ["wheat_seed", "shrub_seed"]) {
                                    while ((sp[seedKey] || 0) > 0 && this.getTotalItemCount() < INVENTORY_MAX_CAPACITY) {
                                        sp[seedKey]--;
                                        var itemName = seedKey.replace("_", " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                                        this.addToInventory(new Item(itemName));
                                    }
                                }
                            }
                        }
                        // Buy food from stockpile if hungry
                        if (this.hunger > 10 && storageObj && storageObj.stockpile) {
                            var sp = storageObj.stockpile;
                            // Prioritize cheaper foods
                            var foods = ["berry", "apple", "wheat", "fish"];
                            for (var f of foods) {
                                var itemName = f.charAt(0).toUpperCase() + f.slice(1);
                                var cost = ITEM_GOLD_VALUES[itemName] || 2;
                                if ((sp[f] || 0) > 0 && this.gold >= cost) {
                                    sp[f]--;
                                    this.gold -= cost;
                                    sp["gold"] = (sp["gold"] || 0) + cost;
                                    var hungerReduction = cost * 10;
                                    this.hunger = Math.max(0, this.hunger - hungerReduction);
                                    break;
                                }
                            }
                        }
                        if (this.gold >= 100 && !this.ownsHouse) {
                            this.gold -= 100;
                            this.ownsHouse = true;
                            var housePlaced = false;
                            for (var d = 1; d <= 6 && !housePlaced; d++) {
                                for (var hx = targetPos.x - d; hx <= targetPos.x + d && !housePlaced; hx++) {
                                    for (var hy = targetPos.y - d; hy <= targetPos.y + d && !housePlaced; hy++) {
                                        if (world[hx] && world[hx][hy]) {
                                            var hTile = world[hx][hy];
                                            // Place house if tile is GROUND/GRASS and empty
                                            if (hTile.canBeTraversed() && hTile.worldObjects.length === 0 && hTile.type !== TileType.SAND && hTile.type !== TileType.SNOW) {
                                                hTile.type = TileType.GROUND;
                                                var houseObj = new WorldObject("house");
                                                houseObj.ownerId = this.id;
                                                hTile.worldObjects.push(houseObj);
                                                housePlaced = true;
                                                // Request a redraw of the background
                                                //@ts-ignore
                                                if (typeof drawTileToOffscreen === "function")
                                                    drawTileToOffscreen(hx, hy);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        this.stateText = "Idle";
                        return Vector2(0, 0);
                    }
                    else {
                        var now = performance.now();
                        if (now - this.lastPathfindTime >= this.pathfindCooldown) {
                            this.lastPathfindTime = now;
                            //@ts-ignore
                            this.moveTo(Vector2(currentX, currentY), targetPos);
                        }
                    }
                }
                else {
                    this.stateText = "Gathering Resources";
                    var now = performance.now();
                    if (now - this.lastPathfindTime >= this.pathfindCooldown) {
                        var newPos = this.professionMover(currentX, currentY);
                        if (!(newPos.x == currentX && newPos.y == currentY)) {
                            this.lastPathfindTime = now;
                            this.moveTo(Vector2(currentX, currentY), newPos);
                        }
                    }
                }
            }
            // Prevents the entity from going out of bounds
            if (currentX + deviation.x < 0 || currentX + deviation.x > (X_TILES - 1)) {
                deviation.x = 0;
            }
            if (currentY + deviation.y < 0 || currentY + deviation.y > (Y_TILES - 1)) {
                deviation.y = 0;
            }
            return deviation; // Return the entity's deviation
        };
        this.professionLetter = professionLetter;
    }
    getClosestVillageCenter(currentX, currentY) {
        //@ts-ignore
        if (typeof townHallPositions !== "undefined" && townHallPositions.length > 0) {
            let closest = townHallPositions[0];
            let minD = Math.abs(currentX - closest.x) + Math.abs(currentY - closest.y);
            for (let i = 1; i < townHallPositions.length; i++) {
                let th = townHallPositions[i];
                let d = Math.abs(currentX - th.x) + Math.abs(currentY - th.y);
                if (d < minD) {
                    minD = d;
                    closest = th;
                }
            }
            return closest;
        }
        //@ts-ignore
        return typeof STORAGE_POS !== "undefined" ? STORAGE_POS : Vector2(currentX, currentY);
    }
}
