/**
 * IT 211 RAM • Interactive DFD Canvas Engine & Mortal Sin Linter
 * Enhanced with Custom UI Modal, Toast Notifications, and Precise Arrow Geometries
 */

let dfdNodes = [];
let dfdConnections = [];
let currentCanvasMode = 'move';
let selectedNodeForConnection = null;
let draggedNode = null;
let dragOffset = { x: 0, y: 0 };
let activeModalCallback = null;

// History (Undo / Redo) Management
let dfdUndoStack = [];
let dfdRedoStack = [];
const MAX_UNDO_STACK = 50;
let isPerformingUndoRedo = false;
let nodeDragStartPos = null;
let waypointDragStartPos = null;

// Canvas Zoom & Pan State
const BASE_VIEW_WIDTH = 760;
const BASE_VIEW_HEIGHT = 480;
let canvasZoom = 1.0;
let canvasPan = { x: 0, y: 0 };
let isPanningCanvas = false;
let panStart = { clientX: 0, clientY: 0, panX: 0, panY: 0 };
let draggedWaypoint = null;
let draggedArrowEndpoint = null;
let draggedLabel = null;
let justFinishedDragging = false;
let currentEditingFlow = null;

const SCENARIOS = {
  pos: {
    title: "Convenience Store POS System (P1.0)",
    hint: "Customer brings Item Info. Cashier scans barcode. Sales record is updated and computed receipt is issued."
  },
  enroll: {
    title: "University Enrolment & Payment (P2.0)",
    hint: "Student submits Enrollment Request. Process registers block. Payments are stored in D2 PAYMENTS."
  },
  atm: {
    title: "Automated Teller Machine (ATM P0)",
    hint: "Client inserts Card & PIN. ATM communicates with Bank Host to authorize and issue cash."
  },
  leasing_context: {
    title: "Property Leasing System (Context P0.0)",
    hint: "Context Diagram: Central 0.0 system boundary interacting with 8 external entities (Tenants, Staff, Management, System Admin). Strict Topic 6 rule: ZERO data stores in context."
  },
  leasing_level1: {
    title: "Property Leasing System (Level 1 DFD)",
    hint: "Level 1 DFD: 6 Processes (1.0 Inventory, 2.0 Applications, 3.0 Leases, 4.0 Payments, 5.0 Work Orders, 6.0 Security & Audit), 6 Data Stores (D1–D6), and 8 External Entities."
  }
};

/* ========================================================
   GEOMETRY UTILS: BOUNDING BOX INTERSECTIONS & ARROWS
   ======================================================== */
function getNodeDims(node) {
  if (node.type === 'process') return { w: 130, h: 55 };
  if (node.type === 'entity') return { w: 120, h: 45 };
  if (node.type === 'store') return { w: 130, h: 42 };
  return { w: 120, h: 45 };
}

function getNodeCenter(node) {
  const dims = getNodeDims(node);
  return { x: node.x + dims.w / 2, y: node.y + dims.h / 2 };
}

function getRectIntersection(cx, cy, w, h, fromX, fromY) {
  const dx = fromX - cx;
  const dy = fromY - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const halfW = w / 2;
  const halfH = h / 2;
  const slope = dy / dx;

  let edgeX = 0;
  let edgeY = 0;

  if (Math.abs(dy) * halfW <= Math.abs(dx) * halfH) {
    edgeX = dx > 0 ? cx + halfW : cx - halfW;
    edgeY = cy + (edgeX - cx) * slope;
  } else {
    edgeY = dy > 0 ? cy + halfH : cy - halfH;
    edgeX = cx + (edgeY - cy) / slope;
  }
  return { x: edgeX, y: edgeY };
}

