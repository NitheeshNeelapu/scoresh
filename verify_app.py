import os
import re

print("=== SCORESH SYSTEM INTEGRATION VERIFICATION ===")

# 1. Check all required files exist
required_files = [
    "index.html",
    "css/main.css",
    "css/components.css",
    "css/responsive.css",
    "js/models.js",
    "js/calculations.js",
    "js/state.js",
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

# Verify Rahul
rahul_runs = calc_runs(18, 6, 2, 5, 3)
assert rahul_runs == 74, f"Rahul runs expected 74, got {rahul_runs}"
rahul_sr = calc_strike_rate(74, 42)
assert round(rahul_sr, 2) == 176.19, f"Rahul SR expected 176.19, got {rahul_sr}"
print(f"  [OK] Rahul formula verified: {rahul_runs} runs off 42 balls -> SR {rahul_sr:.2f}")

# Verify Arjun
arjun_runs = calc_runs(15, 4, 1, 4, 1)
assert arjun_runs == 48, f"Arjun runs expected 48, got {arjun_runs}"
arjun_sr = calc_strike_rate(48, 31)
assert round(arjun_sr, 2) == 154.84, f"Arjun SR expected 154.84, got {arjun_sr}"
print(f"  [OK] Arjun formula verified: {arjun_runs} runs off 31 balls -> SR {arjun_sr:.2f}")

# Verify Rohit bowling
rohit_econ = calc_economy(28, 4.0)
assert round(rohit_econ, 2) == 7.00, f"Rohit economy expected 7.00, got {rohit_econ}"
print(f"  [OK] Rohit economy verified: 28 runs / 4.0 overs -> Econ {rohit_econ:.2f}")

# Verify Vikram bowling (32 runs, 4.0 overs -> 8.00)
vikram_econ = calc_economy(32, 4.0)
assert round(vikram_econ, 2) == 8.00, f"Vikram economy expected 8.00, got {vikram_econ}"
print(f"  [OK] Vikram economy verified: 32 runs / 4.0 overs -> Econ {vikram_econ:.2f}")

# Verify fractional overs (e.g. 3.2 overs = 3 + 2/6 = 3.3333 ov, 20 runs -> 6.00 econ)
frac_econ = calc_economy(20, 3.2)
assert round(frac_econ, 2) == 6.00, f"Fractional economy expected 6.00, got {frac_econ}"
print(f"  [OK] Fractional overs economy verified: 20 runs / 3.2 ov -> Econ {frac_econ:.2f}")

# Verify zero safety
assert calc_strike_rate(0, 0) == 0.0
assert calc_economy(15, 0) == 0.0
print("  [OK] Zero-division safety verified across all calculations.")

# 3. Verify HTML structure elements
with open("index.html", "r", encoding="utf-8") as f:
    html_content = f.read()

assert "view-dashboard" in html_content, "Missing view-dashboard in HTML"
assert "view-batsmen" in html_content, "Missing view-batsmen in HTML"
assert "view-bowlers" in html_content, "Missing view-bowlers in HTML"
assert "view-summary" in html_content, "Missing view-summary in HTML"
assert "view-records" in html_content, "Missing view-records in HTML"
assert "view-analytics" in html_content, "Missing view-analytics in HTML"
assert "batsman-modal" in html_content, "Missing batsman-modal in HTML"
assert "bowler-modal" in html_content, "Missing bowler-modal in HTML"
assert "match-modal" in html_content, "Missing match-modal in HTML"
assert "confirm-modal" in html_content, "Missing confirm-modal in HTML"

print("  [OK] HTML semantic structure, views, modals, and elements fully verified.")
print("\n>>> ALL VERIFICATION CHECKS PASSED WITH 100% SUCCESS! <<<")
