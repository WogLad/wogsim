class SaveManager {
    static saveGame() {
        //@ts-ignore
        const savedTicks = typeof ticks !== "undefined" ? ticks : 0;
        //@ts-ignore
        const savedTownHalls = typeof townHallPositions !== "undefined" ? townHallPositions : [];
        //@ts-ignore
        const savedPaused = typeof PAUSED !== "undefined" ? PAUSED : false;

        const testToolsState = {
            //@ts-ignore
            popHistory: typeof TestTools !== "undefined" ? TestTools.popHistory : null,
            //@ts-ignore
            lastPopSampleTick: typeof TestTools !== "undefined" ? TestTools.lastPopSampleTick : -1
        };

        const flatWorld = [];
        //@ts-ignore
        for (let x = 0; x < X_TILES; x++) {
            let col = [];
            //@ts-ignore
            for (let y = 0; y < Y_TILES; y++) {
                //@ts-ignore
                let tile = world[x][y];
                col.push({
                    type: tile.type,
                    worldObjects: tile.worldObjects, // Clean WorldObject serialization
                    items: tile.items // Clean Item serialization
                });
            }
            flatWorld.push(col);
        }

        const flatEntities = [];
        //@ts-ignore
        for (let entry of entities) {
            let ent = entry.entity;
            flatEntities.push({
                className: ent.constructor.name,
                pos: entry.pos,
                data: ent // This copies all scalar fields, plus genome and inventory
            });
        }

        const saveData = {
            version: 1,
            ticks: savedTicks,
            townHallPositions: savedTownHalls,
            PAUSED: savedPaused,
            testToolsState: testToolsState,
            world: flatWorld,
            entities: flatEntities
        };

        const jsonString = JSON.stringify(saveData);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wogsim_save_tick_${savedTicks}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    static loadGame(jsonString: string) {
        try {
            const data = JSON.parse(jsonString);

            // Restore Globals
            //@ts-ignore
            ticks = data.ticks;
            //@ts-ignore
            townHallPositions = data.townHallPositions;
            //@ts-ignore
            PAUSED = data.PAUSED;

            // Restore TestTools
            if (data.testToolsState && typeof TestTools !== "undefined") {
                //@ts-ignore
                TestTools.popHistory = data.testToolsState.popHistory;
                //@ts-ignore
                TestTools.lastPopSampleTick = data.testToolsState.lastPopSampleTick;
            }

            // Clear existing world entities
            //@ts-ignore
            entities.splice(0, entities.length);
            // Reset entity counters
            //@ts-ignore
            entityCounts.woodcutter = 0;
            //@ts-ignore
            entityCounts.fisherman = 0;
            //@ts-ignore
            entityCounts.miner = 0;
            //@ts-ignore
            entityCounts.farmer = 0;
            //@ts-ignore
            entityCounts.sheep = 0;
            //@ts-ignore
            entityCounts.cow = 0;
            //@ts-ignore
            entityCounts.wolf = 0;
            //@ts-ignore
            entityCounts.total = 0;

            // Restore World
            //@ts-ignore
            for (let x = 0; x < X_TILES; x++) {
                //@ts-ignore
                for (let y = 0; y < Y_TILES; y++) {
                    let savedTile = data.world[x][y];
                    //@ts-ignore
                    let tile = world[x][y];
                    tile.type = savedTile.type;
                    tile.entities = []; // Clear existing refs
                    
                    // Restore items
                    tile.items = savedTile.items.map((itData: any) => {
                        //@ts-ignore
                        let i = new Item(itData.name);
                        Object.assign(i, itData);
                        return i;
                    });

                    // Restore world objects
                    tile.worldObjects = savedTile.worldObjects.map((woData: any) => {
                        //@ts-ignore
                        let wo = new WorldObject(woData.name);
                        Object.assign(wo, woData);
                        return wo;
                    });
                }
            }

            const ENTITY_CLASSES: { [key: string]: any } = {
                "Woodcutter": Woodcutter,
                "Fisherman": Fisherman,
                "Miner": Miner,
                "Farmer": Farmer,
                "Sheep": Sheep,
                "Cow": Cow,
                "Wolf": Wolf
            };

            // Restore Entities
            for (let savedEnt of data.entities) {
                // Determine class
                let EntClass = ENTITY_CLASSES[savedEnt.className];
                if (!EntClass) {
                    console.error("Unknown entity class:", savedEnt.className);
                    continue;
                }

                let ent = new EntClass();
                
                // Assign all data. This overwrites the initialized fields.
                Object.assign(ent, savedEnt.data);

                // Fix performance.now() dependent timers that broke due to session restarts
                ent.lastPathfindTime = performance.now() - Math.random() * (ent.pathfindCooldown || 2000);
                if ('lastFeedTime' in ent) {
                    (ent as any).lastFeedTime = performance.now() - Math.random() * 20000;
                }

                // Fix inventory to ensure it's Item objects
                if (ent.inventory) {
                    ent.inventory = ent.inventory.map((inv: any) => {
                        let count = inv.count;
                        //@ts-ignore
                        let itemObj = new Item(inv.item.name);
                        Object.assign(itemObj, inv.item);
                        return { count: count, item: itemObj };
                    });
                }

                // Add to global array
                //@ts-ignore
                entities.push({ entity: ent, pos: savedEnt.pos });
                //@ts-ignore
                incrementEntityCount(ent);

                // Add to tile
                //@ts-ignore
                world[savedEnt.pos.x][savedEnt.pos.y].addEntity(ent);
            }

            // Redraw everything
            //@ts-ignore
            if (typeof drawEntireWorldToOffscreen === "function") {
                //@ts-ignore
                drawEntireWorldToOffscreen();
            }

            alert("Save file loaded successfully!");
            
        } catch (e) {
            console.error("Failed to load save file:", e);
            alert("Failed to load save file. Check the console for details.");
        }
    }
}
