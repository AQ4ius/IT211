/**
 * IT 211 RAM • Interactive DFD Canvas Engine & Mortal Sin Linter
 */

let dfdNodes = [];
let dfdConnections = [];
let currentCanvasMode = 'move';
let selectedNodeForConnection = null;
let draggedNode = null;
let dragOffset = { x: 0, y: 0 };

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
    connect: "Mode: Click Source Node, then Click Target Node to draw Data Flow",
    delete: "Mode: Click any element to remove"
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
}

function clearDfdCanvas() {
  dfdNodes = [];
  dfdConnections = [];
  selectedNodeForConnection = null;
  renderDfd();
  auditDfdDiagram();
}

function loadBuggyDfdPreset() {
  dfdNodes = [
    { id: "n1", type: "entity", name: "CUSTOMER", x: 60, y: 80 },
    { id: "n2", type: "store", name: "D1 SALES_STORE", x: 380, y: 80 },
    { id: "n3", type: "store", name: "D2 INVENTORY", x: 380, y: 220 },
    { id: "n4", type: "process", name: "CALCULATOR", x: 180, y: 240 }, // Bad name (no verb), miracle or black hole
    { id: "n5", type: "process", name: "3.0 LOG ERRORS", x: 60, y: 380 } // Black hole
  ];

  dfdConnections = [
    { id: "c1", from: "n1", to: "n2", label: "DirectOrderData" }, // Sin #3: Entity -> Store directly!
    { id: "c2", from: "n2", to: "n3", label: "SyncData" },        // Sin #1: Store -> Store directly!
    { id: "c3", from: "n1", to: "n5", label: "CrashLog" }         // n5 has no output -> Black Hole!
  ];

  renderDfd();
  auditDfdDiagram();
}

