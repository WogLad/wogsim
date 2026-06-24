// Tile types and their colors
enum TileType {
    DARK_GRASS = "DARKGREEN",
    GRASS = "#008001",
    GROUND = "#74663B",
    WATER = "#005EB8",
    DARK_WATER = "#003399",
    SAND = "#EEDC82",
    DESERT = "#E4C978",
    SWAMP = "#2F4F4F",
    SNOW = "#FFFFFF"
}

// perlin getFBM moved to WASM

class WorldTile {
    pos: Vector2 = Vector2(0,0); 
    type: TileType | string = TileType.GROUND; // DONE: Should be randomly decided using a noise function
    entities: Entity[] = [];
    items: Item[] = []; // DONE: Add objects that exist on tiles such as wheat or trees
    worldObjects: WorldObject[] = [];
    _traversable: boolean = true; // Cached traversability flag — updated via updateTraversable()

    constructor(x: number, y: number, type?: TileType | string) {
        if (type !== undefined) {
            this.pos = Vector2(x, y);
            this.type = type;
        } else {
            this.pos = Vector2(x, y);
            this.type = TileType.GROUND; // default if not provided
        }
        this.spawnResources();
        this.updateTraversable();
    }

    updateTraversable(): void {
        if (this.type === TileType.WATER || this.type === TileType.DARK_WATER) {
            this._traversable = false;
            return;
        }
        for (var i = 0; i < this.worldObjects.length; i++) {
            if (this.worldObjects[i].name === "fence") {
                this._traversable = false;
                return;
            }
        }
        this._traversable = true;
    }

    spawnResources() {
        this.items = [];
        this.worldObjects = [];

        var type = this.type;
        //@ts-ignore
        var multiplier = typeof RESOURCE_SPAWN_MULTIPLIER !== "undefined" ? RESOURCE_SPAWN_MULTIPLIER : 1.0;
        var rand = Math.random() / (multiplier > 0 ? multiplier : 0.000001);

        if (type === TileType.DARK_GRASS) {
            // Forest
            if (rand < 0.40) {
                this.worldObjects.push(new WorldObject("tree"));
            } else if (rand < 0.50) {
                this.items.push(new Item("Apple"));
            }
        } 
        else if (type === TileType.GRASS) {
            // Plains
            if (rand < 0.08) {
                this.worldObjects.push(new WorldObject("wheat"));
            } else if (rand < 0.16) {
                this.worldObjects.push(new WorldObject("shrub"));
            } else if (rand < 0.22) {
                this.items.push(new Item("Apple"));
            }
        } 
        else if (type === TileType.DESERT) {
            // Desert
            if (rand < 0.15) {
                this.worldObjects.push(new WorldObject("cactus"));
            }
        } 
        else if (type === TileType.SWAMP) {
            // Swamp
            if (rand < 0.25) {
                this.worldObjects.push(new WorldObject("reed"));
            } else if (rand < 0.40) {
                this.items.push(new Item("Berry"));
            }
        } 
        else if (type === TileType.WATER || type === TileType.DARK_WATER) {
            // Water
            if (rand < 0.08) {
                this.worldObjects.push(new WorldObject("fish"));
            }
        } 
        else if (type === TileType.SNOW) {
            // Snow mountain
            if (rand < 0.15) {
                this.worldObjects.push(new WorldObject("stone"));
            } else if (rand < 0.25) {
                this.worldObjects.push(new WorldObject("pine_tree"));
            }
        } 
        else if (type === TileType.SAND) {
            // Beach
            if (rand < 0.05) {
                this.worldObjects.push(new WorldObject("palm_tree"));
            } else if (rand < 0.15) {
                this.items.push(new Item("Shell"));
            }
        }
    }

    getTileInspectorInfoDiv(): HTMLDivElement {
        var inspectorText: string = "";
        inspectorText += `pos: ${this.pos.x}, ${this.pos.y}<br>`;
        inspectorText += `type: ${this.type}<br>`; 
        inspectorText += `entity_count: ${this.entities.length}<br>`;
        inspectorText += `item_count: ${this.items.length}<br>`;
        inspectorText += `world_object_count: ${this.worldObjects.length}`;

        var houseObj = this.worldObjects.find(o => o.name === "house");
        if (houseObj && houseObj.ownerId) {
            //@ts-ignore
            var ownerData = entities.find(e => e.entity.id === houseObj.ownerId);
            if (ownerData) {
                var name = ownerData.entity.constructor.name;
                inspectorText += `<br><span style="color: yellow; font-weight: bold;">Owner: ${name}</span>`;
            }
        }

        var div = document.createElement("div");
        div.innerHTML = inspectorText;
        return div;
    }

    // setTileType moved to WASM

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

    canBeTraversed(): boolean {
        return this._traversable;
    }
}