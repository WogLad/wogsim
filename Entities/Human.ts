class Human extends Entity {
    /** The letter that is displayed on the human to denote its assigned profession */
    professionLetter: string;
    /** The function that is called when a human has to find their next spot to move to for their profession */
    professionMover: (currentX: number, currentY: number) => Vector2 = (x,y) => {return Vector2(0,0)};

    constructor(professionLetter: string) {
        super(true, true, "red");
        this.professionLetter = professionLetter;
    }

    process: () => void = () => {
        // Code to be ran every frame goes here.
    }

    move: ((currentX: number, currentY: number) => Vector2) | null = (currentX, currentY) => {
        // Survival needs ticking
        this.hunger = Math.min(100, this.hunger + 0.5);
        if (this.hunger > 50) {
            this.eatFood();
        }
        if (this.hunger >= 100) {
            this.health = Math.max(0, this.health - 2);
        } else {
            this.health = Math.min(100, this.health + 0.2); // Slow regeneration
        }

        if (this.health <= 0) {
            this.stateText = "Dead";
            return Vector2(0, 0);
        }

        var deviation: Vector2 = Vector2(0,0); // The change made to the current position of the entity

        if (this.moveQueue.length > 0) {
            deviation.x = this.moveQueue[0].x - currentX;
            deviation.y = this.moveQueue[0].y - currentY;
            this.moveQueue.shift(); // Removes the first grid node after moving to it (for A*)
        }
        else {
            // Resource drop-off override
            var hasResources = this.inventory.some(item => !(item instanceof Tool));
            var isFull = this.inventory.length >= INVENTORY_MAX_CAPACITY;

            if (hasResources && (isFull || this.stateText === "Returning to Storage")) {
                this.stateText = "Returning to Storage";
                // Check if adjacent to storage pos (Chebyshev distance <= 1)
                //@ts-ignore
                if (Math.abs(currentX - STORAGE_POS.x) <= 1 && Math.abs(currentY - STORAGE_POS.y) <= 1) {
                    this.stateText = "Depositing Resources";
                    for (var item of this.inventory) {
                        if (!(item instanceof Tool)) {
                            var nameLower = item.name.toLowerCase();
                            //@ts-ignore
                            if (nameLower in Stockpile) {
                                //@ts-ignore
                                Stockpile[nameLower]++;
                            } else {
                                //@ts-ignore
                                Stockpile.wood++;
                            }
                        }
                    }
                    this.inventory = this.inventory.filter(item => item instanceof Tool);
                    this.stateText = "Idle";
                    return Vector2(0, 0);
                } else {
                    var now = performance.now();
                    if (now - this.lastPathfindTime >= this.pathfindCooldown) {
                        this.lastPathfindTime = now;
                        //@ts-ignore
                        this.moveTo(Vector2(currentX, currentY), STORAGE_POS);
                    }
                }
            } else {
                this.stateText = "Gathering Resources";
                var now = performance.now();
                if (now - this.lastPathfindTime >= this.pathfindCooldown) {
                    var newPos: Vector2 = this.professionMover(currentX, currentY);
                    if (!(newPos.x == currentX && newPos.y == currentY)) {
                        this.lastPathfindTime = now;
                        this.moveTo(Vector2(currentX,currentY), newPos);
                    }
                }
            }
        }

        // Prevents the entity from going out of bounds
        if (currentX + deviation.x < 0 || currentX + deviation.x > (X_TILES-1)) {
            deviation.x = 0;
        }
        if (currentY + deviation.y < 0 || currentY + deviation.y > (Y_TILES-1)) {
            deviation.y = 0;
        }

        return deviation; // Return the entity's deviation
    }
}