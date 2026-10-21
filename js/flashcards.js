/**
 * IT 211 RAM • Active Recall Flashcards Database
 * Comprehensive review cards across all 4 modules
 */

const FLASHCARDS = [
  {
    module: "dfd",
    category: "MODULE 3: DFD RULES",
    question: "What is the single governing rule of the Context Diagram regarding Data Stores?",
    answer: "<strong>NO DATA STORES SHALL EVER APPEAR ON A CONTEXT DIAGRAM.</strong><br><br><em>Rationale:</em> Internal data stores are encapsulated inside Process 0. External databases belonging to other organizations are modeled as External Entities, not data stores."
  },
  {
    module: "requirements",
    category: "MODULE 3: REQUIREMENTS",
    question: "Why is 'Student passed admission exam' strictly INVALID as a Precondition in Use Cases?",
    answer: "Preconditions <strong>must be internal system states set inside the software</strong> (e.g. authenticated session token).<br><br>Passing an exam is an external real-world event outside the enrollment software boundary. It is an <strong>Assumption</strong>, NOT a precondition."
  },
  {
    module: "sins",
    category: "TOPIC 6: MORTAL SINS",
    question: "What is Mortal Sin #1, and why is it physically impossible in software systems?",
    answer: "<strong>Data Store to Data Store directly.</strong><br><br>Data at rest is passive; database files cannot autonomously transfer or synchronize themselves without an active software process reading and writing."
  },
  {
    module: "usecases",
    category: "MODULE 4: UML USE CASES",
    question: "In what direction does the dashed arrow point for an <<extends>> relationship?",
    answer: "The dashed arrow points <strong>FROM the Extending Use Case TO the Base Use Case</strong> (<code style='color: #38bdf8;'>Extending ──> Base</code>).<br><br><em>Why:</em> The extending use case references the base use case's extension point, while the base use case remains completely independent."
  },
  {
    module: "usecases",
    category: "MODULE 4: UML USE CASES",
    question: "In what direction does the dashed arrow point for an <<includes>> relationship?",
    answer: "The dashed arrow points <strong>FROM the Base Use Case TO the Included Use Case</strong> (<code style='color: #38bdf8;'>Base ──> Included</code>).<br><br><em>Why:</em> The base use case explicitly invokes the included subroutine whenever it executes."
  },
  {
    module: "dfd",
    category: "MODULE 3: DFD RULES",
    question: "State Miller's 5 ± 2 Rule for DFD process density.",
    answer: "A DFD must contain <strong>between 3 to 7 processes (5 ± 2)</strong>, and <strong>must never exceed 9 processes</strong>.<br><br>Top-level diagrams should have 4 to 7 processes; lower levels should have 2 to 5 processes."
  },
  {
    module: "sins",
    category: "TOPIC 6: MORTAL SINS",
    question: "Differentiate a 'Miracle' from a 'Gray Hole'.",
    answer: "• <strong>Miracle:</strong> A process produces output with <em>zero incoming flows</em> (creating data out of nothing).<br>• <strong>Gray Hole:</strong> A process has inputs, but the inputs are <em>logically insufficient</em> to generate the claimed output."
  },
  {
    module: "sins",
    category: "TOPIC 6: MORTAL SINS",
    question: "What is a 'Black Hole Process'?",
    answer: "A process that absorbs one or more incoming data flows but produces <strong>zero outgoing data flows</strong>. Data enters the process and permanently vanishes without generating value or state."
  },
  {
    module: "sins",
    category: "TOPIC 6: MORTAL SINS",
    question: "Why are bidirectional / double-headed arrows forbidden in DFDs?",
    answer: "A data flow represents a <strong>unidirectional, atomic movement of a specific data packet</strong>. Bidirectional arrows cause ambiguity about what data is moving where. Dependent flows must be drawn as two separate arrows."
  },
  {
    module: "requirements",
    category: "MODULE 3: REQUIREMENTS",
    question: "What are the 7 characteristics of a high-quality requirement in an SRS?",
    answer: "1. <strong>Necessary</strong><br>2. <strong>Appropriate</strong><br>3. <strong>Unambiguous</strong><br>4. <strong>Feasible</strong><br>5. <strong>Verifiable / Testable</strong><br>6. <strong>Correct</strong><br>7. <strong>Consistent with organizational objectives</strong>"
  },
  {
    module: "requirements",
    category: "MODULE 3: REQUIREMENTS",
    question: "What are 'Features Inherent to Automation'? Give two examples.",
    answer: "Features that arise solely because a manual process is converted into a computer software system. Stakeholders rarely ask for them explicitly.<br><br><em>Examples:</em> User registration / authentication, document file uploading instead of email, and session timeout management."
  },
  {
    module: "usecases",
    category: "MODULE 4: UML USE CASES",
    question: "What does the Asterisk (*) symbol mean when placed on a Use Case Extension?",
    answer: "It denotes a <strong>Global Extension</strong> that can be triggered at <strong>any step</strong> throughout the main success scenario.<br><br><em>Examples:</em> Invoking the help facility, or receiving an incoming call/SMS on a mobile app."
  },
  {
    module: "dfd",
    category: "MODULE 3: DFD RULES",
    question: "What is the difference between Syntax Errors and Semantics Errors in DFD validation?",
    answer: "• <strong>Syntax Errors:</strong> Grammatical rule violations (e.g. crossing lines, black holes). <em>Detected automatically by CASE tools.</em><br>• <strong>Semantics Errors:</strong> Misunderstandings of business logic. <em>CANNOT be detected by CASE tools; caught only via walkthroughs and user validation.</em>"
  },
  {
    module: "usecases",
    category: "MODULE 4: UML USE CASES",
    question: "Why are UI elements (buttons, screens) strictly banned in Requirements Analysis Use Cases?",
    answer: "Analysis defines <strong>WHAT</strong> the system must do, not <strong>HOW</strong> the interface looks.<br><br>Specifying buttons and drop-downs creates premature technical coupling. UI design belongs strictly in the <strong>Design Phase</strong>."
  },
  {
    module: "usecases",
    category: "MODULE 4: UML USE CASES",
    question: "Who are the 'Tres Amigos' of UML?",
    answer: "<strong>Ivar Jacobson</strong> (creator of Use Cases), <strong>James Rumbaugh</strong> (OMT), and <strong>Grady Booch</strong> (Booch Method). In the mid-1990s, they unified object-oriented modeling into UML."
  },
  {
    module: "dfd",
    category: "MODULE 3: DFD RULES",
    question: "What is the formula for naming a Process Symbol in a DFD?",
    answer: "A process must always be named with an <strong>Action Verb-Object Pair</strong> (e.g., <em>Compute Final Grade</em>, <em>Update Price</em>, <em>Validate Payment</em>), paired with a unique reference number."
  },
  {
    module: "requirements",
    category: "MODULE 3: REQUIREMENTS",
    question: "What are the 5 advanced analysis strategies used to visualize the To-Be system?",
    answer: "1. <strong>Root Cause Analysis</strong> (5 Whys / Fishbone)<br>2. <strong>Benchmarking</strong><br>3. <strong>Technology Analysis</strong><br>4. <strong>Activity Elimination</strong><br>5. <strong>Cost and Duration Analysis</strong>"
  },
  {
    module: "sins",
    category: "TOPIC 6: MORTAL SINS",
    question: "What is a 'Dead Data Store'?",
    answer: "A data store that has outgoing flows (data read/retrieved) but <strong>zero incoming flows (no writes, updates, or inserts)</strong> across all levels of the DFD hierarchy."
  }
];
