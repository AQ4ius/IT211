# IT 211 RAM • Systems Analyst AI Training Arena

A complete web application engineered to train students in **Requirements Engineering**, **Data Flow Diagramming (DFD)**, **Data Dictionaries**, and **UML Use Case Modeling**, with an automated regex-based essay checking engine and architecture linter.

---

## 🚀 How to Host This Website

This application is 100% static (HTML5, CSS3, ES6 JavaScript) with zero server dependencies or databases required. You can host it in multiple ways:

### Method 1: Instant 1-Click Cloud Hosting on Netlify Drop (100% Free)
1. Open your browser and go to **[app.netlify.com/drop](https://app.netlify.com/drop)**.
2. Drag and drop the whole `it211_training_arena` folder directly into the Netlify box on your browser.
3. Done! Netlify will immediately give you a live public HTTPS link (e.g. `https://it211-trainer.netlify.app`) that you can open on your laptop, phone, or tablet anywhere.

---

### Method 2: Free Permanent Cloud Hosting on GitHub Pages
1. Create a new repository on GitHub (e.g. `it211-ram-trainer`).
2. In this folder (`it211_training_arena`), run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of IT 211 Training Arena"
   git branch -M main
   git remote add origin https://github.com/<your-username>/it211-ram-trainer.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings** > **Pages**.
4. Under **Branch**, select `main` and root `/`, then click **Save**.
5. Your website will be permanently live at:
   `https://<your-username>.github.io/it211-ram-trainer/`

---

### Method 3: 1-Click Local Hosting on Your Computer
* Simply double-click **`start-server.bat`** in this folder!
* It automatically starts a local HTTP server and opens your default browser directly to:
  `http://localhost:8080/`
* To share with classmates or access on your phone connected to the same Wi-Fi, open:
  `http://<your-computer-local-ip>:8080/`

---

## 📂 Project Architecture

```
it211_training_arena/
├── index.html           # Main application interface
├── css/
│   └── style.css        # Clean responsive styles & blue/white theme
├── js/
│   ├── app.js           # Core controller, tab router & event listeners
│   ├── questions.js     # Exam questions with regex token matchers & penalties
│   ├── flashcards.js    # Active recall flashcard deck across 4 modules
│   └── dfd-engine.js    # Interactive SVG DFD canvas & Mortal Sin Linter
├── serve.ps1            # Native PowerShell web server (zero install required)
├── start-server.bat     # Windows double-clickable launcher
├── .nojekyll            # Ensures static asset loading on GitHub Pages
└── README.md            # This hosting guide
```

---

## 🎯 Features

1. **Essay AI Grader:** Tests against the exact keywords, token density, and penalty traps checked by automated university grading bots.
2. **Interactive DFD Builder:** Drag and drop processes, external entities, and data stores. The automated linter catches the 10 Mortal Sins (e.g. Store-to-Store, Entity-to-Store, Miracles, Black Holes, Recursive Loops).
3. **Active Recall Flashcards:** 3D flipping flashcards with module filtering and textbook answers.
4. **Forensics Tab:** Explains the mechanics of why a 290-word essay scored 6/30 and how an 85-word essay achieves a full 30/30.
