const ITEM_GOLD_VALUES: { [key: string]: number } = {
    "Wood": 2,
    "Stone": 2,
    "Berry": 2,
    "Apple": 3,
    "Wheat": 4,
    "Fish": 3,
    "Shell": 1
};

class Item {
    name: string;
    goldValue: number;

    constructor(name: string) {
        this.name = name;
        this.goldValue = ITEM_GOLD_VALUES[name] || 0;
    }
}

class Tool extends Item {
    constructor(name: string) {
        super(name);
    }
}