class Woodcutter extends Human {
    /** The radius of the search square that is used to find the human's next position */
    radarLength: number = 10; // TODO: Add a stroke rect in the debug draw function to show the radar of the human

    constructor() {
        super("W");

        this.addToInventory(new Tool("Stone Axe"));

        // DONE: Return the position of a tree if close to any
        this.professionMover = (currentX: number, currentY: number) => {
            // DONE: Remove the tree from the WorldTile
            var currentTile: WorldTile = world.get(`${currentX},${currentY}`) as WorldTile;
            if (currentTile.worldObjects.length > 0 && currentTile.worldObjects[currentTile.worldObjects.length-1].name == "tree") {
                currentTile.worldObjects.pop();
            }

            for (var x = currentX - this.radarLength; x < currentX + this.radarLength; x++) {
                for (var y = currentY - this.radarLength; y < currentY + this.radarLength; y++) {
                    if (world.get(`${x},${y}`) == undefined) { continue }
                    var worldObjects: WorldObject[] = (world.get(`${x},${y}`) as WorldTile).worldObjects;
                    for (var obj of worldObjects) {
                        if (obj.name == "tree") {
                            return Vector2(x,y);
                        }
                    }
                }
            }
            return this.getRandomPos(currentX,currentY);
        }
    }
}