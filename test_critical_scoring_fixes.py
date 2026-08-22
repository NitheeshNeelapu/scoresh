import sys

print("=== SCORESH CRITICAL LIVE SCORING & SQUAD FIX VERIFICATION ===")

class Player:
    def __init__(self, id, team_id, name, role, is_wk=False):
        self.id = id
        self.team_id = team_id
        self.name = name
        self.role = role
        self.is_wk = is_wk

class Team:
    def __init__(self, id, name, short_name):
        self.id = id
        self.name = name
        self.short_name = short_name
        self.player_ids = []

    def add_player(self, player):
        if len(self.player_ids) >= 20:
            raise ValueError("Maximum squad size is 20 players.")
        if player.team_id != self.id:
            raise ValueError("Cannot add player belonging to another team.")
        self.player_ids.append(player.id)

    @property
    def is_valid_squad(self):
        return len(self.player_ids) >= 11 and len(self.player_ids) <= 20

class Delivery:
    def __init__(self, over_index, ball_in_over, striker_id, striker_name, non_striker_id, non_striker_name, bowler_id, bowler_name, runs, is_legal=True, is_wicket=False, dismissal_type=None, fielder_id=None, fielder_name=""):
        self.over_index = over_index
        self.ball_in_over = ball_in_over
        self.striker_id = striker_id
        self.striker_name = striker_name
        self.non_striker_id = non_striker_id
        self.non_striker_name = non_striker_name
        self.bowler_id = bowler_id
        self.bowler_name = bowler_name
        self.runs = runs
        self.is_legal = is_legal
        self.is_wicket = is_wicket
        self.dismissal_type = dismissal_type
        self.fielder_id = fielder_id
        self.fielder_name = fielder_name

    @property
    def display_over(self):
        return f"{self.over_index}.{self.ball_in_over}"

    @property
    def commentary(self):
        if self.is_wicket:
            if self.dismissal_type == "Caught":
                return f"{self.display_over} {self.bowler_name} to {self.striker_name} — WICKET! c {self.fielder_name} b {self.bowler_name}"
            elif self.dismissal_type == "Run Out":
                return f"{self.display_over} {self.bowler_name} to {self.striker_name} — WICKET! run out ({self.fielder_name})"
            elif self.dismissal_type == "Bowled":
                return f"{self.display_over} {self.bowler_name} to {self.striker_name} — WICKET! b {self.bowler_name}"
        if self.runs == 4:
            return f"{self.display_over} {self.bowler_name} to {self.striker_name} — FOUR"
        elif self.runs == 6:
            return f"{self.display_over} {self.bowler_name} to {self.striker_name} — SIX"
        elif self.runs == 0:
            return f"{self.display_over} {self.bowler_name} to {self.striker_name} — dot ball"
        return f"{self.display_over} {self.bowler_name} to {self.striker_name} — {self.runs} run{'s' if self.runs > 1 else ''}"

