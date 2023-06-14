document.getElementById("debugDrawCheckbox")?.addEventListener("change", (e) => {
    //@ts-ignore
    DEBUG_DRAW = e.target.checked;
});

// DONE: Make a tile inspector that shows all the information related to that tile when clicked on
canvas.addEventListener("click", (e) => {
    (tileInspectorDiv as HTMLDivElement).innerHTML = world.get(`${Math.floor(mousePos.x/TILE_SIZE)+CAMERA_OFFSET.x},${Math.floor(mousePos.y/TILE_SIZE)+CAMERA_OFFSET.y}`)?.getTileInspectorInfoDiv().innerHTML as string;
});

(document.getElementById("togglePauseButton") as HTMLButtonElement).addEventListener("click", (e) => {
    PAUSED = !PAUSED;
});