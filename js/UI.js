"use strict";
var _a;
(_a = document.getElementById("debugDrawCheckbox")) === null || _a === void 0 ? void 0 : _a.addEventListener("change", (e) => {
    //@ts-ignore
    DEBUG_DRAW = e.target.checked;
});
// DONE: Make a tile inspector that shows all the information related to that tile when clicked on
canvas.addEventListener("click", (e) => {
    var _a;
    tileInspectorDiv.innerHTML = (_a = world.get(`${Math.floor(mousePos.x / TILE_SIZE)},${Math.floor(mousePos.y / TILE_SIZE)}`)) === null || _a === void 0 ? void 0 : _a.getTileInspectorInfoDiv().innerHTML;
});
document.getElementById("togglePauseButton").addEventListener("click", (e) => {
    PAUSED = !PAUSED;
});
