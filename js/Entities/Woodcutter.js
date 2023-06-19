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
            var currentTile = world.get(`${currentX},${currentY}`);
            if (currentTile.worldObjects.length > 0 && currentTile.worldObjects[currentTile.worldObjects.length - 1].name == "tree") {
                currentTile.worldObjects.pop();
            }
            for (var x = currentX - this.radarLength; x < currentX + this.radarLength; x++) {
                for (var y = currentY - this.radarLength; y < currentY + this.radarLength; y++) {
                    if (world.get(`${x},${y}`) == undefined) {
                        continue;
                    }
                    var worldObjects = world.get(`${x},${y}`).worldObjects;
                    for (var obj of worldObjects) {
                        if (obj.name == "tree") {
                            return Vector2(x, y);
                        }
                    }
                }
            }
            return this.getRandomPos(currentX, currentY);
        };
    }
}