/* Calculate distance from point p to line segment (v, w) */
function distToSegment(p, v, w) {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

/* Calculate midpoint along a multi-segment polyline path */
function getPolylineMidpoint(points) {
  if (!points || points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { x: points[0].x, y: points[0].y };
  if (points.length === 2) {
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2
    };
  }

  let totalLen = 0;
  const lens = [];
  for (let i = 0; i < points.length - 1; i++) {
    const d = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    lens.push(d);
    totalLen += d;
  }

  const half = totalLen / 2;
  let accum = 0;
  for (let i = 0; i < lens.length; i++) {
    if (accum + lens[i] >= half) {
      const segLen = lens[i];
      const t = segLen === 0 ? 0 : (half - accum) / segLen;
      return {
        x: points[i].x + t * (points[i + 1].x - points[i].x),
        y: points[i].y + t * (points[i + 1].y - points[i].y)
      };
    }
    accum += lens[i];
  }

  return {
    x: (points[0].x + points[points.length - 1].x) / 2,
    y: (points[0].y + points[points.length - 1].y) / 2
  };
}

/* Find closest point on rectangle perimeter with cardinal magnetic snapping */
function getClosestPointOnRectPerimeter(pt, rx, ry, rw, rh) {
  const clampX = Math.max(rx, Math.min(rx + rw, pt.x));
  const clampY = Math.max(ry, Math.min(ry + rh, pt.y));

  const dTop = Math.abs(pt.y - ry);
  const dBottom = Math.abs(pt.y - (ry + rh));
  const dLeft = Math.abs(pt.x - rx);
  const dRight = Math.abs(pt.x - (rx + rw));

  const minDist = Math.min(dTop, dBottom, dLeft, dRight);
  let bestX = clampX;
  let bestY = clampY;

  if (minDist === dTop) {
    bestY = ry;
  } else if (minDist === dBottom) {
    bestY = ry + rh;
  } else if (minDist === dLeft) {
    bestX = rx;
  } else {
    bestX = rx + rw;
  }

  // Snap to 25%, 50%, 75% cardinal points if close (within 14px)
  const centerX = rx + rw / 2;
  const centerY = ry + rh / 2;
  if (bestY === ry || bestY === ry + rh) {
    if (Math.abs(bestX - centerX) < 14) bestX = centerX;
    else if (Math.abs(bestX - (rx + rw * 0.25)) < 10) bestX = rx + rw * 0.25;
    else if (Math.abs(bestX - (rx + rw * 0.75)) < 10) bestX = rx + rw * 0.75;
  }
  if (bestX === rx || bestX === rx + rw) {
    if (Math.abs(bestY - centerY) < 14) bestY = centerY;
    else if (Math.abs(bestY - (ry + rh * 0.25)) < 10) bestY = ry + rh * 0.25;
    else if (Math.abs(bestY - (ry + rh * 0.75)) < 10) bestY = ry + rh * 0.75;
  }

  const relX = Math.max(0, Math.min(1, Math.round(((bestX - rx) / rw) * 1000) / 1000));
  const relY = Math.max(0, Math.min(1, Math.round(((bestY - ry) / rh) * 1000) / 1000));
  return { relX, relY, x: Math.round(bestX), y: Math.round(bestY) };
}

/* ========================================================
   GEOMETRY: LINE SEGMENT CROSSING & SPAGHETTI DETECTION
   ======================================================== */
function onSegment(p, q, r) {
  return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
         q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
}

function lineSegmentsIntersect(p1, q1, p2, q2) {
  // Ignore segments sharing common node port connections
  const isClose = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 12;
  if (isClose(p1, p2) || isClose(p1, q2) || isClose(q1, p2) || isClose(q1, q2)) {
    return false;
  }

  function orientation(p, q, r) {
    const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (Math.abs(val) < 1e-5) return 0; // Collinear
    return val > 0 ? 1 : 2; // 1 = Clockwise, 2 = Counterclockwise
  }

  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  // General Case
  if (o1 !== o2 && o3 !== o4) return true;

  // Collinear Cases
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

function getConnectionPoints(c) {
  const fromNode = dfdNodes.find(n => n.id === c.from);
  const toNode = dfdNodes.find(n => n.id === c.to);
  if (!fromNode || !toNode) return [];

  const fromCenter = getNodeCenter(fromNode);
  const toCenter = getNodeCenter(toNode);
  const fromDims = getNodeDims(fromNode);
  const toDims = getNodeDims(toNode);

  c.waypoints = c.waypoints || [];

  let startPt, endPt;
  if (c.from === c.to) {
    startPt = { x: fromNode.x + fromDims.w, y: fromNode.y + 15 };
    endPt = { x: fromNode.x + fromDims.w, y: fromNode.y + fromDims.h - 15 };
  } else {
    if (c.targetAnchor) {
      endPt = {
        x: Math.round(toNode.x + toDims.w * c.targetAnchor.relX),
        y: Math.round(toNode.y + toDims.h * c.targetAnchor.relY)
      };
    } else {
      const refPt = c.waypoints.length > 0 ? c.waypoints[c.waypoints.length - 1] : fromCenter;
      endPt = getRectIntersection(toCenter.x, toCenter.y, toDims.w, toDims.h, refPt.x, refPt.y);
    }

    if (c.sourceAnchor) {
      startPt = {
        x: Math.round(fromNode.x + fromDims.w * c.sourceAnchor.relX),
        y: Math.round(fromNode.y + fromDims.h * c.sourceAnchor.relY)
      };
    } else {
      const refPt = c.waypoints.length > 0 ? c.waypoints[0] : endPt;
      startPt = getRectIntersection(fromCenter.x, fromCenter.y, fromDims.w, fromDims.h, refPt.x, refPt.y);
    }
  }

  return (c.from === c.to) ? [startPt, endPt] : [startPt, ...c.waypoints, endPt];
}

function checkConnectionsCross(c1, c2) {
  if (c1.id === c2.id) return false;
  // Skip if same nodes connected
  if ((c1.from === c2.from && c1.to === c2.to) || (c1.from === c2.to && c1.to === c2.from)) {
    return false;
  }

  const pts1 = getConnectionPoints(c1);
  const pts2 = getConnectionPoints(c2);
  if (pts1.length < 2 || pts2.length < 2) return false;

  for (let i = 0; i < pts1.length - 1; i++) {
    for (let j = 0; j < pts2.length - 1; j++) {
      if (lineSegmentsIntersect(pts1[i], pts1[i + 1], pts2[j], pts2[j + 1])) {
        return true;
      }
    }
  }
  return false;
}

/* Waypoint Drag Handlers (Arduino-style wire bend points) */
function startDraggingWaypoint(e, connection, index) {
  e.preventDefault();
  e.stopPropagation();
  draggedWaypoint = { connection, index };
  const wp = connection.waypoints[index];
  waypointDragStartPos = wp ? { x: wp.x, y: wp.y } : null;
  window.addEventListener('mousemove', onWaypointMouseMove);
  window.addEventListener('mouseup', onWaypointMouseUp);
}

function onWaypointMouseMove(e) {
  if (!draggedWaypoint) return;
  if (e.buttons === 0) {
    onWaypointMouseUp();
    return;
  }
  const svg = document.getElementById('dfd-svg');
  const svgPt = getSvgCoords(svg, e.clientX, e.clientY);
  const wp = draggedWaypoint.connection.waypoints[draggedWaypoint.index];
  if (wp) {
    let targetX = Math.round(svgPt.x);
    let targetY = Math.round(svgPt.y);

    // Subtle orthogonal snapping (Tinkercad-style alignment)
    const prevPt = (draggedWaypoint.index === 0) 
      ? getNodeCenter(dfdNodes.find(n => n.id === draggedWaypoint.connection.from) || { x: targetX, y: targetY })
      : draggedWaypoint.connection.waypoints[draggedWaypoint.index - 1];

    const nextPt = (draggedWaypoint.index === draggedWaypoint.connection.waypoints.length - 1)
      ? getNodeCenter(dfdNodes.find(n => n.id === draggedWaypoint.connection.to) || { x: targetX, y: targetY })
      : draggedWaypoint.connection.waypoints[draggedWaypoint.index + 1];

    if (prevPt) {
      if (Math.abs(targetX - prevPt.x) < 9) targetX = prevPt.x;
      if (Math.abs(targetY - prevPt.y) < 9) targetY = prevPt.y;
    }
    if (nextPt) {
      if (Math.abs(targetX - nextPt.x) < 9) targetX = nextPt.x;
      if (Math.abs(targetY - nextPt.y) < 9) targetY = nextPt.y;
    }

    wp.x = targetX;
    wp.y = targetY;
    requestDragRender();
  }
}

function onWaypointMouseUp() {
  if (draggedWaypoint) {
    const wp = draggedWaypoint.connection.waypoints[draggedWaypoint.index];
    if (wp && waypointDragStartPos && Math.hypot(wp.x - waypointDragStartPos.x, wp.y - waypointDragStartPos.y) > 3) {
      saveDfdStateToHistory("Bend Wire");
    }
    draggedWaypoint = null;
    waypointDragStartPos = null;
    window.removeEventListener('mousemove', onWaypointMouseMove);
    window.removeEventListener('mouseup', onWaypointMouseUp);
    renderDfd();
    auditDfdDiagram();
  }
}

function startDraggingWaypointTouch(e, connection, index) {
  e.preventDefault();
  e.stopPropagation();
  draggedWaypoint = { connection, index };
  const wp = connection.waypoints[index];
  waypointDragStartPos = wp ? { x: wp.x, y: wp.y } : null;
  window.addEventListener('touchmove', onWaypointTouchMove, { passive: false });
  window.addEventListener('touchend', onWaypointTouchEnd);
  window.addEventListener('touchcancel', onWaypointTouchEnd);
}

function onWaypointTouchMove(e) {
  if (!draggedWaypoint || !e.touches || e.touches.length === 0) return;
  if (e.cancelable) e.preventDefault();
  const svg = document.getElementById('dfd-svg');
  const touch = e.touches[0];
  const svgPt = getSvgCoords(svg, touch.clientX, touch.clientY);
  const wp = draggedWaypoint.connection.waypoints[draggedWaypoint.index];
  if (wp) {
    let targetX = Math.round(svgPt.x);
    let targetY = Math.round(svgPt.y);

    const prevPt = (draggedWaypoint.index === 0) 
      ? getNodeCenter(dfdNodes.find(n => n.id === draggedWaypoint.connection.from) || { x: targetX, y: targetY })
      : draggedWaypoint.connection.waypoints[draggedWaypoint.index - 1];

    const nextPt = (draggedWaypoint.index === draggedWaypoint.connection.waypoints.length - 1)
      ? getNodeCenter(dfdNodes.find(n => n.id === draggedWaypoint.connection.to) || { x: targetX, y: targetY })
      : draggedWaypoint.connection.waypoints[draggedWaypoint.index + 1];

    if (prevPt) {
      if (Math.abs(targetX - prevPt.x) < 9) targetX = prevPt.x;
      if (Math.abs(targetY - prevPt.y) < 9) targetY = prevPt.y;
    }
    if (nextPt) {
      if (Math.abs(targetX - nextPt.x) < 9) targetX = nextPt.x;
      if (Math.abs(targetY - nextPt.y) < 9) targetY = nextPt.y;
    }

    wp.x = targetX;
    wp.y = targetY;
    renderDfd();
  }
}

function onWaypointTouchEnd() {
  if (draggedWaypoint) {
    const wp = draggedWaypoint.connection.waypoints[draggedWaypoint.index];
    if (wp && waypointDragStartPos && Math.hypot(wp.x - waypointDragStartPos.x, wp.y - waypointDragStartPos.y) > 3) {
      saveDfdStateToHistory("Bend Wire");
    }
    draggedWaypoint = null;
    waypointDragStartPos = null;
    window.removeEventListener('touchmove', onWaypointTouchMove);
    window.removeEventListener('touchend', onWaypointTouchEnd);
    window.removeEventListener('touchcancel', onWaypointTouchEnd);
    auditDfdDiagram();
  }
}

function straightenCurrentFlow() {
  if (currentEditingFlow) {
    currentEditingFlow.waypoints = [];
    closeAppModal();
    renderDfd();
    auditDfdDiagram();
    saveDfdStateToHistory("Straighten Arrow");
    showToast("Arrow straightened (all bend points removed)", "info");
  }
}

function addBendPointToCurrentFlow() {
  if (!currentEditingFlow) return;
  const c = currentEditingFlow;
  c.waypoints = c.waypoints || [];
  const fromNode = dfdNodes.find(n => n.id === c.from);
  const toNode = dfdNodes.find(n => n.id === c.to);
  if (!fromNode || !toNode) return;
  const fromCenter = getNodeCenter(fromNode);
  const toCenter = getNodeCenter(toNode);
  const midX = Math.round((fromCenter.x + toCenter.x) / 2);
  const midY = Math.round((fromCenter.y + toCenter.y) / 2);
  c.waypoints.push({ x: midX, y: midY });
  closeAppModal();
  renderDfd();
  auditDfdDiagram();
  saveDfdStateToHistory("Add Bend Point");
  showToast("Added bend point at center! Drag point to route wire.", "success");
}

function resetCurrentFlowLabel() {
  if (!currentEditingFlow) return;
  currentEditingFlow.labelOffset = { x: 0, y: 0 };
  closeAppModal();
  renderDfd();
  saveDfdStateToHistory("Reset Label Position");
  showToast("Reset label position to center", "info");
}

function resetCurrentFlowAnchors() {
  if (!currentEditingFlow) return;
  currentEditingFlow.targetAnchor = null;
  currentEditingFlow.sourceAnchor = null;
  closeAppModal();
  renderDfd();
  auditDfdDiagram();
  saveDfdStateToHistory("Reset Arrowhead Anchors");
  showToast("Reset arrowhead and connection points to auto", "info");
}

/* ========================================================
   ARROWHEAD & ENDPOINT DRAG HANDLERS
   ======================================================== */
function startDraggingArrowEndpoint(e, connection, type) {
  e.preventDefault();
  e.stopPropagation();
  draggedArrowEndpoint = { connection, type, moved: false };
  window.addEventListener('mousemove', onArrowEndpointMouseMove);
  window.addEventListener('mouseup', onArrowEndpointMouseUp);
}

function startDraggingArrowEndpointTouch(e, connection, type) {
  if (e.touches && e.touches.length > 1) return;
  if (e.cancelable) e.preventDefault();
  e.stopPropagation();
  draggedArrowEndpoint = { connection, type, moved: false };
  window.addEventListener('touchmove', onArrowEndpointTouchMove, { passive: false });
  window.addEventListener('touchend', onArrowEndpointTouchEnd);
  window.addEventListener('touchcancel', onArrowEndpointTouchEnd);
}

function onArrowEndpointMouseMove(e) {
  if (!draggedArrowEndpoint) return;
  if (e.buttons === 0) {
    onArrowEndpointMouseUp();
    return;
  }
  draggedArrowEndpoint.moved = true;
  updateArrowEndpoint(e.clientX, e.clientY);
}

function onArrowEndpointTouchMove(e) {
  if (!draggedArrowEndpoint || !e.touches || e.touches.length === 0) return;
  if (e.cancelable) e.preventDefault();
  draggedArrowEndpoint.moved = true;
  updateArrowEndpoint(e.touches[0].clientX, e.touches[0].clientY);
}

function updateArrowEndpoint(clientX, clientY) {
  if (!draggedArrowEndpoint) return;
  const svg = document.getElementById('dfd-svg');
  const svgPt = getSvgCoords(svg, clientX, clientY);
  const c = draggedArrowEndpoint.connection;
  const isTarget = draggedArrowEndpoint.type === 'target';
  const nodeId = isTarget ? c.to : c.from;
  const node = dfdNodes.find(n => n.id === nodeId);
  if (!node) return;

  const dims = getNodeDims(node);
  const closest = getClosestPointOnRectPerimeter(svgPt, node.x, node.y, dims.w, dims.h);

  if (isTarget) {
    c.targetAnchor = { relX: closest.relX, relY: closest.relY };
  } else {
    c.sourceAnchor = { relX: closest.relX, relY: closest.relY };
  }
  requestDragRender();
}

function onArrowEndpointMouseUp() {
  endDraggingArrowEndpoint();
}

function onArrowEndpointTouchEnd() {
  endDraggingArrowEndpoint();
}

function endDraggingArrowEndpoint() {
  if (draggedArrowEndpoint) {
    const isTarget = draggedArrowEndpoint.type === 'target';
    const c = draggedArrowEndpoint.connection;
    const wasMoved = draggedArrowEndpoint.moved;
    draggedArrowEndpoint = null;
    window.removeEventListener('mousemove', onArrowEndpointMouseMove);
    window.removeEventListener('mouseup', onArrowEndpointMouseUp);
    window.removeEventListener('touchmove', onArrowEndpointTouchMove);
    window.removeEventListener('touchend', onArrowEndpointTouchEnd);
    window.removeEventListener('touchcancel', onArrowEndpointTouchEnd);

    if (wasMoved) {
      justFinishedDragging = true;
      setTimeout(() => { justFinishedDragging = false; }, 100);
      saveDfdStateToHistory('Move Arrowhead');
      auditDfdDiagram();
    }
  }
}

/* ========================================================
   DATA FLOW LABEL DRAG HANDLERS
   ======================================================== */
function startDraggingLabel(e, connection) {
  if (currentCanvasMode === 'delete') return;
  e.preventDefault();
  e.stopPropagation();
  const svg = document.getElementById('dfd-svg');
  const svgPt = getSvgCoords(svg, e.clientX, e.clientY);
  draggedLabel = {
    connection,
    startSvg: svgPt,
    origOffset: { ...(connection.labelOffset || { x: 0, y: 0 }) },
    moved: false
  };
  window.addEventListener('mousemove', onLabelMouseMove);
  window.addEventListener('mouseup', onLabelMouseUp);
}

function startDraggingLabelTouch(e, connection) {
  if (currentCanvasMode === 'delete') return;
  if (e.touches && e.touches.length > 1) return;
  if (e.cancelable) e.preventDefault();
  e.stopPropagation();
  const touch = e.touches[0];
  const svg = document.getElementById('dfd-svg');
  const svgPt = getSvgCoords(svg, touch.clientX, touch.clientY);
  draggedLabel = {
    connection,
    startSvg: svgPt,
    origOffset: { ...(connection.labelOffset || { x: 0, y: 0 }) },
    moved: false
  };
  window.addEventListener('touchmove', onLabelTouchMove, { passive: false });
  window.addEventListener('touchend', onLabelTouchEnd);
  window.addEventListener('touchcancel', onLabelTouchEnd);
}

function onLabelMouseMove(e) {
  if (!draggedLabel) return;
  if (e.buttons === 0) {
    onLabelMouseUp();
    return;
  }
  updateLabelDrag(e.clientX, e.clientY);
}

function onLabelTouchMove(e) {
  if (!draggedLabel || !e.touches || e.touches.length === 0) return;
  if (e.cancelable) e.preventDefault();
  updateLabelDrag(e.touches[0].clientX, e.touches[0].clientY);
}

function updateLabelDrag(clientX, clientY) {
  if (!draggedLabel) return;
  const svg = document.getElementById('dfd-svg');
  const svgPt = getSvgCoords(svg, clientX, clientY);
  const dx = svgPt.x - draggedLabel.startSvg.x;
  const dy = svgPt.y - draggedLabel.startSvg.y;
  if (Math.hypot(dx, dy) > 3) {
    draggedLabel.moved = true;
  }
  draggedLabel.connection.labelOffset = {
    x: Math.round(draggedLabel.origOffset.x + dx),
    y: Math.round(draggedLabel.origOffset.y + dy)
  };
  requestDragRender();
}

function onLabelMouseUp() {
  endLabelDrag();
}

function onLabelTouchEnd() {
  endLabelDrag();
}

function endLabelDrag() {
  if (draggedLabel) {
    const wasMoved = draggedLabel.moved;
    const c = draggedLabel.connection;
    draggedLabel = null;
    window.removeEventListener('mousemove', onLabelMouseMove);
    window.removeEventListener('mouseup', onLabelMouseUp);
    window.removeEventListener('touchmove', onLabelTouchMove);
    window.removeEventListener('touchend', onLabelTouchEnd);
    window.removeEventListener('touchcancel', onLabelTouchEnd);
    renderDfd();

    if (wasMoved) {
      justFinishedDragging = true;
      setTimeout(() => { justFinishedDragging = false; }, 100);
      saveDfdStateToHistory(`Move Flow Label [${c ? c.label : ''}]`);
    }
  }
}

/* ========================================================
   CANVAS ACTIONS & PRESETS
   ======================================================== */
function changeScenario() {
  const val = document.getElementById('scenario-selector').value;
  if (SCENARIOS[val]) {
    document.getElementById('scenario-hint').innerText = SCENARIOS[val].hint;
  }
  if (val === 'leasing_context') {
    loadPropertyLeasingContextPreset();
  } else if (val === 'leasing_level1') {
    loadPropertyLeasingLevel1Preset();
  } else {
    clearDfdCanvas();
  }
}

function setCanvasMode(mode) {
  currentCanvasMode = mode;
  document.querySelectorAll('.canvas-mode-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById(`btn-mode-${mode}`);
  if (btn) btn.classList.add('active');
  selectedNodeForConnection = null;

  const svg = document.getElementById('dfd-svg');
  if (svg) svg.setAttribute('data-mode', mode);

  const statusMap = {
    move: "Mode: Select & Drag Elements (Drag arrowheads, bend points, or labels)",
    connect: "Mode: Click SOURCE element (Output), then click TARGET element (Input)",
    bend: "Mode: Tap any wire to add bend points (Arduino wiring)",
    edit: "Mode: Click any Process, Entity, Data Store, or Flow arrow to edit / rename",
    delete: "Mode: Click any element or flow to delete"
  };
  document.getElementById('canvas-status').innerText = statusMap[mode] || `Mode: ${mode}`;
  renderDfd();
}

function addDfdNode(type) {
  const id = "node_" + Date.now();
  let name = "";
  let desc = "";
  let defaultX = 80 + Math.random() * 200;
  let defaultY = 60 + Math.random() * 200;

  if (type === 'process') {
    name = "1.0 COMPUTE SALES";
    desc = "Transforms input data items into computed results or documents.";
  } else if (type === 'entity') {
    name = "CUSTOMER";
    desc = "External person, organization, or system outside boundary.";
  } else if (type === 'store') {
    name = "D1 SALES";
    desc = "Passive repository of persistent data at rest.";
  }

  dfdNodes.push({ id, type, name, desc, x: defaultX, y: defaultY });
  renderDfd();
  auditDfdDiagram();
  saveDfdStateToHistory(`Add ${type.toUpperCase()}: ${name}`);
  showToast(`Added ${type.toUpperCase()}: ${name}`, 'success');
}

function clearDfdCanvas() {
  if (dfdNodes.length === 0 && dfdConnections.length === 0) return;
  dfdNodes = [];
  dfdConnections = [];
  selectedNodeForConnection = null;
  resetCanvasZoom();
  renderDfd();
  auditDfdDiagram();
  saveDfdStateToHistory('Clear Canvas');
  showToast("Canvas cleared", "warning");
}

function loadBuggyDfdPreset() {
  dfdNodes = [
    { id: "n1", type: "entity", name: "CUSTOMER", desc: "Shopper at store checkout", x: 40, y: 80 },
    { id: "n2", type: "store", name: "D1 SALES_STORE", desc: "Historical transactions repository", x: 400, y: 80 },
    { id: "n3", type: "store", name: "D2 INVENTORY", desc: "Stock quantities and product prices", x: 400, y: 240 },
    { id: "n4", type: "process", name: "CALCULATOR", desc: "Calculates total amount", x: 180, y: 240 },
    { id: "n5", type: "process", name: "3.0 LOG ERRORS", desc: "System crash dump handler", x: 40, y: 380 }
  ];

  dfdConnections = [
    { id: "c1", from: "n1", to: "n2", label: "DirectOrderData", desc: "Customer directly writing into database" }, // Sin #3
    { id: "c2", from: "n2", to: "n3", label: "SyncData", desc: "Direct database-to-database pipe" },        // Sin #1
    { id: "c3", from: "n1", to: "n5", label: "CrashLog", desc: "Data going into black hole process" }         // Sin #5 (Black Hole)
  ];

  renderDfd();
  auditDfdDiagram();
  saveDfdStateToHistory('Load Mortal Sins Preset');
  showToast("Loaded preset containing multiple Mortal Sins! Check the Linter panel.", "danger");
}

function loadPerfectDfdPreset() {
  dfdNodes = [
    { id: "n1", type: "entity", name: "CUSTOMER", desc: "Shopper initiating item purchase", x: 40, y: 80 },
    { id: "n2", type: "process", name: "1.0 PROCESS ITEM PURCHASE", desc: "Scans item barcode, calculates price, VAT, and prints receipt", x: 270, y: 75 },
    { id: "n3", type: "store", name: "D1 INVENTORY", desc: "Product catalog, SKU stock levels, unit prices", x: 530, y: 80 },
    { id: "n4", type: "entity", name: "CASHIER", desc: "Point-of-sale checkout operator", x: 40, y: 230 },
    { id: "n5", type: "store", name: "D2 SALES ARCHIVE", desc: "Audit log of finalized sales transactions", x: 270, y: 230 },
    { id: "n6", type: "process", name: "2.0 UPDATE & RECONCILE", desc: "Reconciles sales register and adjusts warehouse inventory counts", x: 530, y: 225 },
    { id: "n7", type: "entity", name: "STORE MANAGER", desc: "Branch supervisor reviewing sales and stock reports", x: 530, y: 375 }
  ];

  dfdConnections = [
    { id: "c1", from: "n1", to: "n2", label: "Item_Barcode", desc: "Product barcode scanned from merchandise", waypoints: [] },
    { id: "c2", from: "n3", to: "n2", label: "Price_And_Details", desc: "Unit price, description, and tax rate from inventory", waypoints: [] },
    { id: "c3", from: "n2", to: "n4", label: "Computed_Receipt", desc: "Printed customer receipt with itemized charges", waypoints: [{ x: 195, y: 195 }] },
    { id: "c4", from: "n2", to: "n5", label: "Recorded_Sale", desc: "Finalized sales transaction record", waypoints: [] },
    { id: "c5", from: "n5", to: "n6", label: "Sales_Audit_Data", desc: "Batch sales records for daily balancing", waypoints: [] },
    { id: "c6", from: "n6", to: "n3", label: "Inventory_Adjustment", desc: "Stock decrement instruction per sold item", waypoints: [] },
    { id: "c7", from: "n6", to: "n7", label: "Daily_Revenue_Report", desc: "End-of-day sales summary report", waypoints: [] }
  ];

  renderDfd();
  auditDfdDiagram();
  fitCanvasToElements();
  saveDfdStateToHistory('Load Balanced Preset');
  showToast("Loaded textbook balanced DFD preset (Clean 100%)!", "success");
}

function loadPropertyLeasingContextPreset() {
  const sel = document.getElementById('scenario-selector');
  if (sel) {
    sel.value = 'leasing_context';
    const hint = document.getElementById('scenario-hint');
    if (hint && SCENARIOS['leasing_context']) hint.innerText = SCENARIOS['leasing_context'].hint;
  }

  dfdNodes = [
    { id: "n1", type: "entity", name: "PROSPECTIVE TENANT", desc: "Searches available units and submits applications", x: 40, y: 40 },
    { id: "n2", type: "entity", name: "TENANT", desc: "Active resident paying rent and filing maintenance requests", x: 40, y: 190 },
    { id: "n3", type: "entity", name: "LEASING OFFICER", desc: "Assesses applications and drafts leases", x: 40, y: 340 },
    { id: "n8", type: "entity", name: "SYSTEM ADMINISTRATOR", desc: "Configures system roles, user credentials, and maintains audit logs", x: 40, y: 490 },
    { id: "n0", type: "process", name: "0.0 PROPERTY LEASING SYSTEM", desc: "To-Be Core Property Leasing, Tenant Management & Maintenance System", x: 330, y: 260 },
    { id: "n4", type: "entity", name: "PROPERTY MANAGER", desc: "Manages property records, move-in/outs, and assigns work orders", x: 620, y: 40 },
    { id: "n5", type: "entity", name: "ACCOUNTING PERSONNEL", desc: "Records payments and certifies move-out balance clearances", x: 620, y: 190 },
    { id: "n6", type: "entity", name: "MAINTENANCE PERSONNEL", desc: "Performs repairs and submits materials logs", x: 620, y: 340 },
    { id: "n7", type: "entity", name: "MANAGEMENT", desc: "Sets enterprise leasing policies, reviews performance, and audits operations", x: 620, y: 490 }
  ];

  dfdConnections = [
    { id: "c1", from: "n1", to: "n0", label: "Search_Criteria", desc: "Unit criteria and location preference", waypoints: [] },
    { id: "c2", from: "n1", to: "n0", label: "Rental_Application_Package", desc: "Application form and supporting credentials", waypoints: [] },
    { id: "c3", from: "n0", to: "n1", label: "Available_Units_Catalog", desc: "Matching available units", waypoints: [] },
    { id: "c4", from: "n0", to: "n1", label: "Application_Status_Notice", desc: "Approval or rejection notice", waypoints: [] },
    { id: "c5", from: "n2", to: "n0", label: "Signed_Lease", desc: "Signed tenancy agreement", waypoints: [] },
    { id: "c6", from: "n2", to: "n0", label: "Rent_Payment_Submission", desc: "Monthly rent payment", waypoints: [] },
    { id: "c7", from: "n2", to: "n0", label: "Maintenance_Request", desc: "Repair ticket with problem description", waypoints: [] },
    { id: "c8", from: "n2", to: "n0", label: "Renewal_Decision", desc: "Acceptance or decline of extension", waypoints: [] },
    { id: "c9", from: "n0", to: "n2", label: "Lease_Document", desc: "Draft lease for review", waypoints: [] },
    { id: "c10", from: "n0", to: "n2", label: "Payment_Receipt", desc: "Rent payment confirmation", waypoints: [] },
    { id: "c11", from: "n0", to: "n2", label: "Maintenance_Update_Notice", desc: "Status update and job completion", waypoints: [] },
    { id: "c12", from: "n0", to: "n2", label: "Renewal_Notice", desc: "60-day lease expiration notice", waypoints: [] },
    { id: "c13", from: "n3", to: "n0", label: "Screening_Decision", desc: "Application review outcome", waypoints: [] },
    { id: "c14", from: "n3", to: "n0", label: "Prepared_Lease_Terms", desc: "Draft lease terms", waypoints: [] },
    { id: "c15", from: "n0", to: "n3", label: "Application_Review_Queue", desc: "Pending applications for verification", waypoints: [] },
    { id: "c16", from: "n4", to: "n0", label: "Property_And_Unit_Specs", desc: "Property registration details", waypoints: [] },
    { id: "c17", from: "n4", to: "n0", label: "Work_Order_Assignment", desc: "Assigned technician and schedule", waypoints: [] },
    { id: "c18", from: "n4", to: "n0", label: "Inspection_Clearance", desc: "Move-out inspection confirmation", waypoints: [] },
    { id: "c19", from: "n0", to: "n4", label: "Approaching_Expiration_Alert", desc: "60-day lease expiration alert", waypoints: [] },
    { id: "c20", from: "n0", to: "n4", label: "Open_Work_Orders_List", desc: "Pending repair requests", waypoints: [] },
    { id: "c21", from: "n5", to: "n0", label: "Payment_Record_Entry", desc: "Logged payment transaction", waypoints: [] },
    { id: "c22", from: "n5", to: "n0", label: "Account_Clearance_Confirmation", desc: "Zero balance confirmation for move-out", waypoints: [] },
    { id: "c23", from: "n0", to: "n5", label: "Tenant_Balance_Summary", desc: "Current billing balance and dues", waypoints: [] },
    { id: "c24", from: "n6", to: "n0", label: "Completion_Report_And_Materials", desc: "Work completed, labor hours, and parts", waypoints: [] },
    { id: "c25", from: "n0", to: "n6", label: "Assigned_Work_Order_Details", desc: "Unit location and problem description", waypoints: [] },
    { id: "c26", from: "n7", to: "n0", label: "Management_Directives", desc: "Rental rate guidelines, operational budgets, and audit criteria", waypoints: [] },
    { id: "c27", from: "n0", to: "n7", label: "Executive_Performance_Summary", desc: "Occupancy metrics, revenue totals, and maintenance KPIs", waypoints: [] },
    { id: "c28", from: "n8", to: "n0", label: "System_Config_Parameters", desc: "User access roles, security credentials, and system settings", waypoints: [] },
    { id: "c29", from: "n0", to: "n8", label: "System_Audit_Logs", desc: "Access logs, error trails, and system health status", waypoints: [] }
  ];

  renderDfd();
  auditDfdDiagram();
  fitCanvasToElements();
  saveDfdStateToHistory('Load Property Leasing Context Preset');
  showToast("Loaded Property Leasing Context Diagram (Process 0.0, 8 External Entities)!", "success");
}

function loadPropertyLeasingLevel1Preset() {
  const sel = document.getElementById('scenario-selector');
  if (sel) {
    sel.value = 'leasing_level1';
    const hint = document.getElementById('scenario-hint');
    if (hint && SCENARIOS['leasing_level1']) hint.innerText = SCENARIOS['leasing_level1'].hint;
  }

  dfdNodes = [
    { id: "e1", type: "entity", name: "PROSPECTIVE TENANT", desc: "Inquires about units and submits applications", x: 30, y: 40 },
    { id: "p1", type: "process", name: "1.0 MANAGE PROPERTY & UNIT INVENTORY", desc: "Registers properties, maintains units, filters vacancies", x: 270, y: 35 },
    { id: "d1", type: "store", name: "D1 PROPERTIES_AND_UNITS", desc: "Building specs, unit numbers, pricing, and occupancy status", x: 270, y: 110 },
    { id: "e2", type: "entity", name: "PROPERTY MANAGER", desc: "Registers properties, assigns maintenance, approves move-ins/outs", x: 620, y: 35 },

    { id: "p2", type: "process", name: "2.0 PROCESS RENTAL APPLICATIONS", desc: "Vets applications, verifies credit/employment, records decisions", x: 270, y: 180 },
    { id: "d2", type: "store", name: "D2 RENTAL_APPLICATIONS", desc: "Submitted tenant credentials, references, and review statuses", x: 270, y: 255 },
    { id: "e3", type: "entity", name: "LEASING OFFICER", desc: "Reviews applications, runs checks, and drafts lease agreements", x: 620, y: 180 },

    { id: "e4", type: "entity", name: "TENANT", desc: "Active resident: pays rent, submits maintenance tickets, signs leases", x: 30, y: 340 },
    { id: "p3", type: "process", name: "3.0 MANAGE LEASES & TENANCY", desc: "Prepares agreements, processes move-ins, monitors renewals, handles move-outs", x: 270, y: 330 },
    { id: "d3", type: "store", name: "D3 LEASE_AGREEMENTS", desc: "Signed leases, rental rates, security deposits, and expiration dates", x: 270, y: 405 },

    { id: "p4", type: "process", name: "4.0 PROCESS RENT PAYMENTS & LEDGER", desc: "Calculates dues, logs payments, issues receipts, flags overdue accounts", x: 270, y: 480 },
    { id: "d4", type: "store", name: "D4 PAYMENT_LEDGERS", desc: "Payment records, billing cycles, balances, and payment statuses", x: 270, y: 555 },
    { id: "e5", type: "entity", name: "ACCOUNTING PERSONNEL", desc: "Maintains financial ledger, verifies receipts, and certifies clearances", x: 620, y: 480 },

    { id: "p5", type: "process", name: "5.0 MANAGE MAINTENANCE WORK ORDERS", desc: "Triages tickets, dispatches technicians, and records repairs/parts", x: 270, y: 630 },
    { id: "d5", type: "store", name: "D5 WORK_ORDERS", desc: "Repair requests, technician assignments, status, labor, and materials", x: 270, y: 705 },
    { id: "e6", type: "entity", name: "MAINTENANCE PERSONNEL", desc: "Performs repairs, logs hours, and registers parts consumed", x: 620, y: 630 },

    { id: "e7", type: "entity", name: "SYSTEM ADMINISTRATOR", desc: "Configures user security roles, access permissions, and reviews system audit logs", x: 30, y: 780 },
    { id: "p6", type: "process", name: "6.0 MANAGE SYSTEM SECURITY & AUDIT", desc: "Authenticates users, controls access roles, logs system actions, and generates compliance audits", x: 270, y: 780 },
    { id: "d6", type: "store", name: "D6 SYSTEM_AUDIT_LOGS", desc: "User access records, security events, administrative logs, and system error traces", x: 270, y: 855 },
    { id: "e8", type: "entity", name: "MANAGEMENT", desc: "Oversees property operations, sets leasing policies, and reviews executive governance reports", x: 620, y: 780 }
  ];

  dfdConnections = [
    { id: "f1", from: "e1", to: "p1", label: "Search_Criteria", desc: "Unit criteria and location preference", waypoints: [] },
    { id: "f2", from: "p1", to: "e1", label: "Available_Units_Catalog", desc: "Matching available units", waypoints: [] },
    { id: "f3", from: "e2", to: "p1", label: "Property_And_Unit_Specs", desc: "Property registration details", waypoints: [] },
    { id: "f4", from: "p1", to: "d1", label: "New_Property_And_Unit_Records", desc: "Insert newly registered properties and units", waypoints: [] },
    { id: "f5", from: "d1", to: "p1", label: "Matching_Unit_Data", desc: "Query available units matching search", waypoints: [] },

    { id: "f6", from: "e1", to: "p2", label: "Rental_Application_Package", desc: "Completed form and credentials", waypoints: [] },
    { id: "f7", from: "p2", to: "d2", label: "Submitted_Application_Record", desc: "Store pending application record", waypoints: [] },
    { id: "f8", from: "d2", to: "p2", label: "Application_Details_For_Review", desc: "Fetch application info for verification", waypoints: [] },
    { id: "f9", from: "p2", to: "e3", label: "Application_Review_Queue", desc: "Route to leasing officer", waypoints: [] },
    { id: "f10", from: "e3", to: "p2", label: "Screening_Decision", desc: "Approval, rejection, or request for info", waypoints: [] },
    { id: "f11", from: "p2", to: "d2", label: "Screening_Decision_Status", desc: "Update application status", waypoints: [] },
    { id: "f12", from: "p2", to: "e1", label: "Application_Status_Notice", desc: "Send result to applicant", waypoints: [] },

    { id: "f13", from: "d2", to: "p3", label: "Approved_Applicant_Data", desc: "Fetch approved tenant info for lease drafting", waypoints: [] },
    { id: "f14", from: "e3", to: "p3", label: "Prepared_Lease_Terms", desc: "Provide negotiated lease clauses", waypoints: [] },
    { id: "f15", from: "p3", to: "e4", label: "Lease_Document", desc: "Transmit draft lease for signing", waypoints: [] },
    { id: "f16", from: "e4", to: "p3", label: "Signed_Lease", desc: "Executed agreement returned by tenant", waypoints: [] },
    { id: "f17", from: "p3", to: "d3", label: "New_Signed_Lease_Record", desc: "Persist signed lease into archive", waypoints: [] },
    { id: "f18", from: "e2", to: "p3", label: "Move_In_Approval", desc: "Confirm initial deposit received and keys handed over", waypoints: [] },
    { id: "f19", from: "p3", to: "d1", label: "Unit_Status_Update", desc: "Transition unit status from Available to Occupied", waypoints: [] },
    { id: "f20", from: "d3", to: "p3", label: "Expiring_Lease_Alert_Data", desc: "System checks leases with <60 days remaining", waypoints: [] },
    { id: "f21", from: "p3", to: "e2", label: "Approaching_Expiration_Alert", desc: "Notify manager of upcoming expiration", waypoints: [] },
    { id: "f22", from: "p3", to: "e4", label: "Renewal_Notice", desc: "Offer lease extension terms to tenant", waypoints: [] },
    { id: "f23", from: "e4", to: "p3", label: "Renewal_Decision", desc: "Tenant confirms renewal acceptance", waypoints: [] },
    { id: "f24", from: "p3", to: "d3", label: "Renewed_Lease_Record", desc: "Record extended lease dates", waypoints: [] },
    { id: "f25", from: "e4", to: "p3", label: "Move_Out_Notice", desc: "Tenant notifies non-renewal", waypoints: [] },
    { id: "f26", from: "p3", to: "e5", label: "Move_Out_Financial_Review", desc: "Request final ledger clearance", waypoints: [] },
    { id: "f27", from: "e5", to: "p3", label: "Account_Clearance_Confirmation", desc: "Confirm all dues settled", waypoints: [] },
    { id: "f28", from: "e2", to: "p3", label: "Inspection_Clearance", desc: "Confirm unit inspected and keys returned", waypoints: [] },
    { id: "f29", from: "p3", to: "d3", label: "Terminated_Lease_Status", desc: "Mark lease as terminated / completed", waypoints: [] },
    { id: "f30", from: "p3", to: "e2", label: "Unit_Turnover_Notice", desc: "Alert manager that unit is vacant and ready", waypoints: [] },

    { id: "f31", from: "e4", to: "p4", label: "Rent_Payment_Submission", desc: "Tenant submits monthly payment", waypoints: [] },
    { id: "f32", from: "d3", to: "p4", label: "Active_Lease_Terms", desc: "Verify rent amount and due date", waypoints: [] },
    { id: "f33", from: "e5", to: "p4", label: "Payment_Record_Entry", desc: "Accounting logs verified bank deposit", waypoints: [] },
    { id: "f34", from: "p4", to: "d4", label: "Recorded_Payment_Transaction", desc: "Save payment entry to ledger", waypoints: [] },
    { id: "f35", from: "p4", to: "e4", label: "Payment_Receipt", desc: "Issue official payment acknowledgment", waypoints: [] },
    { id: "f36", from: "d4", to: "p4", label: "Tenant_Billing_Balance", desc: "Query ledger for outstanding balances", waypoints: [] },
    { id: "f37", from: "p4", to: "e5", label: "Tenant_Balance_Summary", desc: "Send report of overdue accounts", waypoints: [] },

    { id: "f38", from: "e4", to: "p5", label: "Maintenance_Request", desc: "Tenant logs repair issue", waypoints: [] },
    { id: "f39", from: "p5", to: "d5", label: "New_Maintenance_Request", desc: "Log ticket with Open status", waypoints: [] },
    { id: "f40", from: "d5", to: "p5", label: "Open_Requests_List", desc: "Retrieve active tickets", waypoints: [] },
    { id: "f41", from: "p5", to: "e2", label: "Open_Work_Orders_List", desc: "Present pending queue to manager", waypoints: [] },
    { id: "f42", from: "e2", to: "p5", label: "Work_Order_Assignment", desc: "Assign technician to ticket", waypoints: [] },
    { id: "f43", from: "p5", to: "d5", label: "Assignment_Status_Update", desc: "Update ticket status to Assigned", waypoints: [] },
    { id: "f44", from: "p5", to: "e6", label: "Assigned_Work_Order_Details", desc: "Dispatch ticket details to tech", waypoints: [] },
    { id: "f45", from: "e6", to: "p5", label: "Completion_Report_And_Materials", desc: "Submit work log and parts used", waypoints: [] },
    { id: "f46", from: "p5", to: "d5", label: "Completed_Work_Record", desc: "Mark ticket Completed and record cost", waypoints: [] },
    { id: "f47", from: "p5", to: "e4", label: "Maintenance_Update_Notice", desc: "Notify tenant repair is finished", waypoints: [] },

    { id: "f48", from: "e7", to: "p6", label: "System_Security_Config", desc: "User roles, access permissions, and authentication rules", waypoints: [] },
    { id: "f49", from: "p6", to: "e7", label: "Security_And_Health_Report", desc: "System uptime, error alerts, and activity log summaries", waypoints: [] },
    { id: "f50", from: "p6", to: "d6", label: "Logged_Security_Audit_Trail", desc: "Record user logins, data modifications, and security events", waypoints: [] },
    { id: "f51", from: "d6", to: "p6", label: "Stored_Audit_Logs", desc: "Query historical event records and incident logs", waypoints: [] },
    { id: "f52", from: "e8", to: "p6", label: "Audit_And_Governance_Request", desc: "Request for enterprise security compliance report", waypoints: [] },
    { id: "f53", from: "p6", to: "e8", label: "Enterprise_Compliance_Report", desc: "Executive summary of system integrity, audits, and SLA compliance", waypoints: [] }
  ];

  renderDfd();
  auditDfdDiagram();
  fitCanvasToElements();
  saveDfdStateToHistory('Load Property Leasing Level 1 Preset');
  showToast("Loaded Property Leasing Level 1 DFD (6 Processes, 6 Stores, 8 Entities)!", "success");
}

/* ========================================================
   RENDER ENGINE (With Visible Directed Arrowheads)
   ======================================================== */
function renderDfd() {
  const connGroup = document.getElementById('svg-connections');
  const nodeGroup = document.getElementById('svg-nodes');
  if (!connGroup || !nodeGroup) return;

  connGroup.innerHTML = "";
  nodeGroup.innerHTML = "";

  // Render Connections (Data Flows)
  dfdConnections.forEach(c => {
    const fromNode = dfdNodes.find(n => n.id === c.from);
    const toNode = dfdNodes.find(n => n.id === c.to);
    if (!fromNode || !toNode) return;

    const fromCenter = getNodeCenter(fromNode);
    const toCenter = getNodeCenter(toNode);
    const fromDims = getNodeDims(fromNode);
    const toDims = getNodeDims(toNode);

    // Compute perimeter intersections & waypoints
    let startPt, endPt;
    c.waypoints = c.waypoints || [];
    c.labelOffset = c.labelOffset || { x: 0, y: 0 };

    if (c.from === c.to) {
      // Recursive loop
      startPt = { x: fromNode.x + fromDims.w, y: fromNode.y + 15 };
      endPt = { x: fromNode.x + fromDims.w, y: fromNode.y + fromDims.h - 15 };
    } else {
      // 1. Calculate endPt (Arrowhead entry point on target)
      if (c.targetAnchor) {
        endPt = {
          x: Math.round(toNode.x + toDims.w * c.targetAnchor.relX),
          y: Math.round(toNode.y + toDims.h * c.targetAnchor.relY)
        };
      } else {
        const refPt = c.waypoints.length > 0 ? c.waypoints[c.waypoints.length - 1] : fromCenter;
        endPt = getRectIntersection(toCenter.x, toCenter.y, toDims.w, toDims.h, refPt.x, refPt.y);
      }

      // 2. Calculate startPt (Arrow start point on source)
      if (c.sourceAnchor) {
        startPt = {
          x: Math.round(fromNode.x + fromDims.w * c.sourceAnchor.relX),
          y: Math.round(fromNode.y + fromDims.h * c.sourceAnchor.relY)
        };
      } else {
        const refPt = c.waypoints.length > 0 ? c.waypoints[0] : endPt;
        startPt = getRectIntersection(fromCenter.x, fromCenter.y, fromDims.w, fromDims.h, refPt.x, refPt.y);
      }
    }

    const allPoints = (c.from === c.to) ? [startPt, endPt] : [startPt, ...c.waypoints, endPt];

    // Check if error flow
    const isError = (fromNode.type === 'store' && toNode.type === 'store') ||
                    (fromNode.type === 'entity' && toNode.type === 'entity') ||
                    (fromNode.type === 'entity' && toNode.type === 'store') ||
                    (fromNode.type === 'store' && toNode.type === 'entity') ||
                    (c.from === c.to);

    const strokeColor = isError ? "#dc2626" : "#2563eb";
    const markerType = isError ? "url(#dfd-arr-err)" : "url(#dfd-arr)";

    const flowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    flowGroup.setAttribute("class", "data-flow-group");
    flowGroup.setAttribute("data-id", c.id);

    // Global flow delete handler when clicked in delete mode
    flowGroup.addEventListener('click', (e) => {
      if (currentCanvasMode === 'delete') {
        e.stopPropagation();
        deleteDfdConnection(c);
      }
    });

    if (c.from === c.to) {
      // Loop path geometry
      const arc = `M ${startPt.x} ${startPt.y} C ${startPt.x + 55} ${startPt.y - 20}, ${endPt.x + 55} ${endPt.y + 20}, ${endPt.x} ${endPt.y}`;

      // Transparent wide hitbox for selecting, editing, or deleting recursive loop
      const hitbox = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hitbox.setAttribute("d", arc);
      hitbox.setAttribute("fill", "none");
      hitbox.setAttribute("stroke", "transparent");
      hitbox.setAttribute("stroke-width", "30");
      hitbox.setAttribute("class", "wire-hitbox");
      hitbox.setAttribute("style", "cursor: pointer;");
      flowGroup.appendChild(hitbox);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", arc);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("marker-end", markerType);
      path.setAttribute("class", "data-flow-path");
      path.setAttribute("style", "cursor: pointer;");
      flowGroup.appendChild(path);

      const handleLoopClick = (e) => {
        e.stopPropagation();
        if (currentCanvasMode === 'delete') {
          deleteDfdConnection(c);
        } else if (currentCanvasMode === 'edit') {
          openEditFlowModal(c);
        }
      };

      hitbox.addEventListener('click', handleLoopClick);
      hitbox.addEventListener('touchstart', (e) => {
        if (currentCanvasMode === 'delete' || currentCanvasMode === 'edit') {
          e.stopPropagation();
          handleLoopClick(e);
        }
      });
      path.addEventListener('click', handleLoopClick);

      // Label pill for recursive loop
      const midX = fromNode.x + fromDims.w + 45 + (c.labelOffset ? c.labelOffset.x : 0);
      const midY = fromNode.y + fromDims.h / 2 + (c.labelOffset ? c.labelOffset.y : 0);
      const labelText = c.label || "RecursiveLoop";
      const pillWidth = Math.max(75, labelText.length * 7 + 24);

      const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      labelGroup.setAttribute("class", "data-flow-label-group");
      labelGroup.setAttribute("style", "cursor: pointer; touch-action: none;");

      const pillRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      pillRect.setAttribute("x", midX - pillWidth / 2);
      pillRect.setAttribute("y", midY - 10);
      pillRect.setAttribute("width", pillWidth);
      pillRect.setAttribute("height", "20");
      pillRect.setAttribute("rx", "10");
      pillRect.setAttribute("fill", "#ffffff");
      pillRect.setAttribute("stroke", strokeColor);
      pillRect.setAttribute("stroke-width", "1.5");
      pillRect.setAttribute("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.1))");
      labelGroup.appendChild(pillRect);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", midX);
      text.setAttribute("y", midY + 3.5);
      text.setAttribute("fill", "#991b1b");
      text.setAttribute("font-size", "9");
      text.setAttribute("font-weight", "800");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("style", "pointer-events: none;");
      text.textContent = `${labelText} \u21ba`;
      labelGroup.appendChild(text);

      labelGroup.addEventListener('click', handleLoopClick);
      labelGroup.addEventListener('touchstart', (e) => {
        if (currentCanvasMode === 'delete' || currentCanvasMode === 'edit') {
          e.stopPropagation();
          handleLoopClick(e);
        }
      });
      labelGroup.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openEditFlowModal(c);
      });

      flowGroup.appendChild(labelGroup);
    } else {
      // Build polyline path string through allPoints
      let pathD = `M ${startPt.x} ${startPt.y}`;
      for (let i = 1; i < allPoints.length; i++) {
        pathD += ` L ${allPoints[i].x} ${allPoints[i].y}`;
      }

      // 1. Transparent wider hitbox path for easy clicking to add bend points (Arduino style)
      const hitbox = document.createElementNS("http://www.w3.org/2000/svg", "path");
      hitbox.setAttribute("d", pathD);
      hitbox.setAttribute("fill", "none");
      hitbox.setAttribute("stroke", "transparent");
      hitbox.setAttribute("stroke-width", currentCanvasMode === 'bend' ? "44" : "20");
      hitbox.setAttribute("stroke-linecap", "round");
      hitbox.setAttribute("stroke-linejoin", "round");
      hitbox.setAttribute("class", "wire-hitbox");
      flowGroup.appendChild(hitbox);

      // 2. Visible wire line
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathD);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      path.setAttribute("marker-end", markerType);
      path.setAttribute("class", "data-flow-path");
      flowGroup.appendChild(path);

      // Hitbox event listeners to add bend points on click/drag
      hitbox.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if (currentCanvasMode === 'delete') {
          deleteDfdConnection(c);
          return;
        }
        if (currentCanvasMode === 'edit') {
          openEditFlowModal(c);
          return;
        }
        if (currentCanvasMode !== 'bend') {
          // In select/move mode, clicking the wire does not create bend points or show popups
          return;
        }

        // Add bend point at mouse position (Only in 'bend' mode!)
        const svg = document.getElementById('dfd-svg');
        const svgPt = getSvgCoords(svg, e.clientX, e.clientY);

        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < allPoints.length - 1; i++) {
          const d = distToSegment(svgPt, allPoints[i], allPoints[i + 1]);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }

        c.waypoints = c.waypoints || [];
        const newWp = { x: Math.round(svgPt.x), y: Math.round(svgPt.y) };
        c.waypoints.splice(bestIdx, 0, newWp);
        renderDfd();
        auditDfdDiagram();
        saveDfdStateToHistory("Add Bend Point");
        startDraggingWaypoint(e, c, bestIdx);
        showToast("Added bend point! Drag to route wire.", "info");
      });

      hitbox.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) return;
        e.stopPropagation();
        if (currentCanvasMode === 'delete') {
          deleteDfdConnection(c);
          return;
        }
        if (currentCanvasMode === 'edit') {
          openEditFlowModal(c);
          return;
        }
        if (currentCanvasMode !== 'bend') {
          // In select/move mode, tapping the wire does not create bend points or show popups
          return;
        }

        const svg = document.getElementById('dfd-svg');
        const touch = e.touches[0];
        const svgPt = getSvgCoords(svg, touch.clientX, touch.clientY);

        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < allPoints.length - 1; i++) {
          const d = distToSegment(svgPt, allPoints[i], allPoints[i + 1]);
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }

        c.waypoints = c.waypoints || [];
        const newWp = { x: Math.round(svgPt.x), y: Math.round(svgPt.y) };
        c.waypoints.splice(bestIdx, 0, newWp);
        renderDfd();
        auditDfdDiagram();
        saveDfdStateToHistory("Add Bend Point");
        startDraggingWaypointTouch(e, c, bestIdx);
        showToast("Added bend point! Drag to route wire.", "info");
      }, { passive: false });

      // 3. Waypoint draggable circular handles (with mobile-friendly 36px touch zone)
      c.waypoints.forEach((wp, wpIdx) => {
        const wpGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        wpGroup.setAttribute("class", "waypoint-group");

        const touchTarget = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        touchTarget.setAttribute("cx", wp.x);
        touchTarget.setAttribute("cy", wp.y);
        touchTarget.setAttribute("r", "18");
        touchTarget.setAttribute("fill", "transparent");
        touchTarget.setAttribute("style", "cursor: move; touch-action: none;");

        const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        handle.setAttribute("cx", wp.x);
        handle.setAttribute("cy", wp.y);
        handle.setAttribute("r", "5.5");
        handle.setAttribute("fill", "#ffffff");
        handle.setAttribute("stroke", strokeColor);
        handle.setAttribute("stroke-width", "2.2");
        handle.setAttribute("class", "waypoint-handle");
        handle.setAttribute("style", "pointer-events: none;");

        const hTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
        hTitle.textContent = "Bend point (Waypoint)\n• Drag to bend wire\n• Double-click or Right-click to remove";
        wpGroup.appendChild(hTitle);
        wpGroup.appendChild(touchTarget);
        wpGroup.appendChild(handle);

        touchTarget.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          if (currentCanvasMode === 'delete') {
            c.waypoints.splice(wpIdx, 1);
            renderDfd();
            showToast("Removed bend point", "warning");
            return;
          }
          startDraggingWaypoint(e, c, wpIdx);
        });

        touchTarget.addEventListener('touchstart', (e) => {
          e.stopPropagation();
          if (e.cancelable) e.preventDefault();
          if (currentCanvasMode === 'delete') {
            c.waypoints.splice(wpIdx, 1);
            renderDfd();
            auditDfdDiagram();
            saveDfdStateToHistory("Remove Bend Point");
            showToast("Removed bend point", "warning");
            return;
          }
          startDraggingWaypointTouch(e, c, wpIdx);
        }, { passive: false });

        touchTarget.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          c.waypoints.splice(wpIdx, 1);
          renderDfd();
          auditDfdDiagram();
          saveDfdStateToHistory("Remove Bend Point");
          showToast("Removed bend point", "warning");
        });

        touchTarget.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          c.waypoints.splice(wpIdx, 1);
          renderDfd();
          auditDfdDiagram();
          saveDfdStateToHistory("Remove Bend Point");
          showToast("Removed bend point", "warning");
        });

        flowGroup.appendChild(wpGroup);
      });

      // 3b. Interactive Arrowhead Drag Handle (Anchor on Node Perimeter)
      if (c.from !== c.to) {
        const arrHandleGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        arrHandleGroup.setAttribute("class", "arrowhead-handle-group");

        const arrTouchTarget = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        arrTouchTarget.setAttribute("cx", endPt.x);
        arrTouchTarget.setAttribute("cy", endPt.y);
        arrTouchTarget.setAttribute("r", "18");
        arrTouchTarget.setAttribute("fill", "transparent");
        arrTouchTarget.setAttribute("style", "cursor: grab; touch-action: none;");

        const arrVisibleHandle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        arrVisibleHandle.setAttribute("cx", endPt.x);
        arrVisibleHandle.setAttribute("cy", endPt.y);
        arrVisibleHandle.setAttribute("r", "5.5");
        arrVisibleHandle.setAttribute("fill", "#ffffff");
        arrVisibleHandle.setAttribute("stroke", strokeColor);
        arrVisibleHandle.setAttribute("stroke-width", "2.2");
        arrVisibleHandle.setAttribute("class", "arrowhead-handle");
        arrVisibleHandle.setAttribute("style", "pointer-events: none;");

        const arrTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
        arrTitle.textContent = "Arrowhead Anchor\n• Drag along border to reposition where arrow enters\n• Double-click to reset to auto";
        arrHandleGroup.appendChild(arrTitle);
        arrHandleGroup.appendChild(arrTouchTarget);
        arrHandleGroup.appendChild(arrVisibleHandle);

        arrTouchTarget.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          startDraggingArrowEndpoint(e, c, 'target');
        });

        arrTouchTarget.addEventListener('touchstart', (e) => {
          e.stopPropagation();
          startDraggingArrowEndpointTouch(e, c, 'target');
        }, { passive: false });

        arrTouchTarget.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          c.targetAnchor = null;
          renderDfd();
          showToast("Reset arrowhead to auto position", "info");
        });

        arrTouchTarget.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          c.targetAnchor = null;
          renderDfd();
          showToast("Reset arrowhead to auto position", "info");
        });

        flowGroup.appendChild(arrHandleGroup);
      }

      // 4. Label placed at midpoint along full polyline path (Draggable anywhere)
      const mid = getPolylineMidpoint(allPoints);
      const labelText = c.label || "Data_Flow";
      const pillWidth = Math.max(70, labelText.length * 7 + 24);
      const labelX = mid.x + (c.labelOffset ? c.labelOffset.x : 0);
      const labelY = mid.y + (c.labelOffset ? c.labelOffset.y : 0);

      // Leader line if label is moved away from wire center
      if (c.labelOffset && (Math.abs(c.labelOffset.x) > 10 || Math.abs(c.labelOffset.y) > 10)) {
        const leaderLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        leaderLine.setAttribute("x1", mid.x);
        leaderLine.setAttribute("y1", mid.y);
        leaderLine.setAttribute("x2", labelX);
        leaderLine.setAttribute("y2", labelY);
        leaderLine.setAttribute("stroke", "#94a3b8");
        leaderLine.setAttribute("stroke-width", "1.2");
        leaderLine.setAttribute("stroke-dasharray", "3,3");
        leaderLine.setAttribute("opacity", "0.7");
        leaderLine.setAttribute("style", "pointer-events: none;");
        flowGroup.appendChild(leaderLine);
      }

      const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      labelGroup.setAttribute("class", "data-flow-label-group");
      labelGroup.setAttribute("style", "cursor: grab; touch-action: none;");

      const pillRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      pillRect.setAttribute("x", labelX - pillWidth / 2);
      pillRect.setAttribute("y", labelY - 10);
      pillRect.setAttribute("width", pillWidth);
      pillRect.setAttribute("height", "20");
      pillRect.setAttribute("rx", "10");
      pillRect.setAttribute("fill", "#ffffff");
      pillRect.setAttribute("stroke", strokeColor);
      pillRect.setAttribute("stroke-width", "1.5");
      pillRect.setAttribute("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.1))");
      labelGroup.appendChild(pillRect);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", labelX);
      text.setAttribute("y", labelY + 3.5);
      text.setAttribute("fill", isError ? "#991b1b" : "#1e40af");
      text.setAttribute("font-size", "9");
      text.setAttribute("font-weight", "800");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("style", "pointer-events: none;");
      text.textContent = `${labelText} \u2192`;
      labelGroup.appendChild(text);

      const lblTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
      lblTitle.textContent = `Flow: ${c.label}\n• Drag label to reposition anywhere\n• Click to inspect • Double-click to edit`;
      labelGroup.appendChild(lblTitle);

      labelGroup.addEventListener('mousedown', (e) => {
        startDraggingLabel(e, c);
      });

      labelGroup.addEventListener('touchstart', (e) => {
        startDraggingLabelTouch(e, c);
      }, { passive: false });

      labelGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        if (justFinishedDragging) return;
        if (currentCanvasMode === 'delete') {
          deleteDfdConnection(c);
        } else if (currentCanvasMode === 'edit') {
          openEditFlowModal(c);
        }
      });

      labelGroup.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openEditFlowModal(c);
      });

      flowGroup.appendChild(labelGroup);

      // 5. Output badge on first segment
      const outPt0 = allPoints[0];
      const outPt1 = allPoints[1];
      const outDist = Math.hypot(outPt1.x - outPt0.x, outPt1.y - outPt0.y);
      const tOut = outDist > 0 ? Math.min(22, outDist * 0.25) / outDist : 0;
      const outX = outPt0.x + (outPt1.x - outPt0.x) * tOut;
      const outY = outPt0.y + (outPt1.y - outPt0.y) * tOut;

      const outBadge = document.createElementNS("http://www.w3.org/2000/svg", "text");
      outBadge.setAttribute("x", outX);
      outBadge.setAttribute("y", outY - 5);
      outBadge.setAttribute("fill", "#64748b");
      outBadge.setAttribute("font-size", "7.5");
      outBadge.setAttribute("font-weight", "bold");
      outBadge.setAttribute("text-anchor", "middle");
      outBadge.textContent = "OUT";
      flowGroup.appendChild(outBadge);

      // 6. Input badge on last segment
      const inPtPrev = allPoints[allPoints.length - 2];
      const inPtEnd = allPoints[allPoints.length - 1];
      const inDist = Math.hypot(inPtPrev.x - inPtEnd.x, inPtPrev.y - inPtEnd.y);
      const tIn = inDist > 0 ? Math.min(22, inDist * 0.25) / inDist : 0;
      const inX = inPtEnd.x + (inPtPrev.x - inPtEnd.x) * tIn;
      const inY = inPtEnd.y + (inPtPrev.y - inPtEnd.y) * tIn;

      const inBadge = document.createElementNS("http://www.w3.org/2000/svg", "text");
      inBadge.setAttribute("x", inX);
      inBadge.setAttribute("y", inY - 5);
      inBadge.setAttribute("fill", strokeColor);
      inBadge.setAttribute("font-size", "7.5");
      inBadge.setAttribute("font-weight", "bold");
      inBadge.setAttribute("text-anchor", "middle");
      inBadge.textContent = "IN";
      flowGroup.appendChild(inBadge);
    }

    // Hover tooltip for data flow (shows name, endpoints, and optional description)
    const flowTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
    flowTitle.textContent = `Flow: ${c.label} (${fromNode.name} -> ${toNode.name})${c.desc ? '\nDescription: ' + c.desc : ''}\n• Click wire to add bend points (Arduino style)\n• Drag points to bend arrow\n• Double-click point to remove`;
    flowGroup.appendChild(flowTitle);

    connGroup.appendChild(flowGroup);
  });

  // Render Nodes
  dfdNodes.forEach(node => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "dfd-node" + (selectedNodeForConnection === node.id ? " selected" : ""));
    g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
    g.setAttribute("data-id", node.id);

    // Native hover tooltip for node (type, name, description)
    const nodeTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
    nodeTitle.textContent = `${node.type.toUpperCase()}: ${node.name}${node.desc ? '\nDescription: ' + node.desc : ''}\n(Click in Edit mode or double-click to rename/edit)`;
    g.appendChild(nodeTitle);

    const dims = getNodeDims(node);

    if (node.type === 'process') {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", dims.w);
      rect.setAttribute("height", dims.h);
      rect.setAttribute("rx", "8");
      rect.setAttribute("fill", "#ffffff");
      rect.setAttribute("stroke", "#1e293b");
      rect.setAttribute("stroke-width", "1.8");

      const bar = document.createElementNS("http://www.w3.org/2000/svg", "line");
      bar.setAttribute("x1", "0");
      bar.setAttribute("y1", "16");
      bar.setAttribute("x2", dims.w);
      bar.setAttribute("y2", "16");
      bar.setAttribute("stroke", "#1e293b");
      bar.setAttribute("stroke-width", "1.2");

      let procId = "PROCESS";
      let procLabel = node.name;
      const pMatch = node.name.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      if (pMatch) {
        procId = "PROCESS " + pMatch[1];
        procLabel = pMatch[2] || node.name;
      }

      const textId = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textId.setAttribute("x", dims.w / 2);
      textId.setAttribute("y", "12");
      textId.setAttribute("fill", "#64748b");
      textId.setAttribute("font-size", "9");
      textId.setAttribute("font-weight", "bold");
      textId.setAttribute("text-anchor", "middle");
      textId.textContent = procId;

      const textName = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textName.setAttribute("x", dims.w / 2);
      textName.setAttribute("y", "36");
      textName.setAttribute("fill", "#0f172a");
      textName.setAttribute("font-weight", "bold");
      textName.setAttribute("text-anchor", "middle");
      if (procLabel.length > 22) textName.setAttribute("font-size", "7.5");
      else if (procLabel.length > 16) textName.setAttribute("font-size", "8.5");
      else textName.setAttribute("font-size", "9");
      textName.textContent = procLabel;

      g.appendChild(rect);
      g.appendChild(bar);
      g.appendChild(textId);
      g.appendChild(textName);

    } else if (node.type === 'entity') {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", dims.w);
      rect.setAttribute("height", dims.h);
      rect.setAttribute("fill", "#f8fafc");
      rect.setAttribute("stroke", "#1e293b");
      rect.setAttribute("stroke-width", "1.8");

      const textName = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textName.setAttribute("x", dims.w / 2);
      textName.setAttribute("y", dims.h / 2 + 4);
      textName.setAttribute("fill", "#1e293b");
      textName.setAttribute("font-weight", "bold");
      textName.setAttribute("text-anchor", "middle");
      if (node.name.length > 20) textName.setAttribute("font-size", "7.5");
      else if (node.name.length > 14) textName.setAttribute("font-size", "8.5");
      else textName.setAttribute("font-size", "9.5");
      textName.textContent = node.name;

      g.appendChild(rect);
      g.appendChild(textName);

    } else if (node.type === 'store') {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", dims.w);
      rect.setAttribute("height", dims.h);
      rect.setAttribute("fill", "#ffffff");
      rect.setAttribute("stroke", "#1e293b");
      rect.setAttribute("stroke-width", "1.8");

      const bar = document.createElementNS("http://www.w3.org/2000/svg", "line");
      bar.setAttribute("x1", "30");
      bar.setAttribute("y1", "0");
      bar.setAttribute("x2", "30");
      bar.setAttribute("y2", dims.h);
      bar.setAttribute("stroke", "#1e293b");
      bar.setAttribute("stroke-width", "1.8");

      let storeId = "D";
      let storeLabel = node.name;
      const dMatch = node.name.match(/^(D\d+)\s*(.*)$/i);
      if (dMatch) {
        storeId = dMatch[1].toUpperCase();
        storeLabel = dMatch[2] || dMatch[1];
      }

      const textId = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textId.setAttribute("x", "15");
      textId.setAttribute("y", dims.h / 2 + 4);
      textId.setAttribute("fill", "#1e293b");
      textId.setAttribute("font-size", "9");
      textId.setAttribute("font-weight", "bold");
      textId.setAttribute("text-anchor", "middle");
      textId.textContent = storeId;

      const textName = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textName.setAttribute("x", (dims.w + 30) / 2);
      textName.setAttribute("y", dims.h / 2 + 4);
      textName.setAttribute("fill", "#0f172a");
      textName.setAttribute("font-weight", "bold");
      textName.setAttribute("text-anchor", "middle");
      if (storeLabel.length > 20) textName.setAttribute("font-size", "7.5");
      else if (storeLabel.length > 14) textName.setAttribute("font-size", "8.5");
      else textName.setAttribute("font-size", "9");
      textName.textContent = storeLabel;

      g.appendChild(rect);
      g.appendChild(bar);
      g.appendChild(textId);
      g.appendChild(textName);
    }

    g.addEventListener('mousedown', (e) => onNodeMouseDown(e, node));
    g.addEventListener('touchstart', (e) => onNodeTouchStart(e, node), { passive: false });
    g.addEventListener('click', (e) => onNodeClick(e, node));
    g.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openEditNodeModal(node);
    });

    nodeGroup.appendChild(g);
  });
}

