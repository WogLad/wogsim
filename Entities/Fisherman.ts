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

            for (var x = currentX - this.radarLength; x < currentX + this.radarLength; x++) {
                for (var y = currentY - this.radarLength; y < currentY + this.radarLength; y++) {
                    if (world[x] == undefined || world[x][y] == undefined) { continue }
                    if (world[x][y].type == TileType.WATER && x > 0) {
                        return Vector2(x-1,y);
                    }
                }
            }
            return this.getRandomPos(currentX,currentY);
        }
    }
}