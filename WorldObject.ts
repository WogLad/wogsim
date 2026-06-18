class WorldObject {
    name: string;
    ownerId?: string;
    stockpile?: { [key: string]: number };

    constructor(name: string) {
        this.name = name;
        if (name === "town_hall" || name === "storage_pile") {
            this.stockpile = {
                wood: 0,
                fish: 0,
                stone: 0,
                wheat: 0,
                apple: 0,
                berry: 0,
                gold: 0,
                tree_seed: 0,
                pine_seed: 0,
                palm_seed: 0,
                wheat_seed: 0,
                shrub_seed: 0,
                cactus_seed: 0
            };
        }
    }
}