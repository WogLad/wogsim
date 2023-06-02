interface Vector2 {
    x: number;
    y: number;
}

function Vector2(x: number, y: number): Vector2 {
    return {x:x, y:y};
}

interface GridNode {
    closed:     boolean;
    f:          number;
    g:          number;
    h:          number;
    parent:     GridNode;
    visited:    boolean;
    weight:     number;
    x:          number;
    y:          number;
}

interface EntityData {
    entity: Entity;
    pos: Vector2;
}