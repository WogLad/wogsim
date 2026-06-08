class TestTools {
    static activeMode: "inspect" | "spawn" | "delete" = "inspect";
    static selectedEntity: "woodcutter" | "fisherman" = "woodcutter";

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

    /**
     * Handles canvas clicks. Returns true if the click was handled by TestTools, false otherwise.
     */
    static handleCanvasClick(x: number, y: number): boolean {
        if (this.activeMode === "inspect") {
            return false; // Default inspect behavior takes over
        }

        const tile = world[x] ? world[x][y] : undefined;
        if (!tile) return true; // Handled but out of bounds

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
                // Update inspector if this tile is currently selected
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

            // Update inspector if this tile is currently selected
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

            // Draw text preview of the letter we're about to spawn
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