/* ========================================================
   CANVAS ZOOM & PAN SYSTEM
   ======================================================== */
function updateCanvasViewBox() {
  const svg = document.getElementById('dfd-svg');
  if (!svg) return;
  const w = BASE_VIEW_WIDTH / canvasZoom;
  const h = BASE_VIEW_HEIGHT / canvasZoom;
  svg.setAttribute('viewBox', `${canvasPan.x} ${canvasPan.y} ${w} ${h}`);

  const display = document.getElementById('zoom-level-display');
  if (display) {
    display.textContent = `${Math.round(canvasZoom * 100)}%`;
  }
}

function zoomCanvas(delta, centerPoint) {
  const oldZoom = canvasZoom;
  let newZoom = Math.min(2.5, Math.max(0.35, canvasZoom + delta));
  newZoom = Math.round(newZoom * 100) / 100;
  if (newZoom === oldZoom) return;

  let cx, cy;
  if (centerPoint) {
    cx = centerPoint.x;
    cy = centerPoint.y;
  } else {
    cx = canvasPan.x + (BASE_VIEW_WIDTH / oldZoom) / 2;
    cy = canvasPan.y + (BASE_VIEW_HEIGHT / oldZoom) / 2;
  }

  const oldW = BASE_VIEW_WIDTH / oldZoom;
  const oldH = BASE_VIEW_HEIGHT / oldZoom;
  const ratioX = (cx - canvasPan.x) / oldW;
  const ratioY = (cy - canvasPan.y) / oldH;

  const newW = BASE_VIEW_WIDTH / newZoom;
  const newH = BASE_VIEW_HEIGHT / newZoom;

  canvasPan.x = Math.round(cx - ratioX * newW);
  canvasPan.y = Math.round(cy - ratioY * newH);
  canvasZoom = newZoom;

  updateCanvasViewBox();
}

