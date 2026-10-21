/**
 * IT 211 RAM • Business & Systems Analysis Scenario Question Bank
 * Centered on Business Process Analysis, Requirements Definition, and Conceptual Modeling.
 * Evaluates core lecture terminology (as-is, to-be, manual, computerized, problem areas, business rules, etc.)
 */

const QUESTION_BANK = [
  {
    id: "q_bpr",
    category: "BUSINESS PROCESS & REQUIREMENTS ANALYSIS",
    title: "Scenario 1: Transitioning from a Manual System to a To-Be Computerized System",
    desc: "A nationwide logistics company relies on paper records and telephone coordination between regional depots. Management is plagued by delayed reports, stock discrepancies, and customer billing complaints.",
    scenario: "As a Systems Analyst, evaluate this business process: 1. Contrast the current As-Is manual system with the proposed To-Be computerized system. 2. Explain how requirements analysis identifies problem areas like inconsistent data and delayed reports. 3. Discuss how defining functional requirements, non-functional requirements, and business rules enhances executive decision-making.",
    requiredKeywords: [
      { term: "as-is system / current system", weight: 3, regex: /(as-is|current system)/i },
      { term: "manual system", weight: 3, regex: /manual system/i },
      { term: "to-be system / proposed system", weight: 3, regex: /(to-be|proposed system)/i },
      { term: "computerized system / automated", weight: 3, regex: /(computerized|automated system)/i },
      { term: "problem areas", weight: 3, regex: /problem area/i },
      { term: "inconsistent data", weight: 3, regex: /inconsistent data/i },
      { term: "delayed reports / latency", weight: 3, regex: /(delayed report|latency)/i },
      { term: "requirements analysis", weight: 3, regex: /requirements analysis/i },
      { term: "business rules", weight: 3, regex: /business rule/i },
      { term: "functional & non-functional requirements", weight: 4, regex: /(functional requirement|non(-|\s)?functional)/i },
      { term: "business process & information system", weight: 4, regex: /(business process|information system)/i },
      { term: "decision-making", weight: 3, regex: /decision(-|\s)?making/i }
    ],
    traps: [
      { term: "jumping directly to code or database schemas", penalty: 6, regex: /\b(write sql|program in c#|create table in mysql)\b/i, reason: "Requirements analysis focuses on business processes and rules, not physical coding or database tables!" }
    ],
    exemplar: "In systems analysis, we begin by evaluating the as-is system—the current manual system where paper ledgers cause severe problem areas including inconsistent data across depots and delayed reports for management. Through structured requirements analysis, the analyst studies the business process to conceptualize the to-be system, which will operate as a computerized system. Here, the new information system establishes centralized data stores and automated data flows that eliminate redundant recording. By formally defining functional requirements (such as automated dispatching) and non-functional requirements (such as system reliability and speed), the organization enforces standardized business rules. This transformation eliminates operational bottlenecks and delivers accurate, real-time new information that directly empowers sound executive decision-making."
  },
  {
    id: "q_process_model",
    category: "LOGICAL PROCESS MODELING & INFORMATION FLOW",
    title: "Scenario 2: Logical Process Models & Transforming Data into New Information",
    desc: "A corporate board questions why systems analysts create Data Flow Diagrams (DFDs) instead of starting software development immediately.",
    scenario: "Explain the business value of process modeling: 1. Explain how a logical process model describes what a business process does without being distracted by physical implementation details. 2. Explain how data flows serve as the 'glue' holding processes together. 3. Detail how processes transform incoming data into new information that supports organizational decision-making.",
    requiredKeywords: [
      { term: "business process", weight: 3, regex: /business process/i },
      { term: "information system", weight: 3, regex: /information system/i },
      { term: "data flows (the glue)", weight: 4, regex: /data flow/i },
      { term: "data store (data at rest)", weight: 3, regex: /data store/i },
      { term: "new information", weight: 4, regex: /new information/i },
      { term: "decision-making", weight: 3, regex: /decision(-|\s)?making/i },
      { term: "as-is system & to-be system", weight: 3, regex: /(as-is|to-be)/i },
      { term: "manual system vs computerized system", weight: 3, regex: /(manual system|computerized system)/i },
      { term: "logical process model vs physical details", weight: 4, regex: /(logical process model|physical detail|implementation detail)/i }
    ],
    traps: [
      { term: "stating dfd shows execution timing or loops", penalty: 5, regex: /\b(shows sequence of steps|shows timing|shows loops)\b/i, reason: "DFDs show WHAT activities are performed, NOT timing, sequencing, or programming loops!" }
    ],
    exemplar: "A process model describes business processes—the activities that people and systems perform. Analysts develop logical process models for both the as-is system and the to-be system to focus on how the business should run without being distracted by physical implementation details (such as whether data is gathered on paper or web forms, or stored in filing cabinets or cloud databases). Within this model, data flows act as the vital glue holding the processes together, showing what inputs enter each activity and what outputs are generated. Processes in the information system retrieve data from a data store and transform raw inputs into valuable new information. This continuous flow of structured knowledge is the foundation of organizational decision-making in both manual and computerized systems."
  },
  {
    id: "q_compliance",
    category: "REQUIREMENTS DEFINITION & REGULATORY GOVERNANCE",
    title: "Scenario 3: Requirements Elicitation, Problem Areas & Regulatory Compliance",
    desc: "A regional healthcare facility is modernizing its patient management workflow. Currently, doctors and billing clerks maintain duplicate paper files, causing delayed billing, billing errors, and non-compliance with statutory healthcare mandates.",
    scenario: "1. Detail how requirements analysis detects problem areas like inconsistent data and delayed reports. 2. Contrast functional requirements against non-functional requirements. 3. Explain how existing laws and supervisory bodies (e.g., DOH, PhilHealth, Data Privacy) serve as mandatory constraints that govern business rules.",
    requiredKeywords: [
      { term: "requirements analysis", weight: 3, regex: /requirements analysis/i },
      { term: "problem areas", weight: 3, regex: /problem area/i },
      { term: "inconsistent data", weight: 3, regex: /inconsistent data/i },
      { term: "delayed reports", weight: 3, regex: /delayed report/i },
      { term: "functional requirements", weight: 3, regex: /functional requirement/i },
      { term: "non-functional requirements", weight: 3, regex: /non(-|\s)?functional/i },
      { term: "existing laws / regulatory bodies", weight: 4, regex: /(existing law|supervisory|doh|philhealth|compliance)/i },
      { term: "business rules", weight: 3, regex: /business rule/i },
      { term: "business process & information system", weight: 3, regex: /(business process|information system)/i },
      { term: "decision-making", weight: 3, regex: /decision(-|\s)?making/i }
    ],
    traps: [
      { term: "claiming regulatory laws are optional", penalty: 6, regex: /\blaws are optional\b/i, reason: "Existing laws from supervisory bodies serve as non-negotiable constraints on the system!" }
    ],
    exemplar: "During requirements analysis, the systems analyst uncovers critical problem areas in the current business process, notably inconsistent data created by duplicate record-keeping and delayed reports that impair clinical decision-making. To solve this, the analyst defines functional requirements that state what services the information system must provide—such as calculating treatment charges according to strict business rules. In parallel, non-functional requirements define quality constraints, performance benchmarks, and security safeguards. Crucially, requirements must comply with existing laws and supervisory bodies (such as DOH and PhilHealth regulations, and the Data Privacy Act), ensuring patient confidentiality and auditability across the entire computerized system."
  },
  {
    id: "q_conservation",
    category: "DATA INTEGRITY & CONSERVATION OF DATA",
    title: "Scenario 4: The Law of Conservation of Data & Avoiding Miracle and Black Hole Errors",
    desc: "A sales manager requests a sales forecasting feature in the new computerized system, but the proposed diagram shows the forecasting process generating reports without any input flow from past sales data stores.",
    scenario: "1. Explain the two parts of the Law of Conservation of Data in business systems analysis. 2. Contrast a 'Black Hole' error with a 'Miracle' error. 3. Explain the subtle semantic error of 'insufficient inputs' (the H2O principle) where a process attempts to produce new information without adequate source data.",
    requiredKeywords: [
      { term: "conservation of data", weight: 4, regex: /conservation of data/i },
      { term: "data store (data at rest)", weight: 3, regex: /data store/i },
      { term: "data flows (movement)", weight: 3, regex: /data flow/i },
      { term: "black hole error (no output)", weight: 4, regex: /black hole/i },
      { term: "miracle error (no input)", weight: 4, regex: /miracle/i },
      { term: "insufficient inputs (h2o principle)", weight: 4, regex: /insufficient input/i },
      { term: "new information", weight: 3, regex: /new information/i },
      { term: "business process & information system", weight: 3, regex: /(business process|information system)/i },
      { term: "decision-making", weight: 3, regex: /decision(-|\s)?making/i }
    ],
    traps: [
      { term: "stating data stores can move data autonomously", penalty: 6, regex: /\bdata stores can send data directly without a process\b/i, reason: "Data at rest stays at rest until moved by an active process!" }
    ],
    exemplar: "The Law of Conservation of Data is a cornerstone of business process modeling. Its first principle states that data at rest in a data store stays at rest until moved by a process—data cannot travel on data flows without a process to push or pull it. The second principle states that processes cannot consume or create data out of nothing. Violating this produces either a 'black hole' error (where data enters a process but produces no output, wasting resources) or a 'miracle' error (where a process produces output with zero inputs). A related subtle semantic error occurs when a process has insufficient inputs to generate the requested output—just as creating water (H2O) requires both hydrogen and oxygen, an information system cannot generate new information like sales forecasts without input flows from customer orders and historical inventory data stores to support sound managerial decision-making."
  },
  {
    id: "q_validation",
    category: "MODEL QUALITY & WALK-THROUGH VALIDATION",
    title: "Scenario 5: Syntax Errors vs. Semantics Errors & Stakeholder Walk-Throughs",
    desc: "A project team created DFDs that passed automated CASE tool checks with zero syntax errors, yet users rejected the system during deployment because the software miscalculated shipping deadlines.",
    scenario: "1. Differentiate between syntax errors (grammatical DFD rules) and semantics errors (business process misunderstandings). 2. Explain why semantics errors cause the most problems in system development. 3. Detail how stakeholder walk-throughs and user role-playing ensure that business rules and consistent terminology match reality.",
    requiredKeywords: [
      { term: "syntax errors (grammatical)", weight: 4, regex: /syntax error/i },
      { term: "semantics errors (misunderstandings)", weight: 4, regex: /semantic(s)? error/i },
      { term: "business process", weight: 3, regex: /business process/i },
      { term: "business rules", weight: 3, regex: /business rule/i },
      { term: "walk-through / user validation", weight: 4, regex: /walk(-|\s)?through/i },
      { term: "role-play / role-playing", weight: 3, regex: /role(-|\s)?play/i },
      { term: "consistent terminology", weight: 3, regex: /consistent terminology/i },
      { term: "requirements analysis", weight: 3, regex: /requirements analysis/i },
      { term: "to-be system", weight: 3, regex: /(to-be|computerized system)/i },
      { term: "decision-making", weight: 2, regex: /decision(-|\s)?making/i }
    ],
    traps: [
      { term: "claiming case tools detect business misunderstandings", penalty: 7, regex: /\bcase tools can detect semantics errors\b/i, reason: "CASE tools only check syntax grammar; they cannot understand business domain logic!" }
    ],
    exemplar: "In systems modeling, syntax errors refer to grammatical errors that violate the formal rules of the DFD language (such as missing process names or black holes), which are easily caught by automated CASE tools. In contrast, semantics errors refer to misunderstandings by the analyst in collecting and analyzing the business process. Semantics errors cause the most problems in development because a diagram can be syntactically flawless while completely misrepresenting business rules. To catch these defects during requirements analysis, analysts conduct a structured walk-through where stakeholders examine the to-be system for accuracy. A powerful validation technique is user role-playing, where participants simulate the process step-by-step using only specified inputs and producing defined outputs. This ensures consistent terminology (resolving differences like 'sales order' versus 'customer order') before the computerized system is constructed, directly improving organizational decision-making."
  },
  {
    id: "q_context_levels",
    category: "DECOMPOSITION & BALANCING PRINCIPLES",
    title: "Scenario 6: DFD Hierarchy, Balancing & Context Diagram Rules",
    desc: "An enterprise analyst is modeling a university enrollment and student billing system. The analyst must communicate with university deans (who want an executive overview) and department clerks (who need detailed step-by-step logic).",
    scenario: "1. Explain how functional decomposition organizes a business process into a hierarchy (Context Diagram, Level 0 DFD, Level 1 DFDs). 2. Explain why data stores are hidden from the Context Diagram. 3. Detail the principle of balancing and why preserving data flows across levels prevents inconsistent data.",
    requiredKeywords: [
      { term: "context diagram (process 0)", weight: 4, regex: /context diagram/i },
      { term: "level 0 diagram", weight: 3, regex: /level 0/i },
      { term: "level 1 diagram", weight: 3, regex: /level 1/i },
      { term: "functional decomposition", weight: 3, regex: /functional decomposition/i },
      { term: "data store (hidden in context)", weight: 4, regex: /data store/i },
      { term: "balancing principle", weight: 4, regex: /balanc/i },
      { term: "data flows (preserved)", weight: 3, regex: /data flow/i },
      { term: "inconsistent data", weight: 3, regex: /inconsistent data/i },
      { term: "business process & information system", weight: 3, regex: /(business process|information system)/i },
      { term: "decision-making", weight: 2, regex: /decision(-|\s)?making/i }
    ],
    traps: [
      { term: "putting data stores on the context diagram", penalty: 7, regex: /\bdata stores should be on the context diagram\b/i, reason: "Data stores are strictly excluded from Context Diagrams to maintain boundary encapsulation!" }
    ],
    exemplar: "Because real-world business processes are too complex for a single diagram, systems analysts practice functional decomposition to create an organized DFD hierarchy. The first diagram is the Context Diagram, which represents the entire information system as Process 0 in context with external entities. Data stores are intentionally excluded from the context diagram to hide internal complexity and preserve system boundary encapsulation. The Level 0 diagram then reveals the major high-level processes and shared data stores. Each major process is subsequently decomposed into a Level 1 diagram for detailed analysis. Crucially, the principle of balancing ensures that all incoming and outgoing data flows shown on a parent process are strictly maintained in its child decomposition. Preserving flows across levels prevents inconsistent data, ensures data conservation, and gives stakeholders an accurate basis for strategic decision-making."
  }
];
