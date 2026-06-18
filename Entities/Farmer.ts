class Farmer extends Human {
    /** The radius of the search square that is used to find the human's next position */
    radarLength: number = 10;

    constructor(customGenome?: Genome) {
        super("P", customGenome);

        this.addToInventory(new Tool("Hoe"));

        this.professionMover = (currentX: number, currentY: number) => {
            var currentTile: WorldTile = world[currentX][currentY];
            
            // 1. Harvest wheat or shrub on the current tile
            var wheatIdx = currentTile.worldObjects.findIndex(o => o.name === "wheat");
            if (wheatIdx !== -1) {
                currentTile.worldObjects.splice(wheatIdx, 1);
                this.addToInventory(new Item("Wheat"));
                
                // 40% chance of dropping a Wheat Seed
                if (Math.random() < 0.4) {
                    this.addToInventory(new Item("Wheat Seed"));
                }
                
                //@ts-ignore
                drawTileToOffscreen(currentX, currentY);
                return Vector2(currentX, currentY);
            }

            var shrubIdx = currentTile.worldObjects.findIndex(o => o.name === "shrub");
            if (shrubIdx !== -1) {
                currentTile.worldObjects.splice(shrubIdx, 1);
                this.addToInventory(new Item("Berry"));
                
                // 40% chance of dropping a Shrub Seed
                if (Math.random() < 0.4) {
                    this.addToInventory(new Item("Shrub Seed"));
                }
                
                //@ts-ignore
                drawTileToOffscreen(currentX, currentY);
                return Vector2(currentX, currentY);
            }

            // 2. Check if we have seeds to plant
            var wheatSeedIdx = this.inventory.findIndex(entry => entry.item.name === "Wheat Seed" && entry.count > 0);
            var shrubSeedIdx = this.inventory.findIndex(entry => entry.item.name === "Shrub Seed" && entry.count > 0);

            if (wheatSeedIdx !== -1 || shrubSeedIdx !== -1) {
                var villageCenter = this.getClosestVillageCenter(currentX, currentY);
                var nearestSuitable = this.findNearest(villageCenter.x, villageCenter.y, 35, (tile) => {
                    if (!tile.canBeTraversed() || tile.worldObjects.length > 0) {
                        return false;
                    }
                    if (wheatSeedIdx !== -1) {
                        return tile.type === TileType.GRASS || tile.type === TileType.DARK_GRASS;
                    } else {
                        return tile.type === TileType.GRASS || tile.type === TileType.DARK_GRASS || tile.type === TileType.SWAMP;
                    }
                });

                if (nearestSuitable) {
                    if (nearestSuitable.x === currentX && nearestSuitable.y === currentY) {
                        if (wheatSeedIdx !== -1) {
                            var entry = this.inventory[wheatSeedIdx];
                            entry.count--;
                            if (entry.count <= 0) this.inventory.splice(wheatSeedIdx, 1);
                            currentTile.worldObjects.push(new WorldObject("wheat"));
                        } else {
                            var entry = this.inventory[shrubSeedIdx];
                            entry.count--;
                            if (entry.count <= 0) this.inventory.splice(shrubSeedIdx, 1);
                            currentTile.worldObjects.push(new WorldObject("shrub"));
                        }
                        //@ts-ignore
                        drawTileToOffscreen(currentX, currentY);
                        return Vector2(currentX, currentY);
                    }
                    return nearestSuitable;
                }
            }

            // 3. Find the nearest wheat or shrub within radar
            var nearestTarget = this.findNearest(currentX, currentY, this.radarLength, (tile) => {
                return tile.worldObjects.some(o => o.name === "wheat" || o.name === "shrub");
            });

            if (nearestTarget) {
                return nearestTarget;
            }
            return this.getRandomPos(currentX, currentY);
        }
    }
}