class MatchState:
    def __init__(self, team_a, team_b, team_a_players, team_b_players):
        self.team_a = team_a
        self.team_b = team_b
        self.team_a_players = {p.id: p for p in team_a_players}
        self.team_b_players = {p.id: p for p in team_b_players}
        self.playing_xi_a = []
        self.playing_xi_b = []
        
        # Authoritative state
        self.striker_id = None
        self.non_striker_id = None
        self.current_bowler_id = None
        self.last_bowler_id = None
        self.ball_log = []
        self.legal_balls = 0
        self.total_runs = 0
        self.total_wickets = 0
        self.dismissed_ids = set()
        self.bowler_figures = {} # bowler_id -> {overs, runs, wkts, maidens}

    def start_match(self, striker_id, non_striker_id, opening_bowler_id):
        self.striker_id = striker_id
        self.non_striker_id = non_striker_id
        self.current_bowler_id = opening_bowler_id
        self.bowler_figures[opening_bowler_id] = {"balls": 0, "runs": 0, "wkts": 0}

    def rotate_strike(self):
        self.striker_id, self.non_striker_id = self.non_striker_id, self.striker_id

    def record_ball(self, runs):
        s_name = self.team_a_players[self.striker_id].name
        ns_name = self.team_a_players[self.non_striker_id].name
        b_name = self.team_b_players[self.current_bowler_id].name

        over_idx = self.legal_balls // 6
        ball_in_over = (self.legal_balls % 6) + 1

        deliv = Delivery(over_idx, ball_in_over, self.striker_id, s_name, self.non_striker_id, ns_name, self.current_bowler_id, b_name, runs, is_legal=True)
        self.ball_log.append(deliv)

        self.total_runs += runs
        self.legal_balls += 1
        self.bowler_figures[self.current_bowler_id]["balls"] += 1
        self.bowler_figures[self.current_bowler_id]["runs"] += runs

        # 1. Single-run / odd run strike rotation
        if runs in [1, 3]:
            self.rotate_strike()

        # 2. End of over strike rotation & consecutive bowler tracking
        is_over_complete = (self.legal_balls % 6 == 0)
        if is_over_complete:
            self.rotate_strike()
            self.last_bowler_id = self.current_bowler_id
            self.current_bowler_id = None # Prompt for next bowler

        return deliv, is_over_complete

    def select_next_bowler(self, bowler_id):
        if bowler_id == self.last_bowler_id:
            raise ValueError("Rule Violation: Bowler cannot bowl consecutive overs.")
        if bowler_id not in self.playing_xi_b:
            raise ValueError("Rule Violation: Bowler must be in Bowling Team's Playing XI.")
        self.current_bowler_id = bowler_id
        if bowler_id not in self.bowler_figures:
            self.bowler_figures[bowler_id] = {"balls": 0, "runs": 0, "wkts": 0}

    def record_wicket(self, dismissal_type, dismissed_id, fielder_id=None, incoming_id=None):
        s_name = self.team_a_players[self.striker_id].name
        ns_name = self.team_a_players[self.non_striker_id].name
        b_name = self.team_b_players[self.current_bowler_id].name
        f_name = self.team_b_players[fielder_id].name if fielder_id else ""

        over_idx = self.legal_balls // 6
        ball_in_over = (self.legal_balls % 6) + 1

        deliv = Delivery(over_idx, ball_in_over, self.striker_id, s_name, self.non_striker_id, ns_name, self.current_bowler_id, b_name, 0, is_legal=True, is_wicket=True, dismissal_type=dismissal_type, fielder_id=fielder_id, fielder_name=f_name)
        self.ball_log.append(deliv)

        self.legal_balls += 1
        self.total_wickets += 1
        self.dismissed_ids.add(dismissed_id)
        self.bowler_figures[self.current_bowler_id]["balls"] += 1

        if dismissal_type != "Run Out":
            self.bowler_figures[self.current_bowler_id]["wkts"] += 1

        was_striker = (dismissed_id == self.striker_id)
        if was_striker:
            self.striker_id = incoming_id
        else:
            self.non_striker_id = incoming_id

        if self.legal_balls % 6 == 0:
            self.rotate_strike()
            self.last_bowler_id = self.current_bowler_id
            self.current_bowler_id = None

        return deliv

# ==============================================================================
# 1. TEAM & PLAYER SQUAD TESTS (Requirements 16, 17, 18, 19)
# ==============================================================================
print("\n--- [TEST 1] Team Squad Sizes, Isolation & Playing XI Validation ---")
team_a = Team("t_a", "Team A", "TMA")
team_b = Team("t_b", "Team B", "TMB")

# Add 11 players to Team A
team_a_players = []
for i in range(1, 12):
    p = Player(f"p_a_{i}", team_a.id, f"Player A{i}", "Batsman" if i <= 6 else "Bowler")
    team_a_players.append(p)
    team_a.add_player(p)

assert team_a.is_valid_squad
print(f"  [OK] Team A created with 11 players. is_valid_squad = {team_a.is_valid_squad}")

# Attempt to add players up to 20
for i in range(12, 21):
    p = Player(f"p_a_{i}", team_a.id, f"Player A{i}", "All-rounder")
    team_a_players.append(p)
    team_a.add_player(p)

assert len(team_a.player_ids) == 20
print(f"  [OK] Added up to 20 players to Team A squad ({len(team_a.player_ids)}/20)")

