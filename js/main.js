"use strict";
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 540;
var entities = [];
function init() {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    for (var i = 0; i < 5; i++) {
        entities.push(new Human());
    }
}
init();
// Main loop
function process() {
    entities.forEach(e => {
        e.process();
        if (e.move != null) {
            e.move();
        }
        e.ticksAlive++;
    });
    requestAnimationFrame(process);
}
requestAnimationFrame(process);
