"use strict";
class Human extends Entity {
    constructor(professionLetter) {
        super(true, true, "red");
        /** The function that is called when a human has to find their next spot to move to for their profession */
        this.professionMover = (x, y) => { return Vector2(0, 0); };
        this.process = () => {
            // Code to be ran every frame goes here.
        };
        this.move = (currentX, currentY) => {
            // Survival needs ticking
            this.hunger = Math.min(100, this.hunger + 0.05);
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
            if (this.moveQueue.length > 0) {
                deviation.x = this.moveQueue[0].x - currentX;
                deviation.y = this.moveQueue[0].y - currentY;
                this.moveQueue.shift(); // Removes the first grid node after moving to it (for A*)
            }
            else {
                // Resource drop-off override
                var hasResources = this.inventory.some(entry => !(entry.item instanceof Tool) && entry.count > 0);
                var isFull = this.getTotalItemCount() >= INVENTORY_MAX_CAPACITY;
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
                                if (storageObj && storageObj.stockpile) {
                                    if (nameLower in storageObj.stockpile) {
                                        storageObj.stockpile[nameLower] += entry.count;
                                    }
                                    else {
                                        storageObj.stockpile.wood += entry.count;
                                    }
                                }
                                this.gold += entry.item.goldValue * entry.count;
                            }
                        }
                        this.inventory = this.inventory.filter(entry => entry.item instanceof Tool);
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
                                    this.hunger = Math.max(0, this.hunger - 50);
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
}
