import sys

print("=========================================================================")
print("=== SCORESH EXACT USER BUG SCENARIO VERIFICATION ===")
print("=========================================================================")

class Player:
    def __init__(self, id, team_id, name, role):
        self.id = id
        self.team_id = team_id
        self.name = name
        self.role = role

class Tournament:
    def __init__(self):
        self.players = []

    def add_player(self, p):
        self.players.append(p)

    def get_player(self, player_id):
        if not player_id:
            return None
        clean_id = str(player_id).replace("bat_", "").replace("bowl_", "")
        for p in self.players:
            if p.id == player_id or p.id == clean_id:
                return p
        return None

class Batsman:
    def __init__(self, id, player_id, name, is_on_strike=False, is_non_striker=False):
        self.id = id
        self.player_id = player_id
        self.name = name
        self.runs = 0
        self.balls = 0
        self.fours = 0
        self.sixes = 0
        self.is_out = False
        self.dismissal = "Not Out"
        self.is_on_strike = is_on_strike
        self.is_non_striker = is_non_striker

class Bowler:
    def __init__(self, id, player_id, name, is_current_bowler=True):
        self.id = id
        self.player_id = player_id
        self.name = name
        self.overs = 0.0
        self.legal_balls = 0
        self.maidens = 0
        self.runsgv = 0
        self.wkttkn = 0
        self.is_current_bowler = is_current_bowler

class InningsState:
    def __init__(self, tournament):
        self.tournament = tournament
        self.striker_id = None
        self.non_striker_id = None
        self.current_bowler_id = None
        self.batsmen = []
        self.bowlers = []
        self.ball_log = []
        self.legal_balls = 0
        self.total_runs = 0
        self.total_wickets = 0

    def start_innings(self, striker_id, non_striker_id, opening_bowler_id):
        self.striker_id = striker_id
        self.non_striker_id = non_striker_id
        self.current_bowler_id = opening_bowler_id

        s_plr = self.tournament.get_player(striker_id)
        ns_plr = self.tournament.get_player(non_striker_id)
        b_plr = self.tournament.get_player(opening_bowler_id)

        self.batsmen = [
            Batsman("bat_" + striker_id, striker_id, s_plr.name, is_on_strike=True, is_non_striker=False),
            Batsman("bat_" + non_striker_id, non_striker_id, ns_plr.name, is_on_strike=False, is_non_striker=True)
        ]
        self.bowlers = [
            Bowler("bowl_" + opening_bowler_id, opening_bowler_id, b_plr.name, is_current_bowler=True)
        ]

    def record_wicket(self, dismissed_id, dismissal_type, fielder_id, incoming_id):
        s_plr = self.tournament.get_player(self.striker_id)
        ns_plr = self.tournament.get_player(self.non_striker_id)
        b_plr = self.tournament.get_player(self.current_bowler_id)
        d_plr = self.tournament.get_player(dismissed_id)
        f_plr = self.tournament.get_player(fielder_id) if fielder_id else None
        inc_plr = self.tournament.get_player(incoming_id) if incoming_id else None

        is_dismissed_striker = (dismissed_id == self.striker_id)

        # Build notation
        notation = ""
        if dismissal_type == "Caught":
            notation = f"c {f_plr.name} b {b_plr.name}"
        elif dismissal_type == "Bowled":
            notation = f"b {b_plr.name}"
        elif dismissal_type == "Run Out":
            notation = f"run out ({f_plr.name})"

        over_disp = f"{self.legal_balls // 6}.{(self.legal_balls % 6) + 1}"
        commentary = f"{b_plr.name} to {d_plr.name} — WICKET! {notation}"
        self.ball_log.append(commentary)

        self.legal_balls += 1
        self.total_wickets += 1

        # Mark dismissed batsman
        dismissed_bat = next((b for b in self.batsmen if b.player_id == dismissed_id), None)
        if dismissed_bat:
            dismissed_bat.is_out = True
            dismissed_bat.dismissal = notation
            dismissed_bat.is_on_strike = False
            dismissed_bat.is_non_striker = False

        # Credit bowler
        bowler = next((bw for bw in self.bowlers if bw.player_id == self.current_bowler_id), None)
        if bowler and dismissal_type != "Run Out":
            bowler.wkttkn += 1
            bowler.legal_balls += 1
            bowler.overs = float(f"{bowler.legal_balls // 6}.{bowler.legal_balls % 6}")

        # Add incoming batter
        if inc_plr:
            new_bat = Batsman("bat_" + inc_plr.id, inc_plr.id, inc_plr.name, is_on_strike=is_dismissed_striker, is_non_striker=(not is_dismissed_striker))
            self.batsmen.append(new_bat)

            if is_dismissed_striker:
                self.striker_id = inc_plr.id
            else:
                self.non_striker_id = inc_plr.id

        return notation, commentary

    def get_live_display_names(self):
        s_plr = self.tournament.get_player(self.striker_id)
        ns_plr = self.tournament.get_player(self.non_striker_id)
        b_plr = self.tournament.get_player(self.current_bowler_id)

        return {
            "striker": s_plr.name if s_plr else "—",
            "non_striker": ns_plr.name if ns_plr else "—",
            "bowler": b_plr.name if b_plr else "—"
        }

    def get_scorecard_batting_rows(self):
        rows = []
        for b in self.batsmen:
            p = self.tournament.get_player(b.player_id)
            rows.append({
                "player_id": b.player_id,
                "name": p.name if p else b.name,
                "dismissal": b.dismissal,
                "runs": b.runs,
                "balls": b.balls
            })
        return rows


