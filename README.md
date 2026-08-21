# Scoresh 🏏 — Dynamic Cricket Platform
> **Your cricket. Your tournament. Your score.**

Scoresh is a modern, responsive, data-driven cricket scoring and tournament management engine. Built with pure client-side modular JavaScript, it starts with a clean zero-hardcoded state and powers school, college, corporate, and club cricket tournaments.

---

## 🌟 Key Highlights & Capabilities

- **Zero Fixed / Hardcoded Data**: Starts clean with no predefined teams, players, or tournaments. All data is dynamically created and owned by the user.
- **First Screen Choice & Setup Wizard**:
  - Welcome screen with options to *Create a New Tournament*, *View All Tournaments*, or *Join Leagues*.
  - 4-step setup wizard: Details (T10, T20, ODI, Test, Custom Overs), Team Registration, Player Squads, and Round-Robin Schedule Generator.
- **Multi-Tournament Architecture**:
  - `Tournament` $\rightarrow$ `Teams` $\rightarrow$ `Players` $\rightarrow$ `Matches` $\rightarrow$ `Innings` $\rightarrow$ `Overs` $\rightarrow$ `Balls` $\rightarrow$ `Scorecards` $\rightarrow$ `Points Table` $\rightarrow$ `Records`.
  - Seamlessly manage multiple tournaments (e.g., *Summer League*, *Inter-College Cup*, *Weekend League*) independently without data interference.
- **Professional Live Scoring State Machine**:
  - 1-click live scoring pad: `0`, `1`, `2`, `3`, `4`, `6`, `Wide`, `No Ball`, `Bye`, `Leg Bye`, `Wicket`.
  - Real-time strike rotation on odd runs & over completions.
  - Full dismissal modal (Bowled, Caught, LBW, Run Out, Stumped, Hit Wicket) with fielder selection and next batsman entry.
  - Ball-by-ball commentary stream with custom commentary notes.
  - Innings break target setup and automatic chase winner calculation.
- **Dynamic Points Table & Net Run Rate (NRR)**:
  - Real-time computation of `Played (P)`, `Won (W)`, `Lost (L)`, `Tied (T)`, `NR`, `Points (PTS)`, and `Net Run Rate (NRR)`.
- **Tournament Records & Leaderboards**:
  - Dynamic **Orange Cap** (Most Runs), **Purple Cap** (Most Wickets), Highest Scores, Strike Rates, Sixes count, Economy rates, and Milestones (Centuries, 50s).
- **Decoupled Persistence & Portability**:
  - `StorageService` repository layer saving to `localStorage` with JSON export/import and print-ready match scorecards.

---

## 📐 Mathematical Formulas (From C Reference)

### 1. Batsman Runs
$$\text{Runs} = (1 \times \text{ones}) + (2 \times \text{twos}) + (3 \times \text{threes}) + (4 \times \text{fours}) + (6 \times \text{sixes})$$

### 2. Strike Rate
$$\text{Strike Rate} = \left(\frac{\text{Runs}}{\text{Balls}}\right) \times 100 \quad (\text{Safe: returns } 0.00 \text{ when Balls} = 0)$$

### 3. Bowler Economy Rate
$$\text{Economy} = \frac{\text{Runs Conceded}}{\text{Overs Bowled Fraction}} \quad (\text{where } 4.5 \text{ ov} = 4 + \frac{5}{6} = 4.8333 \text{ ov})$$

### 4. Net Run Rate (NRR)
$$\text{NRR} = \left(\frac{\text{Total Runs Scored}}{\text{Total Overs Faced}}\right) - \left(\frac{\text{Total Runs Conceded}}{\text{Total Overs Bowled}}\right)$$

---

## 🏗️ Architecture & Project Structure

```
scoresh/
├── index.html                   # Dynamic SPA with Welcome Screen, Wizard, Live Scoring, Standings, Records
├── css/
│   ├── main.css                 # Design tokens, clean layout, sticky topbar with Tournament Switcher
│   ├── components.css           # Live scoring pad, commentary feed, points table, squad cards, wizard
│   └── responsive.css           # Mobile navigation drawer, responsive scorecards, touch controls, print styles
├── js/
│   ├── models.js                # Data classes: Tournament, Team, Player, Match, Innings, Batsman, Bowler, BallEvent
│   ├── calculations.js          # Pure cricket math engine: Runs, SR, Fractional Economy, CRR, RRR, NRR, Standings, Records
│   ├── storage.js               # Decoupled Data Layer & Repository (StorageService, JSON Export/Import)
│   ├── state.js                 # Central State Manager (activeTournament, activeMatch, search, events)
│   ├── wizard.js                # Tournament Setup Wizard (Details -> Teams -> Squads -> Schedule)
│   ├── modals.js                # Modals: Create Match, Toss, Dismissal, Change Bowler, Squads, Confirmation
│   ├── scoring.js               # Live Scoring Engine: Ball recorder, strike rotation, extras, wickets, commentary
│   ├── charts.js                # Dynamic Chart.js analytics: Runs, shot distributions, bowling figures
│   ├── ui.js                    # UI Renderers: Welcome screen, Dashboard, Fixtures, Squads, Live Match, Points Table
│   └── app.js                   # Application Bootstrapper, routing, search filters, and action dispatchers
└── README.md                    # Platform documentation and guide
```

---

## 🚀 How to Run

1. **Direct Browser Execution**:
   Double-click `index.html` in Windows Explorer to open in any web browser.
2. **Local HTTP Server (Optional)**:
   ```bash
   python -m http.server 8000
   ```
   Open `http://localhost:8000` in your web browser.
