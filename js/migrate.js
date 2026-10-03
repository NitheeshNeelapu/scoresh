/* ============================================================
   SCORESH: One-time migration — localStorage → Supabase
   Run from console:  await window.migrateToSupabase()
   Safe to re-run for testing only if you delete cloud rows first.
   ============================================================ */

window.migrateToSupabase = async function () {
    const sb = window.scoreshSupabase;
    if (!sb) { console.error('Supabase client not found'); return; }

    const local = JSON.parse(localStorage.getItem('scoresh_tournaments_v3') || '[]');
    console.log(`Found ${local.length} tournament(s) locally`);

    const summary = {
        tournaments: 0, teams: 0, players: 0, matches: 0,
        innings: 0, deliveries: 0, playingXI: 0, snapshots: 0
    };
    const errors = [];

    for (const t of local) {
        // 1. TOURNAMENT (let Supabase generate uuid)
        const { data: tRow, error: tErr } = await sb.from('tournaments').insert({
            name: t.name, description: t.description || null, logo: t.logo || null,
            format: t.format || null, overs: t.overs || null,
            location: t.location || null, organizer: t.organizer || null,
            start_date: t.startDate || null, end_date: t.endDate || null,
            number_of_teams: t.numberOfTeams || null, rules: t.rules || null,
            status: t.status || 'upcoming'
        }).select().single();
        if (tErr) { errors.push(['tournament', t.name, tErr]); continue; }
        summary.tournaments++;
        const tourId = tRow.id;
        const teamMap = {}, playerMap = {}, innMap = {};

        // 2. TEAMS
        for (const team of (t.teams || [])) {
            const { data: teamRow, error: e } = await sb.from('teams').insert({
                tournament_id: tourId, name: team.name,
                short_name: team.shortName || null,
                color: team.color || null, logo_url: team.logo || null
            }).select().single();
            if (e) { errors.push(['team', team.name, e]); continue; }
            teamMap[team.id] = teamRow.id; summary.teams++;
        }

        // 3. PLAYERS
        for (const p of (t.players || [])) {
            const { data: pRow, error: e } = await sb.from('players').insert({
                tournament_id: tourId,
                team_id: teamMap[p.teamId] || null,
                name: p.name,
                jersey_number: p.jersey ? parseInt(p.jersey) || null : null,
                role: p.role || null, batting_style: p.battingStyle || null,
                bowling_style: p.bowlingStyle || null,
                is_wicketkeeper: !!p.isWicketkeeper,
                is_captain: !!p.isCaptain, is_vice_captain: !!p.isViceCaptain,
                profile_image: p.profileImage || null
            }).select().single();
            if (e) { errors.push(['player', p.name, e]); continue; }
            playerMap[p.id] = pRow.id; summary.players++;
        }

        // 4. MATCHES
        for (const m of (t.matches || [])) {
            const { data: mRow, error: e } = await sb.from('matches').insert({
                tournament_id: tourId, title: m.title || null,
                team_a_id: teamMap[m.teamAId], team_b_id: teamMap[m.teamBId],
                team_a_name: m.teamAName || null, team_b_name: m.teamBName || null,
                team_a_short: m.teamAShort || null, team_b_short: m.teamBShort || null,
                team_a_color: m.teamAColor || null, team_b_color: m.teamBColor || null,
                overs: m.totalOvers || null, match_format: m.matchFormat || null,
                match_date: m.date || null, match_time: m.time || null,
                venue: m.venue || null,
                status: ({ 'live': 'LIVE', 'upcoming': 'SCHEDULED', 'completed': 'COMPLETED', 'break': 'BREAK' }[String(m.status).toLowerCase()] || 'SCHEDULED'),
                toss_winner_id: m.tossWinnerId ? teamMap[m.tossWinnerId] : null,
                toss_decision: m.tossDecision || null, umpires: m.umpires || null,
                winner_team_id: m.winnerTeamId ? teamMap[m.winnerTeamId] : null,
                result_summary: m.resultSummary || null,
                player_of_the_match: m.playerOfTheMatch || null,
                custom_summary_text: m.customSummaryText || null,
                key_moments: m.keyMoments || null,
                last_bowler_id: m.lastBowlerId ? playerMap[m.lastBowlerId] : null,
                win_probability: m.winProbability || null,
                current_innings: (m.currentInningIndex ?? 0) + 1
            }).select().single();
            if (e) { errors.push(['match', m.title, e]); console.error('MATCH INSERT ERROR:', e.message, e.details, e.hint); continue; }
            summary.matches++;
            const matchId = mRow.id;

            // 4a. PLAYING XI
            const xiRows = [];
            (m.teamAPlayingXI || []).forEach((pid, i) =>
                xiRows.push({
                    match_id: matchId, team_id: teamMap[m.teamAId],
                    player_id: playerMap[pid], batting_order: i + 1
                }));
            (m.teamBPlayingXI || []).forEach((pid, i) =>
                xiRows.push({
                    match_id: matchId, team_id: teamMap[m.teamBId],
                    player_id: playerMap[pid], batting_order: i + 1
                }));
            if (xiRows.length) {
                const { error: e2 } = await sb.from('playing_xi').insert(xiRows);
                if (e2) errors.push(['playing_xi', m.title, e2]);
                else summary.playingXI += xiRows.length;
            }

            // 4b. INNINGS + DELIVERIES + SNAPSHOTS
            for (const inn of (m.innings || [])) {
                const { data: iRow, error: e3 } = await sb.from('innings').insert({
                    match_id: matchId, innings_number: inn.inningNumber,
                    batting_team_id: teamMap[inn.battingTeamId],
                    bowling_team_id: teamMap[inn.bowlingTeamId],
                    batting_team_name: inn.battingTeamName || null,
                    bowling_team_name: inn.bowlingTeamName || null,
                    striker_id: inn.strikerId ? playerMap[inn.strikerId] : null,
                    non_striker_id: inn.nonStrikerId ? playerMap[inn.nonStrikerId] : null,
                    current_bowler_id: inn.currentBowlerId ? playerMap[inn.currentBowlerId] : null,
                    batsmen: inn.batsmen || [], bowlers: inn.bowlers || [],
                    fall_of_wickets: inn.fallOfWickets || [],
                    partnerships: inn.partnerships || [], extras: inn.extras || {},
                    total_runs: inn.totalRuns || 0, total_wickets: inn.totalWickets || 0,
                    legal_balls: inn.legalBalls || 0, is_completed: !!inn.isCompleted,
                    target: inn.target ?? null
                }).select().single();
                if (e3) { errors.push(['innings', m.title, e3]); continue; }
                summary.innings++;
                innMap[inn.id] = iRow.id;

                const dels = (inn.ballLog || []).map(d => ({
                    innings_id: iRow.id, over_number: d.overIndex, ball_number: d.ballInOver,
                    striker_id: d.strikerId ? playerMap[d.strikerId] : null,
                    striker_name: d.strikerName || null,
                    non_striker_id: d.nonStrikerId ? playerMap[d.nonStrikerId] : null,
                    non_striker_name: d.nonStrikerName || null,
                    bowler_id: d.bowlerId ? playerMap[d.bowlerId] : null,
                    bowler_name: d.bowlerName || null,
                    runs_batter: d.runsOffBat || 0,
                    runs_wide: d.extras?.wide || 0, runs_noball: d.extras?.noball || 0,
                    runs_bye: d.extras?.bye || 0, runs_legbye: d.extras?.legbye || 0,
                    runs_extras: (d.extras?.wide || 0) + (d.extras?.noball || 0) + (d.extras?.bye || 0) + (d.extras?.legbye || 0),
                    total_runs: (d.runsOffBat || 0) + (d.extras?.wide || 0) + (d.extras?.noball || 0) + (d.extras?.bye || 0) + (d.extras?.legbye || 0),
                    extra_type: d.extras?.wide ? 'wide' : d.extras?.noball ? 'noball'
                        : d.extras?.bye ? 'bye' : d.extras?.legbye ? 'legbye' : null,
                    is_legal: !!d.isLegal, is_wicket: !!d.isWicket,
                    dismissed_player_id: d.dismissedPlayerId ? playerMap[d.dismissedPlayerId] : null,
                    dismissed_player_name: d.dismissedPlayerName || null,
                    dismissal_type: d.dismissalType || null,
                    fielder_id: d.fielderId ? playerMap[d.fielderId] : null,
                    fielder_name: d.fielderName || null,
                    wicketkeeper_id: d.wicketkeeperId ? playerMap[d.wicketkeeperId] : null,
                    wicketkeeper_name: d.wicketkeeperName || null,
                    dismissal_desc: d.dismissalDesc || null,
                    auto_commentary: d.autoCommentary || null
                }));
                if (dels.length) {
                    const { error: e4 } = await sb.from('deliveries').insert(dels);
                    if (e4) errors.push(['deliveries', m.title, e4]);
                    else summary.deliveries += dels.length;
                }
            }

            // 4c. PROBABILITY SNAPSHOTS
            const snaps = (m.probabilityHistory || []).map(s => {
                const parts = String(s.score || '0/0').split('/');
                const runs = parseInt(parts[0]) || 0;
                const wkts = parseInt(parts[1]) || 0;
                const inn = (m.innings || []).find(i => i.inningNumber === s.inning) || {};
                return {
                    match_id: matchId,
                    innings_id: innMap[inn.id] || null,
                    over_number: Math.floor(parseFloat(s.over) || 0),
                    team_a_probability: s.teamAProb ?? null,
                    team_b_probability: s.teamBProb ?? null,
                    score: runs,
                    wickets: wkts,
                    balls_remaining: null,
                    required_runs: null,
                    required_run_rate: null
                };
            });
            if (snaps.length) {
                const { error: e5 } = await sb.from('probability_snapshots').insert(snaps);
                if (e5) { errors.push(['probability_snapshots', m.title, e5]); console.error('SNAPSHOT ERROR:', e5.message); }
                else summary.snapshots += snaps.length;
            }
        }
    }

    console.log('=== MIGRATION SUMMARY ===', summary);
    if (errors.length) console.warn('Errors:', errors);
    else console.log('✅ Migration complete — no errors!');
    return summary;
};

console.log('[Scoresh] Migration ready. Run: await window.migrateToSupabase()');
