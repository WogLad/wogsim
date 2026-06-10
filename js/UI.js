"use strict";
var _a;
(_a = document.getElementById("debugDrawCheckbox")) === null || _a === void 0 ? void 0 : _a.addEventListener("change", (e) => {
    //@ts-ignore
    DEBUG_DRAW = e.target.checked;
});
// DONE: Make a tile inspector that shows all the information related to that tile when clicked on
canvas.addEventListener("click", (e) => {
    // Determine drag distance
    var dragDist = Math.hypot(e.clientX - dragStartMousePos.x, e.clientY - dragStartMousePos.y);
    if (dragDist > 5)
        return; // Prevent click action on drag
    var clickX = Math.floor(mousePos.x / TILE_SIZE + CAMERA_OFFSET.x);
    var clickY = Math.floor(mousePos.y / TILE_SIZE + CAMERA_OFFSET.y);
    // Check if test tools handle the click
    var handled = false;
    //@ts-ignore
    if (typeof TestTools !== "undefined") {
        //@ts-ignore
        handled = TestTools.handleCanvasClick(clickX, clickY);
    }
    if (!handled) {
        var clickTile = world[clickX] ? world[clickX][clickY] : undefined;
        if (clickTile && tileInspectorDiv) {
            tileInspectorDiv.innerHTML = clickTile.getTileInspectorInfoDiv().innerHTML;
        }
    }
});
var togglePauseButton = document.getElementById("togglePauseButton");
if (togglePauseButton) {
    togglePauseButton.addEventListener("click", (e) => {
        PAUSED = !PAUSED;
        togglePauseButton.innerText = PAUSED ? "Resume" : "Pause";
        togglePauseButton.style.background = PAUSED ? "rgba(255, 51, 102, 0.4)" : "rgba(255, 255, 255, 0.1)";
        togglePauseButton.style.borderColor = PAUSED ? "#ff3366" : "rgba(255, 255, 255, 0.2)";
    });
}
// DONE: Add movement controls that can adjust the camera offset
var isMouseDown = false;
var dragStartMousePos = { x: 0, y: 0 };
var dragStartCameraOffset = { x: 0, y: 0 };
var mouseTilePos = { x: 0, y: 0 };
canvas.onpointermove = (e) => {
    var rect = e.target.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; //x position within the element.
    mousePos.y = e.clientY - rect.top; //y position within the element.
    mouseTilePos.x = Math.floor(mousePos.x / TILE_SIZE + CAMERA_OFFSET.x);
    mouseTilePos.y = Math.floor(mousePos.y / TILE_SIZE + CAMERA_OFFSET.y);
    if (isMouseDown) {
        var dx = e.clientX - dragStartMousePos.x;
        var dy = e.clientY - dragStartMousePos.y;
        var dragTileOffsetX = dx / TILE_SIZE;
        var dragTileOffsetY = dy / TILE_SIZE;
        setCameraOffset(dragStartCameraOffset.x - dragTileOffsetX, dragStartCameraOffset.y - dragTileOffsetY);
    }
};
canvas.addEventListener("pointerdown", (e) => {
    isMouseDown = true;
    dragStartMousePos.x = e.clientX;
    dragStartMousePos.y = e.clientY;
    dragStartCameraOffset.x = CAMERA_OFFSET.x;
    dragStartCameraOffset.y = CAMERA_OFFSET.y;
    var rect = e.target.getBoundingClientRect();
    mousePos.x = e.clientX - rect.left; //x position within the element.
    mousePos.y = e.clientY - rect.top; //y position within the element.
    mouseTilePos.x = Math.floor(mousePos.x / TILE_SIZE + CAMERA_OFFSET.x);
    mouseTilePos.y = Math.floor(mousePos.y / TILE_SIZE + CAMERA_OFFSET.y);
});
canvas.addEventListener("pointerup", (e) => {
    isMouseDown = false;
});
canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    var zoomFactor = 1.15;
    var oldTileSize = TILE_SIZE;
    // Get mouse position relative to world coordinates before zoom
    var mouseWorldX = mousePos.x / oldTileSize + CAMERA_OFFSET.x;
    var mouseWorldY = mousePos.y / oldTileSize + CAMERA_OFFSET.y;
    if (e.deltaY < 0) {
        // Zoom in
        TILE_SIZE = Math.min(60, TILE_SIZE * zoomFactor);
    }
    else {
        // Zoom out
        TILE_SIZE = Math.max(4, TILE_SIZE / zoomFactor);
    }
    // Adjust camera offset to zoom towards the mouse cursor
    setCameraOffset(mouseWorldX - mousePos.x / TILE_SIZE, mouseWorldY - mousePos.y / TILE_SIZE);
}, { passive: false });
