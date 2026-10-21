/**
 * IT 211 RAM • Exam Question Bank & Regex Grading Matchers
 * Extracted directly from Saint Louis University CS131 / IT211 RAM Modules 3 & 4
 */

const QUESTION_BANK = [
  {
    id: "q1",
    category: "MODULE 3: DFD FUNDAMENTALS",
    title: "Explain the Principle of Balancing in DFDs and why it enforces Conservation of Data.",
    desc: "Discuss parent and child DFDs, how flows must be preserved across functional decomposition, and what constitutes an unbalanced diagram.",
    requiredKeywords: [
      { term: "balancing", weight: 3, regex: /\bbalanc(ed|ing)\b/i },
      { term: "parent (dfd|process)", weight: 3, regex: /\bparent\b/i },
      { term: "child (dfd|process|decomposition)", weight: 3, regex: /\bchild\b/i },
      { term: "input and output (flows)", weight: 4, regex: /\b(input|inputs)\b.*\b(output|outputs)\b/i },
      { term: "maintained / preserved", weight: 3, regex: /\b(maintain(ed)?|preserv(ed)?)\b/i },
      { term: "conservation of data", weight: 4, regex: /\bconservation of data\b/i },
      { term: "functional decomposition / explosion", weight: 3, regex: /\b(functional decomposition|explosion|leveling)\b/i },
      { term: "syntax error", weight: 3, regex: /\bsyntax error(s)?\b/i },
      { term: "accounted for", weight: 2, regex: /\baccounted for\b/i },
      { term: "case tool", weight: 2, regex: /\bcase tool(s)?\b/i }
    ],
    traps: [
      { term: "timing / sequence / loops", penalty: 5, regex: /\b(loop(s)?|timing|chronological|step 1 then step 2)\b/i, reason: "DFDs do NOT depict timing, sequencing, or loops." }
    ],
    exemplar: "Balancing is the fundamental architectural principle in functional decomposition ensuring that all input and output data flows entering or exiting a higher-level parent DFD bubble are strictly maintained and preserved in its decomposed child DFD. Under conservation of data, data can neither be created nor destroyed; the source of each data element must be accounted for across every level. If a parent process has two incoming flows and one outgoing flow, its child decomposition must account for those exact external flows. Failing to maintain this consistency produces an unbalanced DFD, which is a severe syntax error flagged during automated CASE tool compilation and structured walkthroughs."
  },
  {
    id: "q2",
    category: "MODULE 4: UML USE CASES",
    title: "State the Golden Precondition Rule in Use Case Specifications. Why is 'Student passed admission' invalid?",
    desc: "Distinguish between internal system states vs. external real-world assumptions. Contrast the student enrollment scenario.",
    requiredKeywords: [
      { term: "precondition(s)", weight: 3, regex: /\bprecondition(s)?\b/i },
      { term: "internal system state", weight: 4, regex: /\b(internal|system state(s)?)\b/i },
      { term: "set in the system (not outside)", weight: 4, regex: /\b(in the system|inside the system)\b/i },
      { term: "system boundary", weight: 3, regex: /\bsystem boundary\b/i },
      { term: "assumption(s) / remarks", weight: 4, regex: /\bassumption(s)?\b/i },
      { term: "outside the system", weight: 3, regex: /\boutside\b/i },
      { term: "enrolment vs admission", weight: 3, regex: /\b(admission|enrol(l)?ment)\b/i },
      { term: "logged in / session", weight: 3, regex: /\b(log(ged)? in|session|credentials)\b/i },
      { term: "verifiable in software", weight: 3, regex: /\bverifi(able|ed)\b/i }
    ],
    traps: [
      { term: "calling admission a precondition", penalty: 8, regex: /\badmission is a precondition\b/i, reason: "Admission occurs outside the enrollment system boundary, making it an assumption, NOT a precondition!" }
    ],
    exemplar: "The Golden Precondition Rule mandates that preconditions must represent system states that are expected to be true when the use case begins and must have been set in the system, not outside of it. A valid precondition is verifiable by the software itself, such as 'the student is successfully logged into the system' with active session credentials. Conversely, stating that a 'student passed admission' or 'graduated high school' is strictly invalid as a precondition because admission takes place outside the enrollment software system boundary. External real-world qualifications belong under Assumptions or Remarks, because the enrollment system cannot directly verify external human actions without an internal record already existing."
  },
  {
    id: "q3",
    category: "TOPIC 6: DFD QUALITY & MORTAL SINS",
    title: "Differentiate between a Miracle, a Black Hole, and a Gray Hole in Data Flow Diagrams.",
    desc: "Provide the exact input/output conditions for each anomaly and cite how they violate data conservation.",
    requiredKeywords: [
      { term: "miracle / spontaneous generation", weight: 4, regex: /\b(miracle|spontaneous generation)\b/i },
      { term: "zero inputs / no incoming flow", weight: 3, regex: /\b(no in(put)?|zero input(s)?|without input)\b/i },
      { term: "black hole", weight: 4, regex: /\bblack hole\b/i },
      { term: "zero outputs / no outgoing flow", weight: 3, regex: /\b(no out(put)?|zero output(s)?|without output)\b/i },
      { term: "gray hole", weight: 4, regex: /\bgray hole\b/i },
      { term: "inputs are insufficient", weight: 4, regex: /\b(insufficient|not enough input(s)?)\b/i },
      { term: "generate output", weight: 3, regex: /\bgenerate output\b/i },
      { term: "conservation of data", weight: 3, regex: /\bconservation of data\b/i },
      { term: "syntax / semantic error", weight: 2, regex: /\b(syntax|semantic(s)?)\b/i }
    ],
    traps: [
      { term: "confusing black hole with data store", penalty: 5, regex: /\bblack hole is a data store\b/i, reason: "A Black Hole is a process error where data enters but never exits." }
    ],
    exemplar: "In Data Flow Diagramming, three pathological process errors violate data consistency: 1. A Miracle (Spontaneous Generation) occurs when a process produces output data flows despite having no incoming data flows, violating conservation of data by creating information out of nothing. 2. A Black Hole occurs when a process absorbs input data flows but produces no outgoing data flows, causing data to permanently vanish from the system without generating value. 3. A Gray Hole occurs when a process has both inputs and outputs, but the incoming data flows are logically insufficient to generate the claimed output (e.g. inputting only Raw_Scores and attempting to produce a Complete_Transcript_With_Honors without querying student history)."
  },
  {
    id: "q4",
    category: "MODULE 4: UML USE CASES",
    title: "Compare <<includes>> vs <<extends>> vs Generalization in Use Case Diagrams. Explain arrow directions.",
    desc: "Define mandatory subroutines, conditional interruptions, and superclass/subclass inheritance with arrow orientations.",
    requiredKeywords: [
      { term: "<<includes>>", weight: 3, regex: /\binclude(s)?\b/i },
      { term: "base to included (arrow)", weight: 3, regex: /\b(base to included|from base to)\b/i },
      { term: "mandatory / common reuse", weight: 3, regex: /\b(mandatory|reus(e|ed)|explicitly)\b/i },
      { term: "<<extends>>", weight: 3, regex: /\bextend(s)?\b/i },
      { term: "extending to base (arrow)", weight: 3, regex: /\b(extending to base|from extending)\b/i },
      { term: "conditional / optional interruption", weight: 3, regex: /\b(condition(al)?|optional|interrupt(s)?)\b/i },
      { term: "generalization / specialization", weight: 3, regex: /\b(generalization|specialization)\b/i },
      { term: "superclass - subclass", weight: 3, regex: /\b(superclass|subclass|inherit(s)?)\b/i },
      { term: "hollow triangle arrow", weight: 3, regex: /\b(triangle|hollow)\b/i },
      { term: "dashed arrow", weight: 3, regex: /\bdashed\b/i }
    ],
    traps: [
      { term: "pointing extends towards extension", penalty: 6, regex: /\bextends points from base to extending\b/i, reason: "Wrong arrow direction! In UML, <<extends>> points FROM Extending TO Base!" }
    ],
    exemplar: "In UML Use Case modeling: 1. <<includes>> represents a mandatory relationship where the base use case explicitly incorporates the behavior of another use case for common reuse; the dashed arrow points FROM Base TO Included (Base ──> Included). 2. <<extends>> represents an optional, conditional interruption where the extending use case inserts behavior into the base use case at a specific extension point; the dashed arrow points strictly FROM Extending TO Base (Extending ──> Base). 3. Generalization / Specialization represents inheritance analogous to the superclass-subclass relationship in object-oriented programming, where a specialized child inherits all parent behaviors; it is depicted with a solid line and a hollow triangle arrow pointing to the parent use case."
  },
  {
    id: "q5",
    category: "MODULE 3: REQUIREMENTS ENGINEERING",
    title: "Differentiate Functional from Non-Functional Requirements. Give concrete examples from the lecture slides.",
    desc: "Explain the definition of each, how they are tested, and cite slide examples (e.g. senior citizen discount, dashboard statistics).",
    requiredKeywords: [
      { term: "functional requirements", weight: 3, regex: /\bfunctional requirement(s)?\b/i },
      { term: "services / functions", weight: 3, regex: /\b(service(s)?|function(s)?)\b/i },
      { term: "computations / business rules", weight: 3, regex: /\b(computation(s)?|business rule(s)?)\b/i },
      { term: "non-functional requirements", weight: 3, regex: /\bnon(-|\s)?functional\b/i },
      { term: "quality characteristics / constraints", weight: 4, regex: /\b(quality|constraint(s)?)\b/i },
      { term: "performance / usability / reliability", weight: 4, regex: /\b(performance|usability|reliability|safety)\b/i },
      { term: "discount / sales / gpa (FR example)", weight: 3, regex: /\b(discount|gpa|sales|tax|payroll)\b/i },
      { term: "24 hours / themes / response time (NFR example)", weight: 3, regex: /\b(24 hours|theme(s)?|speed|uptime)\b/i }
    ],
    traps: [
      { term: "calling performance a functional requirement", penalty: 5, regex: /\bperformance is a functional requirement\b/i, reason: "Performance is a Non-Functional Requirement (quality attribute)!" }
    ],
    exemplar: "Functional Requirements define the specific functions, services, computations, and business rules provided by the software system. For example, the lecture slides cite that the system must compute student GPA, allow cashiers to scan barcodes, and accommodate 20% senior citizen discounts. In contrast, Non-Functional Requirements specify quality characteristics and systemic constraints that dictate how the system must perform. Examples from the slides include usability (users customizing backgrounds from theme choices), performance (dashboard statistics updating every 24 hours), security, and compliance with regulatory bodies like CHED and BSP."
  },
  {
    id: "q6",
    category: "TOPIC 6: DFD QUALITY & LINTER",
    title: "Why can CASE tools detect Syntax Errors but CANNOT detect Semantics Errors? How are semantics errors caught?",
    desc: "Explain grammatical rule checking vs understanding business domain logic, and cite the role of walkthroughs.",
    requiredKeywords: [
      { term: "syntax errors", weight: 3, regex: /\bsyntax error(s)?\b/i },
      { term: "grammatical rules of dfd", weight: 3, regex: /\bgrammatical\b/i },
      { term: "case tools have syntax checkers", weight: 4, regex: /\bcase tool(s)?\b/i },
      { term: "semantics errors", weight: 3, regex: /\bsemantic(s)? error(s)?\b/i },
      { term: "misunderstandings by the analyst", weight: 4, regex: /\bmisunderstanding(s)?\b/i },
      { term: "collecting / analyzing / reporting", weight: 3, regex: /\b(collecting|analyzing|reporting)\b/i },
      { term: "walk-through(s)", weight: 4, regex: /\bwalk(-|\s)?through(s)?\b/i },
      { term: "user validation", weight: 3, regex: /\buser validation\b/i }
    ],
    traps: [
      { term: "claiming case tools find all errors", penalty: 6, regex: /\bcase tools can detect semantics errors\b/i, reason: "CASE tools cannot detect semantics errors because they lack business domain knowledge." }
    ],
    exemplar: "Syntax errors are grammatical violations that break the formal rules of the DFD language (such as connecting an entity directly to a data store, creating black holes, or drawing bidirectional arrows). Because these rules are programmatic, automated CASE tools have built-in syntax checkers that easily detect and flag them. In contrast, Semantics Errors are misunderstandings by the analyst in collecting, analyzing, and reporting information about the system. A DFD can be 100% syntactically valid yet semantically completely wrong (such as calculating payroll using incorrect tax formulas or omitting required audit approvals). CASE tools cannot understand business context; therefore, semantics errors must be validated through structured walk-throughs and user validation."
  }
];
