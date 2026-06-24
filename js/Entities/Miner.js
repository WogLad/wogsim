"use strict";
class Miner extends Human {
    constructor(customGenome) {
        super("M", customGenome);
        /** The radius of the search square that is used to find the human's next position */
        this.radarLength = 10;
        this.entityType = ENTITY_TYPE_MINER;
        this.addToInventory(new Tool("Stone Pickaxe"));
        this.professionMover = (currentX, currentY) => {
            var currentTile = world[currentX][currentY];
            // Mine the stone on the current tile
            var stoneIdx = currentTile.worldObjects.findIndex(o => o.name === "stone");
            if (stoneIdx !== -1) {
                currentTile.worldObjects.splice(stoneIdx, 1);
                this.addToInventory(new Item("Stone"));
                //@ts-ignore
                drawTileToOffscreen(currentX, currentY);
                // Stay on this tile to finish the mine
                return Vector2(currentX, currentY);
            }
            // Find the nearest stone within radar
            var nearestStone = this.findNearest(currentX, currentY, this.radarLength, (tile) => {
                return tile.worldObjects.some(o => o.name === "stone");
            });
            if (nearestStone) {
                return nearestStone;
            }
            return this.getRandomPos(currentX, currentY);
        };
    }
}
