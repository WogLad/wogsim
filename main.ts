var canvas: HTMLCanvasElement = document.getElementById("canvas") as HTMLCanvasElement;
var ctx: CanvasRenderingContext2D = canvas.getContext("2d") as CanvasRenderingContext2D;

const CANVAS_WIDTH: number = 960;
const CANVAS_HEIGHT: number = 540;

function init(): void {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0,0, CANVAS_WIDTH,CANVAS_HEIGHT);
}

init();