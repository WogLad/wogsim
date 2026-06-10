"use strict";
class Farmer extends Human {
    constructor(customGenome) {
        super("P", customGenome);
        /** The radius of the search square that is used to find the human's next position */
        this.radarLength = 10;
        this.addToInventory(new Tool("Hoe"));
        this.professionMover = (currentX, currentY) => {
            var currentTile = world[currentX][currentY];
            // 1. Harvest wheat or shrub on the current tile
            var wheatIdx = currentTile.worldObjects.findIndex(o => o.name === "wheat");
            if (wheatIdx !== -1) {
                currentTile.worldObjects.splice(wheatIdx, 1);
                this.addToInventory(new Item("Wheat"));
                //@ts-ignore
                drawTileToOffscreen(currentX, currentY);
                return Vector2(currentX, currentY);
            }
            var shrubIdx = currentTile.worldObjects.findIndex(o => o.name === "shrub");
            if (shrubIdx !== -1) {
                currentTile.worldObjects.splice(shrubIdx, 1);
                this.addToInventory(new Item("Berry"));
                //@ts-ignore
                drawTileToOffscreen(currentX, currentY);
                return Vector2(currentX, currentY);
            }
            // 2. Plant wheat on current tile if it's Grass or Dark Grass and empty, with 15% chance
            if ((currentTile.type === TileType.GRASS || currentTile.type === TileType.DARK_GRASS) && currentTile.worldObjects.length === 0) {
                if (Math.random() < 0.15) {
                    currentTile.worldObjects.push(new WorldObject("wheat"));
                    //@ts-ignore
                    drawTileToOffscreen(currentX, currentY);
                    // Stay a tick to plant
                    return Vector2(currentX, currentY);
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
        };
    }
}