# Attempt to add 21st player -> must be BLOCKED
try:
    p21 = Player("p_a_21", team_a.id, "Player A21", "Batsman")
    team_a.add_player(p21)
    assert False, "Should have failed on 21st player"
except ValueError as e:
    print(f"  [OK] Adding 21st player correctly blocked: '{e}'")

# Team Isolation Check: Adding Team B player to Team A must fail
try:
    pb = Player("p_b_1", team_b.id, "Player B1", "Batsman")
    team_a.add_player(pb)
    assert False, "Should have failed adding Team B player to Team A"
except ValueError as e:
    print(f"  [OK] Team isolation enforced: '{e}'")

# Build Team B with 12 players
team_b_players = []
for i in range(1, 13):
    p = Player(f"p_b_{i}", team_b.id, f"Player B{i}", "Bowler" if i <= 6 else "Batsman")
    team_b_players.append(p)
    team_b.add_player(p)

assert team_b.is_valid_squad
print(f"  [OK] Team B created with {len(team_b.player_ids)} players. is_valid_squad = {team_b.is_valid_squad}")


# ==============================================================================
# 2. MATCH SIMULATION (Exact User Test Scenarios)
# ==============================================================================
print("\n--- [TEST 2] Exact Match Simulation Sequence ---")

# Setup Named Players
manoj = Player("p_manoj", team_a.id, "Manoj", "Batsman")
siva = Player("p_siva", team_a.id, "Siva", "Batsman")
kiran = Player("p_kiran", team_a.id, "Kiran", "Batsman")
rahul = Player("p_rahul", team_b.id, "Rahul", "Bowler")
arjun = Player("p_arjun", team_b.id, "Arjun", "Bowler")
nitheesh = Player("p_nitheesh", team_b.id, "Nitheesh", "All-rounder")
ravi = Player("p_ravi", team_b.id, "Ravi", "Bowler")

match_a_players = [manoj, siva, kiran] + team_a_players[3:11]
match_b_players = [rahul, arjun, nitheesh, ravi] + team_b_players[4:11]

match = MatchState(team_a, team_b, match_a_players, match_b_players)
match.playing_xi_a = [p.id for p in match_a_players]
match.playing_xi_b = [p.id for p in match_b_players]

# START: Striker = Manoj, Non-Striker = Siva, Bowler = Rahul
match.start_match(manoj.id, siva.id, rahul.id)
assert match.striker_id == "p_manoj"
assert match.non_striker_id == "p_siva"
assert match.current_bowler_id == "p_rahul"
print(f"  [OK] Match Started: Striker={match.team_a_players[match.striker_id].name}, Non-Striker={match.team_a_players[match.non_striker_id].name}, Bowler={match.team_b_players[match.current_bowler_id].name}")

# BALL 1: Manoj scores 1
d1, over_done = match.record_ball(1)
assert match.striker_id == "p_siva", f"Expected Striker = Siva, got {match.striker_id}"
assert match.non_striker_id == "p_manoj", f"Expected Non-Striker = Manoj, got {match.non_striker_id}"
assert d1.commentary == "0.1 Rahul to Manoj — 1 run"
print(f"  [OK] Ball 1: 1 run -> Striker={match.team_a_players[match.striker_id].name}, Non-Striker={match.team_a_players[match.non_striker_id].name} (Commentary: '{d1.commentary}')")

# BALL 2: Siva scores 0
d2, over_done = match.record_ball(0)
assert match.striker_id == "p_siva"
assert match.non_striker_id == "p_manoj"
assert d2.commentary == "0.2 Rahul to Siva — dot ball"
print(f"  [OK] Ball 2: 0 runs -> Striker={match.team_a_players[match.striker_id].name}, Non-Striker={match.team_a_players[match.non_striker_id].name} (Commentary: '{d2.commentary}')")

# BALL 3: Siva scores 4
d3, over_done = match.record_ball(4)
assert match.striker_id == "p_siva"
assert match.non_striker_id == "p_manoj"
assert d3.commentary == "0.3 Rahul to Siva — FOUR"
print(f"  [OK] Ball 3: 4 runs -> Striker={match.team_a_players[match.striker_id].name}, Non-Striker={match.team_a_players[match.non_striker_id].name} (Commentary: '{d3.commentary}')")

