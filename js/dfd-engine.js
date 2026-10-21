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
  document.getElementById(`btn-mode-${mode}`).classList.add('active');
  selectedNodeForConnection = null;

  const statusMap = {
    move: "Mode: Select & Drag Elements",
    connect: "Mode: Click SOURCE element (Output), then click TARGET element (Input)",
    delete: "Mode: Click any element or flow to delete"
  };
  document.getElementById('canvas-status').innerText = statusMap[mode];
  renderDfd();
}

function addDfdNode(type) {
  const id = "node_" + Date.now();
  let name = "";
  let defaultX = 80 + Math.random() * 200;
  let defaultY = 60 + Math.random() * 200;

  if (type === 'process') {
    name = "1.0 COMPUTE SALES";
  } else if (type === 'entity') {
    name = "CUSTOMER";
  } else if (type === 'store') {
    name = "D1 SALES";
  }

  dfdNodes.push({ id, type, name, x: defaultX, y: defaultY });
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
    { id: "n1", type: "entity", name: "CUSTOMER", x: 40, y: 80 },
    { id: "n2", type: "store", name: "D1 SALES_STORE", x: 400, y: 80 },
    { id: "n3", type: "store", name: "D2 INVENTORY", x: 400, y: 240 },
    { id: "n4", type: "process", name: "CALCULATOR", x: 180, y: 240 },
    { id: "n5", type: "process", name: "3.0 LOG ERRORS", x: 40, y: 380 }
  ];

  dfdConnections = [
    { id: "c1", from: "n1", to: "n2", label: "DirectOrderData" }, // Sin #3
    { id: "c2", from: "n2", to: "n3", label: "SyncData" },        // Sin #1
    { id: "c3", from: "n1", to: "n5", label: "CrashLog" }         // Sin #5 (Black Hole)
  ];

  renderDfd();
  auditDfdDiagram();
  showToast("Loaded preset containing multiple Mortal Sins! Check the Linter panel.", "danger");
}

function loadPerfectDfdPreset() {
  dfdNodes = [
    { id: "n1", type: "entity", name: "CUSTOMER", x: 40, y: 140 },
    { id: "n2", type: "process", name: "1.0 COMPUTE SALES", x: 260, y: 140 },
    { id: "n3", type: "store", name: "D1 PRODUCTS", x: 260, y: 20 },
    { id: "n4", type: "store", name: "D2 SALES", x: 260, y: 280 },
    { id: "n5", type: "entity", name: "CASHIER", x: 500, y: 140 }
  ];

  dfdConnections = [
    { id: "c1", from: "n1", to: "n2", label: "Item_Info" },
    { id: "c2", from: "n3", to: "n2", label: "Product_Details" },
    { id: "c3", from: "n2", to: "n4", label: "Completed_Sale" },
    { id: "c4", from: "n2", to: "n5", label: "Computed_Receipt" }
  ];

  renderDfd();
  auditDfdDiagram();
  showToast("Loaded textbook balanced DFD preset!", "success");
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

    flowGroup.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentCanvasMode === 'delete') {
        dfdConnections = dfdConnections.filter(item => item.id !== c.id);
        renderDfd();
        auditDfdDiagram();
        showToast("Deleted Data Flow", "warning");
      } else {
        showToast(`Flow [${c.label}]: Output from ${fromNode.name} ➔ Input to ${toNode.name}`, 'info');
      }
    });

    connGroup.appendChild(flowGroup);
  });

  // Render Nodes
  dfdNodes.forEach(node => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "dfd-node" + (selectedNodeForConnection === node.id ? " selected" : ""));
    g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
    g.setAttribute("data-id", node.id);

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

      const textId = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textId.setAttribute("x", dims.w / 2);
      textId.setAttribute("y", "12");
      textId.setAttribute("fill", "#64748b");
      textId.setAttribute("font-size", "9");
      textId.setAttribute("font-weight", "bold");
      textId.setAttribute("text-anchor", "middle");
      textId.textContent = "PROCESS";

      const textName = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textName.setAttribute("x", dims.w / 2);
      textName.setAttribute("y", "36");
      textName.setAttribute("fill", "#0f172a");
      textName.setAttribute("font-size", "9");
      textName.setAttribute("font-weight", "bold");
      textName.setAttribute("text-anchor", "middle");
      textName.textContent = node.name;

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
      textName.setAttribute("font-size", "9.5");
      textName.setAttribute("font-weight", "bold");
      textName.setAttribute("text-anchor", "middle");
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

      const textId = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textId.setAttribute("x", "15");
      textId.setAttribute("y", dims.h / 2 + 4);
      textId.setAttribute("fill", "#1e293b");
      textId.setAttribute("font-size", "9");
      textId.setAttribute("font-weight", "bold");
      textId.setAttribute("text-anchor", "middle");
      textId.textContent = "D1";

      const textName = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textName.setAttribute("x", (dims.w + 30) / 2);
      textName.setAttribute("y", dims.h / 2 + 4);
      textName.setAttribute("fill", "#0f172a");
      textName.setAttribute("font-size", "9");
      textName.setAttribute("font-weight", "bold");
      textName.setAttribute("text-anchor", "middle");
      textName.textContent = node.name;

      g.appendChild(rect);
      g.appendChild(bar);
      g.appendChild(textId);
      g.appendChild(textName);
    }

    g.addEventListener('mousedown', (e) => onNodeMouseDown(e, node));
    g.addEventListener('click', (e) => onNodeClick(e, node));

    nodeGroup.appendChild(g);
  });
}

