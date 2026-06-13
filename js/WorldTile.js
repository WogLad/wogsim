"use strict";
// Tile types and their colors
var TileType;
(function (TileType) {
    TileType["DARK_GRASS"] = "DARKGREEN";
    TileType["GRASS"] = "#008001";
    TileType["GROUND"] = "#74663B";
    TileType["WATER"] = "#005EB8";
    TileType["DARK_WATER"] = "#003399";
    TileType["SAND"] = "#EEDC82";
    TileType["DESERT"] = "#E4C978";
    TileType["SWAMP"] = "#2F4F4F";
    TileType["SNOW"] = "#FFFFFF";
})(TileType || (TileType = {}));
function getFBM(x, y, octaves, persistence, lacunarity, scale) {
    let total = 0;
    let frequency = scale;
    let amplitude = 1.0;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
        //@ts-ignore
        total += perlin.get(x * frequency, y * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    return total / maxValue;
}
class WorldTile {
    constructor(x, y) {
        this.pos = Vector2(0, 0);
        this.type = TileType.GROUND; // DONE: Should be randomly decided using a noise function
        this.entities = [];
        this.items = []; // DONE: Add objects that exist on tiles such as wheat or trees
        this.worldObjects = [];
        this.setTileType(x, y); // Sets the type of tile
        this.spawnResources();
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
            }
            else if (rand < 0.50) {
                this.items.push(new Item("Apple"));
            }
        }
        else if (type === TileType.GRASS) {
            // Plains
            if (rand < 0.08) {
                this.worldObjects.push(new WorldObject("wheat"));
            }
            else if (rand < 0.16) {
                this.worldObjects.push(new WorldObject("shrub"));
            }
            else if (rand < 0.22) {
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
            }
            else if (rand < 0.40) {
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
            }
            else if (rand < 0.25) {
                this.worldObjects.push(new WorldObject("pine_tree"));
            }
        }
        else if (type === TileType.SAND) {
            // Beach
            if (rand < 0.05) {
                this.worldObjects.push(new WorldObject("palm_tree"));
            }
            else if (rand < 0.15) {
                this.items.push(new Item("Shell"));
            }
        }
    }
    getTileInspectorInfoDiv() {
        var inspectorText = "";
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
    /**
     * Assigns a random tile type to the tile
     */
    setTileType(x, y) {
        this.pos = Vector2(x, y);
        // FBM parameters: x, y, octaves, persistence, lacunarity, scale
        var elevation = getFBM(x, y, 4, 0.45, 2.1, 0.03);
        var moisture = getFBM(x + 5000, y + 5000, 3, 0.5, 2.0, 0.03);
        if (elevation < -0.3) {
            this.type = TileType.DARK_WATER;
        }
        else if (elevation < -0.15) {
            this.type = TileType.WATER;
        }
        else if (elevation < -0.08) {
            this.type = TileType.SAND; // Beach/Sand
        }
        else if (elevation > 0.4) {
            this.type = TileType.SNOW; // Mountain Peak
        }
        else {
            // Land biomes
            if (moisture < -0.2) {
                this.type = TileType.DESERT;
            }
            else if (moisture < 0.2) {
                if (elevation > 0.18) {
                    this.type = TileType.GROUND; // Dry hills
                }
                else {
                    this.type = TileType.GRASS; // Plains
                }
            }
            else {
                if (elevation < 0.05) {
                    this.type = TileType.SWAMP; // Wetlands
                }
                else {
                    this.type = TileType.DARK_GRASS; // Forest
                }
            }
        }
    }
    /**
     * Returns if the entity was successfully added to the tile or not
     */
    addEntity(e) {
        if ((this.entities.length + 1) > TILE_ENTITY_LIMIT) {
            return false;
        }
        this.entities.push(e);
        return true;
    }
    /**
     * Returns if the entity was successfully removed from the tile or not
     */
    removeEntity(index) {
        var e = this.entities.splice(index, 1);
        if (e.length == 0) {
            return false;
        }
        return true;
    }
    getColor() {
        if (this.entities.length != 0) {
            return this.entities[this.entities.length - 1].color;
        }
        return this.type;
    }
    canBeTraversed() {
        if ([TileType.WATER, TileType.DARK_WATER].includes(this.type)) {
            return false;
        }
        if (this.worldObjects.some(o => o.name === "fence")) {
            return false;
        }
        return true;
    }
}
