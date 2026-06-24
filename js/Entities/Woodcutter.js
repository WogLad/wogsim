"use strict";
class Woodcutter extends Human {
    constructor(customGenome) {
        super("W", customGenome);
        /** The radius of the search square that is used to find the human's next position */
        this.radarLength = 10; // TODO: Add a stroke rect in the debug draw function to show the radar of the human
        this.entityType = ENTITY_TYPE_WOODCUTTER;
        this.addToInventory(new Tool("Stone Axe"));
        // DONE: Return the position of a tree if close to any
        this.professionMover = (currentX, currentY) => {
            var currentTile = world[currentX][currentY];
            // Cut down the tree/pine_tree/palm_tree/cactus on the current tile
            var treeIdx = currentTile.worldObjects.findIndex(o => o.name === "tree" || o.name === "pine_tree" || o.name === "palm_tree" || o.name === "cactus");
            if (treeIdx !== -1) {
                var treeName = currentTile.worldObjects[treeIdx].name;
                currentTile.worldObjects.splice(treeIdx, 1);
                this.addToInventory(new Item("Wood"));
                // 40% chance of dropping a matching seed
                if (Math.random() < 0.4) {
                    if (treeName === "tree") {
                        this.addToInventory(new Item("Tree Seed"));
                    }
                    else if (treeName === "pine_tree") {
                        this.addToInventory(new Item("Pine Seed"));
                    }
                    else if (treeName === "palm_tree") {
                        this.addToInventory(new Item("Palm Seed"));
                    }
                    else if (treeName === "cactus") {
                        this.addToInventory(new Item("Cactus Seed"));
                    }
                }
                drawTileToOffscreen(currentX, currentY);
                // Stay on this tile to finish the chop
                return Vector2(currentX, currentY);
            }
            // Check if we have seeds in our inventory to plant
            var treeSeedIdx = this.inventory.findIndex(entry => entry.item.name === "Tree Seed" && entry.count > 0);
            var pineSeedIdx = this.inventory.findIndex(entry => entry.item.name === "Pine Seed" && entry.count > 0);
            var palmSeedIdx = this.inventory.findIndex(entry => entry.item.name === "Palm Seed" && entry.count > 0);
            var cactusSeedIdx = this.inventory.findIndex(entry => entry.item.name === "Cactus Seed" && entry.count > 0);
            if (treeSeedIdx !== -1 || pineSeedIdx !== -1 || palmSeedIdx !== -1 || cactusSeedIdx !== -1) {
                var villageCenter = this.getClosestVillageCenter(currentX, currentY);
                var nearestSuitable = this.findNearest(villageCenter.x, villageCenter.y, 35, (tile) => {
                    if (!tile.canBeTraversed() || tile.worldObjects.length > 0) {
                        return false;
                    }
                    if (treeSeedIdx !== -1) {
                        return tile.type === TileType.DARK_GRASS || tile.type === TileType.GRASS;
                    }
                    else if (pineSeedIdx !== -1) {
                        return tile.type === TileType.SNOW;
                    }
                    else if (cactusSeedIdx !== -1) {
                        return tile.type === TileType.DESERT;
                    }
                    else {
                        return tile.type === TileType.SAND;
                    }
                });
                if (nearestSuitable) {
                    if (nearestSuitable.x === currentX && nearestSuitable.y === currentY) {
                        if (treeSeedIdx !== -1) {
                            var entry = this.inventory[treeSeedIdx];
                            entry.count--;
                            if (entry.count <= 0)
                                this.inventory.splice(treeSeedIdx, 1);
                            currentTile.worldObjects.push(new WorldObject("tree"));
                        }
                        else if (pineSeedIdx !== -1) {
                            var entry = this.inventory[pineSeedIdx];
                            entry.count--;
                            if (entry.count <= 0)
                                this.inventory.splice(pineSeedIdx, 1);
                            currentTile.worldObjects.push(new WorldObject("pine_tree"));
                        }
                        else if (cactusSeedIdx !== -1) {
                            var entry = this.inventory[cactusSeedIdx];
                            entry.count--;
                            if (entry.count <= 0)
                                this.inventory.splice(cactusSeedIdx, 1);
                            currentTile.worldObjects.push(new WorldObject("cactus"));
                        }
                        else {
                            var entry = this.inventory[palmSeedIdx];
                            entry.count--;
                            if (entry.count <= 0)
                                this.inventory.splice(palmSeedIdx, 1);
                            currentTile.worldObjects.push(new WorldObject("palm_tree"));
                        }
                        //@ts-ignore
                        drawTileToOffscreen(currentX, currentY);
                        return Vector2(currentX, currentY);
                    }
                    return nearestSuitable;
                }
            }
            // Find the nearest tree of any type or cactus within radar
            var nearestTree = this.findNearest(currentX, currentY, this.radarLength, (tile) => {
                return tile.worldObjects.some(o => o.name === "tree" || o.name === "pine_tree" || o.name === "palm_tree" || o.name === "cactus");
            });
            if (nearestTree) {
                return nearestTree;
            }
            return this.getRandomPos(currentX, currentY);
        };
    }
}
