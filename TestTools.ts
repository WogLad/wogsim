class TestTools {
    static activeMode: "inspect" | "spawn" | "delete" = "inspect";
    static selectedEntity: "woodcutter" | "fisherman" | "miner" | "farmer" | "sheep" | "cow" | "wolf" | "tree" | "pine_tree" | "palm_tree" | "stone" | "wheat" | "shrub" | "cactus" = "woodcutter"; // Spawning selection type

    // Inspection state
    static selectedTile: WorldTile | null = null;
    static inspectedEntity: Entity | null = null;

    static init() {
        const modeInspect = document.getElementById("modeInspectBtn");
        const modeSpawn = document.getElementById("modeSpawnBtn");
        const modeDelete = document.getElementById("modeDeleteBtn");
        const entitySelectGroup = document.getElementById("entitySelectGroup");

        const entityWoodcutter = document.getElementById("entityWoodcutterBtn");
        const entityFisherman = document.getElementById("entityFishermanBtn");
        const entityMiner = document.getElementById("entityMinerBtn");
        const entityFarmer = document.getElementById("entityFarmerBtn");
        const entitySheep = document.getElementById("entitySheepBtn");
        const entityCow = document.getElementById("entityCowBtn");
        const entityWolf = document.getElementById("entityWolfBtn");

        const resourceTree = document.getElementById("resourceTreeBtn");
        const resourcePine = document.getElementById("resourcePineBtn");
        const resourcePalm = document.getElementById("resourcePalmBtn");
        const resourceStone = document.getElementById("resourceStoneBtn");
        const resourceWheat = document.getElementById("resourceWheatBtn");
        const resourceShrub = document.getElementById("resourceShrubBtn");
        const resourceCactus = document.getElementById("resourceCactusBtn");

        const togglePanelBtn = document.getElementById("togglePanelBtn");
        const panel = document.getElementById("testToolsPanel");

        if (togglePanelBtn && panel) {
            togglePanelBtn.addEventListener("click", () => {
                panel.classList.toggle("minimized");
                if (panel.classList.contains("minimized")) {
                    togglePanelBtn.innerText = "+";
                } else {
                    togglePanelBtn.innerText = "—";
                }
            });
        }

        const setMode = (mode: "inspect" | "spawn" | "delete") => {
            this.activeMode = mode;
            [modeInspect, modeSpawn, modeDelete].forEach(btn => btn?.classList.remove("active"));
            if (mode === "inspect") {
                modeInspect?.classList.add("active");
                entitySelectGroup?.classList.add("hidden");
                this.setHelpText("Click on the canvas to inspect tiles.");
            } else if (mode === "spawn") {
                modeSpawn?.classList.add("active");
                entitySelectGroup?.classList.remove("hidden");
                this.setHelpText(`Click on a traversable tile to spawn a ${this.selectedEntity}.`);
            } else if (mode === "delete") {
                modeDelete?.classList.add("active");
                entitySelectGroup?.classList.add("hidden");
                this.setHelpText("Click on a tile to remove its entities.");
            }
        };

        modeInspect?.addEventListener("click", () => setMode("inspect"));
        modeSpawn?.addEventListener("click", () => setMode("spawn"));
        modeDelete?.addEventListener("click", () => setMode("delete"));

        const entityButtons = [
            entityWoodcutter, entityFisherman, entityMiner, entityFarmer, entitySheep, entityCow, entityWolf,
            resourceTree, resourcePine, resourcePalm, resourceStone, resourceWheat, resourceShrub, resourceCactus
        ];

        const selectEntity = (type: any, activeBtn: HTMLElement | null) => {
            this.selectedEntity = type;
            entityButtons.forEach(btn => btn?.classList.remove("active"));
            activeBtn?.classList.add("active");
            this.setHelpText(`Click on a traversable tile to spawn a ${type}.`);
        };

        entityWoodcutter?.addEventListener("click", () => selectEntity("woodcutter", entityWoodcutter));
        entityFisherman?.addEventListener("click", () => selectEntity("fisherman", entityFisherman));
        entityMiner?.addEventListener("click", () => selectEntity("miner", entityMiner));
        entityFarmer?.addEventListener("click", () => selectEntity("farmer", entityFarmer));
        entitySheep?.addEventListener("click", () => selectEntity("sheep", entitySheep));
        entityCow?.addEventListener("click", () => selectEntity("cow", entityCow));
        entityWolf?.addEventListener("click", () => selectEntity("wolf", entityWolf));

        resourceTree?.addEventListener("click", () => selectEntity("tree", resourceTree));
        resourcePine?.addEventListener("click", () => selectEntity("pine_tree", resourcePine));
        resourcePalm?.addEventListener("click", () => selectEntity("palm_tree", resourcePalm));
        resourceStone?.addEventListener("click", () => selectEntity("stone", resourceStone));
        resourceWheat?.addEventListener("click", () => selectEntity("wheat", resourceWheat));
        resourceShrub?.addEventListener("click", () => selectEntity("shrub", resourceShrub));
        resourceCactus?.addEventListener("click", () => selectEntity("cactus", resourceCactus));

        // Density Slider
        const densitySlider = document.getElementById("resourceDensitySlider") as HTMLInputElement;
        const densityValue = document.getElementById("resourceDensityValue");
        if (densitySlider && densityValue) {
            densitySlider.addEventListener("input", (e) => {
                const val = parseFloat((e.target as HTMLInputElement).value);
                densityValue.innerText = val.toFixed(1) + "x";
                //@ts-ignore
                if (typeof RESOURCE_SPAWN_MULTIPLIER !== "undefined") {
                    //@ts-ignore
                    RESOURCE_SPAWN_MULTIPLIER = val;
                }
            });
        }

        // Simulation Speed Buttons
        const speed1x = document.getElementById("speed1xBtn");
        const speed2x = document.getElementById("speed2xBtn");
        const speed5x = document.getElementById("speed5xBtn");
        const speed10x = document.getElementById("speed10xBtn");

        const speedBtns = [speed1x, speed2x, speed5x, speed10x];
        const setSpeed = (speed: number, activeBtn: HTMLElement | null) => {
            //@ts-ignore
            SIMULATION_SPEED = speed;
            speedBtns.forEach(btn => btn?.classList.remove("active"));
            activeBtn?.classList.add("active");
        };

        speed1x?.addEventListener("click", () => setSpeed(1, speed1x));
        speed2x?.addEventListener("click", () => setSpeed(2, speed2x));
        speed5x?.addEventListener("click", () => setSpeed(5, speed5x));
        speed10x?.addEventListener("click", () => setSpeed(10, speed10x));

        this.updateStats();
    }

    static setHelpText(text: string) {
        const el = document.querySelector(".help-text");
        if (el) {
            (el as HTMLElement).innerText = text;
        }
    }

    static updateStats() {
        const el = document.getElementById("entityStats");
        if (el) {
            el.innerText = `Total Entities: ${entities.length}`;
        }
        // Continuously record population snapshots for the time-series graph
        this.recordPopulationSample();
    }

    static getTileTypeName(type: string): string {
        switch (type) {
            case "DARKGREEN": return "Forest";
            case "#008001": return "Grassland";
            case "#74663B": return "Dry Hills";
            case "#005EB8": return "Water (Shallow)";
            case "#003399": return "Water (Deep)";
            case "#EEDC82": return "Beach (Sand)";
            case "#E4C978": return "Desert";
            case "#2F4F4F": return "Swamp";
            case "#FFFFFF": return "Snowy Peak";
            default: return type;
        }
    }

    static updateInspector() {
        const tileInfoEl = document.getElementById("devInspectorTileInfo");
        const entitiesSectionEl = document.getElementById("devInspectorEntitiesSection");
        const entitiesListEl = document.getElementById("devInspectorEntitiesList");
        const detailsEl = document.getElementById("devInspectorDetails");

        if (!this.selectedTile) {
            if (tileInfoEl) tileInfoEl.innerText = "Click a tile to inspect.";
            entitiesSectionEl?.classList.add("hidden");
            detailsEl?.classList.add("hidden");
            return;
        }

        // Render Tile Info
        const typeName = this.getTileTypeName(this.selectedTile.type as string);
        if (tileInfoEl) {
            tileInfoEl.innerHTML = `
                <div class="detail-row"><span class="detail-label">Terrain:</span><span class="detail-val highlight">${typeName}</span></div>
                <div class="detail-row"><span class="detail-label">Pos:</span><span class="detail-val">(${this.selectedTile.pos.x}, ${this.selectedTile.pos.y})</span></div>
                <div class="detail-row"><span class="detail-label">Objects:</span><span class="detail-val">${this.selectedTile.worldObjects.length > 0 ? this.selectedTile.worldObjects.map(o => o.name).join(", ") : "None"}</span></div>
            `;
        }

        // Render Entities List on this Tile
        const tileEntities = this.selectedTile.entities;
        if (tileEntities.length > 0) {
            entitiesSectionEl?.classList.remove("hidden");
            if (entitiesListEl) {
                entitiesListEl.innerHTML = "";
                tileEntities.forEach((ent, index) => {
                    const isSelected = this.inspectedEntity === ent;
                    const entTypeName = ent instanceof Woodcutter ? "Woodcutter" : (ent instanceof Fisherman ? "Fisherman" : (ent && ent.constructor ? ent.constructor.name : "Entity"));
                    const letter = ent instanceof Human ? ent.professionLetter : "";
                    const itemDiv = document.createElement("div");
                    itemDiv.className = `inspector-entity-item${isSelected ? " selected" : ""}`;
                    itemDiv.innerHTML = `
                        <span>${entTypeName}${letter ? ` (${letter})` : ""}</span>
                        <span style="font-size: 10px; opacity: 0.6;">ID: ${ent.id.slice(0, 8)}...</span>
                    `;
                    itemDiv.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.inspectedEntity = ent;
                        this.updateInspector();
                    });
                    entitiesListEl.appendChild(itemDiv);
                });
            }
        } else {
            entitiesSectionEl?.classList.add("hidden");
        }

        // Render Entity Details
        if (this.inspectedEntity) {
            detailsEl?.classList.remove("hidden");
            this.renderEntityDetails(this.inspectedEntity);
        } else {
            detailsEl?.classList.add("hidden");
        }
    }

    static renderEntityDetails(ent: Entity) {
        const detailsEl = document.getElementById("devInspectorDetails");
        if (!detailsEl) return;

        const globalData = entities.find(d => d.entity === ent);
        const currentPosStr = globalData ? `(${globalData.pos.x}, ${globalData.pos.y})` : "Unknown";
        const entTypeName = ent instanceof Woodcutter ? "Woodcutter" : (ent instanceof Fisherman ? "Fisherman" : (ent && ent.constructor ? ent.constructor.name : "Entity"));

        let inventoryHtml = "None";
        if (ent.inventory.length > 0) {
            inventoryHtml = `
                <div class="inventory-tags">
                    ${ent.inventory.map(entry => `<span class="inventory-tag">${entry.item.name} x${entry.count}</span>`).join("")}
                </div>
            `;
        }

        const radarVal = (ent as any).radarLength !== undefined ? (ent as any).radarLength : "N/A";
        const pathfindCooldownVal = Math.round(ent.pathfindCooldown) + "ms";

        detailsEl.innerHTML = `
            <div class="entity-details-panel">
                <div class="sub-label">Entity Details</div>
                <div class="detail-row">
                    <span class="detail-label">Type:</span>
                    <span class="detail-val highlight">${entTypeName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="detail-val highlight" id="liveInspectorStatus">${ent.stateText}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Gold:</span>
                    <span class="detail-val" id="liveInspectorGold" style="color: #ffd700; font-weight: bold;">${ent.gold}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Health:</span>
                    <span class="detail-val" id="liveInspectorHealth" style="color: #ff3366; font-weight: bold;">${Math.round(ent.health)}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Hunger:</span>
                    <span class="detail-val" id="liveInspectorHunger" style="color: #ffcc00; font-weight: bold;">${Math.round(ent.hunger)}%</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">ID:</span>
                    <span class="detail-val" title="${ent.id}">${ent.id.slice(0, 8)}...</span>
                </div>
                 <div class="detail-row">
                    <span class="detail-label">Ticks Alive:</span>
                    <span class="detail-val" id="liveInspectorTicks">${ent.ticksAlive} / ${Math.round(ent.maxAge)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Current Pos:</span>
                    <span class="detail-val" id="liveInspectorPos">${currentPosStr}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Move Queue:</span>
                    <span class="detail-val" id="liveInspectorQueue">${ent.moveQueue.length} nodes</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Radar Range:</span>
                    <span class="detail-val">${radarVal}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Path Cooldown:</span>
                    <span class="detail-val">${pathfindCooldownVal}</span>
                </div>
                <div class="sub-label">Genetics & Reproduction</div>
                <div class="detail-row">
                    <span class="detail-label">Gene Lifespan:</span>
                    <span class="detail-val" id="liveInspectorGeneLifespan">${ent.genome ? ent.genome.lifespanGene.toFixed(2) : "1.00"}x</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Gene Hunger:</span>
                    <span class="detail-val" id="liveInspectorGeneHunger">${ent.genome ? ent.genome.hungerRateGene.toFixed(2) : "1.00"}x</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Gene Speed:</span>
                    <span class="detail-val" id="liveInspectorGeneSpeed">${ent.genome ? ent.genome.speedGene.toFixed(2) : "1.00"}x</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Mating Status:</span>
                    <span class="detail-val" id="liveInspectorMatingStatus">Checking...</span>
                </div>
                <div class="sub-label">Inventory (${ent.getTotalItemCount()}/${20})</div>
                <div id="liveInspectorInventory">${inventoryHtml}</div>
            </div>
        `;
    }

    static updateInspectorLive() {
        if (!this.inspectedEntity) return;

        const ent = this.inspectedEntity;

        const statusEl = document.getElementById("liveInspectorStatus");
        if (statusEl) statusEl.innerText = ent.stateText;

        const goldEl = document.getElementById("liveInspectorGold");
        if (goldEl) goldEl.innerText = ent.gold.toString();

        const healthEl = document.getElementById("liveInspectorHealth");
        if (healthEl) healthEl.innerText = `${Math.round(ent.health)}%`;

        const hungerEl = document.getElementById("liveInspectorHunger");
        if (hungerEl) hungerEl.innerText = `${Math.round(ent.hunger)}%`;

        const ticksEl = document.getElementById("liveInspectorTicks");
        if (ticksEl) ticksEl.innerText = `${ent.ticksAlive} / ${Math.round(ent.maxAge)}`;

        // Genetics live update
        const geneLifespanEl = document.getElementById("liveInspectorGeneLifespan");
        if (geneLifespanEl) geneLifespanEl.innerText = ent.genome ? `${ent.genome.lifespanGene.toFixed(2)}x` : "1.00x";

        const geneHungerEl = document.getElementById("liveInspectorGeneHunger");
        if (geneHungerEl) geneHungerEl.innerText = ent.genome ? `${ent.genome.hungerRateGene.toFixed(2)}x` : "1.00x";

        const geneSpeedEl = document.getElementById("liveInspectorGeneSpeed");
        if (geneSpeedEl) geneSpeedEl.innerText = ent.genome ? `${ent.genome.speedGene.toFixed(2)}x` : "1.00x";

        const matingStatusEl = document.getElementById("liveInspectorMatingStatus");
        if (matingStatusEl) {
            let isMature = ent.ticksAlive > (ent.constructor.name === "Human" ? 3000 : 2000);
            let onMatingCooldown = ent.ticksAlive - ent.lastMatingTick <= ent.matingCooldown;
            let matingStatus = "Not Receptive";
            if (ent.health <= 0) {
                matingStatus = "Dead";
            } else if (!isMature) {
                matingStatus = `Juvenile (Mature at ${ent.constructor.name === "Human" ? 3000 : 2000})`;
            } else if (onMatingCooldown) {
                let remaining = Math.round(ent.matingCooldown - (ent.ticksAlive - ent.lastMatingTick));
                matingStatus = `Cooldown (${remaining} ticks)`;
            } else if (ent.hunger >= 40) {
                matingStatus = "Hungry (Needs < 40)";
            } else {
                matingStatus = "Ready";
            }
            matingStatusEl.innerText = matingStatus;
        }

        const posEl = document.getElementById("liveInspectorPos");
        if (posEl) {
            const globalData = entities.find(d => d.entity === ent);
            posEl.innerText = globalData ? `(${globalData.pos.x}, ${globalData.pos.y})` : "Unknown";
        }

        const queueEl = document.getElementById("liveInspectorQueue");
        if (queueEl) queueEl.innerText = `${ent.moveQueue.length} nodes`;

        const inventoryEl = document.getElementById("liveInspectorInventory");
        if (inventoryEl) {
            let inventoryHtml = "None";
            if (ent.inventory.length > 0) {
                inventoryHtml = `
                    <div class="inventory-tags">
                        ${ent.inventory.map(entry => `<span class="inventory-tag">${entry.item.name} x${entry.count}</span>`).join("")}
                    </div>
                `;
            }
            const existingTags = inventoryEl.querySelectorAll(".inventory-tag");
            var isDiff = false;
            if (existingTags.length !== ent.inventory.length) {
                isDiff = true;
            } else {
                for (var idx = 0; idx < existingTags.length; idx++) {
                    var expectedText = `${ent.inventory[idx].item.name} x${ent.inventory[idx].count}`;
                    if ((existingTags[idx] as HTMLElement).innerText !== expectedText) {
                        isDiff = true;
                        break;
                    }
                }
            }
            if (isDiff) {
                inventoryEl.innerHTML = inventoryHtml;
            }
            const labelEl = inventoryEl.previousElementSibling;
            if (labelEl && labelEl.classList.contains("sub-label") && labelEl.textContent && labelEl.textContent.startsWith("Inventory")) {
                (labelEl as HTMLElement).innerText = `Inventory (${ent.getTotalItemCount()}/20)`;
            }
        }
    }

    /**
     * Handles canvas clicks. Returns true if the click was handled by TestTools, false otherwise.
     */
    static handleCanvasClick(x: number, y: number): boolean {
        const tile = world[x] ? world[x][y] : undefined;
        if (!tile) return true; // Handled but out of bounds

        if (this.activeMode === "inspect") {
            this.selectedTile = tile;
            if (tile.entities.length > 0) {
                this.inspectedEntity = tile.entities[0];
            } else {
                this.inspectedEntity = null;
            }
            this.updateInspector();

            var townHall = tile.worldObjects.find(o => o.name === "town_hall" || o.name === "storage_pile");
            if (townHall && townHall.stockpile) {
                //@ts-ignore
                activeStockpile = townHall.stockpile;
                //@ts-ignore
                activeStockpileName = `📦 Village Stockpile (${tile.pos.x}, ${tile.pos.y})`;
            } else {
                //@ts-ignore
                activeStockpile = null;
                //@ts-ignore
                activeStockpileName = "📦 Select a Town Hall to view Stockpile";
            }

            if (tileInspectorDiv) {
                tileInspectorDiv.innerHTML = tile.getTileInspectorInfoDiv().innerHTML;
            }
            return true;
        }

        if (this.activeMode === "spawn") {
            if (!tile.canBeTraversed()) {
                alert("Cannot spawn: Tile is not traversable!");
                return true;
            }
            if (tile.entities.length >= TILE_ENTITY_LIMIT) {
                alert(`Cannot spawn: Tile entity limit (${TILE_ENTITY_LIMIT}) reached!`);
                return true;
            }

            const resourceTypes = ["tree", "pine_tree", "palm_tree", "stone", "wheat", "shrub", "cactus"];
            if (resourceTypes.includes(this.selectedEntity)) {
                tile.worldObjects.push(new WorldObject(this.selectedEntity));
                //@ts-ignore
                if (typeof drawTileToOffscreen === "function") drawTileToOffscreen(x, y);
                this.updateStats();
                return true;
            }

            let newEntity: Entity;
            if (this.selectedEntity === "woodcutter") {
                newEntity = new Woodcutter();
            } else if (this.selectedEntity === "fisherman") {
                newEntity = new Fisherman();
            } else if (this.selectedEntity === "miner") {
                //@ts-ignore
                newEntity = new Miner();
            } else if (this.selectedEntity === "farmer") {
                //@ts-ignore
                newEntity = new Farmer();
            } else if (this.selectedEntity === "sheep") {
                //@ts-ignore
                newEntity = new Sheep();
            } else if (this.selectedEntity === "cow") {
                //@ts-ignore
                newEntity = new Cow();
            } else if (this.selectedEntity === "wolf") {
                //@ts-ignore
                newEntity = new Wolf();
            } else {
                return true;
            }

            if (tile.addEntity(newEntity)) {
                entities.push({ entity: newEntity, pos: Vector2(x, y) });
                //@ts-ignore
                incrementEntityCount(newEntity);
                this.updateStats();

                // Inspect the newly spawned entity
                this.selectedTile = tile;
                this.inspectedEntity = newEntity;
                this.updateInspector();

                if (tileInspectorDiv) {
                    tileInspectorDiv.innerHTML = tile.getTileInspectorInfoDiv().innerHTML;
                }
            }
        } else if (this.activeMode === "delete") {
            if (tile.entities.length === 0) {
                return true;
            }

            // Remove all entities on this tile
            for (let i = entities.length - 1; i >= 0; i--) {
                const ent = entities[i];
                if (ent.pos.x === x && ent.pos.y === y) {
                    //@ts-ignore
                    decrementEntityCount(ent.entity);
                    // Swap-and-pop
                    var lastIdx = entities.length - 1;
                    if (i !== lastIdx) {
                        entities[i] = entities[lastIdx];
                    }
                    entities.length = lastIdx;
                }
            }
            tile.entities = [];
            tile.worldObjects = [];
            tile.items = [];

            //@ts-ignore
            if (typeof drawTileToOffscreen === "function") drawTileToOffscreen(x, y);
            this.updateStats();

            this.selectedTile = tile;
            this.inspectedEntity = null;
            this.updateInspector();

            if (tileInspectorDiv) {
                tileInspectorDiv.innerHTML = tile.getTileInspectorInfoDiv().innerHTML;
            }
        }

        return true;
    }

    /**
     * Renders a hover preview frame. Returns true if TestTools drew a custom preview.
     */
    static drawPreview(hoveredTileX: number, hoveredTileY: number): boolean {
        if (this.activeMode === "inspect") {
            return false; // Fall back to default red selector box
        }

        const tile = world[hoveredTileX] ? world[hoveredTileX][hoveredTileY] : undefined;
        const screenX = Math.round((hoveredTileX - CAMERA_OFFSET.x) * TILE_SIZE);
        const screenY = Math.round((hoveredTileY - CAMERA_OFFSET.y) * TILE_SIZE);

        if (this.activeMode === "spawn") {
            const isValid = tile && tile.canBeTraversed() && tile.entities.length < TILE_ENTITY_LIMIT;
            ctx.strokeStyle = isValid ? "#00ffcc" : "#ff3366";
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

            ctx.fillStyle = isValid ? "rgba(0, 255, 204, 0.4)" : "rgba(255, 51, 102, 0.3)";
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

            ctx.fillStyle = isValid ? "#000000" : "#ffffff";
            ctx.font = "bold 10px sans-serif";
            ctx.textAlign = "center";
            let letter = "W";
            if (this.selectedEntity === "woodcutter") letter = "W";
            else if (this.selectedEntity === "fisherman") letter = "F";
            else if (this.selectedEntity === "miner") letter = "M";
            else if (this.selectedEntity === "farmer") letter = "P";
            else if (this.selectedEntity === "sheep") letter = "S";
            else if (this.selectedEntity === "cow") letter = "C";
            else if (this.selectedEntity === "wolf") letter = "X";
            ctx.fillText(letter, screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 1.4);
        } else if (this.activeMode === "delete") {
            const hasEntities = tile && tile.entities.length > 0;
            ctx.strokeStyle = "#ff3366";
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

            ctx.fillStyle = "rgba(255, 51, 102, 0.3)";
            ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

            if (hasEntities) {
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 10px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("✕", screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 1.4);
            }
        }

        return true;
    }

    // ========================================
    // World Statistics Popup
    // ========================================
    static statsRefreshInterval: any = null;
    static isStatsOpen: boolean = false;
    static popGraphMode: boolean = false; // false = bar chart, true = graph
    static envGraphMode: boolean = false; // false = bar chart, true = graph

    // Population history for time-series graph
    static popHistory: {
        ticks: number[],
        woodcutter: number[],
        fisherman: number[],
        miner: number[],
        farmer: number[],
        sheep: number[],
        cow: number[],
        wolf: number[],
        total: number[],
        avgLifespan: number[],
        avgHungerRate: number[],
        avgSpeed: number[],
        totalGold: number[],
        totalFood: number[],
        totalMaterials: number[],
        avgHealth: number[],
        avgHunger: number[],
        starvationRate: number[],
        homelessnessRate: number[],
        avgAge: number[],
        juvenileRatio: number[],
        working: number[],
        sleeping: number[],
        idle: number[],
        seekingMate: number[],
        tree: number[],
        pine_tree: number[],
        palm_tree: number[],
        fish: number[],
        stone: number[],
        wheat: number[],
        shrub: number[],
        cactus: number[]
    } = {
            ticks: [], woodcutter: [], fisherman: [], miner: [], farmer: [], sheep: [], cow: [], wolf: [], total: [],
            avgLifespan: [], avgHungerRate: [], avgSpeed: [],
            totalGold: [], totalFood: [], totalMaterials: [],
            avgHealth: [], avgHunger: [], starvationRate: [], homelessnessRate: [],
            avgAge: [], juvenileRatio: [],
            working: [], sleeping: [], idle: [], seekingMate: [],
            tree: [], pine_tree: [], palm_tree: [], fish: [], stone: [], wheat: [], shrub: [], cactus: []
        };
    static readonly POP_HISTORY_MAX = 600; // Max data points (~30,000 ticks at 50-tick interval)
    static readonly POP_SAMPLE_INTERVAL = 50; // Record every N ticks
    static lastPopSampleTick: number = -1;

    static openWorldStats() {
        const overlay = document.getElementById("worldStatsOverlay");
        if (!overlay) return;
        overlay.classList.remove("hidden");
        this.isStatsOpen = true;
        this.refreshWorldStats();
        // Auto-refresh every 1 second while open
        this.statsRefreshInterval = setInterval(() => {
            if (this.isStatsOpen) {
                this.refreshWorldStats();
            }
        }, 1000);
    }

    static closeWorldStats() {
        const overlay = document.getElementById("worldStatsOverlay");
        if (overlay) overlay.classList.add("hidden");
        this.isStatsOpen = false;
        if (this.statsRefreshInterval) {
            clearInterval(this.statsRefreshInterval);
            this.statsRefreshInterval = null;
        }
        // Clean up expanded graph if any
        document.getElementById("statsGraphBackdrop")?.remove();
        document.querySelector(".stats-card.expanded")?.classList.remove("expanded");
    }

    static exportDataToCSV() {
        const hist = this.popHistory;
        if (hist.ticks.length === 0) {
            console.warn("No data to export.");
            return;
        }

        let csvContent = "Tick,TotalPopulation,Woodcutter,Fisherman,Miner,Farmer,Sheep,Cow,Wolf,AvgLifespan,AvgHungerRate,AvgSpeed,TotalGold,TotalFood,TotalMaterials,AvgHealth,AvgHunger,StarvationRate,HomelessnessRate,AvgAge,JuvenileRatio,Working,Sleeping,Idle,SeekingMate,Trees,Pine,Palm,Fish,Stone,Wheat,Shrub,Cactus\n";

        for (let i = 0; i < hist.ticks.length; i++) {
            csvContent += `${hist.ticks[i]},${hist.total[i]},${hist.woodcutter[i]},${hist.fisherman[i]},${hist.miner[i]},${hist.farmer[i]},${hist.sheep[i]},${hist.cow[i]},${hist.wolf[i]},${hist.avgLifespan[i]},${hist.avgHungerRate[i]},${hist.avgSpeed[i]},${hist.totalGold[i]},${hist.totalFood[i]},${hist.totalMaterials[i]},${hist.avgHealth[i]},${hist.avgHunger[i]},${hist.starvationRate[i]},${hist.homelessnessRate[i]},${hist.avgAge[i]},${hist.juvenileRatio[i]},${hist.working[i]},${hist.sleeping[i]},${hist.idle[i]},${hist.seekingMate[i]},${hist.tree[i] || 0},${hist.pine_tree[i] || 0},${hist.palm_tree[i] || 0},${hist.fish[i] || 0},${hist.stone[i] || 0},${hist.wheat[i] || 0},${hist.shrub[i] || 0},${hist.cactus[i] || 0}\n`;
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        //@ts-ignore
        link.setAttribute("download", `wogsim_population_data_tick_${typeof ticks !== "undefined" ? ticks : 0}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    static recordPopulationSample() {
        //@ts-ignore
        let currentTick = typeof ticks !== "undefined" ? ticks : 0;
        // Only sample every POP_SAMPLE_INTERVAL ticks
        if (currentTick - this.lastPopSampleTick < this.POP_SAMPLE_INTERVAL && this.lastPopSampleTick >= 0) return;
        this.lastPopSampleTick = currentTick;

        let w = 0, f = 0, m = 0, p = 0, s = 0, c = 0, wo = 0;
        let sumLifespan = 0, sumHungerRate = 0, sumSpeed = 0, genomeCount = 0;
        let totalGold = 0, totalFood = 0, totalMaterials = 0;
        let totalHealth = 0, totalHunger = 0, starvingCount = 0, humansCount = 0, homelessCount = 0;
        let totalAge = 0, juveniles = 0;
        let working = 0, sleeping = 0, idle = 0, seekingMate = 0;

        let totalEntities = entities.length;

        for (let i = 0; i < totalEntities; i++) {
            const ent = entities[i].entity;
            const name = ent.constructor.name;

            // Population
            if (name === "Woodcutter") { w++; humansCount++; }
            else if (name === "Fisherman") { f++; humansCount++; }
            else if (name === "Miner") { m++; humansCount++; }
            else if (name === "Farmer") { p++; humansCount++; }
            else if (name === "Sheep") s++;
            else if (name === "Cow") c++;
            else if (name === "Wolf") wo++;

            // Genetics
            if (ent.genome) {
                genomeCount++;
                sumLifespan += ent.genome.lifespanGene;
                sumHungerRate += ent.genome.hungerRateGene;
                sumSpeed += ent.genome.speedGene;
            }

            // Health/Hunger
            totalHealth += ent.health;
            totalHunger += ent.hunger;
            if (ent.hunger > 80) starvingCount++;

            // Age
            totalAge += ent.ticksAlive;
            let matureAge = (name === "Sheep" || name === "Cow" || name === "Wolf") ? 2000 : 3000;
            if (ent.ticksAlive < matureAge) juveniles++;

            // Gold & Housing
            if (ent.gold !== undefined) totalGold += ent.gold;
            if (["Woodcutter", "Fisherman", "Miner", "Farmer"].includes(name)) {
                if (!ent.ownsHouse) homelessCount++;
            }

            // Inventory
            if (ent.inventory) {
                for (let inv of ent.inventory) {
                    let itemName = inv.item ? inv.item.name : ((inv as any).name || "");
                    if (["raw_meat", "cooked_meat", "fish", "bread", "wheat", "apple", "berry"].includes(itemName.toLowerCase())) totalFood += inv.count;
                    else if (["log", "stone", "iron_ore", "wood"].includes(itemName.toLowerCase())) totalMaterials += inv.count;
                }
            }

            // Activity
            let state = ent.stateText || "Unknown";
            if (state.includes("Working") || state.includes("Gather") || state.includes("Chop") || state.includes("Min") || state.includes("Farm") || state.includes("Fish")) working++;
            else if (state.includes("Sleep")) sleeping++;
            else if (state.includes("Idle") || state.includes("Wander")) idle++;
            else if (state.includes("Seeking Mate")) seekingMate++;
        }

        // Add townhall stockpiles
        //@ts-ignore
        if (typeof townHallPositions !== "undefined" && typeof world !== "undefined") {
            //@ts-ignore
            for (let thPos of townHallPositions) {
                //@ts-ignore
                let tile = world[thPos.x] ? world[thPos.x][thPos.y] : null;
                if (tile) {
                    //@ts-ignore
                    let thObj = tile.worldObjects.find(o => o.name === "town_hall");
                    if (thObj && thObj.stockpile) {
                        let sp = thObj.stockpile;
                        totalGold += (sp.gold || 0);
                        totalFood += (sp.fish || 0) + (sp.wheat || 0) + (sp.apple || 0) + (sp.berry || 0);
                        totalMaterials += (sp.wood || 0) + (sp.stone || 0);
                    }
                }
            }
        }

        let h = this.popHistory;
        h.ticks.push(currentTick);
        h.woodcutter.push(w);
        h.fisherman.push(f);
        h.miner.push(m);
        h.farmer.push(p);
        h.sheep.push(s);
        h.cow.push(c);
        h.wolf.push(wo);
        h.total.push(totalEntities);

        // New Metrics
        h.avgLifespan.push(genomeCount > 0 ? +(sumLifespan / genomeCount).toFixed(2) : 0);
        h.avgHungerRate.push(genomeCount > 0 ? +(sumHungerRate / genomeCount).toFixed(2) : 0);
        h.avgSpeed.push(genomeCount > 0 ? +(sumSpeed / genomeCount).toFixed(2) : 0);

        h.totalGold.push(totalGold);
        h.totalFood.push(totalFood);
        h.totalMaterials.push(totalMaterials);

        h.avgHealth.push(totalEntities > 0 ? +(totalHealth / totalEntities).toFixed(2) : 0);
        h.avgHunger.push(totalEntities > 0 ? +(totalHunger / totalEntities).toFixed(2) : 0);
        h.starvationRate.push(totalEntities > 0 ? +(starvingCount / totalEntities * 100).toFixed(2) : 0);
        h.homelessnessRate.push(humansCount > 0 ? +(homelessCount / humansCount * 100).toFixed(2) : 0);

        h.avgAge.push(totalEntities > 0 ? +(totalAge / totalEntities).toFixed(2) : 0);
        h.juvenileRatio.push(totalEntities > 0 ? +(juveniles / totalEntities * 100).toFixed(2) : 0);

        h.working.push(working);
        h.sleeping.push(sleeping);
        h.idle.push(idle);
        h.seekingMate.push(seekingMate);

        // Count natural resources in the world
        let treeCount = 0, pineCount = 0, palmCount = 0, fishCount = 0;
        let stoneCount = 0, wheatCount = 0, shrubCount = 0, cactusCount = 0;

        for (let x = 0; x < X_TILES; x++) {
            if (!world[x]) continue;
            for (let y = 0; y < Y_TILES; y++) {
                let tile = world[x][y];
                if (tile) {
                    for (let obj of tile.worldObjects) {
                        if (obj.name === "tree") treeCount++;
                        else if (obj.name === "pine_tree") pineCount++;
                        else if (obj.name === "palm_tree") palmCount++;
                        else if (obj.name === "fish") fishCount++;
                        else if (obj.name === "stone") stoneCount++;
                        else if (obj.name === "wheat") wheatCount++;
                        else if (obj.name === "shrub") shrubCount++;
                        else if (obj.name === "cactus") cactusCount++;
                    }
                }
            }
        }

        // Initialize resource arrays on h if not present (legacy support)
        if (!h.tree) h.tree = [];
        if (!h.pine_tree) h.pine_tree = [];
        if (!h.palm_tree) h.palm_tree = [];
        if (!h.fish) h.fish = [];
        if (!h.stone) h.stone = [];
        if (!h.wheat) h.wheat = [];
        if (!h.shrub) h.shrub = [];
        if (!h.cactus) h.cactus = [];

        h.tree.push(treeCount);
        h.pine_tree.push(pineCount);
        h.palm_tree.push(palmCount);
        h.fish.push(fishCount);
        h.stone.push(stoneCount);
        h.wheat.push(wheatCount);
        h.shrub.push(shrubCount);
        h.cactus.push(cactusCount);
    }

    static renderPopulationGraph(container: HTMLElement) {
        // Create or reuse canvas
        let canvas = container.querySelector("canvas#popGraphCanvas") as HTMLCanvasElement;
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.id = "popGraphCanvas";
            canvas.style.width = "100%";
            canvas.style.height = "220px";
            canvas.style.borderRadius = "6px";
            canvas.style.display = "block";
        }

        let isExpanded = !!container.closest(".stats-card")?.classList.contains("expanded");
        let h = isExpanded ? 400 : 220;

        // Set actual pixel size from container width
        let rect = container.getBoundingClientRect();
        let dpr = window.devicePixelRatio || 1;
        let w = Math.floor(rect.width - 32); // account for padding
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";

        let gCtx = canvas.getContext("2d");
        if (!gCtx) return;
        gCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Background
        gCtx.fillStyle = "rgba(0, 0, 0, 0.3)";
        gCtx.fillRect(0, 0, w, h);

        let hist = this.popHistory;
        let dataLen = hist.ticks.length;

        // Slice history if not expanded and length exceeds limit
        let displayHistory = hist;
        if (!isExpanded && dataLen > this.POP_HISTORY_MAX) {
            let startIdx = dataLen - this.POP_HISTORY_MAX;
            displayHistory = {
                ticks: hist.ticks.slice(startIdx),
                woodcutter: hist.woodcutter.slice(startIdx),
                fisherman: hist.fisherman.slice(startIdx),
                miner: hist.miner.slice(startIdx),
                farmer: hist.farmer.slice(startIdx),
                sheep: hist.sheep.slice(startIdx),
                cow: hist.cow.slice(startIdx),
                wolf: hist.wolf.slice(startIdx),
                total: hist.total.slice(startIdx),
                avgLifespan: hist.avgLifespan.slice(startIdx),
                avgHungerRate: hist.avgHungerRate.slice(startIdx),
                avgSpeed: hist.avgSpeed.slice(startIdx),
                totalGold: hist.totalGold.slice(startIdx),
                totalFood: hist.totalFood.slice(startIdx),
                totalMaterials: hist.totalMaterials.slice(startIdx),
                avgHealth: hist.avgHealth.slice(startIdx),
                avgHunger: hist.avgHunger.slice(startIdx),
                starvationRate: hist.starvationRate.slice(startIdx),
                homelessnessRate: hist.homelessnessRate.slice(startIdx),
                avgAge: hist.avgAge.slice(startIdx),
                juvenileRatio: hist.juvenileRatio.slice(startIdx),
                working: hist.working.slice(startIdx),
                sleeping: hist.sleeping.slice(startIdx),
                idle: hist.idle.slice(startIdx),
                seekingMate: hist.seekingMate.slice(startIdx),
                tree: hist.tree.slice(startIdx),
                pine_tree: hist.pine_tree.slice(startIdx),
                palm_tree: hist.palm_tree.slice(startIdx),
                fish: hist.fish.slice(startIdx),
                stone: hist.stone.slice(startIdx),
                wheat: hist.wheat.slice(startIdx),
                shrub: hist.shrub.slice(startIdx),
                cactus: hist.cactus.slice(startIdx)
            };
            dataLen = this.POP_HISTORY_MAX;
        }

        if (dataLen < 2) {
            gCtx.fillStyle = "rgba(255, 255, 255, 0.3)";
            gCtx.font = "12px sans-serif";
            gCtx.textAlign = "center";
            gCtx.fillText("Collecting data... (need at least 2 samples)", w / 2, h / 2);
            // Build the HTML with canvas
            container.innerHTML = "";
            container.appendChild(this.buildGraphHeader(isExpanded));
            container.appendChild(canvas);
            container.appendChild(this.buildGraphLegend());
            return;
        }

        // Chart margins
        let ml = 40, mr = 12, mt = 12, mb = 28;
        let cw = w - ml - mr;
        let ch = h - mt - mb;

        // Find Y max across all series
        let yMax = 0;
        let series: { key: string, color: string, data: number[] }[] = [
            { key: "Woodcutter", color: "#ff7b7b", data: displayHistory.woodcutter },
            { key: "Fisherman", color: "#7bc0ff", data: displayHistory.fisherman },
            { key: "Miner", color: "#d0d0d0", data: displayHistory.miner },
            { key: "Farmer", color: "#e5ff82", data: displayHistory.farmer },
            { key: "Sheep", color: "#ffffff", data: displayHistory.sheep },
            { key: "Cow", color: "#f5deb3", data: displayHistory.cow },
            { key: "Wolf", color: "#888888", data: displayHistory.wolf },
        ];

        for (let s of series) {
            for (let v of s.data) {
                if (v > yMax) yMax = v;
            }
        }
        yMax = Math.max(yMax, 5); // Minimum scale
        yMax = Math.ceil(yMax * 1.1); // 10% headroom

        let xMin = displayHistory.ticks[0];
        let xMax = displayHistory.ticks[dataLen - 1];
        let xRange = Math.max(xMax - xMin, 1);

        // Grid lines
        gCtx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        gCtx.lineWidth = 1;
        let yGridCount = 5;
        gCtx.font = "10px Menlo, Monaco, monospace";
        gCtx.fillStyle = "rgba(255, 255, 255, 0.3)";
        gCtx.textAlign = "right";
        for (let gi = 0; gi <= yGridCount; gi++) {
            let yVal = Math.round((yMax / yGridCount) * gi);
            let yPos = mt + ch - (yVal / yMax) * ch;
            gCtx.beginPath();
            gCtx.moveTo(ml, yPos);
            gCtx.lineTo(ml + cw, yPos);
            gCtx.stroke();
            gCtx.fillText(yVal.toString(), ml - 4, yPos + 3);
        }

        // X-axis tick labels
        gCtx.textAlign = "center";
        gCtx.fillStyle = "rgba(255, 255, 255, 0.3)";
        let xLabelCount = Math.min(6, dataLen);
        for (let xi = 0; xi < xLabelCount; xi++) {
            let idx = Math.floor((xi / (xLabelCount - 1)) * (dataLen - 1));
            let tickVal = displayHistory.ticks[idx];
            let xPos = ml + ((tickVal - xMin) / xRange) * cw;
            gCtx.fillText(tickVal.toString(), xPos, h - 4);
        }

        // Draw each series line
        for (let s of series) {
            gCtx.strokeStyle = s.color;
            gCtx.lineWidth = 1.8;
            gCtx.lineJoin = "round";
            gCtx.beginPath();
            for (let i = 0; i < dataLen; i++) {
                let x = ml + ((displayHistory.ticks[i] - xMin) / xRange) * cw;
                let y = mt + ch - (s.data[i] / yMax) * ch;
                if (i === 0) gCtx.moveTo(x, y);
                else gCtx.lineTo(x, y);
            }
            gCtx.stroke();
        }

        // Axis lines
        gCtx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        gCtx.lineWidth = 1;
        gCtx.beginPath();
        gCtx.moveTo(ml, mt);
        gCtx.lineTo(ml, mt + ch);
        gCtx.lineTo(ml + cw, mt + ch);
        gCtx.stroke();

        // Assemble the card HTML
        container.innerHTML = "";
        container.appendChild(this.buildGraphHeader(isExpanded));
        container.appendChild(canvas);
        container.appendChild(this.buildGraphLegend());
    }

    static buildGraphHeader(isExpanded: boolean): HTMLElement {
        let header = document.createElement("div");
        header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;";
        let title = document.createElement("div");
        title.className = "stat-big-label";
        title.style.cssText = "margin: 0; text-align: left;";
        title.innerText = isExpanded ? "FULL POPULATION HISTORY (TICK 0+)" : "POPULATION OVER TIME (RECENT)";

        let btnContainer = document.createElement("div");
        btnContainer.style.cssText = "display: flex; gap: 8px;";

        if (!isExpanded) {
            let btn = document.createElement("button");
            btn.className = "pop-graph-toggle-btn";
            btn.innerText = "Bar View";
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                TestTools.popGraphMode = false;
                TestTools.refreshWorldStats();
            });
            btnContainer.appendChild(btn);
        }

        let expandBtn = document.createElement("button");
        expandBtn.className = "pop-graph-toggle-btn";
        if (isExpanded) {
            expandBtn.style.cssText = "background: rgba(255, 51, 102, 0.2); border-color: rgba(255, 51, 102, 0.4); color: #ff3366;";
        }
        expandBtn.innerText = isExpanded ? "✕ Collapse" : "🔍 Expand";
        expandBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            let popEl = document.getElementById("statsPopulation");
            if (popEl) {
                let card = popEl.closest(".stats-card");
                if (card) {
                    card.classList.toggle("expanded");
                    let overlay = document.getElementById("statsGraphBackdrop");
                    if (card.classList.contains("expanded")) {
                        if (!overlay) {
                            overlay = document.createElement("div");
                            overlay.id = "statsGraphBackdrop";
                            overlay.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); z-index: 20500; transition: opacity 0.2s ease; border-radius: 16px;";
                            overlay.addEventListener("click", (ev) => {
                                ev.stopPropagation();
                                card?.classList.remove("expanded");
                                overlay?.remove();
                                TestTools.refreshWorldStats();
                            });
                            let popup = card.closest(".stats-popup");
                            if (popup) {
                                popup.appendChild(overlay);
                            }
                        }
                    } else {
                        overlay?.remove();
                    }
                }
            }
            TestTools.refreshWorldStats();
        });
        btnContainer.appendChild(expandBtn);

        header.appendChild(title);
        header.appendChild(btnContainer);
        return header;
    }

    static buildGraphLegend(): HTMLElement {
        let legend = document.createElement("div");
        legend.className = "pop-graph-legend";
        let items = [
            { label: "Woodcutter", color: "#ff7b7b" },
            { label: "Fisherman", color: "#7bc0ff" },
            { label: "Miner", color: "#d0d0d0" },
            { label: "Farmer", color: "#e5ff82" },
            { label: "Sheep", color: "#ffffff" },
            { label: "Cow", color: "#f5deb3" },
            { label: "Wolf", color: "#888888" },
        ];
        for (let item of items) {
            let el = document.createElement("span");
            el.className = "pop-graph-legend-item";
            el.innerHTML = `<span class="pop-graph-legend-swatch" style="background: ${item.color};"></span>${item.label}`;
            legend.appendChild(el);
        }
        return legend;
    }

    static renderEnvironmentGraph(container: HTMLElement) {
        // Create or reuse canvas
        let canvas = container.querySelector("canvas#envGraphCanvas") as HTMLCanvasElement;
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.id = "envGraphCanvas";
            canvas.style.width = "100%";
            canvas.style.height = "220px";
            canvas.style.borderRadius = "6px";
            canvas.style.display = "block";
        }

        let isExpanded = !!container.closest(".stats-card")?.classList.contains("expanded");
        let h = isExpanded ? 400 : 220;

        // Set actual pixel size from container width
        let rect = container.getBoundingClientRect();
        let dpr = window.devicePixelRatio || 1;
        let w = Math.floor(rect.width - 32); // account for padding
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";

        let gCtx = canvas.getContext("2d");
        if (!gCtx) return;
        gCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Background
        gCtx.fillStyle = "rgba(0, 0, 0, 0.3)";
        gCtx.fillRect(0, 0, w, h);

        let hist = this.popHistory;
        let dataLen = hist.ticks.length;

        // Slice history if not expanded and length exceeds limit
        let displayHistory = hist;
        if (!isExpanded && dataLen > this.POP_HISTORY_MAX) {
            let startIdx = dataLen - this.POP_HISTORY_MAX;
            displayHistory = {
                ticks: hist.ticks.slice(startIdx),
                tree: (hist.tree || []).slice(startIdx),
                pine_tree: (hist.pine_tree || []).slice(startIdx),
                palm_tree: (hist.palm_tree || []).slice(startIdx),
                fish: (hist.fish || []).slice(startIdx),
                stone: (hist.stone || []).slice(startIdx),
                wheat: (hist.wheat || []).slice(startIdx),
                shrub: (hist.shrub || []).slice(startIdx),
                cactus: (hist.cactus || []).slice(startIdx),
            } as any;
            dataLen = this.POP_HISTORY_MAX;
        } else {
            displayHistory = {
                ticks: hist.ticks,
                tree: hist.tree || [],
                pine_tree: hist.pine_tree || [],
                palm_tree: hist.palm_tree || [],
                fish: hist.fish || [],
                stone: hist.stone || [],
                wheat: hist.wheat || [],
                shrub: hist.shrub || [],
                cactus: hist.cactus || [],
            } as any;
        }

        if (dataLen < 2) {
            gCtx.fillStyle = "rgba(255, 255, 255, 0.3)";
            gCtx.font = "12px sans-serif";
            gCtx.textAlign = "center";
            gCtx.fillText("Collecting data... (need at least 2 samples)", w / 2, h / 2);
            // Build the HTML with canvas
            container.innerHTML = "";
            container.appendChild(this.buildEnvGraphHeader(isExpanded));
            container.appendChild(canvas);
            container.appendChild(this.buildEnvGraphLegend());
            return;
        }

        // Chart margins
        let ml = 40, mr = 12, mt = 12, mb = 28;
        let cw = w - ml - mr;
        let ch = h - mt - mb;

        // Find Y max across all series
        let yMax = 0;
        let series: { key: string, color: string, data: number[] }[] = [
            { key: "Trees", color: "#228b22", data: displayHistory.tree || [] },
            { key: "Pine", color: "#1e3f20", data: displayHistory.pine_tree || [] },
            { key: "Palm", color: "#2e8b57", data: displayHistory.palm_tree || [] },
            { key: "Fish", color: "#4682b4", data: displayHistory.fish || [] },
            { key: "Stone", color: "#808080", data: displayHistory.stone || [] },
            { key: "Wheat", color: "#daa520", data: displayHistory.wheat || [] },
            { key: "Shrub", color: "#3cb371", data: displayHistory.shrub || [] },
            { key: "Cactus", color: "#2d7a47", data: displayHistory.cactus || [] },
        ];

        for (let s of series) {
            for (let v of s.data) {
                if (v > yMax) yMax = v;
            }
        }
        yMax = Math.max(yMax, 5); // Minimum scale
        yMax = Math.ceil(yMax * 1.1); // 10% headroom

        let xMin = displayHistory.ticks[0];
        let xMax = displayHistory.ticks[dataLen - 1];
        let xRange = Math.max(xMax - xMin, 1);

        // Grid lines
        gCtx.strokeStyle = "rgba(255, 255, 255, 0.06)";
        gCtx.lineWidth = 1;
        let yGridCount = 5;
        gCtx.font = "10px Menlo, Monaco, monospace";
        gCtx.fillStyle = "rgba(255, 255, 255, 0.3)";
        gCtx.textAlign = "right";
        for (let gi = 0; gi <= yGridCount; gi++) {
            let yVal = Math.round((yMax / yGridCount) * gi);
            let yPos = mt + ch - (yVal / yMax) * ch;
            gCtx.beginPath();
            gCtx.moveTo(ml, yPos);
            gCtx.lineTo(ml + cw, yPos);
            gCtx.stroke();
            gCtx.fillText(yVal.toString(), ml - 4, yPos + 3);
        }

        // X-axis tick labels
        gCtx.textAlign = "center";
        gCtx.fillStyle = "rgba(255, 255, 255, 0.3)";
        let xLabelCount = Math.min(6, dataLen);
        for (let xi = 0; xi < xLabelCount; xi++) {
            let idx = Math.floor((xi / (xLabelCount - 1)) * (dataLen - 1));
            let tickVal = displayHistory.ticks[idx];
            let xPos = ml + ((tickVal - xMin) / xRange) * cw;
            gCtx.fillText(tickVal.toString(), xPos, h - 4);
        }

        // Draw each series line
        for (let s of series) {
            gCtx.strokeStyle = s.color;
            gCtx.lineWidth = 1.8;
            gCtx.lineJoin = "round";
            gCtx.beginPath();
            for (let i = 0; i < dataLen; i++) {
                let x = ml + ((displayHistory.ticks[i] - xMin) / xRange) * cw;
                let y = mt + ch - ((s.data[i] || 0) / yMax) * ch;
                if (i === 0) gCtx.moveTo(x, y);
                else gCtx.lineTo(x, y);
            }
            gCtx.stroke();
        }

        // Axis lines
        gCtx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        gCtx.lineWidth = 1;
        gCtx.beginPath();
        gCtx.moveTo(ml, mt);
        gCtx.lineTo(ml, mt + ch);
        gCtx.lineTo(ml + cw, mt + ch);
        gCtx.stroke();

        // Assemble the card HTML
        container.innerHTML = "";
        container.appendChild(this.buildEnvGraphHeader(isExpanded));
        container.appendChild(canvas);
        container.appendChild(this.buildEnvGraphLegend());
    }

    static buildEnvGraphHeader(isExpanded: boolean): HTMLElement {
        let header = document.createElement("div");
        header.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;";
        let title = document.createElement("div");
        title.className = "stat-big-label";
        title.style.cssText = "margin: 0; text-align: left;";
        title.innerText = isExpanded ? "FULL ENVIRONMENT HISTORY (TICK 0+)" : "RESOURCES OVER TIME (RECENT)";

        let btnContainer = document.createElement("div");
        btnContainer.style.cssText = "display: flex; gap: 8px;";

        if (!isExpanded) {
            let btn = document.createElement("button");
            btn.className = "pop-graph-toggle-btn";
            btn.innerText = "Bar View";
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                TestTools.envGraphMode = false;
                TestTools.refreshWorldStats();
            });
            btnContainer.appendChild(btn);
        }

        let expandBtn = document.createElement("button");
        expandBtn.className = "pop-graph-toggle-btn";
        if (isExpanded) {
            expandBtn.style.cssText = "background: rgba(255, 51, 102, 0.2); border-color: rgba(255, 51, 102, 0.4); color: #ff3366;";
        }
        expandBtn.innerText = isExpanded ? "✕ Collapse" : "🔍 Expand";
        expandBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            let envEl = document.getElementById("statsEnvironment");
            if (envEl) {
                let card = envEl.closest(".stats-card");
                if (card) {
                    card.classList.toggle("expanded");
                    let overlay = document.getElementById("statsGraphBackdrop");
                    if (card.classList.contains("expanded")) {
                        if (!overlay) {
                            overlay = document.createElement("div");
                            overlay.id = "statsGraphBackdrop";
                            overlay.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); z-index: 20500; transition: opacity 0.2s ease; border-radius: 16px;";
                            overlay.addEventListener("click", (ev) => {
                                ev.stopPropagation();
                                card?.classList.remove("expanded");
                                overlay?.remove();
                                TestTools.refreshWorldStats();
                            });
                            let popup = card.closest(".stats-popup");
                            if (popup) {
                                popup.appendChild(overlay);
                            }
                        }
                    } else {
                        overlay?.remove();
                    }
                }
            }
            TestTools.refreshWorldStats();
        });
        btnContainer.appendChild(expandBtn);

        header.appendChild(title);
        header.appendChild(btnContainer);
        return header;
    }

    static buildEnvGraphLegend(): HTMLElement {
        let legend = document.createElement("div");
        legend.className = "pop-graph-legend";
        let items = [
            { label: "Trees", color: "#228b22" },
            { label: "Pine", color: "#1e3f20" },
            { label: "Palm", color: "#2e8b57" },
            { label: "Fish", color: "#4682b4" },
            { label: "Stone", color: "#808080" },
            { label: "Wheat", color: "#daa520" },
            { label: "Shrub", color: "#3cb371" },
            { label: "Cactus", color: "#2d7a47" },
        ];
        for (let item of items) {
            let el = document.createElement("span");
            el.className = "pop-graph-legend-item";
            el.innerHTML = `<span class="pop-graph-legend-swatch" style="background: ${item.color};"></span>${item.label}`;
            legend.appendChild(el);
        }
        return legend;
    }

    static refreshWorldStats() {
        // Record population sample
        this.recordPopulationSample();

        // ---- Gather all data ----
        const allEntities = entities;
        const total = allEntities.length;

        // Population counts
        let woodcutters = 0, fishermen = 0, miners = 0, farmers = 0;
        let sheep = 0, cows = 0, wolves = 0;
        let humans = 0, animals = 0;

        // Health/hunger aggregation
        let totalHealth = 0, totalHunger = 0;
        let criticalHealth = 0; // health < 30
        let starving = 0; // hunger > 80
        let wellFed = 0; // hunger < 20
        let dead = 0;

        // Genetics aggregation (only living entities)
        let sumLifespan = 0, sumHungerRate = 0, sumSpeed = 0;
        let minLifespan = Infinity, maxLifespan = -Infinity;
        let minHungerRate = Infinity, maxHungerRate = -Infinity;
        let minSpeed = Infinity, maxSpeed = -Infinity;
        let genomeCount = 0;

        // Age tracking
        let totalAge = 0;
        let oldestAge = 0;
        let youngestAge = Infinity;
        let juveniles = 0; // ticksAlive < 2000/3000

        // Activity state counts
        let activityCounts: { [key: string]: number } = {};

        // Inventory tracking
        let carriedItems: { [key: string]: number } = {};
        let totalGold = 0;
        let homeowners = 0;

        // Mating tracking
        let seekingMate = 0;
        let readyToMate = 0;
        let onMatingCooldown = 0;

        for (let i = 0; i < total; i++) {
            const ent = allEntities[i].entity;
            const name = ent.constructor.name;

            // Population
            if (name === "Woodcutter") { woodcutters++; humans++; }
            else if (name === "Fisherman") { fishermen++; humans++; }
            else if (name === "Miner") { miners++; humans++; }
            else if (name === "Farmer") { farmers++; humans++; }
            else if (name === "Sheep") { sheep++; animals++; }
            else if (name === "Cow") { cows++; animals++; }
            else if (name === "Wolf") { wolves++; animals++; }

            // Health/Hunger
            totalHealth += ent.health;
            totalHunger += ent.hunger;
            if (ent.health < 30) criticalHealth++;
            if (ent.hunger > 80) starving++;
            if (ent.hunger < 20) wellFed++;
            if (ent.health <= 0) dead++;

            // Age
            totalAge += ent.ticksAlive;
            if (ent.ticksAlive > oldestAge) oldestAge = ent.ticksAlive;
            if (ent.ticksAlive < youngestAge) youngestAge = ent.ticksAlive;
            let matureAge = (ent instanceof Human) ? 3000 : 2000;
            if (ent.ticksAlive < matureAge) juveniles++;

            // Genetics
            if (ent.genome) {
                genomeCount++;
                sumLifespan += ent.genome.lifespanGene;
                sumHungerRate += ent.genome.hungerRateGene;
                sumSpeed += ent.genome.speedGene;
                if (ent.genome.lifespanGene < minLifespan) minLifespan = ent.genome.lifespanGene;
                if (ent.genome.lifespanGene > maxLifespan) maxLifespan = ent.genome.lifespanGene;
                if (ent.genome.hungerRateGene < minHungerRate) minHungerRate = ent.genome.hungerRateGene;
                if (ent.genome.hungerRateGene > maxHungerRate) maxHungerRate = ent.genome.hungerRateGene;
                if (ent.genome.speedGene < minSpeed) minSpeed = ent.genome.speedGene;
                if (ent.genome.speedGene > maxSpeed) maxSpeed = ent.genome.speedGene;
            }

            // Activity
            let state = ent.stateText || "Unknown";
            activityCounts[state] = (activityCounts[state] || 0) + 1;

            // Inventory
            for (let inv of ent.inventory) {
                carriedItems[inv.item.name] = (carriedItems[inv.item.name] || 0) + inv.count;
            }

            // Gold & Housing
            totalGold += ent.gold;
            if (ent.ownsHouse) homeowners++;

            // Mating
            if (ent.stateText === "Seeking Mate") seekingMate++;
            let isMature = ent.ticksAlive > matureAge;
            let onCooldown = ent.ticksAlive - ent.lastMatingTick <= ent.matingCooldown;
            if (isMature && !onCooldown && ent.hunger < 40) readyToMate++;
            if (isMature && onCooldown) onMatingCooldown++;
        }

        // Village stockpile aggregation
        let globalStockpile: { [key: string]: number } = {
            wood: 0, fish: 0, stone: 0, wheat: 0, apple: 0, berry: 0, gold: 0,
            tree_seed: 0, pine_seed: 0, palm_seed: 0, wheat_seed: 0, shrub_seed: 0, cactus_seed: 0
        };
        let villageCount = townHallPositions.length;
        let villageData: { pos: Vector2, population: number, stockpile: { [key: string]: number } }[] = [];

        for (let thPos of townHallPositions) {
            let tile = world[thPos.x] ? world[thPos.x][thPos.y] : null;
            let thObj = tile ? tile.worldObjects.find((o: WorldObject) => o.name === "town_hall") : null;
            let sp = thObj && thObj.stockpile ? thObj.stockpile : {
                wood: 0, fish: 0, stone: 0, wheat: 0, apple: 0, berry: 0, gold: 0,
                tree_seed: 0, pine_seed: 0, palm_seed: 0, wheat_seed: 0, shrub_seed: 0, cactus_seed: 0
            };

            for (let key in globalStockpile) {
                globalStockpile[key] += (sp[key] || 0);
            }

            // Count nearby villagers
            let nearbyHumans = allEntities.filter(d =>
                d.entity instanceof Human &&
                Math.max(Math.abs(d.pos.x - thPos.x), Math.abs(d.pos.y - thPos.y)) <= 45
            ).length;

            villageData.push({ pos: thPos, population: nearbyHumans, stockpile: sp });
        }

        // World house count (full scan — houses are sparse so sampling could miss them)
        let houseCount = 0;
        for (let x = 0; x < X_TILES; x++) {
            for (let y = 0; y < Y_TILES; y++) {
                if (world[x][y].worldObjects.some((o: WorldObject) => o.name === "house")) {
                    houseCount++;
                }
            }
        }

        // ---- Helper functions ----
        function statLine(label: string, value: string | number, cssClass: string = ""): string {
            return `<div class="stat-line"><span class="stat-label">${label}</span><span class="stat-value ${cssClass}">${value}</span></div>`;
        }

        function meterBar(label: string, value: number, max: number, colorClass: string): string {
            let pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
            return `<div class="stat-meter">
                <div class="stat-meter-label"><span>${label}</span><span>${Math.round(pct)}%</span></div>
                <div class="stat-meter-bar"><div class="stat-meter-fill ${colorClass}" style="width: ${pct}%"></div></div>
            </div>`;
        }

        function popBar(label: string, count: number, maxCount: number, color: string): string {
            let pct = maxCount > 0 ? Math.min(100, (count / maxCount) * 100) : 0;
            return `<div class="pop-bar-row">
                <span class="pop-bar-label">${label}</span>
                <div class="pop-bar-track">
                    <div class="pop-bar-fill" style="width: ${pct}%; background: ${color};"></div>
                    <span class="pop-bar-count">${count}</span>
                </div>
            </div>`;
        }

        // ---- Render sections ----

        // 1. Population Census
        const maxPop = Math.max(woodcutters, fishermen, miners, farmers, sheep, cows, wolves, 1);
        const popEl = document.getElementById("statsPopulation");
        if (popEl) {
            if (this.popGraphMode) {
                // Graph view
                this.renderPopulationGraph(popEl);
            } else {
                // Bar chart view
                popEl.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="stat-big" style="flex: 1;">
                            <div class="stat-big-number">${total}</div>
                            <div class="stat-big-label">Total Entities</div>
                        </div>
                        <button class="pop-graph-toggle-btn" id="popGraphToggleBtn">📈 Graph</button>
                    </div>
                    <hr class="stat-divider">
                    <div class="stat-section-label">Humans (${humans})</div>
                    ${popBar("Woodcutter", woodcutters, maxPop, "#ff7b7b")}
                    ${popBar("Fisherman", fishermen, maxPop, "#7bc0ff")}
                    ${popBar("Miner", miners, maxPop, "#d0d0d0")}
                    ${popBar("Farmer", farmers, maxPop, "#e5ff82")}
                    <div class="stat-section-label">Animals (${animals})</div>
                    ${popBar("Sheep", sheep, maxPop, "#ffffff")}
                    ${popBar("Cow", cows, maxPop, "#f5f5dc")}
                    ${popBar("Wolf", wolves, maxPop, "#888888")}
                    <hr class="stat-divider">
                    ${statLine("Entity Cap", `${total} / ${MAX_ENTITIES_LIMIT}`, total >= MAX_ENTITIES_LIMIT ? "danger" : "accent")}
                `;
                // Bind the toggle button
                let toggleBtn = document.getElementById("popGraphToggleBtn");
                if (toggleBtn) {
                    toggleBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        TestTools.popGraphMode = true;
                        TestTools.refreshWorldStats();
                    });
                }
            }
        }

        // 2. Global Economy
        const econEl = document.getElementById("statsEconomy");
        if (econEl) {
            let totalStockpileValue = 0;
            for (let key in globalStockpile) {
                if (key === "gold") continue;
                let itemName = key.charAt(0).toUpperCase() + key.slice(1);
                totalStockpileValue += (globalStockpile[key] || 0) * (ITEM_GOLD_VALUES[itemName] || 1);
            }
            let totalCarriedValue = 0;
            for (let key in carriedItems) {
                totalCarriedValue += (carriedItems[key] || 0) * (ITEM_GOLD_VALUES[key] || 1);
            }

            econEl.innerHTML = `
                <div class="stat-big">
                    <div class="stat-big-number" style="color: #ffd700;">${totalGold}</div>
                    <div class="stat-big-label">Total Gold (On Entities)</div>
                </div>
                <hr class="stat-divider">
                ${statLine("Stockpile Gold", globalStockpile.gold, "gold")}
                ${statLine("Stockpile Value", `${totalStockpileValue} g`, "gold")}
                ${statLine("Carried Value", `${totalCarriedValue} g`, "")}
                <hr class="stat-divider">
                ${statLine("Homeowners", homeowners, "accent")}
                ${statLine("Houses Built", houseCount, "accent")}
                ${statLine("Avg Gold/Human", humans > 0 ? (totalGold / humans).toFixed(1) : "0", "gold")}
            `;
        }

        // 3. Village Summary
        const villEl = document.getElementById("statsVillages");
        if (villEl) {
            let villageHtml = `${statLine("Villages", villageCount, "accent")}`;
            villageHtml += `<hr class="stat-divider">`;
            for (let vi = 0; vi < villageData.length; vi++) {
                let vd = villageData[vi];
                let sp = vd.stockpile;
                let totalRes = 0;
                for (let k in sp) totalRes += (sp[k] || 0);
                villageHtml += `
                    <div class="stat-section-label">Village ${vi + 1} (${vd.pos.x}, ${vd.pos.y})</div>
                    ${statLine("Population", vd.population, vd.population < 2 ? "danger" : "accent")}
                    ${statLine("Total Resources", totalRes, "")}
                `;
            }
            villEl.innerHTML = villageHtml;
        }

        // 4. Activity Breakdown
        const actEl = document.getElementById("statsActivity");
        if (actEl) {
            // Sort activities by count
            let sorted = Object.entries(activityCounts).sort((a, b) => b[1] - a[1]);
            let html = "";
            for (let [state, count] of sorted) {
                let pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
                let colorClass = "";
                if (state.includes("Dead")) colorClass = "danger";
                else if (state.includes("Hungry") || state.includes("Starv")) colorClass = "warn";
                else if (state.includes("Fleeing")) colorClass = "danger";
                else if (state.includes("Hunting")) colorClass = "info";
                else if (state.includes("Mate")) colorClass = "purple";
                else if (state.includes("Gathering") || state.includes("Grazing")) colorClass = "accent";

                html += statLine(state, `${count} (${pct}%)`, colorClass);
            }
            actEl.innerHTML = html || `<span class="stat-label">No entities active</span>`;
        }

        // 5. Genetic Pool Analysis
        const genEl = document.getElementById("statsGenetics");
        if (genEl) {
            let avgLifespan = genomeCount > 0 ? (sumLifespan / genomeCount) : 1;
            let avgHunger = genomeCount > 0 ? (sumHungerRate / genomeCount) : 1;
            let avgSpeed = genomeCount > 0 ? (sumSpeed / genomeCount) : 1;

            if (genomeCount === 0) {
                minLifespan = 0; maxLifespan = 0;
                minHungerRate = 0; maxHungerRate = 0;
                minSpeed = 0; maxSpeed = 0;
            }

            genEl.innerHTML = `
                <div class="stat-section-label">Lifespan Gene</div>
                ${statLine("Average", avgLifespan.toFixed(3) + "x", "accent")}
                ${statLine("Range", `${minLifespan.toFixed(2)} — ${maxLifespan.toFixed(2)}`, "")}
                ${meterBar("Avg vs Baseline", avgLifespan, 2.0, "green")}
                <div class="stat-section-label">Hunger Rate Gene</div>
                ${statLine("Average", avgHunger.toFixed(3) + "x", avgHunger > 1.1 ? "warn" : "accent")}
                ${statLine("Range", `${minHungerRate.toFixed(2)} — ${maxHungerRate.toFixed(2)}`, "")}
                ${meterBar("Avg vs Baseline", avgHunger, 2.0, avgHunger > 1.1 ? "orange" : "green")}
                <div class="stat-section-label">Speed Gene</div>
                ${statLine("Average", avgSpeed.toFixed(3) + "x", "accent")}
                ${statLine("Range", `${minSpeed.toFixed(2)} — ${maxSpeed.toFixed(2)}`, "")}
                ${meterBar("Avg vs Baseline", avgSpeed, 2.0, "blue")}
                <hr class="stat-divider">
                ${statLine("Genome Samples", genomeCount, "")}
            `;
        }

        // 6. Health & Survival
        const healthEl = document.getElementById("statsHealth");
        if (healthEl) {
            let avgHealth = total > 0 ? (totalHealth / total) : 0;
            let avgHunger = total > 0 ? (totalHunger / total) : 0;
            let avgAge = total > 0 ? (totalAge / total) : 0;

            healthEl.innerHTML = `
                ${meterBar("Average Health", avgHealth, 100, avgHealth < 50 ? "red" : "green")}
                ${meterBar("Average Hunger", avgHunger, 100, avgHunger > 60 ? "red" : avgHunger > 30 ? "orange" : "green")}
                <hr class="stat-divider">
                ${statLine("Critical Health (<30)", criticalHealth, criticalHealth > 0 ? "danger" : "")}
                ${statLine("Starving (>80 hunger)", starving, starving > 0 ? "danger" : "")}
                ${statLine("Well Fed (<20 hunger)", wellFed, "accent")}
                <hr class="stat-divider">
                <div class="stat-section-label">Age & Reproduction</div>
                ${statLine("Average Age", Math.round(avgAge) + " ticks", "")}
                ${statLine("Oldest Entity", oldestAge + " ticks", "accent")}
                ${statLine("Juveniles", juveniles, "")}
                ${statLine("Seeking Mate", seekingMate, seekingMate > 0 ? "info" : "")}
                ${statLine("Ready to Mate", readyToMate, readyToMate > 0 ? "accent" : "")}
                ${statLine("Mating Cooldown", onMatingCooldown, "")}
            `;
        }

        // 7. World Environment (tile-type counts — sampled for performance)
        const envEl = document.getElementById("statsEnvironment");
        if (envEl) {
            // Count world objects
            let treeCount = 0, fishCount = 0, stoneCount = 0, wheatCount = 0;
            let shrubCount = 0, cactusCount = 0, reedCount = 0, palmCount = 0, pineCount = 0;
            let fenceCount = 0, townHallCount = 0;

            for (let x = 0; x < X_TILES; x++) {
                for (let y = 0; y < Y_TILES; y++) {
                    let tile = world[x][y];
                    for (let obj of tile.worldObjects) {
                        if (obj.name === "tree") treeCount++;
                        else if (obj.name === "pine_tree") pineCount++;
                        else if (obj.name === "palm_tree") palmCount++;
                        else if (obj.name === "fish") fishCount++;
                        else if (obj.name === "stone") stoneCount++;
                        else if (obj.name === "wheat") wheatCount++;
                        else if (obj.name === "shrub") shrubCount++;
                        else if (obj.name === "cactus") cactusCount++;
                        else if (obj.name === "reed") reedCount++;
                        else if (obj.name === "fence") fenceCount++;
                        else if (obj.name === "town_hall") townHallCount++;
                    }
                }
            }

            if (this.envGraphMode) {
                this.renderEnvironmentGraph(envEl);
            } else {
                envEl.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div class="stat-big" style="flex: 1;">
                            <div class="stat-big-number">${(X_TILES * Y_TILES).toLocaleString()}</div>
                            <div class="stat-big-label">Total Tiles</div>
                        </div>
                        <button class="pop-graph-toggle-btn" id="envGraphToggleBtn">📈 Graph</button>
                    </div>
                    <hr class="stat-divider">
                    ${statLine("World Size", `${X_TILES} × ${Y_TILES}`, "accent")}
                    <hr class="stat-divider">
                    <div class="stat-section-label">Natural Resources</div>
                    <div class="stat-grid">
                        ${statLine("🌳 Trees", `${treeCount}`, "")}
                        ${statLine("🌲 Pine", `${pineCount}`, "")}
                        ${statLine("🌴 Palm", `${palmCount}`, "")}
                        ${statLine("🐟 Fish", `${fishCount}`, "")}
                        ${statLine("🪨 Stone", `${stoneCount}`, "")}
                        ${statLine("🌾 Wheat", `${wheatCount}`, "")}
                        ${statLine("🌿 Shrub", `${shrubCount}`, "")}
                        ${statLine("🌵 Cactus", `${cactusCount}`, "")}
                    </div>
                `;

                // Bind the toggle button
                let toggleBtn = document.getElementById("envGraphToggleBtn");
                if (toggleBtn) {
                    toggleBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        TestTools.envGraphMode = true;
                        TestTools.refreshWorldStats();
                    });
                }
            }
        }

        // 8. Total Stockpile Resources
        const resEl = document.getElementById("statsResources");
        if (resEl) {
            let totalRes = 0;
            for (let key in globalStockpile) totalRes += globalStockpile[key];

            const resourceEmoji: { [key: string]: string } = {
                wood: "🪵", fish: "🐟", stone: "🪨", wheat: "🌾", apple: "🍎", berry: "🫐", gold: "💰",
                tree_seed: "🌱", pine_seed: "🌲", palm_seed: "🌴", wheat_seed: "🌾", shrub_seed: "🌿", cactus_seed: "🌵"
            };
            let maxRes = Math.max(...Object.values(globalStockpile), 1);

            let html = `
                <div class="stat-big">
                    <div class="stat-big-number" style="font-size: 26px;">${totalRes}</div>
                    <div class="stat-big-label">Total Resources (All Villages)</div>
                </div>
                <hr class="stat-divider">
            `;

            for (let key in globalStockpile) {
                let emoji = resourceEmoji[key] || "📦";
                let value = globalStockpile[key];
                let colorClass = key === "gold" ? "gold" : "green";
                let label = key.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                html += meterBar(`${emoji} ${label}`, value, maxRes, colorClass);
            }

            resEl.innerHTML = html;
        }

        // 9. Carried Inventory
        const invEl = document.getElementById("statsInventory");
        if (invEl) {
            let sortedItems = Object.entries(carriedItems).sort((a, b) => b[1] - a[1]);
            let totalCarried = 0;
            for (let [, count] of sortedItems) totalCarried += count;

            let html = `
                <div class="stat-big">
                    <div class="stat-big-number" style="font-size: 26px;">${totalCarried}</div>
                    <div class="stat-big-label">Total Items Carried</div>
                </div>
                <hr class="stat-divider">
            `;

            if (sortedItems.length === 0) {
                html += `<span class="stat-label">No items being carried</span>`;
            } else {
                for (let [name, count] of sortedItems) {
                    html += statLine(name, count, "");
                }
            }
            invEl.innerHTML = html;
        }

        // Update tick counter
        const tickEl = document.getElementById("statsTickCounter");
        //@ts-ignore
        if (tickEl) tickEl.innerText = `Tick: ${typeof ticks !== "undefined" ? ticks : 0}`;
    }
}

// Automatically initialize once DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
    TestTools.init();

    // World Stats button
    const statsBtn = document.getElementById("worldStatsBtn");
    const statsCloseBtn = document.getElementById("statsCloseBtn");
    const statsExportBtn = document.getElementById("statsExportBtn");
    const statsOverlay = document.getElementById("worldStatsOverlay");

    if (statsBtn) {
        statsBtn.addEventListener("click", () => {
            TestTools.openWorldStats();
        });
    }
    if (statsExportBtn) {
        statsExportBtn.addEventListener("click", () => {
            TestTools.exportDataToCSV();
        });
    }
    if (statsCloseBtn) {
        statsCloseBtn.addEventListener("click", () => {
            TestTools.closeWorldStats();
        });
    }
    // Close on clicking backdrop
    if (statsOverlay) {
        statsOverlay.addEventListener("click", (e) => {
            if (e.target === statsOverlay) {
                TestTools.closeWorldStats();
            }
        });
    }
    // Close with Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && TestTools.isStatsOpen) {
            TestTools.closeWorldStats();
        }
    });

    // Save & Load UI integration
    const saveGameBtn = document.getElementById("saveGameBtn");
    const loadGameBtn = document.getElementById("loadGameBtn");
    const loadGameInput = document.getElementById("loadGameInput") as HTMLInputElement;

    if (saveGameBtn) {
        saveGameBtn.addEventListener("click", () => {
            //@ts-ignore
            if (typeof SaveManager !== "undefined") SaveManager.saveGame();
        });
    }

    if (loadGameBtn && loadGameInput) {
        loadGameBtn.addEventListener("click", () => {
            loadGameInput.click();
        });

        loadGameInput.addEventListener("change", (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target.files && target.files.length > 0) {
                const file = target.files[0];
                const reader = new FileReader();
                reader.onload = (re) => {
                    if (re.target && typeof re.target.result === "string") {
                        //@ts-ignore
                        if (typeof SaveManager !== "undefined") SaveManager.loadGame(re.target.result);
                    }
                };
                reader.readAsText(file);
                target.value = ""; // Reset to allow re-selection
            }
        });
    }
});
