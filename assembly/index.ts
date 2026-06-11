// Wogsim AssemblyScript A* Pathfinding and core utilities

export const X_TILES = 320;
export const Y_TILES = 180;
export const GRID_SIZE = X_TILES * Y_TILES;

// We will use a flat array to represent the grid. 
// 0 = wall/water, > 0 = walk weight (1 for standard ground)
export var grid = new Float32Array(GRID_SIZE);

export function setGridWeight(x: i32, y: i32, weight: f32): void {
  if (x >= 0 && x < X_TILES && y >= 0 && y < Y_TILES) {
    grid[x * Y_TILES + y] = weight;
  }
}

export function getGridWeight(x: i32, y: i32): f32 {
  if (x >= 0 && x < X_TILES && y >= 0 && y < Y_TILES) {
    return grid[x * Y_TILES + y];
  }
  return 0.0;
}

// A* Node struct flattened for performance
// f, g, h, parentIndex, closed, visited
var node_g = new Float32Array(GRID_SIZE);
var node_h = new Float32Array(GRID_SIZE);
var node_f = new Float32Array(GRID_SIZE);
var node_parent = new Int32Array(GRID_SIZE);
var node_closed = new Uint8Array(GRID_SIZE);
var node_visited = new Uint8Array(GRID_SIZE);
var node_version = new Uint32Array(GRID_SIZE);
var current_version: u32 = 1;

// Binary Heap implementation for A*
var heap = new Int32Array(GRID_SIZE);
var heapSize: i32 = 0;

function heapPush(index: i32): void {
  heap[heapSize] = index;
  sinkDown(heapSize);
  heapSize++;
}

function heapPop(): i32 {
  var result = heap[0];
  heapSize--;
  if (heapSize > 0) {
    heap[0] = heap[heapSize];
    bubbleUp(0);
  }
  return result;
}

function sinkDown(n: i32): void {
  var element = heap[n];
  var elemF = node_f[element];
  while (n > 0) {
    var parentN = ((n + 1) >> 1) - 1;
    var parent = heap[parentN];
    if (elemF < node_f[parent]) {
      heap[parentN] = element;
      heap[n] = parent;
      n = parentN;
    } else {
      break;
    }
  }
}

function bubbleUp(n: i32): void {
  var length = heapSize;
  var element = heap[n];
  var elemF = node_f[element];

  while (true) {
    var child2N = (n + 1) << 1;
    var child1N = child2N - 1;
    var swap = -1;
    var child1F: f32 = 0;

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
    } else {
      break;
    }
  }
}

// Ensure a node is initialized for the current A* search run
function initNode(index: i32): void {
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

function heuristic(x0: i32, y0: i32, x1: i32, y1: i32): f32 {
  var d1 = Math.abs(x1 - x0) as f32;
  var d2 = Math.abs(y1 - y0) as f32;
  var D: f32 = 1.0;
  var D2: f32 = 1.41421356;
  return ((D * (d1 + d2)) + ((D2 - (2.0 * D)) * (Math.min(d1, d2) as f32))) as f32;
}

// Result buffer (max path length = 2000 nodes, each node uses 2 ints (x, y))
var resultPath = new Int32Array(4000);
var resultPathLength: i32 = 0;

export function getResultPathPointer(): usize {
  return resultPath.dataStart;
}

export function getResultPathLength(): i32 {
  return resultPathLength;
}

export function findPath(startX: i32, startY: i32, endX: i32, endY: i32): boolean {
  if (startX < 0 || startX >= X_TILES || startY < 0 || startY >= Y_TILES ||
      endX < 0 || endX >= X_TILES || endY < 0 || endY >= Y_TILES) {
    resultPathLength = 0;
    return false;
  }

  var startIndex = startX * Y_TILES + startY;
  var endIndex = endX * Y_TILES + endY;

  if (grid[endIndex] == 0.0) {
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

  var D: f32 = 1.0;
  var D2: f32 = 1.41421356;

  // Neighbor offsets (8-way diagonal)
  var dx = [-1,  1,  0,  0, -1,  1, -1,  1];
  var dy = [ 0,  0, -1,  1, -1, -1,  1,  1];

  while (heapSize > 0 && iterations < maxIterations) {
    iterations++;
    var currentIndex = heapPop();

    if (currentIndex == endIndex) {
      // Reconstruct path
      var count = 0;
      var curr = currentIndex;
      while (node_parent[curr] != -1 && count < 2000) {
        var px = curr / Y_TILES;
        var py = curr % Y_TILES;
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

    var cx = currentIndex / Y_TILES;
    var cy = currentIndex % Y_TILES;

    for (let i = 0; i < 8; i++) {
      var nx = cx + dx[i];
      var ny = cy + dy[i];

      if (nx >= 0 && nx < X_TILES && ny >= 0 && ny < Y_TILES) {
        var nIndex = nx * Y_TILES + ny;
        var weight = grid[nIndex];

        if (weight == 0.0) continue; // Wall

        initNode(nIndex);

        if (node_closed[nIndex] == 1) continue;

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
          } else {
            // Need to rescore in heap
            var hIdx = -1;
            for (let j = 0; j < heapSize; j++) {
              if (heap[j] == nIndex) { hIdx = j; break; }
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
export * from "./worldgen";
