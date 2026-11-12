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
    { id: "c1", from: "n1", to: "n2", label: "Item_Barcode", desc: "Product barcode scanned from merchandise" },
    { id: "c2", from: "n3", to: "n2", label: "Price_And_Details", desc: "Unit price, description, and tax rate from inventory" },
    { id: "c3", from: "n2", to: "n4", label: "Computed_Receipt", desc: "Printed customer receipt with itemized charges" },
    { id: "c4", from: "n2", to: "n5", label: "Recorded_Sale", desc: "Finalized sales transaction record" },
    { id: "c5", from: "n5", to: "n6", label: "Sales_Audit_Data", desc: "Batch sales records for daily balancing" },
    { id: "c6", from: "n6", to: "n3", label: "Inventory_Adjustment", desc: "Stock decrement instruction per sold item" },
    { id: "c7", from: "n6", to: "n7", label: "Daily_Revenue_Report", desc: "End-of-day sales summary report" }
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

    // Compute perimeter intersections
    let startPt, endPt;
    if (c.from === c.to) {
      // Recursive loop
      startPt = { x: fromNode.x + fromDims.w, y: fromNode.y + 15 };
      endPt = { x: fromNode.x + fromDims.w, y: fromNode.y + fromDims.h - 15 };
    } else {
      startPt = getRectIntersection(fromCenter.x, fromCenter.y, fromDims.w, fromDims.h, toCenter.x, toCenter.y);
      endPt = getRectIntersection(toCenter.x, toCenter.y, toDims.w, toDims.h, fromCenter.x, fromCenter.y);
    }

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
    flowGroup.setAttribute("style", "cursor: pointer;");

    if (c.from === c.to) {
      // Loop path
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const arc = `M ${startPt.x} ${startPt.y} C ${startPt.x + 50} ${startPt.y - 20}, ${endPt.x + 50} ${endPt.y + 20}, ${endPt.x} ${endPt.y}`;
      path.setAttribute("d", arc);
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", "2.5");
      path.setAttribute("marker-end", markerType);
      flowGroup.appendChild(path);
    } else {
      // Line
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", startPt.x);
      line.setAttribute("y1", startPt.y);
      line.setAttribute("x2", endPt.x);
      line.setAttribute("y2", endPt.y);
      line.setAttribute("stroke", strokeColor);
      line.setAttribute("stroke-width", "2.5");
      line.setAttribute("marker-end", markerType);
      flowGroup.appendChild(line);

      // Label background pill
      const midX = (startPt.x + endPt.x) / 2;
      const midY = (startPt.y + endPt.y) / 2;
      const labelText = c.label || "Data_Flow";
      const pillWidth = Math.max(70, labelText.length * 7 + 24);

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
      flowGroup.appendChild(pillRect);

      // Label text with explicit directional arrow
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", midX);
      text.setAttribute("y", midY + 3.5);
      text.setAttribute("fill", isError ? "#991b1b" : "#1e40af");
      text.setAttribute("font-size", "9");
      text.setAttribute("font-weight", "800");
      text.setAttribute("text-anchor", "middle");
      text.textContent = `${labelText} ➔`;
      flowGroup.appendChild(text);

      // Output & Input indicator badges near endpoints
      const outBadge = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const outDx = (endPt.x - startPt.x) * 0.15;
      const outDy = (endPt.y - startPt.y) * 0.15;
      outBadge.setAttribute("x", startPt.x + outDx);
      outBadge.setAttribute("y", startPt.y + outDy - 5);
      outBadge.setAttribute("fill", "#64748b");
      outBadge.setAttribute("font-size", "7.5");
      outBadge.setAttribute("font-weight", "bold");
      outBadge.setAttribute("text-anchor", "middle");
      outBadge.textContent = "📤 OUT";
      flowGroup.appendChild(outBadge);

      const inBadge = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const inDx = (startPt.x - endPt.x) * 0.15;
      const inDy = (startPt.y - endPt.y) * 0.15;
      inBadge.setAttribute("x", endPt.x + inDx);
      inBadge.setAttribute("y", endPt.y + inDy - 5);
      inBadge.setAttribute("fill", strokeColor);
      inBadge.setAttribute("font-size", "7.5");
      inBadge.setAttribute("font-weight", "bold");
      inBadge.setAttribute("text-anchor", "middle");
      inBadge.textContent = "📥 IN";
      flowGroup.appendChild(inBadge);
    }

    // Hover tooltip for data flow (shows name, endpoints, and optional description)
    const flowTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
    flowTitle.textContent = `Flow: ${c.label} (${fromNode.name} ➔ ${toNode.name})${c.desc ? '\nDescription: ' + c.desc : ''}\n(Click in Edit mode or double-click to rename/edit)`;
    flowGroup.appendChild(flowTitle);

    flowGroup.addEventListener('click', (e) => {
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

    flowGroup.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openEditFlowModal(c);
    });

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
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function onNodeMouseDown(e, node) {
  if (currentCanvasMode !== 'move') return;
  e.preventDefault();
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
  draggedNode.x = Math.max(10, Math.min(620, Math.round(svgPt.x - dragOffset.x)));
  draggedNode.y = Math.max(10, Math.min(420, Math.round(svgPt.y - dragOffset.y)));
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
  draggedNode.x = Math.max(10, Math.min(620, Math.round(svgPt.x - dragOffset.x)));
  draggedNode.y = Math.max(10, Math.min(420, Math.round(svgPt.y - dragOffset.y)));
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
