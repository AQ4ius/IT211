/**
 * IT 211 RAM • Situational Real-Life Scenario Question Bank
 * Deep business, systems analysis, and requirements engineering cases.
 */

const QUESTION_BANK = [
  {
    id: "q_hosp",
    category: "MODULE 3: BUSINESS PROBLEM & REQUIREMENTS",
    title: "Scenario 1: Hospital ER Admission & Data Privacy Compliance",
    desc: "St. Jude Hospital ER manual triage takes 55 minutes. Patient records in triage do not match billing, causing medical and billing discrepancies. DOH/PhilHealth mandates real-time bed tracking and DPA/HIPAA requires patient record encryption at rest.",
    scenario: "Analyze this business problem: 1. Identify the core problem areas in the As-Is system. 2. Formulate 2 Functional Requirements and 2 Non-Functional Requirements (specifying latency & compliance). 3. Explain why stating 'Patient has active HMO insurance' is an Assumption and NOT an internal Use Case Precondition.",
    requiredKeywords: [
      { term: "problem area(s) / data inconsistency", weight: 3, regex: /\b(problem area(s)?|inconsistent|discrepanc(y|ies)|redundanc(y|ies))\b/i },
      { term: "as-is vs to-be", weight: 3, regex: /\b(as-is|to-be)\b/i },
      { term: "functional requirements (services)", weight: 3, regex: /\bfunctional requirement(s)?\b/i },
      { term: "non-functional requirements (quality)", weight: 3, regex: /\bnon(-|\s)?functional requirement(s)?\b/i },
      { term: "performance / latency (NFR)", weight: 3, regex: /\b(performance|latency|seconds|minutes|real-time)\b/i },
      { term: "doh / philhealth / dpa / hipaa compliance", weight: 3, regex: /\b(doh|philhealth|dpa|hipaa|compliance|privacy|encryption)\b/i },
      { term: "precondition vs assumption", weight: 4, regex: /\b(precondition|assumption)\b/i },
      { term: "internal system state", weight: 4, regex: /\b(internal|inside the system|system state)\b/i },
      { term: "outside system boundary", weight: 3, regex: /\boutside\b/i },
      { term: "verifiable in software", weight: 3, regex: /\bverifi(able|ed)\b/i }
    ],
    traps: [
      { term: "treating insurance policy as a precondition", penalty: 7, regex: /\bhmo insurance is a valid precondition\b/i, reason: "Patient's real-world insurance possession is outside the enrollment/admission boundary; it is an Assumption, not a software Precondition!" }
    ],
    exemplar: "1. Problem Areas (As-Is): Severe data inconsistency between triage and billing due to redundant paper ledgers, causing operational latency and delayed patient care. 2. Functional Requirements (To-Be): FR-1: System shall record triage vital signs and automatically allocate available ER beds. FR-2: System shall submit online claims verification to PhilHealth and partner HMO gateways. 3. Non-Functional Requirements: NFR-1 (Performance): Emergency bed assignment shall update in < 2 seconds. NFR-2 (Compliance/Security): All patient health data must comply with DPA and DOH standards using AES-256 encryption at rest. 4. Precondition Analysis: 'Patient has active HMO insurance' is strictly an Assumption, NOT an internal Precondition. Preconditions must be internal system states verifiable inside the software boundary (e.g. 'Patient medical record exists in database'). External real-world qualifications belong under Assumptions or Remarks."
  },
  {
    id: "q_fintech",
    category: "MODULE 3 & TOPIC 6: FINTECH & DFD BOUNDARIES",
    title: "Scenario 2: FinTech Mobile Wallet & Central Bank (BSP) Anti-Fraud Flow",
    desc: "QuickPay e-wallet launches peer-to-peer transfers. BSP Circular mandates real-time anti-fraud transaction monitoring for amounts exceeding ₱50,000, multi-factor authentication, and encrypted audit trail retention.",
    scenario: "1. Using DFD principles, explain how fund transfers move through processes to data stores. 2. Differentiate features inherent to automation from explicit stakeholder requests. 3. Explain why an automated transaction monitoring process cannot directly write into the Central Bank ledger without violating DFD encapsulation (Mortal Sin #3).",
    requiredKeywords: [
      { term: "data moves / transformation", weight: 3, regex: /\b(data moves|transformed|data flow)\b/i },
      { term: "features inherent to automation", weight: 4, regex: /\bfeatures (that )?inherently (arise|arising) from automation\b/i },
      { term: "explicitly stated requirements", weight: 3, regex: /\bexplicitly stated\b/i },
      { term: "authentication / timeout / audit trail", weight: 3, regex: /\b(authentication|token|audit trail|timeout|session)\b/i },
      { term: "bsp / regulatory supervisory body", weight: 3, regex: /\b(bsp|bangko sentral|regulat(ory|ion))\b/i },
      { term: "mortal sin #3 / entity to data store", weight: 4, regex: /\b(mortal sin (#)?3|entity to data store|direct connection)\b/i },
      { term: "encapsulation / boundary", weight: 4, regex: /\b(encapsulat(ion|ed)|system boundary)\b/i },
      { term: "action verb-object pair", weight: 3, regex: /\baction verb-object\b/i },
      { term: "mediated by process", weight: 3, regex: /\bmediated by (a )?process\b/i }
    ],
    traps: [
      { term: "direct entity to store bypass", penalty: 7, regex: /\bexternal entity can directly write to data store\b/i, reason: "Direct Entity to Data Store connections violate encapsulation and are Mortal Sin #3!" }
    ],
    exemplar: "1. DFD Flow: In the To-Be system, Sender Entity inputs Transfer_Request to Process 1.0 'Execute Transfer', which validates balances against D1 ACCOUNTS and writes to D2 TRANSACTIONS. 2. Requirements Distinction: Explicit Stakeholder Requirements represent user-requested goals (e.g. 'Customer wants to send ₱5,000 to a phone number'). Conversely, Features Inherent to Automation are architectural necessities that arise purely from digitization—such as biometric multi-factor authentication, automated session expiration, and encrypted audit logging to comply with BSP anti-fraud regulations. 3. Mortal Sin Analysis: The automated transaction monitoring system cannot allow an external banking entity or user to directly access or write to an internal data store (Mortal Sin #3). Direct entity-to-store access bypasses software validation, fraud inspection, and encryption, fatally violating data encapsulation. All interactions must be mediated by a process bubble with an action verb-object pair."
  },
  {
    id: "q_sched",
    category: "MODULE 4 & TOPIC 6: BPR & USE CASE ABSTRACTION",
    title: "Scenario 3: University Enrollment & Prerequisite Bypass (BPR)",
    desc: "A university discovered that students shifted majors and enrolled in Senior Systems Analysis without passing prerequisite Database Systems. Registrar clerks checked paper prerequisite forms manually, which were often misplaced or forged.",
    scenario: "1. Apply Root Cause Analysis and Activity Elimination (BPR) to conceptualize the To-Be process. 2. Write a Structured English specification for Process 2.1 'Validate Academic Prerequisites'. 3. Explain why putting 'Clerk clicks blue submit button on modal screen' in an analysis Use Case violates abstraction.",
    requiredKeywords: [
      { term: "root cause analysis", weight: 4, regex: /\broot cause analysis\b/i },
      { term: "activity elimination / bpr", weight: 4, regex: /\bactivity elimination\b/i },
      { term: "structured english", weight: 3, regex: /\bstructured english\b/i },
      { term: "if-then-else logic", weight: 3, regex: /\bif.*then.*else\b/i },
      { term: "prerequisite validation", weight: 3, regex: /\bprerequisite(s)?\b/i },
      { term: "user interface details omitted", weight: 4, regex: /\b(user interface details|ui details|do not incorporate)\b/i },
      { term: "requirements analysis vs design phase", weight: 4, regex: /\b(requirements analysis|design phase)\b/i },
      { term: "what vs how", weight: 3, regex: /\bwhat.*how\b/i },
      { term: "premature coupling", weight: 2, regex: /\b(coupling|premature|implementation)\b/i }
    ],
    traps: [
      { term: "putting ui buttons in use case", penalty: 6, regex: /\bui buttons should be included in use case\b/i, reason: "UI details are strictly banned during requirements analysis!" }
    ],
    exemplar: "1. Analysis: Root Cause Analysis reveals that prerequisite bypass occurred because manual paper checking lacked centralized validation. Through Activity Elimination, the manual paper clerk sign-off is eliminated and replaced with an automated query against D1 ACADEMIC_RECORDS. 2. Structured English for Process 2.1 'Validate Academic Prerequisites':\nIF Student_Prerequisite_Grade >= 75 THEN\n  GENERATE Eligibility_Approval_Token\n  UPDATE D2 ENROLLMENT_STATE WITH 'Prerequisite Cleared'\nELSE\n  REJECT Enrollment_Request WITH 'Prerequisite Failed: Database Systems Required'\n  TERMINATE Transaction\nENDIF\n3. Use Case UI Ban: Specifying that 'Clerk clicks blue submit button on modal screen' violates requirements analysis abstraction. Use cases define WHAT business service is delivered, not HOW the interface widgets appear. Dictating screen buttons creates premature technical coupling; UI specifications belong exclusively in the Design Phase."
  },
  {
    id: "q_pos",
    category: "TOPIC 6: DATA DICTIONARY & GRAY HOLE SINS",
    title: "Scenario 4: Dining Chain Cloud POS & Senior Citizen Discount Auditing",
    desc: "A national restaurant chain was audited by tax authorities because 20% Senior Citizen and PWD discounts were applied inconsistently without logging required government OSCA IDs, causing audit penalties.",
    scenario: "1. Define the formal Data Dictionary EBNF algebraic notation for DISCOUNTED_ORDER. 2. Explain how a Gray Hole Process occurs if the POS computes discounted totals without receiving verification data. 3. Detail the Use Case Extensions for handling invalid senior citizen ID credentials.",
    requiredKeywords: [
      { term: "data dictionary / ebnf notation", weight: 4, regex: /\bdata dictionary\b/i },
      { term: "= + [ | ] { } ( ) operators", weight: 4, regex: /\b(=|\+|\bcomposed of\b|\[.*\|.*\]|\{.*\})\b/i },
      { term: "data element vs record", weight: 3, regex: /\b(data element|record|data structure)\b/i },
      { term: "gray hole phenomenon", weight: 4, regex: /\bgray hole\b/i },
      { term: "inputs are insufficient", weight: 4, regex: /\b(insufficient|not enough input(s)?)\b/i },
      { term: "generate output", weight: 3, regex: /\bgenerate output\b/i },
      { term: "extensions (3a, 3b)", weight: 3, regex: /\bextension(s)?\b/i },
      { term: "continue or terminate", weight: 3, regex: /\b(continue|terminate(d)?)\b/i },
      { term: "detected by the system", weight: 2, regex: /\bdetected by the system\b/i }
    ],
    traps: [
      { term: "confusing gray hole with black hole", penalty: 5, regex: /\bgray hole has no outputs\b/i, reason: "A Gray Hole has outputs, but its inputs are insufficient to produce them!" }
    ],
    exemplar: "1. Data Dictionary EBNF Specification:\nOSCA_ID = 10{Numeric}\nDiscount_Type = [ Senior_Citizen | PWD | Regular ]\nOrder_Item = Item_ID + Item_Quantity + Item_Price\nDISCOUNTED_ORDER = Order_ID + { Order_Item } + Discount_Type + ( OSCA_ID ) + Subtotal + Discount_Amount + Final_Total\n2. Gray Hole Analysis: A Gray Hole occurs when Process 'Calculate Discounted Total' attempts to produce an audited tax receipt with 20% deduction, but only receives Item_Total without receiving the mandatory OSCA_ID input flow. The input is logically insufficient to generate the claimed output. 3. Use Case Extension Specification:\n3a. Customer claims senior citizen discount:\n  1. Cashier enters OSCA ID number.\n  2. System validates ID format.\n  3. If invalid, System prompts error; Use case resumes at Step 2 or terminates with standard pricing."
  },
  {
    id: "q_gov",
    category: "TOPIC 6: DFD SINS & ARCHITECTURAL BALANCING",
    title: "Scenario 5: Municipal Licensing Bureaucracy & Database Sync",
    desc: "A city business licensing portal requires business owners to visit 3 departments (Permits, Fire, Health). An intern analyst proposes connecting the Fire Department database directly to the Business Permit database to sync addresses automatically.",
    scenario: "1. Identify the DFD Mortal Sin in the intern's direct database connection proposal and explain why it fails in real systems. 2. Provide the professional architectural correction. 3. Explain the Law of Balancing between the Context Diagram (Process 0) and Level 1 DFD.",
    requiredKeywords: [
      { term: "mortal sin #1 / store to store", weight: 4, regex: /\b(mortal sin (#)?1|store(-|\s)to(-|\s)store|data store to data store)\b/i },
      { term: "data at rest is passive", weight: 3, regex: /\b(passive|data at rest)\b/i },
      { term: "intermediary process required", weight: 4, regex: /\b(intermediary process|sync process|process)\b/i },
      { term: "context diagram (process 0)", weight: 3, regex: /\bcontext diagram\b/i },
      { term: "no data stores in context", weight: 4, regex: /\bno data store(s)?\b/i },
      { term: "level 1 / top-level dfd", weight: 3, regex: /\blevel 1\b/i },
      { term: "balancing principle", weight: 3, regex: /\bbalanc(ed|ing)\b/i },
      { term: "conservation of data", weight: 3, regex: /\bconservation of data\b/i },
      { term: "parent to child preservation", weight: 3, regex: /\b(parent|child|preserved|maintained)\b/i }
    ],
    traps: [
      { term: "permitting store to store flow", penalty: 7, regex: /\bdata stores can directly communicate\b/i, reason: "Data stores can NEVER connect directly to other data stores!" }
    ],
    exemplar: "1. Mortal Sin Analysis: The intern's proposal represents Mortal Sin #1: Data Store to Data Store direct connection. Data at rest is passive; database storage files cannot autonomously execute replication or validate network packets without an active CPU process. 2. Architectural Correction: An intermediary software process must be introduced: D1 PERMIT_DATA ➔ [Process 3.0 Synchronize Agency Records] ➔ D2 FIRE_CLEARANCES. 3. Balancing Principle: In the Context Diagram, the entire system is represented as Process 0 with NO data stores permitted (internal storage is encapsulated inside the boundary). When Process 0 is exploded into the Level 1 DFD, all boundary input and output flows from the external entities must be strictly maintained and accounted for under Conservation of Data. Internal flows between processes and data stores appear only on Level 1 and below."
  },
  {
    id: "q_atm",
    category: "MODULE 4: UML USE CASE SEMANTICS",
    title: "Scenario 6: Banking ATM Semantics (Includes vs Extends Nuances)",
    desc: "A software architect models an Automated Teller Machine (ATM) session. Classic textbooks claim that '<<includes>> is always required while <<extends>> is optional'. However, in an ATM session, a client chooses one or more transactions from Withdraw, Deposit, or Inquire Balance.",
    scenario: "1. Resolve the 'Includes Required vs Extends Optional' dilemma as highlighted in course slides 38–39. 2. Contrast modeling the ATM transactions via <<includes>> vs Generalization/Specialization. 3. Detail the role of a Global Asterisk (*) Extension during an active transaction.",
    requiredKeywords: [
      { term: "includes required vs extends optional", weight: 3, regex: /\bincludes.*extends\b/i },
      { term: "generally true but not absolute", weight: 4, regex: /\b(not absolute|generally true)\b/i },
      { term: "atm transaction example", weight: 3, regex: /\batm\b/i },
      { term: "client does one or more", weight: 3, regex: /\bone or more\b/i },
      { term: "matter of semantics / relaxed", weight: 4, regex: /\b(semantics|relaxed)\b/i },
      { term: "generalization / specialization", weight: 3, regex: /\b(generalization|specialization)\b/i },
      { term: "superclass - subclass", weight: 3, regex: /\b(superclass|subclass)\b/i },
      { term: "global asterisk (*) extension", weight: 4, regex: /\b(\*|asterisk|global extension)\b/i },
      { term: "triggered at any point (help / call)", weight: 3, regex: /\b(any point|help|cancel)\b/i }
    ],
    traps: [
      { term: "stating includes is 100% absolute in all systems", penalty: 5, regex: /\bincludes is always 100% mandatory without exception\b/i, reason: "Course slides 38-39 explicitly emphasize that includes being required is generally true but NOT absolute!" }
    ],
    exemplar: "1. Semantic Dilemma (Slides 38–39): The textbook maxim that '<<includes>> is mandatory and <<extends>> is optional' is generally true but is NOT absolute. In an ATM session, modeling Process ATM Transaction as <<includes>> Withdraw Cash, Deposit, and Inquire Balance does not mean the user must execute all three; the client selects one or more transactions. In enterprise analysis, these rules can be relaxed as a matter of semantics. 2. Alternative Modeling: Many architects model ATM transactions using Generalization / Specialization, where Withdraw Cash and Deposit to Account inherit as specialized child use cases from the generic parent use case 'ATM Transaction' (superclass-subclass relationship). 3. Global Asterisk (*) Extension: Denoted by an asterisk (*), this represents an alternate or exception path that can be triggered at ANY point during the session (e.g. '*a. Client presses Cancel button' or '*b. System detects card reader hardware tamper'), instantly terminating the session safely."
  }
];
