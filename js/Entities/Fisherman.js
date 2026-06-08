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
            for (var x = currentX - this.radarLength; x < currentX + this.radarLength; x++) {
                for (var y = currentY - this.radarLength; y < currentY + this.radarLength; y++) {
                    if (world[x] == undefined || world[x][y] == undefined) {
                        continue;
                    }
                    if (world[x][y].type == TileType.WATER && x > 0) {
                        return Vector2(x - 1, y);
                    }
                }
            }
            return this.getRandomPos(currentX, currentY);
        };
    }
}