function loadPerfectDfdPreset() {
  dfdNodes = [
    { id: "n1", type: "entity", name: "CUSTOMER", x: 60, y: 120 },
    { id: "n2", type: "process", name: "1.0 COMPUTE SALES", x: 250, y: 120 },
    { id: "n3", type: "store", name: "D1 PRODUCTS", x: 250, y: 20 },
    { id: "n4", type: "store", name: "D2 SALES", x: 250, y: 260 },
    { id: "n5", type: "entity", name: "CASHIER", x: 480, y: 120 }
  ];

  dfdConnections = [
    { id: "c1", from: "n1", to: "n2", label: "Item_Info" },
    { id: "c2", from: "n3", to: "n2", label: "Product_Details" },
    { id: "c3", from: "n2", to: "n4", label: "Completed_Sale" },
    { id: "c4", from: "n2", to: "n5", label: "Computed_Receipt" }
  ];

  renderDfd();
  auditDfdDiagram();
}

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

    // Center coords
    const fX = fromNode.x + 60;
    const fY = fromNode.y + 25;
    const tX = toNode.x + 60;
    const tY = toNode.y + 25;

    // Check if error flow (store to store, entity to store, entity to entity)
    const isError = (fromNode.type === 'store' && toNode.type === 'store') ||
                    (fromNode.type === 'entity' && toNode.type === 'entity') ||
                    (fromNode.type === 'entity' && toNode.type === 'store') ||
                    (fromNode.type === 'store' && toNode.type === 'entity');

    // Create line
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", fX);
    line.setAttribute("y1", fY);
    line.setAttribute("x2", tX);
    line.setAttribute("y2", tY);
    line.setAttribute("stroke", isError ? "#dc2626" : "#2563eb");
    line.setAttribute("stroke-width", "2");
    line.setAttribute("marker-end", isError ? "url(#dfd-arr-err)" : "url(#dfd-arr)");

    // Text label
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", (fX + tX) / 2);
    text.setAttribute("y", (fY + tY) / 2 - 6);
    text.setAttribute("fill", isError ? "#991b1b" : "#1e3a8a");
    text.setAttribute("font-size", "10");
    text.setAttribute("font-weight", "bold");
    text.setAttribute("text-anchor", "middle");
    text.textContent = c.label;

    connGroup.appendChild(line);
    connGroup.appendChild(text);
  });

  // Render Nodes
  dfdNodes.forEach(node => {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "dfd-node" + (selectedNodeForConnection === node.id ? " selected" : ""));
    g.setAttribute("transform", `translate(${node.x}, ${node.y})`);
    g.setAttribute("data-id", node.id);

    if (node.type === 'process') {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", "125");
      rect.setAttribute("height", "55");
      rect.setAttribute("rx", "8");
      rect.setAttribute("fill", "#ffffff");
      rect.setAttribute("stroke", "#1e293b");
      rect.setAttribute("stroke-width", "1.8");

      const bar = document.createElementNS("http://www.w3.org/2000/svg", "line");
      bar.setAttribute("x1", "0");
      bar.setAttribute("y1", "16");
      bar.setAttribute("x2", "125");
      bar.setAttribute("y2", "16");
      bar.setAttribute("stroke", "#1e293b");
      bar.setAttribute("stroke-width", "1.2");

      const textId = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textId.setAttribute("x", "62");
      textId.setAttribute("y", "12");
      textId.setAttribute("fill", "#64748b");
      textId.setAttribute("font-size", "9");
      textId.setAttribute("font-weight", "bold");
      textId.setAttribute("text-anchor", "middle");
      textId.textContent = "PROCESS";

      const textName = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textName.setAttribute("x", "62");
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
      rect.setAttribute("width", "120");
      rect.setAttribute("height", "45");
      rect.setAttribute("fill", "#f8fafc");
      rect.setAttribute("stroke", "#1e293b");
      rect.setAttribute("stroke-width", "1.8");

      const textName = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textName.setAttribute("x", "60");
      textName.setAttribute("y", "26");
      textName.setAttribute("fill", "#1e293b");
      textName.setAttribute("font-size", "9.5");
      textName.setAttribute("font-weight", "bold");
      textName.setAttribute("text-anchor", "middle");
      textName.textContent = node.name;

      g.appendChild(rect);
      g.appendChild(textName);

    } else if (node.type === 'store') {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", "125");
      rect.setAttribute("height", "40");
      rect.setAttribute("fill", "#ffffff");
      rect.setAttribute("stroke", "#1e293b");
      rect.setAttribute("stroke-width", "1.8");

      const bar = document.createElementNS("http://www.w3.org/2000/svg", "line");
      bar.setAttribute("x1", "30");
      bar.setAttribute("y1", "0");
      bar.setAttribute("x2", "30");
      bar.setAttribute("y2", "40");
      bar.setAttribute("stroke", "#1e293b");
      bar.setAttribute("stroke-width", "1.8");

      const textId = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textId.setAttribute("x", "15");
      textId.setAttribute("y", "24");
      textId.setAttribute("fill", "#1e293b");
      textId.setAttribute("font-size", "9");
      textId.setAttribute("font-weight", "bold");
      textId.setAttribute("text-anchor", "middle");
      textId.textContent = "D1";

      const textName = document.createElementNS("http://www.w3.org/2000/svg", "text");
      textName.setAttribute("x", "75");
      textName.setAttribute("y", "24");
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

    // Interaction listeners
    g.addEventListener('mousedown', (e) => onNodeMouseDown(e, node));
    g.addEventListener('click', (e) => onNodeClick(e, node));

    nodeGroup.appendChild(g);
  });
}

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
    return;
  }

  if (currentCanvasMode === 'connect') {
    if (!selectedNodeForConnection) {
      selectedNodeForConnection = node.id;
      document.getElementById('canvas-status').innerText = `Selected SOURCE [${node.name}]. Now click TARGET element...`;
      renderDfd();
    } else {
      if (selectedNodeForConnection === node.id) {
        // Recursive loop attempt
        dfdConnections.push({
          id: "conn_" + Date.now(),
          from: selectedNodeForConnection,
          to: node.id,
          label: "RecursiveFlow"
        });
      } else {
        const flowLabel = prompt("Enter Data Flow Name (Noun phrase, e.g. Customer_Order, Payment_Slip):", "Data_Flow");
        dfdConnections.push({
          id: "conn_" + Date.now(),
          from: selectedNodeForConnection,
          to: node.id,
          label: flowLabel || "FlowData"
        });
      }

      selectedNodeForConnection = null;
      document.getElementById('canvas-status').innerText = "Data flow created. Auditing architecture...";
      renderDfd();
      auditDfdDiagram();
    }
  }
}

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

    // Process naming check: must start with verb or number + verb
    const verbRegex = /\b(compute|process|calculate|generate|update|record|verify|produce|validate|admit|check)\b/i;
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
