declare const ENTITY_TYPE_UNKNOWN: number;
declare const ENTITY_TYPE_WOODCUTTER: number;
declare const ENTITY_TYPE_FISHERMAN: number;
declare const ENTITY_TYPE_MINER: number;
declare const ENTITY_TYPE_FARMER: number;
declare const ENTITY_TYPE_SHEEP: number;
declare const ENTITY_TYPE_COW: number;
declare const ENTITY_TYPE_WOLF: number;

declare class Entity {
    id: string;
    entityType: number;
    ticksAlive: number;
    maxAge: number;
    lastPathfindTime: number;
    pathfindCooldown: number;
    health: number;
    hunger: number;
    stateText: string;
    gold: number;
    ownsHouse: boolean;
    lastMatingTick: number;
    matingCooldown: number;
    moveQueue: Int32Array;
    moveQueueLength: number;
    moveQueueIndex: number;
    inventory: { item: Item, count: number }[];
    isLiving: boolean;
    isMovable: boolean;
    color: string;
    genome: {
        lifespanGene: number;
        hungerRateGene: number;
        speedGene: number;
    };
    moveDelay?: number;
    
    constructor(living: boolean, movable: boolean, viewColor: string, customGenome?: any);
    
    getTotalItemCount(): number;
    eatFood(): boolean;
    static crossoverAndMutate(parentA: Entity, parentB: Entity): any;
    moveTo(startPos: Vector2, endPos: Vector2): void;
    getRandomPos(currentX: number, currentY: number, radius?: number): Vector2;
    addToInventory(item: Item, count?: number): boolean;
    findNearest(currentX: number, currentY: number, maxRadius: number, predicate: (tile: any, x: number, y: number) => boolean): Vector2 | null;
    process(): void;
    move: ((currentX: number, currentY: number) => Vector2) | null;
}

declare class Human extends Entity {
    professionLetter: string;
    constructor(color?: string);
}

declare class Woodcutter extends Human { constructor(); }
declare class Fisherman extends Human { constructor(); }
declare class Miner extends Human { constructor(); }
declare class Farmer extends Human { constructor(); }

declare class Animal extends Entity {
    constructor(color: string);
}

declare class Sheep extends Animal { constructor(); }
declare class Cow extends Animal { constructor(); }
declare class Wolf extends Animal { constructor(); }