/* ========================================================
   MOUSE EVENTS
   ======================================================== */
function onNodeMouseDown(e, node) {
  if (currentCanvasMode !== 'move') return;
  draggedNode = node;
  dragOffset.x = e.clientX - node.x;
  dragOffset.y = e.clientY - node.y;

  window.addEventListener('mousemove', onNodeMouseMove);
  window.addEventListener('mouseup', onNodeMouseUp);
}

function onNodeMouseMove(e) {
  if (!draggedNode) return;
  draggedNode.x = Math.max(10, Math.min(800, e.clientX - dragOffset.x));
  draggedNode.y = Math.max(10, Math.min(500, e.clientY - dragOffset.y));
  renderDfd();
}

function onNodeMouseUp() {
  draggedNode = null;
  window.removeEventListener('mousemove', onNodeMouseMove);
  window.removeEventListener('mouseup', onNodeMouseUp);
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
          label: "RecursiveLoop"
        });
        selectedNodeForConnection = null;
        document.getElementById('canvas-status').innerText = "Data flow created. Auditing architecture...";
        renderDfd();
        auditDfdDiagram();
        showToast("Created recursive loop flow (Mortal Sin #9)", "danger");
      } else {
        // Open Custom In-App Modal
        openDataFlowModal(fromNode, toNode, (flowName) => {
          dfdConnections.push({
            id: "conn_" + Date.now(),
            from: fromNode.id,
            to: toNode.id,
            label: flowName || "Data_Flow"
          });
          selectedNodeForConnection = null;
          document.getElementById('canvas-status').innerText = `Connected: ${fromNode.name} ➔ ${toNode.name}`;
          renderDfd();
          auditDfdDiagram();
          showToast(`Data Flow Created: [${flowName}]`, "success");
        });
      }
    }
  }
}

/* ========================================================
   CUSTOM MODAL & TOAST MANAGERS (Zero browser popups)
   ======================================================== */
function openDataFlowModal(fromNode, toNode, callback) {
  activeModalCallback = callback;
  const modal = document.getElementById('app-modal');
  const input = document.getElementById('modal-input');
  const desc = document.getElementById('modal-desc');
  const chipsBox = document.getElementById('modal-chips');

  desc.innerHTML = `Enter the noun phrase representing data leaving <strong>[${fromNode.name}]</strong> as Output and arriving at <strong>[${toNode.name}]</strong> as Input:`;
  input.value = "Data_Flow";

  // Contextual chip suggestions
  const suggestions = ["Item_Info", "Product_Details", "Computed_Sales", "Payment_Record", "Receipt", "Customer_Details", "Verification_Token", "Audit_Log"];
  chipsBox.innerHTML = "";
  suggestions.forEach(s => {
    const btn = document.createElement('button');
    btn.className = "chip-btn";
    btn.type = "button";
    btn.textContent = s;
    btn.onclick = () => { input.value = s; };
    chipsBox.appendChild(btn);
  });

  modal.classList.add('active');
  input.focus();
  input.select();

  // Setup confirm button handler
  const confirmBtn = document.getElementById('modal-confirm-btn');
  confirmBtn.onclick = () => {
    const val = input.value.trim() || "Data_Flow";
    closeAppModal();
    if (activeModalCallback) activeModalCallback(val);
  };
}

function closeAppModal() {
  const modal = document.getElementById('app-modal');
  if (modal) modal.classList.remove('active');
  selectedNodeForConnection = null;
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

    const verbRegex = /\b(compute|process|calculate|generate|update|record|verify|produce|validate|admit|check|evaluate|enroll|enrol)\b/i;
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
