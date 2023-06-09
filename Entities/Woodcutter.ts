class Woodcutter extends Human {
    constructor() {
        super("W");

        this.addToInventory(new Tool("Stone Axe"));
    }

    // getClosestTreePos(): Vector2 {
    //     // TODO: FIGURE THIS OUT
    // }
}