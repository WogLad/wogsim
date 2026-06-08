"use strict";
class Woodcutter extends Human {
    constructor() {
        super("W");
        /** The radius of the search square that is used to find the human's next position */
        this.radarLength = 10; // TODO: Add a stroke rect in the debug draw function to show the radar of the human
        this.addToInventory(new Tool("Stone Axe"));
        // DONE: Return the position of a tree if close to any
        this.professionMover = (currentX, currentY) => {
            // DONE: Remove the tree from the WorldTile
            var currentTile = world[currentX][currentY];
            if (currentTile.worldObjects.length > 0 && currentTile.worldObjects[currentTile.worldObjects.length - 1].name == "tree") {
                currentTile.worldObjects.pop();
                drawTileToOffscreen(currentX, currentY);
            }
            var nearestTree = this.findNearest(currentX, currentY, this.radarLength, (tile) => {
                var worldObjs = tile.worldObjects;
                var objLen = worldObjs.length;
                return objLen > 0 && worldObjs[objLen - 1].name === "tree";
            });
            if (nearestTree) {
                return nearestTree;
            }
            return this.getRandomPos(currentX, currentY);
        };
    }
}
