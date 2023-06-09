/**
 * The base class that all the entities inherit their components and behaviour from.
 */
class Entity {
    id: string = crypto.randomUUID();
    ticksAlive: number = 0;
    color: string;
    
    isLiving: boolean;
    isMovable: boolean;

    moveQueue: GridNode[] = [];
    inventory: Item[] = [];

    process: () => void = () => {}; // Called every frame
    move: ((currentX: number, currentY: number) => Vector2) | null = (currentX: number, currentY: number) => {return Vector2(0,0)}; // Called every frame to move the entity if possible

    constructor(living: boolean, movable: boolean, viewColor: string) {
        this.isLiving = living;
        this.isMovable = movable;
        this.color = viewColor;

        if (!this.isMovable) {
            this.move = null;
        }
    }

    moveTo(startPos: Vector2, endPos: Vector2) {
        //@ts-ignore
        this.moveQueue = astar.search(aStarGrid, aStarGrid.grid[startPos.x][startPos.y], aStarGrid.grid[endPos.x][endPos.y]);
    }

    getRandomPos(): Vector2 {
        return Vector2(Math.floor(Math.random() * X_TILES), Math.floor(Math.random() * Y_TILES));
    }

    addToInventory(item: Item, count: number = 1): boolean {
        if (this.inventory.length >= INVENTORY_MAX_CAPACITY) {
            return false;
        }
        for (var i = 0; i < count; i++) {
            this.inventory.push(item);
        }
        return true;
    }
}