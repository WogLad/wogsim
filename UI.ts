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

// DONE: Add movement controls that can adjust the camera offset
var isMouseDown: boolean = false;
var initMousePos: Vector2 = {x:0, y:0};
var mouseTilePos: Vector2 = {x: 0, y: 0};

canvas.onpointermove = (e) => {
    var rect = (e.target as HTMLElement).getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; //x position within the element.
    mousePos.y = e.clientY - rect.top;  //y position within the element.

    if (Math.floor(mousePos.x/TILE_SIZE) != mouseTilePos.x || Math.floor(mousePos.y/TILE_SIZE) != mouseTilePos.y) {
        // Mouse Tile Pos Has Changed
        mouseTilePos.x = Math.floor(mousePos.x/TILE_SIZE)+CAMERA_OFFSET.x;
        mouseTilePos.y = Math.floor(mousePos.y/TILE_SIZE)+CAMERA_OFFSET.y;
    }

    // SWIPE GESTURES
    if (isMouseDown) {
        // (DONE): Fix the Y-axis issue
        // (DONE): Fix the mobile touch issue
        if (initMousePos.x != 0 && initMousePos.y != 0) {
            var pointerDragOffset: Vector2 = Vector2(mouseTilePos.x - initMousePos.x, mouseTilePos.y - initMousePos.y);
            if (pointerDragOffset.x < 0 && CAMERA_OFFSET.x+1 < X_TILES) {
                setCameraOffset(CAMERA_OFFSET.x+1, CAMERA_OFFSET.y);
            }
            else if (pointerDragOffset.x > 0 && CAMERA_OFFSET.x-1 >= 0) {
                setCameraOffset(CAMERA_OFFSET.x-1, CAMERA_OFFSET.y);
            }

            if (pointerDragOffset.y < 0 && CAMERA_OFFSET.y+1 < Y_TILES) {
                setCameraOffset(CAMERA_OFFSET.x, CAMERA_OFFSET.y+1);
            }
            else if (pointerDragOffset.y > 0 && CAMERA_OFFSET.y-1 >= 0) {
                setCameraOffset(CAMERA_OFFSET.x, CAMERA_OFFSET.y-1);
            }
        }
    }
}

canvas.addEventListener("pointerdown", (e) => {
    isMouseDown = true;

    initMousePos.x = mouseTilePos.x;
    initMousePos.y = mouseTilePos.y;

    var rect = (e.target as HTMLElement).getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; //x position within the element.
    mousePos.y = e.clientY - rect.top;  //y position within the element.

    if (Math.floor(mousePos.x/TILE_SIZE) != mouseTilePos.x || Math.floor(mousePos.y/TILE_SIZE) != mouseTilePos.y) {
        // Mouse Tile Pos Has Changed
        mouseTilePos.x = Math.floor(mousePos.x/TILE_SIZE)+CAMERA_OFFSET.x;
        mouseTilePos.y = Math.floor(mousePos.y/TILE_SIZE)+CAMERA_OFFSET.y;
    }
});

canvas.addEventListener("pointerup", (e) => {
    isMouseDown = false;

    initMousePos.x = 0;
    initMousePos.y = 0;
});