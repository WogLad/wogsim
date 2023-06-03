"use strict";
var _a;
(_a = document.getElementById("debugDrawCheckbox")) === null || _a === void 0 ? void 0 : _a.addEventListener("change", (e) => {
    //@ts-ignore
    DEBUG_DRAW = e.target.checked;
});
// TODO: Make a tile inspector that shows all the information related to that tile when clicked on
