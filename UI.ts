document.getElementById("debugDrawCheckbox")?.addEventListener("change", (e) => {
    //@ts-ignore
    DEBUG_DRAW = e.target.checked;
});

// DONE: Make a tile inspector that shows all the information related to that tile when clicked on
canvas.addEventListener("click", (e) => {
    // Determine drag distance
    var dragDist = Math.hypot(e.clientX - dragStartMousePos.x, e.clientY - dragStartMousePos.y);
    if (dragDist > 5) return; // Prevent click action on drag

    var clickX = Math.floor(mousePos.x/TILE_SIZE + CAMERA_OFFSET.x);
    var clickY = Math.floor(mousePos.y/TILE_SIZE + CAMERA_OFFSET.y);

    // Check if test tools handle the click
    var handled = false;
    //@ts-ignore
    if (typeof TestTools !== "undefined") {
        //@ts-ignore
        handled = TestTools.handleCanvasClick(clickX, clickY);
    }

    if (!handled) {
        var clickTile = world[clickX] ? world[clickX][clickY] : undefined;
        if (clickTile) {
            (tileInspectorDiv as HTMLDivElement).innerHTML = clickTile.getTileInspectorInfoDiv().innerHTML;
        }
    }
});

(document.getElementById("togglePauseButton") as HTMLButtonElement).addEventListener("click", (e) => {
    PAUSED = !PAUSED;
});

// DONE: Add movement controls that can adjust the camera offset
var isMouseDown: boolean = false;
var dragStartMousePos = { x: 0, y: 0 };
var dragStartCameraOffset = { x: 0, y: 0 };
var mouseTilePos: Vector2 = {x: 0, y: 0};

canvas.onpointermove = (e) => {
    var rect = (e.target as HTMLElement).getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; //x position within the element.
    mousePos.y = e.clientY - rect.top;  //y position within the element.

    mouseTilePos.x = Math.floor(mousePos.x/TILE_SIZE + CAMERA_OFFSET.x);
    mouseTilePos.y = Math.floor(mousePos.y/TILE_SIZE + CAMERA_OFFSET.y);

    if (isMouseDown) {
        var dx = e.clientX - dragStartMousePos.x;
        var dy = e.clientY - dragStartMousePos.y;
        
        var dragTileOffsetX = dx / TILE_SIZE;
        var dragTileOffsetY = dy / TILE_SIZE;
        
        setCameraOffset(
            dragStartCameraOffset.x - dragTileOffsetX,
            dragStartCameraOffset.y - dragTileOffsetY
        );
    }
}

canvas.addEventListener("pointerdown", (e) => {
    isMouseDown = true;
    dragStartMousePos.x = e.clientX;
    dragStartMousePos.y = e.clientY;
    dragStartCameraOffset.x = CAMERA_OFFSET.x;
    dragStartCameraOffset.y = CAMERA_OFFSET.y;

    var rect = (e.target as HTMLElement).getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; //x position within the element.
    mousePos.y = e.clientY - rect.top;  //y position within the element.

    mouseTilePos.x = Math.floor(mousePos.x/TILE_SIZE + CAMERA_OFFSET.x);
    mouseTilePos.y = Math.floor(mousePos.y/TILE_SIZE + CAMERA_OFFSET.y);
});

canvas.addEventListener("pointerup", (e) => {
    isMouseDown = false;
});