class Woodcutter extends Human {
    /** The radius of the search square that is used to find the human's next position */
    radarLength: number = 10; // TODO: Add a stroke rect in the debug draw function to show the radar of the human

    constructor(customGenome?: Genome) {
        super("W", customGenome);

        this.addToInventory(new Tool("Stone Axe"));

        // DONE: Return the position of a tree if close to any
        this.professionMover = (currentX: number, currentY: number) => {
            var currentTile: WorldTile = world[currentX][currentY];
            
            // Cut down the tree/pine_tree/palm_tree on the current tile
            var treeIdx = currentTile.worldObjects.findIndex(o => o.name === "tree" || o.name === "pine_tree" || o.name === "palm_tree");
            if (treeIdx !== -1) {
                currentTile.worldObjects.splice(treeIdx, 1);
                this.addToInventory(new Item("Wood"));
                drawTileToOffscreen(currentX, currentY);
                // Stay on this tile to finish the chop
                return Vector2(currentX, currentY);
            }

            // Find the nearest tree of any type within radar
            var nearestTree = this.findNearest(currentX, currentY, this.radarLength, (tile) => {
                return tile.worldObjects.some(o => o.name === "tree" || o.name === "pine_tree" || o.name === "palm_tree");
            });

            if (nearestTree) {
                return nearestTree;
            }
            return this.getRandomPos(currentX, currentY);
        }
    }
}