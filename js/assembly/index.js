"use strict";
// Wogsim AssemblyScript A* Pathfinding and core utilities
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPath = exports.getResultPathLength = exports.getResultPathPointer = exports.getGridWeight = exports.setGridWeight = exports.grid = exports.GRID_SIZE = exports.Y_TILES = exports.X_TILES = void 0;
exports.X_TILES = 320;
exports.Y_TILES = 180;
exports.GRID_SIZE = exports.X_TILES * exports.Y_TILES;
// We will use a flat array to represent the grid. 
// 0 = wall/water, > 0 = walk weight (1 for standard ground)
exports.grid = new Float32Array(exports.GRID_SIZE);
function setGridWeight(x, y, weight) {
    if (x >= 0 && x < exports.X_TILES && y >= 0 && y < exports.Y_TILES) {
        exports.grid[x * exports.Y_TILES + y] = weight;
    }
}
exports.setGridWeight = setGridWeight;
function getGridWeight(x, y) {
    if (x >= 0 && x < exports.X_TILES && y >= 0 && y < exports.Y_TILES) {
        return exports.grid[x * exports.Y_TILES + y];
    }
    return 0.0;
}
exports.getGridWeight = getGridWeight;
// A* Node struct flattened for performance
// f, g, h, parentIndex, closed, visited
var node_g = new Float32Array(exports.GRID_SIZE);
var node_h = new Float32Array(exports.GRID_SIZE);
var node_f = new Float32Array(exports.GRID_SIZE);
var node_parent = new Int32Array(exports.GRID_SIZE);
var node_closed = new Uint8Array(exports.GRID_SIZE);
var node_visited = new Uint8Array(exports.GRID_SIZE);
var node_version = new Uint32Array(exports.GRID_SIZE);
var current_version = 1;
// Binary Heap implementation for A*
var heap = new Int32Array(exports.GRID_SIZE);
var heapSize = 0;
function heapPush(index) {
    heap[heapSize] = index;
    sinkDown(heapSize);
    heapSize++;
}
function heapPop() {
    var result = heap[0];
    heapSize--;
    if (heapSize > 0) {
        heap[0] = heap[heapSize];
        bubbleUp(0);
    }
    return result;
}
function sinkDown(n) {
    var element = heap[n];
    var elemF = node_f[element];
    while (n > 0) {
        var parentN = ((n + 1) >> 1) - 1;
        var parent = heap[parentN];
        if (elemF < node_f[parent]) {
            heap[parentN] = element;
            heap[n] = parent;
            n = parentN;
        }
        else {
            break;
        }
    }
}
function bubbleUp(n) {
    var length = heapSize;
    var element = heap[n];
    var elemF = node_f[element];
    while (true) {
        var child2N = (n + 1) << 1;
        var child1N = child2N - 1;
        var swap = -1;
        var child1F = 0;
        if (child1N < length) {
            var child1 = heap[child1N];
            child1F = node_f[child1];
            if (child1F < elemF) {
                swap = child1N;
            }
        }
        if (child2N < length) {
            var child2 = heap[child2N];
            var child2F = node_f[child2];
            if (child2F < (swap == -1 ? elemF : child1F)) {
                swap = child2N;
            }
        }
        if (swap != -1) {
            heap[n] = heap[swap];
            heap[swap] = element;
            n = swap;
        }
        else {
            break;
        }
    }
}
// Ensure a node is initialized for the current A* search run
function initNode(index) {
    if (node_version[index] != current_version) {
        node_version[index] = current_version;
        node_g[index] = 0.0;
        node_h[index] = 0.0;
        node_f[index] = 0.0;
        node_parent[index] = -1;
        node_closed[index] = 0;
        node_visited[index] = 0;
    }
}
function heuristic(x0, y0, x1, y1) {
    var d1 = Math.abs(x1 - x0);
    var d2 = Math.abs(y1 - y0);
    var D = 1.0;
    var D2 = 1.41421356;
    return ((D * (d1 + d2)) + ((D2 - (2.0 * D)) * Math.min(d1, d2)));
}
// Result buffer (max path length = 2000 nodes, each node uses 2 ints (x, y))
var resultPath = new Int32Array(4000);
var resultPathLength = 0;
function getResultPathPointer() {
    return resultPath.dataStart;
}
exports.getResultPathPointer = getResultPathPointer;
function getResultPathLength() {
    return resultPathLength;
}
exports.getResultPathLength = getResultPathLength;
function findPath(startX, startY, endX, endY) {
    if (startX < 0 || startX >= exports.X_TILES || startY < 0 || startY >= exports.Y_TILES ||
        endX < 0 || endX >= exports.X_TILES || endY < 0 || endY >= exports.Y_TILES) {
        resultPathLength = 0;
        return false;
    }
    var startIndex = startX * exports.Y_TILES + startY;
    var endIndex = endX * exports.Y_TILES + endY;
    if (exports.grid[endIndex] == 0.0) {
        resultPathLength = 0;
        return false; // Target is a wall
    }
    current_version++;
    heapSize = 0;
    initNode(startIndex);
    node_h[startIndex] = heuristic(startX, startY, endX, endY);
    node_f[startIndex] = node_h[startIndex];
    heapPush(startIndex);
    var maxIterations = 2000;
    var iterations = 0;
    var D = 1.0;
    var D2 = 1.41421356;
    // Neighbor offsets (8-way diagonal)
    var dx = [-1, 1, 0, 0, -1, 1, -1, 1];
    var dy = [0, 0, -1, 1, -1, -1, 1, 1];
    while (heapSize > 0 && iterations < maxIterations) {
        iterations++;
        var currentIndex = heapPop();
        if (currentIndex == endIndex) {
            // Reconstruct path
            var count = 0;
            var curr = currentIndex;
            while (node_parent[curr] != -1 && count < 2000) {
                var px = curr / exports.Y_TILES;
                var py = curr % exports.Y_TILES;
                resultPath[count * 2] = px;
                resultPath[count * 2 + 1] = py;
                count++;
                curr = node_parent[curr];
            }
            // Reverse array in place because we traced from end to start
            for (let i = 0; i < count / 2; i++) {
                var tmpX = resultPath[i * 2];
                var tmpY = resultPath[i * 2 + 1];
                var opp = count - 1 - i;
                resultPath[i * 2] = resultPath[opp * 2];
                resultPath[i * 2 + 1] = resultPath[opp * 2 + 1];
                resultPath[opp * 2] = tmpX;
                resultPath[opp * 2 + 1] = tmpY;
            }
            resultPathLength = count;
            return true;
        }
        node_closed[currentIndex] = 1;
        var cx = currentIndex / exports.Y_TILES;
        var cy = currentIndex % exports.Y_TILES;
        for (let i = 0; i < 8; i++) {
            var nx = cx + dx[i];
            var ny = cy + dy[i];
            if (nx >= 0 && nx < exports.X_TILES && ny >= 0 && ny < exports.Y_TILES) {
                var nIndex = nx * exports.Y_TILES + ny;
                var weight = exports.grid[nIndex];
                if (weight == 0.0)
                    continue; // Wall
                initNode(nIndex);
                if (node_closed[nIndex] == 1)
                    continue;
                var cost = (i < 4) ? D : D2; // Orthogonal vs diagonal
                var gScore = node_g[currentIndex] + weight * cost;
                var beenVisited = node_visited[nIndex];
                if (beenVisited == 0 || gScore < node_g[nIndex]) {
                    node_visited[nIndex] = 1;
                    node_parent[nIndex] = currentIndex;
                    node_h[nIndex] = heuristic(nx, ny, endX, endY);
                    node_g[nIndex] = gScore;
                    node_f[nIndex] = gScore + node_h[nIndex];
                    if (beenVisited == 0) {
                        heapPush(nIndex);
                    }
                    else {
                        // Need to rescore in heap
                        var hIdx = -1;
                        for (let j = 0; j < heapSize; j++) {
                            if (heap[j] == nIndex) {
                                hIdx = j;
                                break;
                            }
                        }
                        if (hIdx != -1) {
                            sinkDown(hIdx); // since gScore is lower, f is lower, so sinkDown (towards top of heap)
                        }
                    }
                }
            }
        }
    }
    resultPathLength = 0;
    return false;
}
exports.findPath = findPath;
__exportStar(require("./worldgen"), exports);
