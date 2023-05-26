var canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
var ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

const CANVAS_WIDTH: number = 960;
const CANVAS_HEIGHT: number = 540;

var entities: Entity[] = [];

function init(): void {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0,0, CANVAS_WIDTH,CANVAS_HEIGHT);

    for (var i = 0; i < 5; i++) {
        entities.push(new Human());
    }
}

init();

// Main loop
function process(): void {
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