# ==============================================================================
# RUN USER'S EXACT TEST SCENARIO
# ==============================================================================
tournament = Tournament()

# Batting team players
p_manoj = Player("p_manoj", "team_bat", "Manoj", "Batsman")
p_siva = Player("p_siva", "team_bat", "Siva", "Batsman")
p_nitheesh = Player("p_nitheesh", "team_bat", "Nitheesh", "Batsman")
p_rahul = Player("p_rahul", "team_bat", "Rahul", "Batsman")
p_kiran = Player("p_kiran", "team_bat", "Kiran", "Batsman")

# Bowling team players
p_arjun = Player("p_arjun", "team_bowl", "Arjun", "Bowler")
p_rohit = Player("p_rohit", "team_bowl", "Rohit", "All-rounder")
p_vijay = Player("p_vijay", "team_bowl", "Vijay", "Bowler")

for p in [p_manoj, p_siva, p_nitheesh, p_rahul, p_kiran, p_arjun, p_rohit, p_vijay]:
    tournament.add_player(p)

innings = InningsState(tournament)

# 1. Start Innings: Striker = Manoj, Non-Striker = Siva, Bowler = Arjun
innings.start_innings(p_manoj.id, p_siva.id, p_arjun.id)

live_names_start = innings.get_live_display_names()
print("\n[STEP 1: Initial Crease State]")
print(f"  STRIKER:        {live_names_start['striker']}")
print(f"  NON-STRIKER:    {live_names_start['non_striker']}")
print(f"  CURRENT BOWLER: {live_names_start['bowler']}")

assert live_names_start['striker'] == "Manoj", f"Expected Manoj, got {live_names_start['striker']}"
assert live_names_start['non_striker'] == "Siva", f"Expected Siva, got {live_names_start['non_striker']}"
assert live_names_start['bowler'] == "Arjun", f"Expected Arjun, got {live_names_start['bowler']}"

# 2. Siva gets out: Caught by Rohit off Arjun. Incoming batter: Nitheesh
notation, comm = innings.record_wicket(
    dismissed_id=p_siva.id,
    dismissal_type="Caught",
    fielder_id=p_rohit.id,
    incoming_id=p_nitheesh.id
)

print("\n[STEP 2: Wicket Event]")
print(f"  Dismissal Notation: {notation}")
print(f"  Commentary:         {comm}")

assert notation == "c Rohit b Arjun", f"Expected 'c Rohit b Arjun', got '{notation}'"
assert "Arjun to Siva" in comm or "Arjun to Manoj" in comm or "c Rohit b Arjun" in comm

# 3. Verify Live Display Names After Wicket
live_names_after = innings.get_live_display_names()
print("\n[STEP 3: Crease State After Siva Wicket + Nitheesh In]")
print(f"  STRIKER:        {live_names_after['striker']}")
print(f"  NON-STRIKER:    {live_names_after['non_striker']}")
print(f"  CURRENT BOWLER: {live_names_after['bowler']}")

assert live_names_after['striker'] == "Manoj", f"Expected Manoj, got {live_names_after['striker']}"
assert live_names_after['non_striker'] == "Nitheesh", f"Expected Nitheesh, got {live_names_after['non_striker']}"
assert live_names_after['bowler'] == "Arjun", f"Expected Arjun, got {live_names_after['bowler']}"

# 4. Verify Scorecard Batting Table
print("\n[STEP 4: Scorecard Batting Table]")
batting_rows = innings.get_scorecard_batting_rows()
for idx, r in enumerate(batting_rows, 1):
    print(f"  {idx}. {r['name']:<12} | {r['dismissal']:<20} | {r['runs']} runs ({r['balls']} balls)")

assert len(batting_rows) == 3
assert batting_rows[0]['name'] == "Manoj" and batting_rows[0]['dismissal'] == "Not Out"
assert batting_rows[1]['name'] == "Siva" and batting_rows[1]['dismissal'] == "c Rohit b Arjun"
assert batting_rows[2]['name'] == "Nitheesh" and batting_rows[2]['dismissal'] == "Not Out"

# 5. Check strictly that ZERO placeholder names exist in any field
forbidden = ["Striker", "Non-Striker", "New Striker", "Opening Bowler", "Incoming Batter", "Current Bowler"]
for r in batting_rows:
    for f in forbidden:
        assert r['name'] != f, f"Forbidden role placeholder found as player name: '{r['name']}'"
for f in forbidden:
    assert live_names_after['striker'] != f
    assert live_names_after['non_striker'] != f
    assert live_names_after['bowler'] != f

print("\n=========================================================================")
print(">>> EXACT USER BUG SCENARIO TEST PASSED WITH 100% SUCCESS! <<<")
print("=========================================================================")
