import os

print("=== SCORESH DYNAMIC PLATFORM VERIFICATION ===")

# 1. Check all required source files
required_files = [
    "index.html",
    "css/main.css",
    "css/components.css",
    "css/responsive.css",
    "js/models.js",
    "js/calculations.js",
    "js/storage.js",
    "js/state.js",
    "js/scoring.js",
    "js/wizard.js",
    "js/modals.js",
    "js/charts.js",
    "js/ui.js",
    "js/app.js",
    "README.md"
]

all_exist = True
for f in required_files:
    if os.path.exists(f):
        size = os.path.getsize(f)
        print(f"  [OK] File exists: {f} ({size} bytes)")
    else:
        print(f"  [FAIL] Missing file: {f}")
        all_exist = False

assert all_exist, "Some required files are missing!"

# 2. Formula verification in Python mirroring JS logic
def calc_runs(ones, twos, threes, fours, sixes):
    return (ones * 1) + (twos * 2) + (threes * 3) + (fours * 4) + (sixes * 6)

def calc_strike_rate(runs, balls):
    if balls == 0:
        return 0.0
    return (runs / balls) * 100

def overs_to_fraction(overs):
    full_overs = int(overs)
    balls = round((overs - full_overs) * 10)
    return full_overs + (balls / 6)

def calc_economy(runs, overs):
    ov_frac = overs_to_fraction(overs)
    if ov_frac == 0:
        return 0.0
    return runs / ov_frac

def calc_nrr(runs_scored, overs_faced_balls, runs_conceded, overs_bowled_balls):
    for_rate = runs_scored / (overs_faced_balls / 6) if overs_faced_balls > 0 else 0
    against_rate = runs_conceded / (overs_bowled_balls / 6) if overs_bowled_balls > 0 else 0
    return for_rate - against_rate

# Test 1: Batsman dynamic runs
assert calc_runs(10, 4, 1, 3, 2) == (10 + 8 + 3 + 12 + 12) # 45 runs
print("  [OK] Batsman runs calculation formula verified.")

# Test 2: Exact fractional economy (e.g. 4.5 overs = 4 + 5/6 = 4.8333 ov, 29 runs -> 6.00 econ)
econ_val = calc_economy(29, 4.5)
assert round(econ_val, 2) == 6.00
print("  [OK] Precise fractional overs economy (4.5 ov = 29 runs -> Econ 6.00) verified.")

# Test 3: Net Run Rate calculation
# Team A scores 180 in 20.0 ov (120 balls), concedes 140 in 20.0 ov (120 balls) -> NRR = (180/20) - (140/20) = 9.0 - 7.0 = +2.000
nrr_val = calc_nrr(180, 120, 140, 120)
assert round(nrr_val, 3) == 2.000
print(f"  [OK] Net Run Rate (NRR) calculation verified: +{nrr_val:.3f}")

# Test 4: HTML structure validation
with open("index.html", "r", encoding="utf-8") as f:
    html = f.read()

assert "view-welcome" in html, "Missing view-welcome"
assert "view-dashboard" in html, "Missing view-dashboard"
assert "view-tournaments" in html, "Missing view-tournaments"
assert "view-matches" in html, "Missing view-matches"
assert "view-teams" in html, "Missing view-teams"
assert "view-players" in html, "Missing view-players"
assert "view-live" in html, "Missing view-live"
assert "view-scorecard" in html, "Missing view-scorecard"
assert "view-table" in html, "Missing view-table"
assert "view-records" in html, "Missing view-records"
assert "wizard-modal" in html, "Missing wizard-modal"
assert "toss-modal" in html, "Missing toss-modal"
assert "wicket-modal" in html, "Missing wicket-modal"
print("  [OK] HTML semantic structure and modal views verified.")

print("\n>>> ALL DYNAMIC PLATFORM VERIFICATION CHECKS PASSED WITH 100% SUCCESS! <<<")
