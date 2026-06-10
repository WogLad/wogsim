class TestTools {
    static activeMode: "inspect" | "spawn" | "delete" = "inspect";
    static selectedEntity: "woodcutter" | "fisherman" = "woodcutter"; // Spawning selection type

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

        entityWoodcutter?.addEventListener("click", () => {
            this.selectedEntity = "woodcutter";
            entityWoodcutter.classList.add("active");
            entityFisherman?.classList.remove("active");
            this.setHelpText("Click on a traversable tile to spawn a woodcutter.");
        });

        entityFisherman?.addEventListener("click", () => {
            this.selectedEntity = "fisherman";
            entityFisherman.classList.add("active");
            entityWoodcutter?.classList.remove("active");
            this.setHelpText("Click on a traversable tile to spawn a fisherman.");
        });

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
                    const entTypeName = ent instanceof Woodcutter ? "Woodcutter" : (ent instanceof Fisherman ? "Fisherman" : "Human");
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
        const entTypeName = ent instanceof Woodcutter ? "Woodcutter" : (ent instanceof Fisherman ? "Fisherman" : "Human");

        let inventoryHtml = "None";
        if (ent.inventory.length > 0) {
            inventoryHtml = `
                <div class="inventory-tags">
                    ${ent.inventory.map(item => `<span class="inventory-tag">${item.name}</span>`).join("")}
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
                    <span class="detail-label">ID:</span>
                    <span class="detail-val" title="${ent.id}">${ent.id.slice(0, 8)}...</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Ticks Alive:</span>
                    <span class="detail-val" id="liveInspectorTicks">${ent.ticksAlive}</span>
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
                <div class="sub-label">Inventory (${ent.inventory.length}/${20})</div>
                <div id="liveInspectorInventory">${inventoryHtml}</div>
            </div>
        `;
    }

    static updateInspectorLive() {
        if (!this.inspectedEntity) return;

        const ent = this.inspectedEntity;

        const ticksEl = document.getElementById("liveInspectorTicks");
        if (ticksEl) ticksEl.innerText = ent.ticksAlive.toString();

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
                        ${ent.inventory.map(item => `<span class="inventory-tag">${item.name}</span>`).join("")}
                    </div>
                `;
            }
            const existingTags = inventoryEl.querySelectorAll(".inventory-tag");
            if (existingTags.length !== ent.inventory.length) {
                inventoryEl.innerHTML = inventoryHtml;
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
            } else {
                newEntity = new Fisherman();
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
            const letter = this.selectedEntity === "woodcutter" ? "W" : "F";
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