function resetCanvasZoom() {
  canvasZoom = 1.0;
  canvasPan = { x: 0, y: 0 };
  updateCanvasViewBox();
  showToast("Canvas zoom reset to 100%", "info");
}

function fitCanvasToElements() {
  if (dfdNodes.length === 0) {
    resetCanvasZoom();
    return;
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  dfdNodes.forEach(n => {
    const dims = getNodeDims(n);
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + dims.w);
    maxY = Math.max(maxY, n.y + dims.h);
  });

  const pad = 60;
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;

  const diagW = Math.max(200, maxX - minX);
  const diagH = Math.max(150, maxY - minY);

  const scaleX = BASE_VIEW_WIDTH / diagW;
  const scaleY = BASE_VIEW_HEIGHT / diagH;
  let targetZoom = Math.min(scaleX, scaleY);
  targetZoom = Math.min(1.8, Math.max(0.35, Math.round(targetZoom * 100) / 100));

  canvasZoom = targetZoom;
  const viewW = BASE_VIEW_WIDTH / canvasZoom;
  const viewH = BASE_VIEW_HEIGHT / canvasZoom;

  canvasPan.x = Math.round((minX + maxX) / 2 - viewW / 2);
  canvasPan.y = Math.round((minY + maxY) / 2 - viewH / 2);

  updateCanvasViewBox();
  showToast(`Fitted diagram to view (${Math.round(canvasZoom * 100)}%)`, "info");
}

