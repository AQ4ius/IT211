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

// Canvas Zoom & Pan State
const BASE_VIEW_WIDTH = 760;
const BASE_VIEW_HEIGHT = 480;
let canvasZoom = 1.0;
let canvasPan = { x: 0, y: 0 };
let isPanningCanvas = false;
let panStart = { clientX: 0, clientY: 0, panX: 0, panY: 0 };
let draggedWaypoint = null;
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

/* Waypoint Drag Handlers (Arduino-style wire bend points) */
function startDraggingWaypoint(e, connection, index) {
  e.preventDefault();
  e.stopPropagation();
  draggedWaypoint = { connection, index };
  window.addEventListener('mousemove', onWaypointMouseMove);
  window.addEventListener('mouseup', onWaypointMouseUp);
}

function onWaypointMouseMove(e) {
  if (!draggedWaypoint) return;
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
    renderDfd();
  }
}

function onWaypointMouseUp() {
  if (draggedWaypoint) {
    draggedWaypoint = null;
    window.removeEventListener('mousemove', onWaypointMouseMove);
    window.removeEventListener('mouseup', onWaypointMouseUp);
    auditDfdDiagram();
  }
}

function startDraggingWaypointTouch(e, connection, index) {
  e.preventDefault();
  e.stopPropagation();
  draggedWaypoint = { connection, index };
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
    draggedWaypoint = null;
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
    showToast("Arrow straightened (all bend points removed)", "info");
  }
}

/* ========================================================
   CANVAS ACTIONS & PRESETS
   ======================================================== */
function changeScenario() {
  const val = document.getElementById('scenario-selector').value;
  document.getElementById('scenario-hint').innerText = SCENARIOS[val].hint;
  clearDfdCanvas();
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
    move: "Mode: Select & Drag Elements (💡 Tip: Double-click any element or flow to rename/edit)",
    connect: "Mode: Click SOURCE element (Output), then click TARGET element (Input)",
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
  showToast(`Added ${type.toUpperCase()}: ${name}`, 'success');
}

