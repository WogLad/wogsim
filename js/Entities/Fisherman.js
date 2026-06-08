"use strict";
class Fisherman extends Human {
    constructor() {
        super("F");
        /** The radius of the search square that is used to find the human's next position */
        this.radarLength = 10;
        this.addToInventory(new Tool("Fishing Rod"));
        // TODO: Return the position of water if close to any
        this.professionMover = (currentX, currentY) => {
            // DONE: Don't move if the adjacent tile is water
            var adjacentTile = world[currentX + 1] ? world[currentX + 1][currentY] : undefined;
            if (adjacentTile && adjacentTile.type == TileType.WATER) {
                return Vector2(currentX, currentY);
            }
            var nearestWater = this.findNearest(currentX, currentY, this.radarLength, (tile, x, y) => {
                return tile.type === TileType.WATER && x > 0;
            });
            if (nearestWater) {
                return Vector2(nearestWater.x - 1, nearestWater.y);
            }
            return this.getRandomPos(currentX, currentY);
        };
    }
}
