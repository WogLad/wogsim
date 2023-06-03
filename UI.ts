document.getElementById("debugDrawCheckbox")?.addEventListener("change", (e) => {
    //@ts-ignore
    DEBUG_DRAW = e.target.checked;
});

// TODO: Make a tile inspector that shows all the information related to that tile when clicked on