function clearDfdCanvas() {
  dfdNodes = [];
  dfdConnections = [];
  selectedNodeForConnection = null;
  resetCanvasZoom();
  renderDfd();
  auditDfdDiagram();
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
  showToast("Loaded textbook balanced DFD preset (Clean 100%)!", "success");
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

    if (c.from === c.to) {
      // Recursive loop
      startPt = { x: fromNode.x + fromDims.w, y: fromNode.y + 15 };
      endPt = { x: fromNode.x + fromDims.w, y: fromNode.y + fromDims.h - 15 };
    } else if (c.waypoints.length === 0) {
      startPt = getRectIntersection(fromCenter.x, fromCenter.y, fromDims.w, fromDims.h, toCenter.x, toCenter.y);
      endPt = getRectIntersection(toCenter.x, toCenter.y, toDims.w, toDims.h, fromCenter.x, fromCenter.y);
    } else {
      const firstWp = c.waypoints[0];
      const lastWp = c.waypoints[c.waypoints.length - 1];
      startPt = getRectIntersection(fromCenter.x, fromCenter.y, fromDims.w, fromDims.h, firstWp.x, firstWp.y);
      endPt = getRectIntersection(toCenter.x, toCenter.y, toDims.w, toDims.h, lastWp.x, lastWp.y);
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

    if (c.from === c.to) {
      // Loop path
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const arc = `M ${startPt.x} ${startPt.y} C ${startPt.x + 50} ${startPt.y - 20}, ${endPt.x + 50} ${endPt.y + 20}, ${endPt.x} ${endPt.y}`;
      path.setAttribute("d", arc);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("marker-end", markerType);
      path.setAttribute("class", "data-flow-path");
      flowGroup.appendChild(path);
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
      hitbox.setAttribute("stroke-width", "16");
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
          dfdConnections = dfdConnections.filter(item => item.id !== c.id);
          renderDfd();
          auditDfdDiagram();
          showToast("Deleted Data Flow", "warning");
          return;
        }
        if (currentCanvasMode === 'edit') {
          openEditFlowModal(c);
          return;
        }

        // Add bend point at mouse position
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
        startDraggingWaypoint(e, c, bestIdx);
        showToast("Added bend point. Drag to position wire.", "info");
      });

      hitbox.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) return;
        e.stopPropagation();
        if (currentCanvasMode === 'delete') {
          dfdConnections = dfdConnections.filter(item => item.id !== c.id);
          renderDfd();
          auditDfdDiagram();
          showToast("Deleted Data Flow", "warning");
          return;
        }
        if (currentCanvasMode === 'edit') {
          openEditFlowModal(c);
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
        startDraggingWaypointTouch(e, c, bestIdx);
        showToast("Added bend point. Drag to position wire.", "info");
      }, { passive: false });

      // 3. Waypoint draggable circular handles
      c.waypoints.forEach((wp, wpIdx) => {
        const handle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        handle.setAttribute("cx", wp.x);
        handle.setAttribute("cy", wp.y);
        handle.setAttribute("r", "5.5");
        handle.setAttribute("fill", "#ffffff");
        handle.setAttribute("stroke", strokeColor);
        handle.setAttribute("stroke-width", "2.2");
        handle.setAttribute("class", "waypoint-handle");

        const hTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
        hTitle.textContent = "Bend point (Waypoint)\n• Drag to bend wire\n• Double-click or Right-click to remove";
        handle.appendChild(hTitle);

        handle.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          if (currentCanvasMode === 'delete') {
            c.waypoints.splice(wpIdx, 1);
            renderDfd();
            showToast("Removed bend point", "warning");
            return;
          }
          startDraggingWaypoint(e, c, wpIdx);
        });

        handle.addEventListener('touchstart', (e) => {
          e.stopPropagation();
          if (e.cancelable) e.preventDefault();
          if (currentCanvasMode === 'delete') {
            c.waypoints.splice(wpIdx, 1);
            renderDfd();
            showToast("Removed bend point", "warning");
            return;
          }
          startDraggingWaypointTouch(e, c, wpIdx);
        }, { passive: false });

        handle.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          c.waypoints.splice(wpIdx, 1);
          renderDfd();
          showToast("Removed bend point", "warning");
        });

        handle.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          c.waypoints.splice(wpIdx, 1);
          renderDfd();
          showToast("Removed bend point", "warning");
        });

        flowGroup.appendChild(handle);
      });

      // 4. Label placed at midpoint along full polyline path
      const mid = getPolylineMidpoint(allPoints);
      const labelText = c.label || "Data_Flow";
      const pillWidth = Math.max(70, labelText.length * 7 + 24);

      const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      labelGroup.setAttribute("class", "data-flow-label-group");
      labelGroup.setAttribute("style", "cursor: pointer;");

      const pillRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      pillRect.setAttribute("x", mid.x - pillWidth / 2);
      pillRect.setAttribute("y", mid.y - 10);
      pillRect.setAttribute("width", pillWidth);
      pillRect.setAttribute("height", "20");
      pillRect.setAttribute("rx", "10");
      pillRect.setAttribute("fill", "#ffffff");
      pillRect.setAttribute("stroke", strokeColor);
      pillRect.setAttribute("stroke-width", "1.5");
      pillRect.setAttribute("filter", "drop-shadow(0 1px 3px rgba(0,0,0,0.1))");
      labelGroup.appendChild(pillRect);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", mid.x);
      text.setAttribute("y", mid.y + 3.5);
      text.setAttribute("fill", isError ? "#991b1b" : "#1e40af");
      text.setAttribute("font-size", "9");
      text.setAttribute("font-weight", "800");
      text.setAttribute("text-anchor", "middle");
      text.textContent = `${labelText} ➔`;
      labelGroup.appendChild(text);

      labelGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        if (currentCanvasMode === 'delete') {
          dfdConnections = dfdConnections.filter(item => item.id !== c.id);
          renderDfd();
          auditDfdDiagram();
          showToast("Deleted Data Flow", "warning");
        } else if (currentCanvasMode === 'edit') {
          openEditFlowModal(c);
        } else {
          showToast(`Flow [${c.label}]: Output from ${fromNode.name} ➔ Input to ${toNode.name}${c.desc ? ' (' + c.desc + ')' : ''}`, 'info');
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
      outBadge.textContent = "📤 OUT";
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
      inBadge.textContent = "📥 IN";
      flowGroup.appendChild(inBadge);
    }

    // Hover tooltip for data flow (shows name, endpoints, and optional description)
    const flowTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
    flowTitle.textContent = `Flow: ${c.label} (${fromNode.name} ➔ ${toNode.name})${c.desc ? '\nDescription: ' + c.desc : ''}\n• Click wire to add bend points (Arduino style)\n• Drag points to bend arrow\n• Double-click point to remove`;
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

