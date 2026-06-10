class TestTools {
    static activeMode: "inspect" | "spawn" | "delete" = "inspect";
    static selectedEntity: "woodcutter" | "fisherman" | "miner" | "farmer" | "sheep" | "cow" | "wolf" = "woodcutter"; // Spawning selection type

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

        const entityButtons = [entityWoodcutter, entityFisherman, entityMiner, entityFarmer, entitySheep, entityCow, entityWolf];
        
        const selectEntity = (type: "woodcutter" | "fisherman" | "miner" | "farmer" | "sheep" | "cow" | "wolf", activeBtn: HTMLElement | null) => {
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
            } else {
                //@ts-ignore
                newEntity = new Wolf();
            }

            if (tile.addEntity(newEntity)) {
                entities.push({ entity: newEntity, pos: Vector2(x, y) });
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
                    entities.splice(i, 1);
                }
            }
            tile.entities = [];
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
}

// Automatically initialize once DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
    TestTools.init();
});
