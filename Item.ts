class Item {
    name: string;

    constructor(name: string) {
        this.name = name;
    }
}

class Tool extends Item {
    constructor(name: string) {
        super(name);
    }
}