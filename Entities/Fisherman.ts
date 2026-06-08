class Fisherman extends Human {
    /** The radius of the search square that is used to find the human's next position */
    radarLength: number = 10;
    
    constructor() {
        super("F");

        this.addToInventory(new Tool("Fishing Rod"));

        // TODO: Return the position of water if close to any
        this.professionMover = (currentX: number, currentY: number) => {
            // DONE: Don't move if the adjacent tile is water
            var adjacentTile: WorldTile | undefined = world[currentX+1] ? world[currentX+1][currentY] : undefined;
            if (adjacentTile && adjacentTile.type == TileType.WATER) {
                return Vector2(currentX,currentY);
            }

            var nearestWater = this.findNearest(currentX, currentY, this.radarLength, (tile, x, y) => {
                return tile.type === TileType.WATER && x > 0;
            });

            if (nearestWater) {
                return Vector2(nearestWater.x - 1, nearestWater.y);
            }
            return this.getRandomPos(currentX,currentY);
        }
    }
}