/* Background canvas panning (Mouse & Touch) */
function onCanvasMouseDown(e) {
  releaseAllDfdDrags();
  const isBackground = e.target.id === 'dfd-svg' ||
                       e.target.id === 'svg-connections' ||
                       e.target.id === 'svg-nodes' ||
                       e.target.tagName === 'svg';
  if (isBackground || e.button === 1) {
    isPanningCanvas = true;
    panStart = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: canvasPan.x,
      panY: canvasPan.y
    };
    const svg = document.getElementById('dfd-svg');
    if (svg) svg.style.cursor = 'grab';
    window.addEventListener('mousemove', onCanvasMouseMove);
    window.addEventListener('mouseup', onCanvasMouseUp);
  }
}

function onCanvasMouseMove(e) {
  if (!isPanningCanvas) return;
  if (e.buttons === 0) {
    onCanvasMouseUp();
    return;
  }
  const svg = document.getElementById('dfd-svg');
  if (!svg) return;
  const rect = svg.getBoundingClientRect();
  const scaleX = (BASE_VIEW_WIDTH / canvasZoom) / (rect.width || 1);
  const scaleY = (BASE_VIEW_HEIGHT / canvasZoom) / (rect.height || 1);

  const dx = (e.clientX - panStart.clientX) * scaleX;
  const dy = (e.clientY - panStart.clientY) * scaleY;

  canvasPan.x = Math.round(panStart.panX - dx);
  canvasPan.y = Math.round(panStart.panY - dy);
  updateCanvasViewBox();
}

function onCanvasMouseUp() {
  if (isPanningCanvas) {
    isPanningCanvas = false;
    const svg = document.getElementById('dfd-svg');
    if (svg) svg.style.cursor = '';
    window.removeEventListener('mousemove', onCanvasMouseMove);
    window.removeEventListener('mouseup', onCanvasMouseUp);
  }
}

let touchStartDist = 0;
let touchStartZoom = 1.0;
let touchCenter = { x: 0, y: 0 };

function onCanvasTouchStart(e) {
  if (e.touches.length === 2) {
    // Pinch-to-zoom
    e.preventDefault();
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    touchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    touchStartZoom = canvasZoom;
    const svg = document.getElementById('dfd-svg');
    touchCenter = getSvgCoords(svg, (t1.clientX + t2.clientX) / 2, (t1.clientY + t2.clientY) / 2);
    window.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
    window.addEventListener('touchend', onCanvasTouchEnd);
  } else if (e.touches.length === 1) {
    const isBackground = e.target.id === 'dfd-svg' ||
                         e.target.id === 'svg-connections' ||
                         e.target.id === 'svg-nodes' ||
                         e.target.tagName === 'svg';
    if (isBackground) {
      isPanningCanvas = true;
      panStart = {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY,
        panX: canvasPan.x,
        panY: canvasPan.y
      };
      window.addEventListener('touchmove', onCanvasTouchMove, { passive: false });
      window.addEventListener('touchend', onCanvasTouchEnd);
    }
  }
}

function onCanvasTouchMove(e) {
  if (e.touches.length === 2 && touchStartDist > 0) {
    e.preventDefault();
    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    const factor = dist / touchStartDist;
    let newZoom = Math.min(2.5, Math.max(0.35, touchStartZoom * factor));
    newZoom = Math.round(newZoom * 100) / 100;
    zoomCanvas(newZoom - canvasZoom, touchCenter);
  } else if (e.touches.length === 1 && isPanningCanvas) {
    if (e.cancelable) e.preventDefault();
    const svg = document.getElementById('dfd-svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = (BASE_VIEW_WIDTH / canvasZoom) / (rect.width || 1);
    const scaleY = (BASE_VIEW_HEIGHT / canvasZoom) / (rect.height || 1);

    const dx = (e.touches[0].clientX - panStart.clientX) * scaleX;
    const dy = (e.touches[0].clientY - panStart.clientY) * scaleY;

    canvasPan.x = Math.round(panStart.panX - dx);
    canvasPan.y = Math.round(panStart.panY - dy);
    updateCanvasViewBox();
  }
}

function onCanvasTouchEnd() {
  isPanningCanvas = false;
  touchStartDist = 0;
  window.removeEventListener('touchmove', onCanvasTouchMove);
  window.removeEventListener('touchend', onCanvasTouchEnd);
}

function initCanvasZoomAndPan() {
  const svg = document.getElementById('dfd-svg');
  if (!svg) return;

  // Mouse wheel zoom centered on cursor
  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const pt = getSvgCoords(svg, e.clientX, e.clientY);
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    zoomCanvas(delta, pt);
  }, { passive: false });

  svg.addEventListener('mousedown', onCanvasMouseDown);
  svg.addEventListener('touchstart', onCanvasTouchStart, { passive: false });

  updateCanvasViewBox();
}

// Auto-initialize zoom & pan listeners when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCanvasZoomAndPan);
} else {
  initCanvasZoomAndPan();
}

/* ========================================================
   MOUSE & TOUCH DRAG EVENTS (With Matrix-Accurate Coordinates)
   ======================================================== */
function getSvgCoords(svg, clientX, clientY) {
  if (svg && svg.getScreenCTM) {
    const ctm = svg.getScreenCTM();
    if (ctm) {
      const pt = svg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const transformed = pt.matrixTransform(ctm.inverse());
      return { x: transformed.x, y: transformed.y };
    }
  }
  const rect = svg ? svg.getBoundingClientRect() : { left: 0, top: 0 };
  const scaleX = (BASE_VIEW_WIDTH / canvasZoom) / (rect.width || 1);
  const scaleY = (BASE_VIEW_HEIGHT / canvasZoom) / (rect.height || 1);
  return {
    x: canvasPan.x + (clientX - rect.left) * scaleX,
    y: canvasPan.y + (clientY - rect.top) * scaleY
  };
}

let dragRenderPending = false;
function requestDragRender() {
  if (!dragRenderPending) {
    dragRenderPending = true;
    requestAnimationFrame(() => {
      dragRenderPending = false;
      renderDfd();
    });
  }
}

function releaseAllDfdDrags() {
  if (draggedNode) onNodeMouseUp();
  if (draggedWaypoint) onWaypointMouseUp();
  if (draggedArrowEndpoint) endDraggingArrowEndpoint();
  if (draggedLabel) endLabelDrag();
  if (isPanningCanvas) onCanvasMouseUp();
}

// Global safety net (capture-phase: clicking empty space kills any active drag before it can teleport)
window.addEventListener('mousedown', (e) => {
  if (draggedNode && !e.target.closest('.dfd-node')) {
    releaseAllDfdDrags();
  }
}, true);

window.addEventListener('blur', releaseAllDfdDrags);
window.addEventListener('mouseup', releaseAllDfdDrags);
document.addEventListener('mouseleave', releaseAllDfdDrags);

function onNodeMouseDown(e, node) {
  if (currentCanvasMode !== 'move' || e.button !== 0) return;
  releaseAllDfdDrags();
  e.preventDefault();
  e.stopPropagation();
  draggedNode = node;
  nodeDragStartPos = { x: node.x, y: node.y };
  const svg = document.getElementById('dfd-svg');
  const svgPt = getSvgCoords(svg, e.clientX, e.clientY);
  dragOffset.x = svgPt.x - node.x;
  dragOffset.y = svgPt.y - node.y;

  window.addEventListener('mousemove', onNodeMouseMove);
  window.addEventListener('mouseup', onNodeMouseUp);
}

function onNodeMouseMove(e) {
  if (!draggedNode) return;
  if (e.buttons === 0) {
    onNodeMouseUp();
    return;
  }
  const svg = document.getElementById('dfd-svg');
  const svgPt = getSvgCoords(svg, e.clientX, e.clientY);
  draggedNode.x = Math.max(-2000, Math.min(4000, Math.round(svgPt.x - dragOffset.x)));
  draggedNode.y = Math.max(-2000, Math.min(4000, Math.round(svgPt.y - dragOffset.y)));
  requestDragRender();
}

function onNodeMouseUp() {
  const node = draggedNode;
  const startPos = nodeDragStartPos;
  draggedNode = null;
  nodeDragStartPos = null;
  window.removeEventListener('mousemove', onNodeMouseMove);
  window.removeEventListener('mouseup', onNodeMouseUp);

  if (node && startPos) {
    if (Math.hypot(node.x - startPos.x, node.y - startPos.y) > 3) {
      saveDfdStateToHistory(`Move ${node.name}`);
      auditDfdDiagram();
    }
  }
  renderDfd();
}

function onNodeTouchStart(e, node) {
  if (e.touches.length > 1) return;
  if (currentCanvasMode === 'move') {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    draggedNode = node;
    nodeDragStartPos = { x: node.x, y: node.y };
    const touch = e.touches[0];
    const svg = document.getElementById('dfd-svg');
    const svgPt = getSvgCoords(svg, touch.clientX, touch.clientY);
    dragOffset.x = svgPt.x - node.x;
    dragOffset.y = svgPt.y - node.y;

    window.addEventListener('touchmove', onNodeTouchMove, { passive: false });
    window.addEventListener('touchend', onNodeTouchEnd);
    window.addEventListener('touchcancel', onNodeTouchEnd);
  }
}

function onNodeTouchMove(e) {
  if (!draggedNode) return;
  if (e.cancelable) e.preventDefault();
  const touch = e.touches[0];
  const svg = document.getElementById('dfd-svg');
  const svgPt = getSvgCoords(svg, touch.clientX, touch.clientY);
  draggedNode.x = Math.max(-2000, Math.min(4000, Math.round(svgPt.x - dragOffset.x)));
  draggedNode.y = Math.max(-2000, Math.min(4000, Math.round(svgPt.y - dragOffset.y)));
  renderDfd();
}

function onNodeTouchEnd() {
  const node = draggedNode;
  const startPos = nodeDragStartPos;
  draggedNode = null;
  nodeDragStartPos = null;
  window.removeEventListener('touchmove', onNodeTouchMove);
  window.removeEventListener('touchend', onNodeTouchEnd);
  window.removeEventListener('touchcancel', onNodeTouchEnd);

  if (node && startPos) {
    if (Math.hypot(node.x - startPos.x, node.y - startPos.y) > 3) {
      saveDfdStateToHistory(`Move ${node.name}`);
      auditDfdDiagram();
    }
  }
}

function onNodeClick(e, node) {
  e.stopPropagation();

  if (currentCanvasMode === 'delete') {
    const deletedName = node.name;
    dfdNodes = dfdNodes.filter(n => n.id !== node.id);
    dfdConnections = dfdConnections.filter(c => c.from !== node.id && c.to !== node.id);
    renderDfd();
    auditDfdDiagram();
    saveDfdStateToHistory(`Delete ${deletedName}`);
    showToast(`Deleted ${deletedName}`, "warning");
    return;
  }

  if (currentCanvasMode === 'edit') {
    openEditNodeModal(node);
    return;
  }

  if (currentCanvasMode === 'connect') {
    if (!selectedNodeForConnection) {
      selectedNodeForConnection = node.id;
      document.getElementById('canvas-status').innerText = `SOURCE selected: [${node.name}] (Output). Now click TARGET element (Input)...`;
      renderDfd();
    } else {
      const fromNode = dfdNodes.find(n => n.id === selectedNodeForConnection);
      const toNode = node;

      if (fromNode.id === toNode.id) {
        // Recursive loop attempt
        dfdConnections.push({
          id: "conn_" + Date.now(),
          from: fromNode.id,
          to: toNode.id,
          label: "RecursiveLoop",
          desc: "Iterative recursive feedback loop"
        });
        selectedNodeForConnection = null;
        document.getElementById('canvas-status').innerText = "Data flow created. Auditing architecture...";
        renderDfd();
        auditDfdDiagram();
        saveDfdStateToHistory("Add Recursive Loop");
        showToast("Created recursive loop flow (Mortal Sin #9)", "danger");
      } else {
        // Open Custom In-App Modal
        openDataFlowModal(fromNode, toNode, (flowName, flowDesc) => {
          dfdConnections.push({
            id: "conn_" + Date.now(),
            from: fromNode.id,
            to: toNode.id,
            label: flowName || "Data_Flow",
            desc: flowDesc || ""
          });
          selectedNodeForConnection = null;
          document.getElementById('canvas-status').innerText = `Connected: ${fromNode.name} -> ${toNode.name}`;
          renderDfd();
          auditDfdDiagram();
          saveDfdStateToHistory(`Add Flow [${flowName || 'Data_Flow'}]`);
          showToast(`Data Flow Created: [${flowName}]`, "success");
        });
      }
    }
  } else if (currentCanvasMode === 'move') {
    // In move mode, clicking elements does not show popup toasts
  }
}

/* ========================================================
   CUSTOM MODAL & TOAST MANAGERS (Zero browser popups)
   ======================================================== */
function openEditNodeModal(node) {
  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const nameLabel = document.getElementById('modal-name-label');
  const input = document.getElementById('modal-input');
  const chipsHeader = document.getElementById('modal-chips-header');
  const chipsBox = document.getElementById('modal-chips');
  const descLabel = document.getElementById('modal-desc-field-label');
  const descInput = document.getElementById('modal-desc-input');
  const helpText = document.getElementById('modal-desc');
  const confirmBtn = document.getElementById('modal-confirm-btn');

  let typeLabel = "Element";
  let promptText = "";
  let suggestions = [];

  if (node.type === 'process') {
    typeLabel = "Process";
    promptText = "<strong>Process Rule:</strong> Must use an <strong>active verb phrase</strong> (e.g. <em>1.0 PROCESS ITEM PURCHASE</em>, <em>2.0 UPDATE INVENTORY</em>). Inputs are transformed into outputs.";
    suggestions = [
      "1.0 PROCESS ITEM PURCHASE",
      "2.0 UPDATE & RECONCILE",
      "3.0 VERIFY ENROLMENT",
      "4.0 CALCULATE SALES TAX",
      "5.0 AUTHENTICATE USER",
      "6.0 GENERATE REPORT",
      "7.0 RECORD PAYMENT"
    ];
    if (descLabel) descLabel.innerText = "Process Specification / Logic Description (Optional):";
  } else if (node.type === 'entity') {
    typeLabel = "External Entity";
    promptText = "<strong>External Entity Rule:</strong> Stakeholders or external systems outside the system boundary (e.g. <em>CUSTOMER</em>, <em>CASHIER</em>). Must be <strong>singular noun phrase</strong>.";
    suggestions = [
      "CUSTOMER",
      "CASHIER",
      "STUDENT",
      "STORE MANAGER",
      "BANK HOST",
      "SUPPLIER",
      "ADMINISTRATOR",
      "ACCOUNTING DEPT"
    ];
    if (descLabel) descLabel.innerText = "Role / External System Description (Optional):";
  } else if (node.type === 'store') {
    typeLabel = "Data Store";
    promptText = "<strong>Data Store Rule:</strong> Passive repositories of persistent data at rest (e.g. <em>D1 INVENTORY</em>). Format: <strong>D[#] + Plural Noun</strong>. Cannot connect directly to entities or other stores.";
    suggestions = [
      "D1 INVENTORY",
      "D2 SALES ARCHIVE",
      "D3 CUSTOMER DATABASE",
      "D4 ENROLMENT RECORDS",
      "D5 AUDIT LOGS",
      "D6 TRANSACTION JOURNAL"
    ];
    if (descLabel) descLabel.innerText = "Data Stored / Schema Description (Optional):";
  }

  title.innerHTML = `<svg class="ui-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> <span>Edit ${typeLabel}: ${node.name}</span>`;
  if (nameLabel) nameLabel.innerText = `${typeLabel} Name / Identifier:`;
  input.value = node.name;
  if (descInput) descInput.value = node.desc || "";
  helpText.innerHTML = promptText;
  if (chipsHeader) chipsHeader.innerText = `Quick Suggestions for ${typeLabel}:`;

  chipsBox.innerHTML = "";
  suggestions.forEach(s => {
    const btn = document.createElement('button');
    btn.className = "chip-btn";
    btn.type = "button";
    btn.textContent = s;
    btn.onclick = () => {
      input.value = s;
      input.focus();
    };
    chipsBox.appendChild(btn);
  });

  confirmBtn.textContent = "Save Changes";

  const onConfirm = () => {
    const newName = input.value.trim() || node.name;
    const newDesc = descInput ? descInput.value.trim() : "";
    const oldName = node.name;
    node.name = newName;
    node.desc = newDesc;
    closeAppModal();
    renderDfd();
    auditDfdDiagram();
    saveDfdStateToHistory(`Edit ${typeLabel}: ${newName}`);
    showToast(`Updated ${typeLabel}: "${oldName}" -> "${newName}"`, 'success');
  };

  confirmBtn.onclick = onConfirm;

  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    } else if (e.key === 'Escape') {
      closeAppModal();
    }
  };

  if (descInput) {
    descInput.onkeydown = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onConfirm();
      } else if (e.key === 'Escape') {
        closeAppModal();
      }
    };
  }

  modal.classList.add('active');
  setTimeout(() => {
    input.focus();
    input.select();
  }, 50);
}