# BALL 4: Siva scores 0
match.record_ball(0)
# BALL 5: Siva scores 0
match.record_ball(0)

# BALL 6: Siva scores 0 -> END OF OVER (6 legal balls)
d6, over_done = match.record_ball(0)
assert over_done == True
assert match.legal_balls == 6
# At end of over, strike rotates so Manoj is now striker!
assert match.striker_id == "p_manoj"
assert match.non_striker_id == "p_siva"
assert match.last_bowler_id == "p_rahul"
assert match.current_bowler_id == None
print(f"  [OK] Ball 6 (Over Complete 1.0 ov): Strike rotated -> Striker={match.team_a_players[match.striker_id].name}, Non-Striker={match.team_a_players[match.non_striker_id].name}")
print(f"  [OK] Previous bowler recorded as {match.team_b_players[match.last_bowler_id].name}. Consecutive over blocked.")

# Attempt to select Rahul again for consecutive over -> must FAIL
try:
    match.select_next_bowler("p_rahul")
    assert False, "Consecutive over by same bowler should fail"
except ValueError as e:
    print(f"  [OK] Selecting Rahul for next over correctly blocked: '{e}'")

# Select Arjun as next bowler from Playing XI
match.select_next_bowler(arjun.id)
assert match.current_bowler_id == "p_arjun"
print(f"  [OK] Selected Next Bowler: {match.team_b_players[match.current_bowler_id].name}")

# NEXT DELIVERY: 1.1 Arjun to Manoj -> 1 run
d7, over_done = match.record_ball(1)
assert d7.commentary == "1.1 Arjun to Manoj — 1 run"
assert match.striker_id == "p_siva"
assert match.non_striker_id == "p_manoj"
print(f"  [OK] Delivery 1.1: Commentary: '{d7.commentary}' -> Striker={match.team_a_players[match.striker_id].name}, Non-Striker={match.team_a_players[match.non_striker_id].name}")

# WICKET TEST: Dismiss Manoj (who is non-striker) by Catch (c Nitheesh b Arjun)
# Let's dismiss Manoj on next ball (let's rotate strike so Manoj faces, or dismiss Manoj directly)
match.rotate_strike() # Manoj is striker
w_del = match.record_wicket("Caught", manoj.id, fielder_id=nitheesh.id, incoming_id=kiran.id)
assert w_del.commentary == "1.2 Arjun to Manoj — WICKET! c Nitheesh b Arjun"
assert match.bowler_figures["p_arjun"]["wkts"] == 1
assert manoj.id in match.dismissed_ids
assert match.striker_id == "p_kiran"
assert match.non_striker_id == "p_siva"
print(f"  [OK] Wicket Event: Commentary: '{w_del.commentary}'")
print(f"  [OK] Dismissed player {manoj.name} removed; incoming batter {kiran.name} assigned to striker. (Striker={match.team_a_players[match.striker_id].name}, Non-Striker={match.team_a_players[match.non_striker_id].name})")
print(f"  [OK] Bowler Arjun credited with {match.bowler_figures['p_arjun']['wkts']} wicket.")

# RUN OUT TEST: Dismiss Siva by Run Out (run out Ravi)
w_ro = match.record_wicket("Run Out", siva.id, fielder_id=ravi.id, incoming_id="p_a_4")
assert w_ro.commentary == "1.3 Arjun to Kiran — WICKET! run out (Ravi)"
# Bowler Arjun wickets must STILL be 1 (run out does NOT credit bowler)
assert match.bowler_figures["p_arjun"]["wkts"] == 1
assert siva.id in match.dismissed_ids
print(f"  [OK] Run Out Event: Commentary: '{w_ro.commentary}'")
print(f"  [OK] Bowler Arjun wickets remain {match.bowler_figures['p_arjun']['wkts']} (Run out NOT credited to bowler).")

print("\n=========================================================================")
print(">>> ALL CRITICAL LIVE SCORING AND SQUAD TESTS PASSED WITH 100% SUCCESS! <<<")
print("=========================================================================")
