"use strict";
class Fisherman extends Human {
    constructor(customGenome) {
        super("F", customGenome);
        /** The radius of the search square that is used to find the human's next position */
        this.radarLength = 10;
        this.addToInventory(new Tool("Fishing Rod"));
        this.professionMover = (currentX, currentY) => {
            // 1. Check if we are already adjacent to water or a tile with fish
            var adjacentWaterOrFishTile = null;
            var targetFishTile = null;
            var directions = [
                Vector2(-1, 0), Vector2(1, 0), Vector2(0, -1), Vector2(0, 1),
                Vector2(-1, -1), Vector2(-1, 1), Vector2(1, -1), Vector2(1, 1)
            ];
            for (var dir of directions) {
                var tx = currentX + dir.x;
                var ty = currentY + dir.y;
                if (world[tx] && world[tx][ty]) {
                    var tile = world[tx][ty];
                    var isWater = tile.type === TileType.WATER || tile.type === TileType.DARK_WATER;
                    var hasFish = tile.worldObjects.some(o => o.name === "fish");
                    if (isWater || hasFish) {
                        adjacentWaterOrFishTile = tile;
                        if (hasFish) {
                            targetFishTile = tile;
                            break; // Prioritize harvesting visible fish
                        }
                    }
                }
            }
            // If adjacent to water/fish, perform fishing
            if (adjacentWaterOrFishTile) {
                if (targetFishTile) {
                    var fishIdx = targetFishTile.worldObjects.findIndex(o => o.name === "fish");
                    if (fishIdx !== -1) {
                        targetFishTile.worldObjects.splice(fishIdx, 1);
                        this.addToInventory(new Item("Fish"));
                        drawTileToOffscreen(targetFishTile.pos.x, targetFishTile.pos.y);
                    }
                }
                else {
                    // 10% chance to catch a fish in generic water
                    if (Math.random() < 0.1) {
                        this.addToInventory(new Item("Fish"));
                    }
                }
                // Stay on current tile to fish
                return Vector2(currentX, currentY);
            }
            // 2. Otherwise, find the nearest tile containing fish or water within radar
            var nearestTarget = this.findNearest(currentX, currentY, this.radarLength, (tile) => {
                var isWater = tile.type === TileType.WATER || tile.type === TileType.DARK_WATER;
                var hasFish = tile.worldObjects.some(o => o.name === "fish");
                return isWater || hasFish;
            });
            if (nearestTarget) {
                // Find a traversable adjacent tile next to the target to stand on
                for (var dir of directions) {
                    var tx = nearestTarget.x + dir.x;
                    var ty = nearestTarget.y + dir.y;
                    if (world[tx] && world[tx][ty] && world[tx][ty].canBeTraversed()) {
                        return Vector2(tx, ty);
                    }
                }
            }
            // 3. Fallback to random wander
            return this.getRandomPos(currentX, currentY);
        };
    }
}