function openEditFlowModal(c) {
  currentEditingFlow = c;
  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const nameLabel = document.getElementById('modal-name-label');
  const input = document.getElementById('modal-input');
  const chipsHeader = document.getElementById('modal-chips-header');
  const chipsBox = document.getElementById('modal-chips');
  const descLabel = document.getElementById('modal-desc-field-label');
  const descInput = document.getElementById('modal-desc-input');
  const helpText = document.getElementById('modal-desc');
  const confirmBtn = document.getElementById('modal-confirm-btn');
  const extraBox = document.getElementById('modal-extra-actions');

  const fromNode = dfdNodes.find(n => n.id === c.from);
  const toNode = dfdNodes.find(n => n.id === c.to);
  const fromName = fromNode ? fromNode.name : "Source";
  const toName = toNode ? toNode.name : "Target";

  title.innerHTML = `<svg class="ui-icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> <span>Edit Data Flow: ${c.label}</span>`;
  if (nameLabel) nameLabel.innerText = "Data Flow Label (Noun Phrase):";
  input.value = c.label;
  if (descInput) descInput.value = c.desc || "";
  if (descLabel) descLabel.innerText = "Data Payload Description / Fields (Optional):";

  helpText.innerHTML = `<strong>Data Flow Rule:</strong> Flow represents data in motion from <strong>[${fromName}]</strong> (Output) -> <strong>[${toName}]</strong> (Input). Must be a <strong>noun phrase</strong> describing the data packet.`;
  if (chipsHeader) chipsHeader.innerText = "Quick Suggestions for Data Flow:";

  if (extraBox) {
    extraBox.style.display = 'block';
    let btnsHtml = `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <button type="button" class="btn btn-outline" style="width: 100%; font-size: 0.76rem;" onclick="addBendPointToCurrentFlow()">
          <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24"><path d="M4 4v7a4 4 0 0 0 4 4h8"/><polyline points="13 11 17 15 13 19"/><circle cx="11" cy="15" r="2.5" fill="currentColor"/></svg>
          Add Bend Point (at Center)
        </button>
    `;

    if (c.waypoints && c.waypoints.length > 0) {
      btnsHtml += `
        <button type="button" class="btn btn-outline" style="width: 100%; font-size: 0.76rem;" onclick="straightenCurrentFlow()">
          <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          Straighten Arrow (Remove All ${c.waypoints.length} Bend Point${c.waypoints.length > 1 ? 's' : ''})
        </button>
      `;
    }

    if (c.labelOffset && (c.labelOffset.x !== 0 || c.labelOffset.y !== 0)) {
      btnsHtml += `
        <button type="button" class="btn btn-outline" style="width: 100%; font-size: 0.76rem;" onclick="resetCurrentFlowLabel()">
          <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Reset Label Position to Center
        </button>
      `;
    }

    if (c.targetAnchor || c.sourceAnchor) {
      btnsHtml += `
        <button type="button" class="btn btn-outline" style="width: 100%; font-size: 0.76rem;" onclick="resetCurrentFlowAnchors()">
          <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          Reset Arrowhead to Auto Position
        </button>
      `;
    }

    btnsHtml += `</div>`;
    extraBox.innerHTML = btnsHtml;
  }

  const suggestions = [
    "Item_Barcode",
    "Price_And_Details",
    "Computed_Receipt",
    "Recorded_Sale",
    "Sales_Audit_Data",
    "Inventory_Adjustment",
    "Daily_Revenue_Report",
    "Payment_Slip",
    "Student_Credentials",
    "Enrolment_Status",
    "Transaction_Summary"
  ];

  chipsBox.innerHTML = "";
  suggestions.forEach(s => {
    const btn = document.createElement('button');
    btn.className = "chip-btn";
    btn.type = "button";
    btn.textContent = s;
    btn.onclick = () => {
      input.value = s;
      input.focus();
    };
    chipsBox.appendChild(btn);
  });

  confirmBtn.textContent = "Save Changes";

  const onConfirm = () => {
    const newLabel = input.value.trim() || c.label;
    const newDesc = descInput ? descInput.value.trim() : "";
    const oldLabel = c.label;
    c.label = newLabel;
    c.desc = newDesc;
    closeAppModal();
    renderDfd();
    auditDfdDiagram();
    saveDfdStateToHistory(`Edit Flow [${newLabel}]`);
    showToast(`Updated Data Flow: "${oldLabel}" -> "${newLabel}"`, 'success');
  };

  confirmBtn.onclick = onConfirm;

  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    } else if (e.key === 'Escape') {
      closeAppModal();
    }
  };

  if (descInput) {
    descInput.onkeydown = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onConfirm();
      } else if (e.key === 'Escape') {
        closeAppModal();
      }
    };
  }

  modal.classList.add('active');
  setTimeout(() => {
    input.focus();
    input.select();
  }, 50);
}

function openDataFlowModal(fromNode, toNode, callback) {
  activeModalCallback = callback;
  const modal = document.getElementById('app-modal');
  const title = document.getElementById('modal-title');
  const nameLabel = document.getElementById('modal-name-label');
  const input = document.getElementById('modal-input');
  const chipsHeader = document.getElementById('modal-chips-header');
  const chipsBox = document.getElementById('modal-chips');
  const descLabel = document.getElementById('modal-desc-field-label');
  const descInput = document.getElementById('modal-desc-input');
  const helpText = document.getElementById('modal-desc');
  const confirmBtn = document.getElementById('modal-confirm-btn');

  title.innerHTML = `<svg class="ui-icon" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> <span>Create Data Flow</span>`;
  if (nameLabel) nameLabel.innerText = "Data Flow Label (Noun Phrase):";
  input.value = "Data_Flow";
  if (descInput) descInput.value = "";
  if (descLabel) descLabel.innerText = "Data Payload Description (Optional):";
  helpText.innerHTML = `Enter the noun phrase representing data leaving <strong>[${fromNode.name}]</strong> as Output and arriving at <strong>[${toNode.name}]</strong> as Input:`;
  if (chipsHeader) chipsHeader.innerText = "Quick Suggestions (Standard Nouns):";

  // Contextual chip suggestions
  const suggestions = [
    "Item_Barcode",
    "Price_And_Details",
    "Computed_Receipt",
    "Recorded_Sale",
    "Sales_Audit_Data",
    "Payment_Slip",
    "Enrolment_Data",
    "Daily_Report"
  ];
  chipsBox.innerHTML = "";
  suggestions.forEach(s => {
    const btn = document.createElement('button');
    btn.className = "chip-btn";
    btn.type = "button";
    btn.textContent = s;
    btn.onclick = () => { input.value = s; input.focus(); };
    chipsBox.appendChild(btn);
  });

  confirmBtn.textContent = "Confirm Flow";

  const onConfirm = () => {
    const flowName = input.value.trim() || "Data_Flow";
    const flowDesc = descInput ? descInput.value.trim() : "";
    const cb = activeModalCallback;
    closeAppModal();
    if (cb) cb(flowName, flowDesc);
  };

  confirmBtn.onclick = onConfirm;

  input.onkeydown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onConfirm();
    } else if (e.key === 'Escape') {
      closeAppModal();
    }
  };

  if (descInput) {
    descInput.onkeydown = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onConfirm();
      } else if (e.key === 'Escape') {
        closeAppModal();
      }
    };
  }

  modal.classList.add('active');
  setTimeout(() => {
    input.focus();
    input.select();
  }, 50);
}

function closeAppModal() {
  const modal = document.getElementById('app-modal');
  if (modal) modal.classList.remove('active');
  selectedNodeForConnection = null;
  activeModalCallback = null;
  currentEditingFlow = null;
  const extraBox = document.getElementById('modal-extra-actions');
  if (extraBox) {
    extraBox.style.display = 'none';
    extraBox.innerHTML = '';
  }
  const input = document.getElementById('modal-input');
  if (input) input.onkeydown = null;
  const descInput = document.getElementById('modal-desc-input');
  if (descInput) descInput.onkeydown = null;
  const confirmBtn = document.getElementById('modal-confirm-btn');
  if (confirmBtn) confirmBtn.onclick = null;
  renderDfd();
}

function showToast(message, type = "info") {
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Prevent toast buildup / stacking across the screen
  while (container.children.length >= 2) {
    container.removeChild(container.firstChild);
  }

  const iconSvg = {
    success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#22c55e"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>`,
    danger: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#ef4444"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#f59e0b"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#38bdf8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  }[type] || `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#38bdf8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${iconSvg} <span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
  }, 3500);
}

/* ========================================================
   DFD ARCHITECTURE LINTER
   ======================================================== */
function auditDfdDiagram() {
  const sinList = document.getElementById('sin-flag-list');
  if (!sinList) return;
  sinList.innerHTML = "";
  let sinsFound = [];

  // Check Sin 1: Store to Store
  dfdConnections.forEach(c => {
    const from = dfdNodes.find(n => n.id === c.from);
    const to = dfdNodes.find(n => n.id === c.to);
    if (from && to && from.type === 'store' && to.type === 'store') {
      sinsFound.push({
        title: "Mortal Sin #1: Store-to-Store Connection",
        desc: `Data store [${from.name}] cannot move data directly to store [${to.name}]. Passive storage requires an intermediary process.`
      });
    }
  });

  // Check Sin 2: Entity to Entity
  dfdConnections.forEach(c => {
    const from = dfdNodes.find(n => n.id === c.from);
    const to = dfdNodes.find(n => n.id === c.to);
    if (from && to && from.type === 'entity' && to.type === 'entity') {
      sinsFound.push({
        title: "Mortal Sin #2: Entity-to-Entity Connection",
        desc: `External Entity [${from.name}] cannot connect directly to [${to.name}]. Outside communication is outside the system boundary.`
      });
    }
  });

  // Check Sin 3: Entity to Data Store directly
  dfdConnections.forEach(c => {
    const from = dfdNodes.find(n => n.id === c.from);
    const to = dfdNodes.find(n => n.id === c.to);
    if (from && to && ((from.type === 'entity' && to.type === 'store') || (from.type === 'store' && to.type === 'entity'))) {
      sinsFound.push({
        title: "Mortal Sin #3: Direct Entity-Store Connection",
        desc: `[${from.name}] cannot directly access data store [${to.name}]. Violates encapsulation; must be mediated by a process.`
      });
    }
  });

  // Check Sin 9: Recursive Loop
  dfdConnections.forEach(c => {
    if (c.from === c.to) {
      const node = dfdNodes.find(n => n.id === c.from);
      sinsFound.push({
        title: "Mortal Sin #9: Recursive Flow Loop",
        desc: `Process [${node ? node.name : 'P'}] feeds directly into itself. DFDs do not model iterative programming loops.`
      });
    }
  });

  // Check Processes for Black Hole & Miracle
  dfdNodes.filter(n => n.type === 'process').forEach(proc => {
    const ins = dfdConnections.filter(c => c.to === proc.id);
    const outs = dfdConnections.filter(c => c.from === proc.id);

    if (ins.length === 0 && outs.length > 0) {
      sinsFound.push({
        title: "Mortal Sin #4: Miracle (Spontaneous Generation)",
        desc: `Process [${proc.name}] produces output without any input data. Violates conservation of data.`
      });
    }
    if (ins.length > 0 && outs.length === 0) {
      sinsFound.push({
        title: "Mortal Sin #5: Black Hole Phenomenon",
        desc: `Process [${proc.name}] consumes data but produces zero outputs. Data vanishes into a dead end.`
      });
    }
    if (ins.length === 0 && outs.length === 0) {
      sinsFound.push({
        title: "Isolated Process Element",
        desc: `Process [${proc.name}] has no connections.`
      });
    }

    const isContextProc = isContextDiagram || /\b(0\.0|0|p0)\b/i.test(proc.name) || proc.name.toLowerCase().includes("system");
    const verbRegex = /\b(compute|process|calculate|generate|update|record|verify|produce|validate|admit|check|evaluate|enroll|enrol|reconcile|restock|audit|manage)\b/i;
    if (!isContextProc && !verbRegex.test(proc.name)) {
      sinsFound.push({
        title: "Syntax Warning: Process Naming Convention",
        desc: `Process [${proc.name}] lacks an Action Verb-Object phrase (e.g. '1.0 Compute Sales').`
      });
    }
  });

  // Check Stores for Read-Only or Infinite Sink
  dfdNodes.filter(n => n.type === 'store').forEach(store => {
    const ins = dfdConnections.filter(c => c.to === store.id);
    const outs = dfdConnections.filter(c => c.from === store.id);

    if (ins.length === 0 && outs.length > 0) {
      sinsFound.push({
        title: "Mortal Sin #7: Dead / Read-Only Data Store",
        desc: `Data store [${store.name}] is queried but never written to. Data cannot exist without an input process.`
      });
    }
    if (ins.length > 0 && outs.length === 0) {
      sinsFound.push({
        title: "Mortal Sin #8: Infinite Sink Data Store",
        desc: `Data store [${store.name}] is populated but no process ever queries or retrieves its data.`
      });
    }

    // Check Data Store Naming Convention (D# + Plural Noun in ALL CAPS)
    const storeNameTrim = store.name.trim();
    if (!/^D\d+\s+[A-Z0-9_\s]+$/i.test(storeNameTrim)) {
      sinsFound.push({
        title: "Syntax Warning: Data Store Naming Convention",
        desc: `Data store [${store.name}] must follow the standard D[#] + PLURAL NOUN format (e.g. 'D1 SALES ARCHIVE', 'D2 PAYMENTS').`
      });
    }
  });

  // Check Drawing Rule: No Crossing of Data Flow Lines (Spaghetti Wiring)
  const checkedCrossingPairs = new Set();
  dfdConnections.forEach(c1 => {
    dfdConnections.forEach(c2 => {
      if (c1.id >= c2.id) return;
      const pairKey = `${c1.id}_${c2.id}`;
      if (checkedCrossingPairs.has(pairKey)) return;
      checkedCrossingPairs.add(pairKey);

      if (checkConnectionsCross(c1, c2)) {
        sinsFound.push({
          title: "Drawing Rule Violation: Crossing Data Flow Lines",
          desc: `Data flow [${c1.label}] crosses directly over [${c2.label}]. DFD layout principles forbid crossing lines (spaghetti wiring). Use bend points, adjust arrowheads, or reposition elements to route cleanly.`
        });
      }
    });
  });

  // Check Context Diagram Level Rule (No Data Stores in Context View)
  const scenarioVal = document.getElementById('scenario-selector')?.value;
  const isContextDiagram = scenarioVal === 'atm' || scenarioVal === 'leasing_context' || (dfdNodes.filter(n => n.type === 'process').length === 1 && dfdNodes.some(n => n.name.includes("0") || n.name.toLowerCase().includes("system")));
  if (isContextDiagram) {
    const storesInContext = dfdNodes.filter(n => n.type === 'store');
    if (storesInContext.length > 0) {
      sinsFound.push({
        title: "Context Diagram Rule Violation: Data Store in Context View",
        desc: `Data store [${storesInContext.map(s => s.name).join(", ")}] is strictly prohibited in a Context Diagram (Level 0 Overview). Context Diagrams show only Process 0 and external entities. Data stores only enter at Level 0 decomposition.`
      });
    }
  }

  // Check Sin 10: Double-Headed / Bidirectional Flow Anti-Pattern
  const checkedFlowPairs = new Set();
  dfdConnections.forEach(c1 => {
    dfdConnections.forEach(c2 => {
      if (c1.id >= c2.id) return;
      if (c1.from === c2.to && c1.to === c2.from) {
        const pairKey = [c1.from, c1.to].sort().join("<->");
        if (!checkedFlowPairs.has(pairKey)) {
          checkedFlowPairs.add(pairKey);
          if (c1.label.toLowerCase() === c2.label.toLowerCase() || c1.label === "Data_Flow" || c2.label === "Data_Flow") {
            const nodeA = dfdNodes.find(n => n.id === c1.from);
            const nodeB = dfdNodes.find(n => n.id === c1.to);
            sinsFound.push({
              title: "Mortal Sin #10: Bidirectional Flow Anti-Pattern",
              desc: `Bidirectional communication between [${nodeA ? nodeA.name : 'A'}] and [${nodeB ? nodeB.name : 'B'}] must have separate, unique unidirectional semantic labels (e.g. '1. Inquiry' and '2. Response'), not duplicate names.`
            });
          }
        }
      }
    });
  });

  // Check Process Quantity (Miller's 7 +- 2 Rule)
  const procCount = dfdNodes.filter(n => n.type === 'process').length;
  if (procCount > 7) {
    sinsFound.push({
      title: "Decomposition Rule: Process Clutter (> 7 Processes)",
      desc: `Diagram contains ${procCount} processes, exceeding Miller's 7 ± 2 Rule (3 to 7 processes recommended, never exceed 9). Decompose into child Level 1 diagrams to maintain readability.`
    });
  }

  // Check External Entity Naming (Must be Noun phrase, not starting with action verbs)
  dfdNodes.filter(n => n.type === 'entity').forEach(ent => {
    const verbStarts = /^(compute|process|calculate|generate|update|record|verify|produce|validate|admit|check|evaluate|enroll|enrol)\b/i;
    if (verbStarts.test(ent.name.trim())) {
      sinsFound.push({
        title: "Syntax Warning: External Entity Naming Convention",
        desc: `External Entity [${ent.name}] starts with an action verb. External entities represent people, systems, or organizations outside the boundary and must be noun phrases (e.g. 'CUSTOMER', 'BANK HOST').`
      });
    }
  });

  // Check Data Flow Naming (Every flow must be a specific noun phrase)
  dfdConnections.forEach(c => {
    if (!c.label || c.label.trim() === "" || c.label.trim() === "Data_Flow") {
      const fromNode = dfdNodes.find(n => n.id === c.from);
      const toNode = dfdNodes.find(n => n.id === c.to);
      sinsFound.push({
        title: "Syntax Warning: Generic / Unlabeled Data Flow",
        desc: `Flow from [${fromNode ? fromNode.name : 'Source'}] to [${toNode ? toNode.name : 'Target'}] is labeled '${c.label || 'empty'}'. Every DFD data flow must be a specific noun phrase naming the data packet.`
      });
    }
  });

  // Check Mortal Sin #6: Gray Hole Phenomenon (The H2O Principle)
  dfdNodes.filter(n => n.type === 'process').forEach(proc => {
    const ins = dfdConnections.filter(c => c.to === proc.id);
    const outs = dfdConnections.filter(c => c.from === proc.id);
    const isCalculation = /\b(compute|calculate|generate|reconcile)\b/i.test(proc.name);

    if (isCalculation && ins.length === 1 && outs.length >= 1) {
      const singleIn = ins[0];
      const source = dfdNodes.find(n => n.id === singleIn.from);
      if (source && source.type === 'entity') {
        sinsFound.push({
          title: "Mortal Sin #6: Gray Hole Phenomenon",
          desc: `Process [${proc.name}] produces computed outputs with only input from [${source.name}]. Generating calculated totals or receipts requires reference inputs (e.g. Price Database or Tax Table) - The H2O Principle.`
        });
      }
    }
  });

  // Render results
  const summaryBox = document.getElementById('audit-summary-box');
  const verdictTitle = document.getElementById('audit-verdict-title');
  const verdictDesc = document.getElementById('audit-verdict-desc');

  if (dfdNodes.length === 0) {
    summaryBox.className = "audit-summary-box clean";
    verdictTitle.innerText = "Empty Board";
    verdictDesc.innerText = "Add shapes or load a preset to run the linter.";
    return;
  }

  if (sinsFound.length === 0) {
    summaryBox.className = "audit-summary-box clean";
    verdictTitle.innerText = "Architecture Clean (100%)";
    verdictDesc.innerText = "Diagram satisfies conservation of data and complies with all syntax rules.";
    sinList.innerHTML = `
      <div class="sin-card ok">
        <h5 style="display: flex; align-items: center; gap: 6px;">
          <svg class="ui-icon ui-icon-sm" style="color: var(--success);" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
          All 10 Mortal Sins Avoided
        </h5>
        <p>No direct store-to-store, entity-to-store, miracles, black holes, or recursive loops found.</p>
      </div>
    `;
  } else {
    summaryBox.className = "audit-summary-box dirty";
    verdictTitle.innerText = `Found ${sinsFound.length} Rule Violation(s)`;
    verdictDesc.innerText = "The automated checking system will fail this diagram. Fix the red flags below:";

    sinsFound.forEach(sin => {
      const item = document.createElement('div');
      item.className = "sin-card";
      item.innerHTML = `
        <h5 style="display: flex; align-items: center; gap: 6px;">
          <svg class="ui-icon ui-icon-sm" style="color: var(--danger);" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          ${sin.title}
        </h5>
        <p>${sin.desc}</p>
      `;
      sinList.appendChild(item);
    });
  }
}

