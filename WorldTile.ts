// Tile types and their colors
enum TileType {
    DARK_GRASS = "DARKGREEN",
    GRASS = "#008001",
    GROUND = "#74663B",
    WATER = "#005EB8",
    DARK_WATER = "#003399"
}

class WorldTile {
    type: TileType | string = TileType.GROUND; // DONE: Should be randomly decided using a noise function
    entities: Entity[] = [];
    // TODO: Add objects that exist on tiles such as wheat or trees

    constructor(x: number, y: number) {
        this.setTileType(x,y); // Sets the type of tile
    }

    /**
     * Assigns a random tile type to the tile
     */
    setTileType(x: number, y: number) {
        const noiseFactor: number = 0.07; // Multiply the coords with this to get desired noise values
        //@ts-ignore
        var noiseVal: number = perlin.get(x*noiseFactor, y*noiseFactor);
        if (noiseVal >= 0.15) {
            this.type = TileType.DARK_GRASS;
        }
        else if (noiseVal < 0.15 && noiseVal >= 0) {
            this.type = TileType.GRASS;
        }
        else if (noiseVal < 0 && noiseVal >= -0.25) {
            this.type = TileType.GROUND;
        }
        else if (noiseVal < -0.25 && noiseVal >= -0.35) {
            this.type = TileType.WATER;
        }
        else if (noiseVal < 0.35) {
            this.type = TileType.DARK_WATER;
        }
        // var w = 255*noiseVal;
        // this.type = `rgb(${w}, ${w}, ${w})`;
    }

    /**
     * Returns if the entity was successfully added to the tile or not
     */
    addEntity(e: Entity): boolean {
        if ((this.entities.length + 1) > TILE_ENTITY_LIMIT) {
            return false;
        }
        this.entities.push(e);
        return true;
    }

    /**
     * Returns if the entity was successfully removed from the tile or not
     */
    removeEntity(index: number): boolean {
        var e: Entity[] = this.entities.splice(index, 1);
        if (e.length == 0) {
            return false;
        }
        return true;
    }

    getColor(): string | null {
        if (this.entities.length != 0) {
            return this.entities[this.entities.length-1].color
        }
        return this.type;
    }
}