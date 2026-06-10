"use strict";
class Wolf extends Entity {
    constructor() {
        super(true, true, "gray");
        /** The radius of the search square that is used to find the wolf's prey */
        this.radarLength = 10;
        this.move = (currentX, currentY) => {
            // Hunger ticking
            this.hunger = Math.min(100, this.hunger + 0.04);
            if (this.hunger >= 100) {
                this.health = Math.max(0, this.health - 2);
            }
            else {
                this.health = Math.min(100, this.health + 0.1);
            }
            if (this.health <= 0) {
                this.stateText = "Dead";
                return Vector2(0, 0);
            }
            var deviation = Vector2(0, 0);
            if (this.moveQueue.length > 0) {
                deviation.x = this.moveQueue[0].x - currentX;
                deviation.y = this.moveQueue[0].y - currentY;
                this.moveQueue.shift();
                return deviation;
            }
            // 1. Scan for nearest Sheep or Cow in radar range
            var nearestPreyPos = null;
            var nearestPreyEntity = null;
            var minDistance = Infinity;
            for (var dx = -this.radarLength; dx <= this.radarLength; dx++) {
                for (var dy = -this.radarLength; dy <= this.radarLength; dy++) {
                    var tx = currentX + dx;
                    var ty = currentY + dy;
                    if (world[tx] && world[tx][ty]) {
                        var tile = world[tx][ty];
                        for (var ent of tile.entities) {
                            if (ent && ent.constructor && (ent.constructor.name === "Sheep" || ent.constructor.name === "Cow")) {
                                var dist = Math.max(Math.abs(dx), Math.abs(dy));
                                if (dist < minDistance) {
                                    minDistance = dist;
                                    nearestPreyPos = Vector2(tx, ty);
                                    nearestPreyEntity = ent;
                                }
                            }
                        }
                    }
                }
            }
            // 2. If prey found, hunt it
            if (nearestPreyPos && nearestPreyEntity) {
                var preyType = nearestPreyEntity.constructor.name;
                if (minDistance <= 1) {
                    // Adjacent! Eat the prey
                    this.stateText = "Eating " + preyType;
                    var preyTile = world[nearestPreyPos.x][nearestPreyPos.y];
                    var indexOnTile = preyTile.entities.indexOf(nearestPreyEntity);
                    if (indexOnTile !== -1) {
                        preyTile.removeEntity(indexOnTile);
                    }
                    //@ts-ignore
                    var indexInGlobal = entities.findIndex(d => d.entity === nearestPreyEntity);
                    if (indexInGlobal !== -1) {
                        //@ts-ignore
                        entities.splice(indexInGlobal, 1);
                    }
                    this.hunger = 0;
                    return Vector2(0, 0); // Remain on tile to finish eating
                }
                else {
                    // Chase
                    this.stateText = "Hunting " + preyType;
                    var now = performance.now();
                    if (now - this.lastPathfindTime >= this.pathfindCooldown) {
                        this.lastPathfindTime = now;
                        this.moveTo(Vector2(currentX, currentY), nearestPreyPos);
                    }
                }
            }
            else {
                // 3. Otherwise, wander
                this.stateText = "Wandering";
                var now = performance.now();
                if (now - this.lastPathfindTime >= this.pathfindCooldown) {
                    this.lastPathfindTime = now;
                    var wanderPos = this.getRandomPos(currentX, currentY, 5);
                    this.moveTo(Vector2(currentX, currentY), wanderPos);
                }
            }
            return deviation;
        };
        this.stateText = "Hunting";
    }
}