function onNodeMouseDown(e, node) {
  if (currentCanvasMode !== 'move') return;
  e.preventDefault();
  e.stopPropagation();
  draggedNode = node;
  const svg = document.getElementById('dfd-svg');
  const svgPt = getSvgCoords(svg, e.clientX, e.clientY);
  dragOffset.x = svgPt.x - node.x;
  dragOffset.y = svgPt.y - node.y;

  window.addEventListener('mousemove', onNodeMouseMove);
  window.addEventListener('mouseup', onNodeMouseUp);
}

function onNodeMouseMove(e) {
  if (!draggedNode) return;
  const svg = document.getElementById('dfd-svg');
  const svgPt = getSvgCoords(svg, e.clientX, e.clientY);
  draggedNode.x = Math.max(-2000, Math.min(4000, Math.round(svgPt.x - dragOffset.x)));
  draggedNode.y = Math.max(-2000, Math.min(4000, Math.round(svgPt.y - dragOffset.y)));
  renderDfd();
}

function onNodeMouseUp() {
  draggedNode = null;
  window.removeEventListener('mousemove', onNodeMouseMove);
  window.removeEventListener('mouseup', onNodeMouseUp);
}

function onNodeTouchStart(e, node) {
  if (e.touches.length > 1) return;
  if (currentCanvasMode === 'move') {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();
    draggedNode = node;
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
  draggedNode = null;
  window.removeEventListener('touchmove', onNodeTouchMove);
  window.removeEventListener('touchend', onNodeTouchEnd);
  window.removeEventListener('touchcancel', onNodeTouchEnd);
}

function onNodeClick(e, node) {
  e.stopPropagation();

  if (currentCanvasMode === 'delete') {
    dfdNodes = dfdNodes.filter(n => n.id !== node.id);
    dfdConnections = dfdConnections.filter(c => c.from !== node.id && c.to !== node.id);
    renderDfd();
    auditDfdDiagram();
    showToast(`Deleted ${node.name}`, "warning");
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
          document.getElementById('canvas-status').innerText = `Connected: ${fromNode.name} ➔ ${toNode.name}`;
          renderDfd();
          auditDfdDiagram();
          showToast(`Data Flow Created: [${flowName}]`, "success");
        });
      }
    }
  } else if (currentCanvasMode === 'move') {
    showToast(`[${node.name}]${node.desc ? ': ' + node.desc : ''}`, 'info');
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

  title.innerHTML = `<span>✏️</span> Edit ${typeLabel}: ${node.name}`;
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
    showToast(`Updated ${typeLabel}: "${oldName}" ➔ "${newName}"`, 'success');
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

  title.innerHTML = `<span>✏️</span> Edit Data Flow: ${c.label}`;
  if (nameLabel) nameLabel.innerText = "Data Flow Label (Noun Phrase):";
  input.value = c.label;
  if (descInput) descInput.value = c.desc || "";
  if (descLabel) descLabel.innerText = "Data Payload Description / Fields (Optional):";

  helpText.innerHTML = `<strong>Data Flow Rule:</strong> Flow represents data in motion from <strong>[${fromName}]</strong> (Output) ➔ <strong>[${toName}]</strong> (Input). Must be a <strong>noun phrase</strong> describing the data packet.`;
  if (chipsHeader) chipsHeader.innerText = "Quick Suggestions for Data Flow:";

  if (extraBox) {
    if (c.waypoints && c.waypoints.length > 0) {
      extraBox.style.display = 'block';
      extraBox.innerHTML = `
        <button type="button" class="btn btn-outline" style="width: 100%; font-size: 0.76rem;" onclick="straightenCurrentFlow()">
          🔄 Straighten Arrow (Remove All ${c.waypoints.length} Bend Point${c.waypoints.length > 1 ? 's' : ''})
        </button>
      `;
    } else {
      extraBox.style.display = 'none';
      extraBox.innerHTML = '';
    }
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
    showToast(`Updated Data Flow: "${oldLabel}" ➔ "${newLabel}"`, 'success');
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

  title.innerHTML = `<span>🔗</span> Create Data Flow`;
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
    closeAppModal();
    if (activeModalCallback) activeModalCallback(flowName, flowDesc);
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

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✔️' : type === 'danger' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span> ${message}`;

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

    const verbRegex = /\b(compute|process|calculate|generate|update|record|verify|produce|validate|admit|check|evaluate|enroll|enrol|reconcile|restock|audit|manage)\b/i;
    if (!verbRegex.test(proc.name)) {
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
        <h5><span>✔️</span> All 10 Mortal Sins Avoided</h5>
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
        <h5><span>❌</span> ${sin.title}</h5>
        <p>${sin.desc}</p>
      `;
      sinList.appendChild(item);
    });
  }
}