/* ========================================================
   DFD THINGS TO AVOID GUIDE & MODAL MANAGER
   ======================================================== */
const DFD_AVOID_RULES = [
  {
    id: "sin-1",
    cat: "sins",
    tag: "Mortal Sin #1",
    title: "Direct Store to Store Flow",
    desc: "Connecting a Data Store directly to another Data Store. Data stores are passive storage repositories with no autonomous engine; they cannot read, write, or replicate data to another store on their own.",
    fix: "Insert an intermediary Process: Store A -> [Process (Read & Transform)] -> Store B."
  },
  {
    id: "sin-2",
    cat: "sins",
    tag: "Mortal Sin #2",
    title: "External Entity to External Entity Flow",
    desc: "Drawing a data flow directly between two External Entities. If communication passes between external parties without entering or exiting our software system, it is outside the system scope and must never be modeled.",
    fix: "Delete the flow or route the data through an internal system Process if the system acts as a broker or processor."
  },
  {
    id: "sin-3",
    cat: "sins",
    tag: "Mortal Sin #3",
    title: "External Entity to Data Store Flow",
    desc: "An External Entity directly reading from or writing to a Data Store. Users, customers, and external machines are never granted direct, unmediated access to database tables without software authentication, validation, and authorization.",
    fix: "Connect the External Entity to an input validation Process, which then writes to or reads from the Data Store."
  },
  {
    id: "sin-4",
    cat: "sins",
    tag: "Mortal Sin #4",
    title: "Black Hole Process",
    desc: "A process that receives data flow inputs but produces ZERO outputs. Processes exist solely to transform data; any process that only absorbs data without producing reports, database updates, or entity signals represents an analytical dead end.",
    fix: "Add an outgoing data flow (to a Data Store, External Entity, or another Process) or remove the redundant process."
  },
  {
    id: "sin-5",
    cat: "sins",
    tag: "Mortal Sin #5",
    title: "Miracle Process",
    desc: "A process that generates output data flows without receiving ANY inputs. Data cannot materialize spontaneously out of thin air (violates the Law of Data Conservation).",
    fix: "Supply the process with required transactional inputs, user parameters, or reference database tables."
  },
  {
    id: "sin-6",
    cat: "sins",
    tag: "Mortal Sin #6",
    title: "Gray Hole Phenomenon (The H2O Principle)",
    desc: "A process where the inputs are factually insufficient to produce the outputs. For example, a process receives only 'Item_Barcode' from a customer and outputs a 'Tax_Invoice_With_Totals' without querying a Price Database or Tax Table.",
    fix: "Supply all required lookup inputs (e.g., Price Catalog, Tax Rates) needed by the process's internal logic."
  },
  {
    id: "sin-7",
    cat: "sins",
    tag: "Mortal Sin #7",
    title: "Read-Only / Unpopulated Data Store",
    desc: "A Data Store that is only queried (outputs) but never receives an incoming data flow to write or populate records. The database will permanently remain empty.",
    fix: "Add an upstream setup, migration, batch import, or transaction process that writes records into the store."
  },
  {
    id: "sin-8",
    cat: "sins",
    tag: "Mortal Sin #8",
    title: "Write-Only Data Store / Dead Sink",
    desc: "A Data Store where records are continually saved but never read or queried by any process, reporting engine, or audit flow.",
    fix: "Verify the business purpose of the store and connect reader processes (e.g. Audit, Reporting, Invoicing)."
  },
  {
    id: "sin-9",
    cat: "sins",
    tag: "Mortal Sin #9",
    title: "Recursive Feedback Loop / Self-Loop",
    desc: "Drawing an arrow from a process output directly back into the same process's input. DFDs model state-free data transformations, not programmatic execution cycles (like while/for loops).",
    fix: "Store intermediate results into a Data Store, which the process reads in subsequent transaction cycles."
  },
  {
    id: "sin-10",
    cat: "sins",
    tag: "Mortal Sin #10",
    title: "Double-Headed / Bidirectional Arrows",
    desc: "Drawing an arrow with heads at both ends (<->). DFD data flows must be strictly unidirectional packets of data moving in one direction at a time.",
    fix: "Split bidirectional communication into two distinct unidirectional arrows with unique semantic names (e.g., '1. Account_Inquiry' and '2. Account_Summary')."
  },
  {
    id: "draw-1",
    cat: "drawing",
    tag: "Drawing Rule",
    title: "Crossing Data Flow Lines (Spaghetti Wiring)",
    desc: "Allowing data flow arrows to cross directly over each other. Crossing lines cause visual ambiguity, making it hard to trace inputs and outputs.",
    fix: "Use bend points to route wires cleanly around blocks, or use duplicate symbols (draw duplicate external entities or stores marked with a diagonal slash or duplicate identifier)."
  },
  {
    id: "draw-2",
    cat: "drawing",
    tag: "Drawing Rule",
    title: "Process Clutter (> 7 to 9 Processes - Miller's Law)",
    desc: "Crowding more than 7 to 9 processes onto a single DFD canvas. Violates Miller's 7 ± 2 Cognitive Law and makes the diagram overwhelming and unreadable.",
    fix: "Decompose into hierarchical levels: consolidate child tasks into 3 to 7 parent processes on Level 0, and explode each into child Level 1 DFDs."
  },
  {
    id: "draw-3",
    cat: "drawing",
    tag: "Drawing Rule",
    title: "Routing Lines Through Symbols",
    desc: "Passing an arrow line straight through the middle of an unrelated process, entity, or store.",
    fix: "Add bend points or adjust anchor heads along the element perimeter to route around other shapes."
  },
  {
    id: "draw-4",
    cat: "drawing",
    tag: "Drawing Rule",
    title: "Unattached / Floating Flow Terminals",
    desc: "Drawing an arrow that hangs in empty space without both a definite source element and a target element.",
    fix: "Ensure all data flows start at an element's perimeter and terminate cleanly at another element's perimeter."
  },
  {
    id: "name-1",
    cat: "naming",
    tag: "Naming Syntax",
    title: "Action Verbs for External Entities",
    desc: "Naming an external entity with an action verb (e.g. 'Compute_Tax', 'Process_Order'). Entities are external people, systems, departments, or organizations.",
    fix: "Use strictly NOUN PHRASES in ALL CAPS (e.g. 'CUSTOMER', 'SUPPLIER', 'BANK_HOST', 'ACCOUNTING_DEPARTMENT')."
  },
  {
    id: "name-2",
    cat: "naming",
    tag: "Naming Syntax",
    title: "Noun-Only Names for Processes (Missing Verb)",
    desc: "Naming a process without an active verb (e.g. 'Student_Records' or 'Customer_Accounts'). Processes perform transformation work and must state what they do.",
    fix: "Start with an active verb phrase including reference number (e.g. '1.0 Verify Credentials', '2.0 Process Order')."
  },
  {
    id: "name-3",
    cat: "naming",
    tag: "Naming Syntax",
    title: "Generic or Blank Flow Labels ('Data', 'Info')",
    desc: "Leaving flows blank or giving them generic placeholders like 'Data_Flow', 'Info', 'Output', or 'Input'.",
    fix: "Every data flow must name the concrete packet, record, or form (e.g. 'Payment_Receipt', 'Item_Barcode', 'Verified_Profile')."
  },
  {
    id: "name-4",
    cat: "naming",
    tag: "Naming Syntax",
    title: "Non-Plural or Unnumbered Data Store Names",
    desc: "Naming a data store as a single item or without an identifier (e.g. 'Order' instead of 'D1 ORDERS'). Stores hold collections of multiple records.",
    fix: "Follow the convention: 'D[#] + PLURAL NOUN' in ALL CAPS (e.g. 'D1 CUSTOMERS', 'D2 SALES ARCHIVE', 'D3 PRODUCT INVENTORY')."
  },
  {
    id: "level-1",
    cat: "level",
    tag: "Level Rule",
    title: "Data Stores on a Context Diagram (Process 0)",
    desc: "Placing ANY Data Store symbol on a Context Diagram (Level 0 Overview). Absolute cardinal rule: Context Diagrams show ONLY Process 0 and External Entities at the boundary.",
    fix: "Remove all Data Stores from the Context view. Data stores represent internal storage and must only appear at Level 0 decomposition and below."
  }
];

let activeAvoidCategory = 'all';

function openAvoidRulesModal() {
  const modal = document.getElementById('avoid-rules-modal');
  if (!modal) return;
  activeAvoidCategory = 'all';
  const searchInput = document.getElementById('avoid-search-input');
  if (searchInput) searchInput.value = '';
  
  // Reset tab buttons
  document.querySelectorAll('.avoid-tab-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx === 0);
  });

  renderAvoidRules();
  modal.classList.add('active');
  if (searchInput) setTimeout(() => searchInput.focus(), 80);
}

function closeAvoidRulesModal() {
  const modal = document.getElementById('avoid-rules-modal');
  if (modal) modal.classList.remove('active');
}

function switchAvoidCategory(cat, btn) {
  activeAvoidCategory = cat;
  document.querySelectorAll('.avoid-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAvoidRules();
}

function filterAvoidRules() {
  renderAvoidRules();
}

function renderAvoidRules() {
  const container = document.getElementById('avoid-rules-container');
  if (!container) return;

  const query = (document.getElementById('avoid-search-input')?.value || '').toLowerCase().trim();

  let filtered = DFD_AVOID_RULES.filter(rule => {
    const matchCat = (activeAvoidCategory === 'all') || (rule.cat === activeAvoidCategory);
    if (!matchCat) return false;
    if (!query) return true;
    return rule.title.toLowerCase().includes(query) ||
           rule.desc.toLowerCase().includes(query) ||
           rule.fix.toLowerCase().includes(query) ||
           rule.tag.toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px; color: #94a3b8; font-size: 0.85rem;">
        No rules or sins found matching "${query}". Try searching for "black hole", "crossing", or "context".
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(r => `
    <div class="avoid-card cat-${r.cat}">
      <div class="avoid-card-header">
        <span class="avoid-card-title">${r.title}</span>
        <span class="avoid-tag tag-${r.cat}">${r.tag}</span>
      </div>
      <div class="avoid-card-desc">${r.desc}</div>
      <div class="avoid-fix-box">
        <svg class="ui-icon ui-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12"/></svg>
        <span><strong>How to Fix / Avoid:</strong> ${r.fix}</span>
      </div>
    </div>
  `).join("");
}

/* ========================================================
   CONNECTION DELETION HELPER
   ======================================================== */
function deleteDfdConnection(c) {
  const label = c.label || "Data_Flow";
  dfdConnections = dfdConnections.filter(item => item.id !== c.id);
  renderDfd();
  auditDfdDiagram();
  saveDfdStateToHistory(`Delete Flow [${label}]`);
  showToast("Deleted Data Flow", "warning");
}

/* ========================================================
   HISTORY MANAGER: UNDO & REDO
   ======================================================== */
function saveDfdStateToHistory(label = 'Action') {
  if (isPerformingUndoRedo) return;
  const snapshot = JSON.stringify({
    nodes: dfdNodes,
    connections: dfdConnections
  });

  // Prevent consecutive duplicate states
  if (dfdUndoStack.length > 0 && dfdUndoStack[dfdUndoStack.length - 1].state === snapshot) {
    return;
  }

  dfdUndoStack.push({
    label: label || 'Action',
    state: snapshot,
    timestamp: Date.now()
  });

  if (dfdUndoStack.length > MAX_UNDO_STACK) {
    dfdUndoStack.shift();
  }

  // Clear redo stack on new action
  dfdRedoStack = [];
  updateUndoRedoUI();
  autoSaveDfdToStorage();
}

function undoDfdAction() {
  if (dfdUndoStack.length <= 1) {
    showToast("Nothing to undo", "info");
    return;
  }
  isPerformingUndoRedo = true;
  const currentItem = dfdUndoStack.pop();
  dfdRedoStack.push(currentItem);

  const prevItem = dfdUndoStack[dfdUndoStack.length - 1];
  try {
    const data = JSON.parse(prevItem.state);
    dfdNodes = data.nodes || [];
    dfdConnections = data.connections || [];
    selectedNodeForConnection = null;
    renderDfd();
    auditDfdDiagram();
    showToast(`Undo: ${currentItem.label}`, "info");
  } catch (err) {
    console.error("Undo error", err);
  } finally {
    isPerformingUndoRedo = false;
    updateUndoRedoUI();
    autoSaveDfdToStorage();
  }
}

function redoDfdAction() {
  if (dfdRedoStack.length === 0) {
    showToast("Nothing to redo", "info");
    return;
  }
  isPerformingUndoRedo = true;
  const nextItem = dfdRedoStack.pop();
  dfdUndoStack.push(nextItem);

  try {
    const data = JSON.parse(nextItem.state);
    dfdNodes = data.nodes || [];
    dfdConnections = data.connections || [];
    selectedNodeForConnection = null;
    renderDfd();
    auditDfdDiagram();
    showToast(`Redo: ${nextItem.label}`, "info");
  } catch (err) {
    console.error("Redo error", err);
  } finally {
    isPerformingUndoRedo = false;
    updateUndoRedoUI();
    autoSaveDfdToStorage();
  }
}

function updateUndoRedoUI() {
  const undoBtn = document.getElementById('btn-undo');
  const redoBtn = document.getElementById('btn-redo');
  if (undoBtn) {
    const canUndo = dfdUndoStack.length > 1;
    undoBtn.disabled = !canUndo;
    undoBtn.classList.toggle('disabled', !canUndo);
  }
  if (redoBtn) {
    const canRedo = dfdRedoStack.length > 0;
    redoBtn.disabled = !canRedo;
    redoBtn.classList.toggle('disabled', !canRedo);
  }
}

/* ========================================================
   SAVE & SHARE DFD (ZERO-ACCOUNT COMPRESSION & LINK GENERATOR)
   ======================================================== */
function getDfdExportData() {
  const scenarioVal = document.getElementById('scenario-selector')?.value || 'pos';
  return {
    version: 1,
    app: "IT211_BallsRUs_DFD",
    scenario: scenarioVal,
    timestamp: Date.now(),
    nodes: dfdNodes.map(n => ({
      id: n.id,
      type: n.type,
      name: n.name,
      desc: n.desc || "",
      x: n.x,
      y: n.y
    })),
    connections: dfdConnections.map(c => ({
      id: c.id,
      from: c.from,
      to: c.to,
      label: c.label || "",
      desc: c.desc || "",
      waypoints: Array.isArray(c.waypoints) ? c.waypoints : [],
      sourceAnchor: c.sourceAnchor || null,
      targetAnchor: c.targetAnchor || null,
      labelOffset: c.labelOffset || null
    }))
  };
}

function packDfdData(data) {
  const typeMap = { process: 'p', entity: 'e', store: 'd' };
  return {
    _v: 2,
    s: data.scenario || '',
    n: (data.nodes || []).map(n => [
      n.id,
      typeMap[n.type] || 'p',
      n.name,
      Math.round(n.x),
      Math.round(n.y),
      n.desc || ''
    ]),
    c: (data.connections || []).map(c => [
      c.id,
      c.from,
      c.to,
      c.label,
      c.waypoints && c.waypoints.length ? c.waypoints.map(w => [Math.round(w.x), Math.round(w.y)]) : 0,
      c.sourceAnchor ? [Math.round(c.sourceAnchor.relX * 100) / 100, Math.round(c.sourceAnchor.relY * 100) / 100] : 0,
      c.targetAnchor ? [Math.round(c.targetAnchor.relX * 100) / 100, Math.round(c.targetAnchor.relY * 100) / 100] : 0,
      c.labelOffset && (c.labelOffset.x || c.labelOffset.y) ? [Math.round(c.labelOffset.x), Math.round(c.labelOffset.y)] : 0,
      c.desc || ''
    ])
  };
}

function unpackDfdData(packed) {
  if (!packed || packed._v !== 2) return packed;
  const revTypeMap = { p: 'process', e: 'entity', d: 'store' };
  return {
    version: 2,
    app: "IT211_Leasing_DFD",
    scenario: packed.s || 'leasing_context',
    nodes: (packed.n || []).map(item => ({
      id: item[0],
      type: revTypeMap[item[1]] || 'process',
      name: item[2],
      x: item[3],
      y: item[4],
      desc: item[5] || ''
    })),
    connections: (packed.c || []).map(item => ({
      id: item[0],
      from: item[1],
      to: item[2],
      label: item[3],
      waypoints: Array.isArray(item[4]) ? item[4].map(w => ({ x: w[0], y: w[1] })) : [],
      sourceAnchor: Array.isArray(item[5]) ? { relX: item[5][0], relY: item[5][1] } : null,
      targetAnchor: Array.isArray(item[6]) ? { relX: item[6][0], relY: item[6][1] } : null,
      labelOffset: Array.isArray(item[7]) ? { x: item[7][0], y: item[7][1] } : null,
      desc: item[8] || ''
    }))
  };
}

const PRESET_DEFAULT_COORDS = {
  leasing_level1: {
    e1: [30, 40], p1: [270, 35], d1: [270, 110], e2: [620, 35],
    p2: [270, 180], d2: [270, 255], e3: [620, 180],
    e4: [30, 340], p3: [270, 330], d3: [270, 405],
    p4: [270, 480], d4: [270, 555], e5: [620, 480],
    p5: [270, 630], d5: [270, 705], e6: [620, 630],
    e7: [30, 780], p6: [270, 780], d6: [270, 855], e8: [620, 780]
  },
  leasing_context: {
    n1: [40, 40], n2: [40, 190], n3: [40, 340], n8: [40, 490],
    n0: [330, 260],
    n4: [620, 40], n5: [620, 190], n6: [620, 340], n7: [620, 490]
  },
  pos: {
    n1: [40, 80], n2: [270, 75], n3: [530, 80], n4: [40, 230],
    n5: [270, 230], n6: [530, 225], n7: [530, 375]
  }
};

function detectCurrentBasePreset() {
  const nodeIds = new Set(dfdNodes.map(n => n.id));
  const l1Nodes = ['e1','p1','d1','e2','p2','d2','e3','e4','p3','d3','p4','d4','e5','p5','d5','e6'];
  if (l1Nodes.every(id => nodeIds.has(id))) {
    return 'leasing_level1';
  }
  const ctxNodes = ['n1','n2','n3','n0','n4','n5','n6'];
  if (ctxNodes.every(id => nodeIds.has(id))) {
    return 'leasing_context';
  }
  const posNodes = ['n1','n2','n3','n4','n5','n6','n7'];
  if (posNodes.every(id => nodeIds.has(id))) {
    return 'pos';
  }
  const selVal = document.getElementById('scenario-selector')?.value;
  if (selVal && PRESET_DEFAULT_COORDS[selVal]) {
    return selVal;
  }
  return null;
}

function applyPresetWithMoves(presetName, movesStr = '') {
  const norm = (presetName || '').toLowerCase().trim();
  const sel = document.getElementById('scenario-selector');

  if (norm === 'leasing_level1' || norm === 'leasing_l1' || norm === 'leasing1') {
    if (sel) sel.value = 'leasing_level1';
    loadPropertyLeasingLevel1Preset();
  } else if (norm === 'leasing_context' || norm === 'leasing_ctx' || norm === 'leasing0') {
    if (sel) sel.value = 'leasing_context';
    loadPropertyLeasingContextPreset();
  } else if (norm === 'pos' || norm === 'ballsrus') {
    if (sel) sel.value = 'pos';
    loadPerfectDfdPreset();
  } else if (norm === 'enroll') {
    if (sel) sel.value = 'enroll';
    changeScenario();
  } else if (norm === 'atm') {
    if (sel) sel.value = 'atm';
    changeScenario();
  } else if (norm === 'membership') {
    if (sel) sel.value = 'membership';
    changeScenario();
  } else if (norm === 'inventory') {
    if (sel) sel.value = 'inventory';
    changeScenario();
  } else if (norm === 'reporting') {
    if (sel) sel.value = 'reporting';
    changeScenario();
  } else {
    if (sel) sel.value = 'leasing_level1';
    loadPropertyLeasingLevel1Preset();
  }

  // Apply moved node coordinates if present
  if (movesStr && movesStr.trim()) {
    const tokens = movesStr.trim().split(';');
    let moveCount = 0;
    tokens.forEach(tok => {
      const parts = tok.split(':');
      if (parts.length === 2) {
        const id = parts[0].trim();
        const coords = parts[1].split(',').map(Number);
        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          const node = dfdNodes.find(n => n.id === id);
          if (node) {
            node.x = coords[0];
            node.y = coords[1];
            moveCount++;
          }
        }
      }
    });
    if (moveCount > 0) {
      renderDfd();
      auditDfdDiagram();
      saveDfdStateToHistory(`Loaded Preset (${moveCount} custom moved nodes)`);
    }
  }

  fitCanvasToElements();
}

async function encodeDfdToCode(data) {
  try {
    const packed = packDfdData(data);
    const jsonStr = JSON.stringify(packed);
    if (typeof CompressionStream !== 'undefined') {
      try {
        const blob = new Blob([new TextEncoder().encode(jsonStr)]);
        const compStream = blob.stream().pipeThrough(new CompressionStream('deflate-raw'));
        const buf = await new Response(compStream).arrayBuffer();
        const bytes = new Uint8Array(buf);
        let bin = '';
        const chunk = 8192;
        for (let i = 0; i < bytes.length; i += chunk) {
          bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
        }
        // Base64URL-safe: replace '+' with '-', '/' with '_', strip '='
        const b64 = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        return "DFD2-" + b64;
      } catch (streamErr) {
        console.warn("Deflate failed, falling back to compact base64", streamErr);
      }
    }
    // Fallback: compact base64url
    const b64 = btoa(unescape(encodeURIComponent(jsonStr))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return "DFD2-" + b64;
  } catch (err) {
    console.error("Encoding error:", err);
    return "";
  }
}

async function decodeDfdFromCode(codeStr) {
  if (!codeStr || typeof codeStr !== 'string') throw new Error("Empty code provided");
  let raw = codeStr.trim();
  
  // Extract hash parameter if full link was pasted
  if (raw.includes('#')) {
    raw = raw.substring(raw.indexOf('#') + 1);
  }
  if (raw.startsWith('dfd=') || raw.startsWith('share=')) {
    raw = raw.substring(raw.indexOf('=') + 1);
  }

  // Check if it's a preset or delta string
  if (raw.startsWith('preset=') || raw.startsWith('p=') || raw.includes('preset=') || raw.includes('&m=')) {
    const params = new URLSearchParams(raw);
    const pName = params.get('preset') || params.get('p') || 'leasing_level1';
    const moves = params.get('m') || params.get('moves') || '';
    applyPresetWithMoves(pName, moves);
    return { nodes: dfdNodes, connections: dfdConnections };
  }

  // URL-decode if needed
  try {
    raw = decodeURIComponent(raw);
  } catch (e) {
    // ignore
  }
  raw = raw.trim();

  // If raw JSON string was pasted directly
  if (raw.startsWith('{')) {
    const parsed = JSON.parse(raw);
    return unpackDfdData(parsed);
  }

  // Format 1: New Compressed Format "DFD2-"
  if (raw.startsWith('DFD2-')) {
    let b64 = raw.substring(5).trim();
    // Convert URL-safe Base64 back to standard
    b64 = b64.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '+');
    while (b64.length % 4 !== 0) b64 += '=';

    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    
    let jsonStr = '';
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const blob = new Blob([bytes]);
        const decompStream = blob.stream().pipeThrough(new DecompressionStream('deflate-raw'));
        jsonStr = await new Response(decompStream).text();
      } catch (decompErr) {
        console.warn("DecompressionStream error:", decompErr);
      }
    }
    if (!jsonStr) {
      try {
        jsonStr = decodeURIComponent(escape(bin));
      } catch (e) {
        // Fallback
      }
    }
    if (jsonStr) {
      const packed = JSON.parse(jsonStr);
      return unpackDfdData(packed);
    }
  }

  // Format 2: Legacy "DFD-" Base64 format (100% backward compatibility)
  if (raw.startsWith('DFD-')) {
    let b64 = raw.substring(4).trim().replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '+');
    while (b64.length % 4 !== 0) b64 += '=';
    const binaryStr = atob(b64);
    const jsonStr = decodeURIComponent(binaryStr);
    const parsed = JSON.parse(jsonStr);
    return unpackDfdData(parsed);
  }

  // Generic Base64 fallback
  try {
    let b64 = raw.replace(/-/g, '+').replace(/_/g, '/').replace(/\s+/g, '+');
    while (b64.length % 4 !== 0) b64 += '=';
    const binaryStr = atob(b64);
    const jsonStr = decodeURIComponent(binaryStr);
    const parsed = JSON.parse(jsonStr);
    return unpackDfdData(parsed);
  } catch (e) {
    throw new Error("Could not parse diagram code");
  }
}

async function generateCurrentWorkspaceShare(showToastFeedback = false) {
  const baseUrl = window.location.origin + window.location.pathname;
  const basePreset = detectCurrentBasePreset();
  let cleanUrl = '';
  let code = '';

  if (basePreset && PRESET_DEFAULT_COORDS[basePreset]) {
    const defMap = PRESET_DEFAULT_COORDS[basePreset];
    const moved = [];
    dfdNodes.forEach(n => {
      if (defMap[n.id]) {
        const [dx, dy] = defMap[n.id];
        const curX = Math.round(n.x);
        const curY = Math.round(n.y);
        if (Math.abs(curX - dx) > 2 || Math.abs(curY - dy) > 2) {
          moved.push(`${n.id}:${curX},${curY}`);
        }
      }
    });

    if (moved.length === 0) {
      cleanUrl = `${baseUrl}#preset=${basePreset}`;
      code = `#preset=${basePreset}`;
    } else {
      cleanUrl = `${baseUrl}#preset=${basePreset}&m=${moved.join(';')}`;
      code = `#preset=${basePreset}&m=${moved.join(';')}`;
    }
  } else {
    // Fully custom diagram
    const data = getDfdExportData();
    code = await encodeDfdToCode(data);
    cleanUrl = `${baseUrl}#dfd=${code}`;
  }

  const linkInput = document.getElementById('share-link-input');
  const codeInput = document.getElementById('share-code-input');
  const badgeEl = document.getElementById('workspace-share-badge');

  if (linkInput) linkInput.value = cleanUrl;
  if (codeInput) codeInput.value = code;
  if (badgeEl) {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const charCount = cleanUrl.length;
    badgeEl.innerText = `Workspace Link Ready (${dfdNodes.length} nodes, ${dfdConnections.length} flows • ${charCount} chars • Fits in 1 line • ${timeStr})`;
    badgeEl.style.display = 'inline-block';
  }
  if (showToastFeedback) {
    showToast(`Generated ultra-short workspace link (${cleanUrl.length} chars)!`, "success");
  }
}

async function openSaveShareModal() {
  const modal = document.getElementById('save-share-modal');
  if (!modal) return;

  const detectedPreset = detectCurrentBasePreset();
  const scenarioVal = detectedPreset || document.getElementById('scenario-selector')?.value || 'leasing_level1';
  const baseUrl = window.location.origin + window.location.pathname;

  // Option 1: Clean 1-Line URL (ultra-short, fits in 1 line)
  const shortPresetUrl = `${baseUrl}#preset=${scenarioVal}`;
  const presetLinkInput = document.getElementById('share-preset-link-input');
  if (presetLinkInput) presetLinkInput.value = shortPresetUrl;

  // Option 2: Live Current Workspace Link & Code
  await generateCurrentWorkspaceShare(false);

  const importInput = document.getElementById('import-code-input');
  if (importInput) importInput.value = '';

  renderSaveSlotsUI();
  modal.classList.add('active');
}

function closeSaveShareModal() {
  const modal = document.getElementById('save-share-modal');
  if (modal) modal.classList.remove('active');
}

function copyPresetShareLink() {
  const input = document.getElementById('share-preset-link-input');
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    showToast("1-Line Short Link copied to clipboard!", "success");
  }).catch(() => {
    document.execCommand('copy');
    showToast("1-Line Short Link copied to clipboard!", "success");
  });
}

function copyShareLink() {
  const input = document.getElementById('share-link-input');
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    showToast("Diagram link copied to clipboard!", "success");
  }).catch(() => {
    document.execCommand('copy');
    showToast("Diagram link copied to clipboard!", "success");
  });
}

function copyDiagramCode() {
  const input = document.getElementById('share-code-input');
  if (!input) return;
  input.select();
  navigator.clipboard.writeText(input.value).then(() => {
    showToast("Diagram code copied to clipboard!", "success");
  }).catch(() => {
    document.execCommand('copy');
    showToast("Diagram code copied to clipboard!", "success");
  });
}

function saveToSlot(slotNum) {
  try {
    const data = getDfdExportData();
    const mainProcess = data.nodes.find(n => n.type === 'process')?.name || 'Diagram';
    const meta = {
      timestamp: Date.now(),
      name: `${mainProcess} (${data.nodes.length} nodes, ${data.connections.length} flows)`,
      data: data
    };
    localStorage.setItem(`it211_dfd_slot_${slotNum}`, JSON.stringify(meta));
    showToast(`Saved to Slot ${slotNum}!`, "success");
    renderSaveSlotsUI();
  } catch (e) {
    showToast("Storage quota exceeded", "danger");
  }
}

function loadFromSlot(slotNum) {
  try {
    const raw = localStorage.getItem(`it211_dfd_slot_${slotNum}`);
    if (!raw) {
      showToast(`Slot ${slotNum} is empty. Save a diagram first!`, "warning");
      return;
    }
    const meta = JSON.parse(raw);
    const data = meta.data || meta;
    loadDfdData(data, `Restored Slot ${slotNum}`);
    closeSaveShareModal();
    showToast(`Restored Slot ${slotNum}: ${meta.name || 'Diagram'}`, "success");
  } catch (e) {
    showToast("Failed to load from slot", "danger");
  }
}

function renderSaveSlotsUI() {
  for (let s = 1; s <= 3; s++) {
    const labelEl = document.getElementById(`slot-info-${s}`);
    const loadBtn = document.getElementById(`slot-load-btn-${s}`);
    if (!labelEl) continue;
    const raw = localStorage.getItem(`it211_dfd_slot_${s}`);
    if (raw) {
      try {
        const meta = JSON.parse(raw);
        const dateStr = new Date(meta.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        labelEl.innerText = `${meta.name || 'Saved Diagram'} • ${dateStr}`;
        if (loadBtn) loadBtn.disabled = false;
      } catch(e) {
        labelEl.innerText = "Empty";
        if (loadBtn) loadBtn.disabled = true;
      }
    } else {
      labelEl.innerText = "Empty";
      if (loadBtn) loadBtn.disabled = true;
    }
  }
}

async function loadDiagramFromInput() {
  const input = document.getElementById('import-code-input');
  if (!input || !input.value.trim()) {
    showToast("Please paste a shared link, code, or JSON first", "warning");
    return;
  }
  try {
    const parsed = await decodeDfdFromCode(input.value.trim());
    if (!parsed || (!parsed.nodes && !parsed.dfdNodes)) {
      throw new Error("Invalid diagram structure");
    }
    loadDfdData(parsed, "Imported Shared Diagram");
    closeSaveShareModal();
    showToast(`Loaded diagram with ${dfdNodes.length} elements and ${dfdConnections.length} flows!`, "success");
  } catch (err) {
    showToast("Invalid link or diagram code. Please check and try again.", "danger");
  }
}

function loadDfdData(data, sourceLabel = "Loaded Diagram") {
  dfdNodes = (data.nodes || data.dfdNodes || []).map(n => ({
    id: n.id || ("n_" + Math.random().toString(36).substr(2, 6)),
    type: n.type || "process",
    name: n.name || "Element",
    desc: n.desc || "",
    x: Number(n.x) || 100,
    y: Number(n.y) || 100
  }));

  dfdConnections = (data.connections || data.dfdConnections || data.conns || []).map(c => ({
    id: c.id || ("c_" + Math.random().toString(36).substr(2, 6)),
    from: c.from,
    to: c.to,
    label: c.label || "Data_Flow",
    desc: c.desc || "",
    waypoints: Array.isArray(c.waypoints) ? c.waypoints : [],
    sourceAnchor: c.sourceAnchor || null,
    targetAnchor: c.targetAnchor || null,
    labelOffset: c.labelOffset || null
  }));

  selectedNodeForConnection = null;
  saveDfdStateToHistory(sourceLabel);
  renderDfd();
  auditDfdDiagram();
  fitCanvasToElements();
}

function saveToBrowserStorage() {
  try {
    const data = getDfdExportData();
    localStorage.setItem('ballsrus_dfd_manual_save', JSON.stringify(data));
    showToast(`Saved snapshot to browser (${dfdNodes.length} elements, ${dfdConnections.length} flows)`, "success");
  } catch (e) {
    showToast("Failed to save to browser storage", "danger");
  }
}

function loadFromBrowserStorage() {
  try {
    const raw = localStorage.getItem('ballsrus_dfd_manual_save') || localStorage.getItem('ballsrus_dfd_autosave');
    if (!raw) {
      showToast("No saved diagram found in browser storage", "info");
      return;
    }
    const data = JSON.parse(raw);
    loadDfdData(data, "Restored Browser Snapshot");
    closeSaveShareModal();
    showToast("Restored saved diagram from browser storage!", "success");
  } catch (e) {
    showToast("Error restoring saved diagram", "danger");
  }
}

function autoSaveDfdToStorage() {
  try {
    const exportData = getDfdExportData();
    localStorage.setItem('ballsrus_dfd_autosave', JSON.stringify(exportData));
  } catch (e) {
    // Ignore quota issues
  }
}

function downloadDfdFile() {
  const data = getDfdExportData();
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dfd-diagram-${Date.now()}.dfd`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Downloaded .dfd diagram file!", "success");
}

function handleDfdFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      loadDfdData(data, "Uploaded File: " + file.name);
      closeSaveShareModal();
      showToast(`Loaded diagram from ${file.name}!`, "success");
    } catch (err) {
      showToast("Could not read diagram file. Invalid format.", "danger");
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

async function checkUrlHashForSharedDiagram() {
  if (window.location.hash) {
    let hash = window.location.hash;
    if (hash.startsWith('#')) hash = hash.substring(1);

    // 1. Preset or Delta Link (preset=... or p=... or m=...)
    if (hash.startsWith('preset=') || hash.startsWith('p=') || hash.includes('&m=') || hash.includes('moves=')) {
      const params = new URLSearchParams(hash);
      const presetName = params.get('preset') || params.get('p') || 'leasing_level1';
      const moves = params.get('m') || params.get('moves') || '';
      applyPresetWithMoves(presetName, moves);
      showToast(`Loaded ${presetName.toUpperCase()} diagram!`, "success");
      return true;
    }

    // 2. Encoded custom diagram link (dfd=... or share=...)
    if (hash.startsWith('dfd=') || hash.startsWith('share=')) {
      try {
        const eqIdx = hash.indexOf('=');
        const code = eqIdx !== -1 ? hash.substring(eqIdx + 1) : '';
        if (code) {
          const data = await decodeDfdFromCode(code);
          if (data && (data.nodes || data.dfdNodes)) {
            loadDfdData(data, "Shared Link Diagram");
            showToast("Successfully loaded diagram from custom link!", "success");
            return true;
          }
        }
      } catch (err) {
        console.warn("Failed to load diagram from URL hash:", err);
      }
    }
  }
  return false;
}

// Global Keyboard Shortcuts (Undo/Redo, Save)
window.addEventListener('keydown', (e) => {
  const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
  if (activeTag === 'input' || activeTag === 'textarea') {
    return;
  }

  // Ctrl+Z / Cmd+Z -> Undo or Redo (if Shift held)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      redoDfdAction();
    } else {
      undoDfdAction();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redoDfdAction();
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    openSaveShareModal();
  }
});

// React to Hash Changes
window.addEventListener('hashchange', () => {
  if (window.location.hash) {
    checkUrlHashForSharedDiagram();
  }
});
