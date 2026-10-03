/* ============================================================
   SCORESH: Supabase ↔ Local shape bridge
   - sb_loadAllTournaments(): cloud → local-shaped objects
   - syncNow(): localStorage → Supabase write-through sync
   - Exposes window.supabaseSync
   ============================================================ */

(function () {
    const sb = () => window.scoreshSupabase;

    /* ---------- helpers ---------- */
    const num = v => (v === null || v === undefined ? 0 : v);

    function rebuildOvers(legalBalls) {
        return Math.floor(legalBalls / 6) + (legalBalls % 6) / 10;
    }

    function scoreString(runs, wkts) {
        return `${num(runs)}/${num(wkts)}`;
    }

    /* ---------- one innings: cloud row → local shape ---------- */
    async function mapInnings(row, allPlayers) {
        const { data: dels, error } = await sb().from('deliveries')
            .select('*').eq('innings_id', row.id).order('created_at');
        if (error) console.error('[sync] deliveries load failed:', error.message);

        const ballLog = (dels || []).map(d => ({
            id: d.id,
            matchId: null, // filled by caller
            inningsId: d.innings_id,
            overIndex: d.over_number,
            ballInOver: d.ball_number,
            strikerId: d.striker_id, strikerName: d.striker_name || '',
            nonStrikerId: d.non_striker_id, nonStrikerName: d.non_striker_name || '',
            bowlerId: d.bowler_id, bowlerName: d.bowler_name || '',
            runsOffBat: num(d.runs_batter),
            extras: {
                wide: num(d.runs_wide), noball: num(d.runs_noball),
                bye: num(d.runs_bye), legbye: num(d.runs_legbye)
            },
            isLegal: !!d.is_legal, isWicket: !!d.is_wicket,
            dismissedPlayerId: d.dismissed_player_id,
            dismissedPlayerName: d.dismissed_player_name || '',
            dismissalType: d.dismissal_type,
            fielderId: d.fielder_id, fielderName: d.fielder_name || '',
            wicketkeeperId: d.wicketkeeper_id, wicketkeeperName: d.wicketkeeper_name || '',
            dismissalDesc: d.dismissal_desc || '',
            autoCommentary: d.auto_commentary || '',
            timestamp: new Date(d.created_at).getTime()
        }));

        // --- Rebuild batsmen from ballLog (JSONB copy may hold stale ids) ---
        const batMap = {};
        const pname = pid => { const p = (allPlayers || []).find(x => x.id === pid); return p ? p.name : ''; };
        const ensureBat = (pid, fallbackName) => {
            if (!pid) return null;
            if (!batMap[pid]) batMap[pid] = {
                id: 'bat_' + pid, playerId: pid, name: pname(pid) || fallbackName || '',
                ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0, balls: 0,
                isOut: false, dismissal: 'Not Out', dismissalType: 'Not Out',
                bowlerName: '', fielderName: '', wicketkeeperName: '',
                isOnStrike: false, isNonStriker: false
            };
            return batMap[pid];
        };

        (dels || []).forEach(d => {
            const st = d.striker_id ? ensureBat(d.striker_id, d.striker_name) : null;
            if (st) {
                st.balls += d.is_legal ? 1 : 0;
                if (d.runs_batter === 1) st.ones++;
                else if (d.runs_batter === 2) st.twos++;
                else if (d.runs_batter === 3) st.threes++;
                else if (d.runs_batter === 4) st.fours++;
                else if (d.runs_batter === 6) st.sixes++;
            }
            if (d.is_wicket && d.dismissed_player_id) {
                const out = ensureBat(d.dismissed_player_id, d.dismissed_player_name);
                if (out) { out.isOut = true; out.dismissal = d.dismissal_desc || 'Out'; out.dismissalType = d.dismissal_type || 'Out'; }
            }
        });
        // Ensure striker/non-striker exist in the list
        if (row.striker_id) ensureBat(row.striker_id);
        if (row.non_striker_id) ensureBat(row.non_striker_id);
        // Set strike flags from authoritative ids
        Object.values(batMap).forEach(b => {
            b.isOnStrike = b.playerId === row.striker_id;
            b.isNonStriker = b.playerId === row.non_striker_id;
        });
        const rebuiltBatsmen = Object.values(batMap);

        // --- Rebuild bowlers from ballLog ---
        const bowlMap = {};
        (dels || []).forEach(d => {
            if (!d.bowler_id) return;
            if (!bowlMap[d.bowler_id]) bowlMap[d.bowler_id] = {
                id: 'bowl_' + d.bowler_id, playerId: d.bowler_id,
                name: d.bowler_name || pname(d.bowler_id),
                runsgv: 0, overs: 0, wkttkn: 0, maidens: 0, wides: 0, noBalls: 0, isCurrentBowler: false
            };
            const bw = bowlMap[d.bowler_id];
            bw.runsgv += num(d.runs_batter) + num(d.runs_wide) + num(d.runs_noball) + num(d.runs_bye) + num(d.runs_legbye);
            if (d.is_legal) bw.overs += 1;
            bw.wkttkn += d.is_wicket ? 1 : 0;
            bw.wides += num(d.runs_wide);
            bw.noBalls += num(d.runs_noball);
        });
        const rebuiltBowlers = Object.values(bowlMap).map(b => ({
            ...b, overs: Math.floor(b.overs / 6) + (b.overs % 6) / 10
        }));

        return {
            id: row.id,
            matchId: row.match_id,
            inningNumber: row.innings_number,
            battingTeamId: row.batting_team_id, battingTeamName: row.batting_team_name || '',
            bowlingTeamId: row.bowling_team_id, bowlingTeamName: row.bowling_team_name || '',
            strikerId: row.striker_id, nonStrikerId: row.non_striker_id,
            currentBowlerId: row.current_bowler_id,
            batsmen: rebuiltBatsmen, bowlers: rebuiltBowlers,
            ballLog,
            fallOfWickets: row.fall_of_wickets || [],
            partnerships: row.partnerships || [],
            extras: row.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
            totalRuns: num(row.total_runs), totalWickets: num(row.total_wickets),
            legalBalls: num(row.legal_balls),
            oversBowled: rebuildOvers(num(row.legal_balls)),
            isCompleted: !!row.is_completed,
            target: row.target
        };
    }

    /* ---------- one match ---------- */
    async function mapMatch(row, tournamentId, allPlayers) {
        // Playing XIs
        const { data: xi } = await sb().from('playing_xi')
            .select('*').eq('match_id', row.id).order('batting_order');

        const teamAXI = [], teamBXI = [];
        (xi || []).forEach(r => {
            if (r.team_id === row.team_a_id) teamAXI.push(r.player_id);
            else if (r.team_id === row.team_b_id) teamBXI.push(r.player_id);
        });

        // Innings (ordered)
        const { data: innRows } = await sb().from('innings')
            .select('*').eq('match_id', row.id).order('innings_number');

        const innings = [];
        for (const r of (innRows || [])) {
            const mapped = await mapInnings(r, allPlayers || []);
            mapped.matchId = row.id;
            innings.push(mapped);
        }

        // Probability snapshots → local probabilityHistory shape
        const { data: snaps } = await sb().from('probability_snapshots')
            .select('*').eq('match_id', row.id).order('created_at');

        const probabilityHistory = (snaps || []).map((s, i) => ({
            inning: s.innings_id ? innings.findIndex(x => x.id === s.innings_id) + 1 : 1,
            over: String(Math.floor(num(s.over_number))) + '.' + (i % 6),
            legalBalls: null,
            score: scoreString(s.score, s.wickets),
            teamAProb: s.team_a_probability != null ? Number(s.team_a_probability) : 50,
            teamBProb: s.team_b_probability != null ? Number(s.team_b_probability) : 50,
            battingTeamProb: null, bowlingTeamProb: null,
            equationText: '', // not stored in cloud — see note below
            timestamp: new Date(s.created_at).getTime()
        }));

        return {
            id: row.id,
            tournamentId,
            title: row.title || '',
            teamAId: row.team_a_id, teamBId: row.team_b_id,
            teamAName: row.team_a_name || '', teamBName: row.team_b_name || '',
            teamAShort: row.team_a_short || '', teamBShort: row.team_b_short || '',
            teamAColor: row.team_a_color || '', teamBColor: row.team_b_color || '',
            teamAPlayingXI: teamAXI, teamBPlayingXI: teamBXI,
            date: row.match_date || '', time: row.match_time || '',
            venue: row.venue || '', matchFormat: row.match_format || '',
            totalOvers: num(row.overs),
            status: String(row.status || 'SCHEDULED').toLowerCase(),
            tossWinnerId: row.toss_winner_id, tossDecision: row.toss_decision || 'Bat',
            umpires: row.umpires || '',
            currentInningIndex: Math.max(0, num(row.current_innings) - 1),
            innings,
            resultSummary: row.result_summary || '',
            winnerTeamId: row.winner_team_id,
            playerOfTheMatch: row.player_of_the_match || '',
            customSummaryText: row.custom_summary_text || '',
            keyMoments: row.key_moments || '',
            lastBowlerId: row.last_bowler_id,
            probabilityHistory,
            winProbability: row.win_probability || null
        };
    }

    /* ---------- full load: cloud → local array of tournaments ---------- */
    async function sb_loadAllTournaments() {
        if (!sb()) { console.error('[sync] No Supabase client'); return []; }

        const { data: tours, error } = await sb().from('tournaments')
            .select('*').order('created_at');
        if (error) { console.error('[sync] tournaments load failed:', error.message); return []; }

        const out = [];
        for (const t of tours) {
            const [{ data: teams }, { data: players }, { data: matches }] = await Promise.all([
                sb().from('teams').select('*').eq('tournament_id', t.id).order('created_at'),
                sb().from('players').select('*').eq('tournament_id', t.id).order('created_at'),
                sb().from('matches').select('*').eq('tournament_id', t.id).order('created_at')
            ]);

            const mappedMatches = [];
            for (const m of (matches || [])) {
                mappedMatches.push(await mapMatch(m, t.id, players || []));
            }

            out.push({
                id: t.id,
                hostId: t.created_by, hostName: t.host_name || t.organizer || '',
                name: t.name, logo: t.logo || '🏆', description: t.description || '',
                format: t.format || 'T20', overs: num(t.overs),
                location: t.location || '', organizer: t.organizer || '',
                startDate: t.start_date || '', endDate: t.end_date || '',
                numberOfTeams: num(t.number_of_teams),
                rules: t.rules || '', status: String(t.status || 'upcoming').toLowerCase(),
                teams: (teams || []).map(tm => ({
                    id: tm.id, tournamentId: t.id,
                    name: tm.name, shortName: tm.short_name || '',
                    color: tm.color || '#16a34a', logo: tm.logo_url || '',
                    captainId: null, viceCaptainId: null,
                    wicketkeeperIds: (players || []).filter(p => p.team_id === tm.id && p.is_wicketkeeper).map(p => p.id),
                    playerIds: (players || []).filter(p => p.team_id === tm.id).map(p => p.id)
                })),
                players: (players || []).map(p => ({
                    id: p.id, tournamentId: t.id, teamId: p.team_id,
                    name: p.name, jersey: p.jersey_number != null ? String(p.jersey_number) : '',
                    role: p.role || 'Batsman',
                    battingStyle: p.batting_style || '', bowlingStyle: p.bowling_style || '',
                    isWicketkeeper: !!p.is_wicketkeeper, isCaptain: !!p.is_captain,
                    isViceCaptain: !!p.is_vice_captain, profileImage: p.profile_image || ''
                })),
                matches: mappedMatches
            });
        }
        console.log(`[sync] Loaded ${out.length} tournament(s) from Supabase`);
        return out;
    }

    /* ============================================================
       WRITE-THROUGH SYNC
       Watches localStorage; whenever it changes, pushes data to Supabase.
       Strategy: upsert everything changed (simple + safe for now).
       ============================================================ */

    const LAST_KEY = 'scoresh_sync_state_v1';
    let syncing = false;

    function localFingerprint() {
        const raw = localStorage.getItem('scoresh_tournaments_v3') || '';
        // Cheap fingerprint: length + simple hash
        let h = 0;
        for (let i = 0; i < raw.length; i += Math.max(1, Math.floor(raw.length / 500))) {
            h = (h * 31 + raw.charCodeAt(i)) | 0;
        }
        return h + ':' + raw.length;
    }

    async function pushTournament(t) {
        // 1. Tournament row
        await sb().from('tournaments').upsert({
            id: t.id, name: t.name, logo: t.logo || '🏆', description: t.description || '',
            format: t.format || 'T20', overs: t.overs || 0, location: t.location || '',
            organizer: t.organizer || '', start_date: t.startDate || '', end_date: t.endDate || '',
            number_of_teams: t.numberOfTeams || 0, rules: t.rules || '',
            status: String(t.status || 'upcoming').toUpperCase()
        });

        // 2. Teams
        if (t.teams?.length) {
            await sb().from('teams').upsert(t.teams.map(tm => ({
                id: tm.id, tournament_id: t.id, name: tm.name,
                short_name: tm.shortName || '', color: tm.color || '#16a34a'
            })));
        }

        // 3. Players
        if (t.players?.length) {
            await sb().from('players').upsert(t.players.map(p => ({
                id: p.id, tournament_id: t.id, team_id: p.teamId, name: p.name,
                jersey_number: p.jersey ? parseInt(p.jersey) : null,
                role: p.role || 'Batsman', batting_style: p.battingStyle || '',
                bowling_style: p.bowlingStyle || '',
                is_wicketkeeper: !!p.isWicketkeeper, is_captain: !!p.isCaptain,
                is_vice_captain: !!p.isViceCaptain
            })));
        }

        // 4. Matches + innings + deliveries
        for (const m of (t.matches || [])) {
            const matchStatus = ({ 'live': 'LIVE', 'upcoming': 'SCHEDULED', 'completed': 'COMPLETED', 'break': 'BREAK' }[String(m.status).toLowerCase()] || 'SCHEDULED');
            await sb().from('matches').upsert({
                id: m.id, tournament_id: t.id,
                title: m.title || '', team_a_id: m.teamAId, team_b_id: m.teamBId,
                team_a_name: m.teamAName || '', team_b_name: m.teamBName || '',
                team_a_short: m.teamAShort || '', team_b_short: m.teamBShort || '',
                team_a_color: m.teamAColor || '', team_b_color: m.teamBColor || '',
                match_date: m.date || '', match_time: m.time || '', venue: m.venue || '',
                match_format: m.matchFormat || '', overs: m.totalOvers || 0,
                status: matchStatus,
                toss_winner_id: m.tossWinnerId, toss_decision: m.tossDecision || m.tDecision || 'Bat',
                umpires: m.umpires || '', current_innings: (m.currentInningIndex ?? 0) + 1,
                result_summary: m.resultSummary || '', winner_team_id: m.winnerTeamId,
                player_of_the_match: m.playerOfTheMatch || '',
                custom_summary_text: m.customSummaryText || '', key_moments: m.keyMoments || '',
                last_bowler_id: m.lastBowlerId
            });

            // Playing XI (delete+insert keeps it in sync with any XI changes)
            if (m.teamAPlayingXI?.length || m.teamBPlayingXI?.length) {
                const xiRows = [
                    ...(m.teamAPlayingXI || []).map((pid, i) => ({
                        match_id: m.id, team_id: m.teamAId, player_id: pid, batting_order: i + 1
                    })),
                    ...(m.teamBPlayingXI || []).map((pid, i) => ({
                        match_id: m.id, team_id: m.teamBId, player_id: pid, batting_order: i + 1
                    }))
                ];
                await sb().from('playing_xi').delete().eq('match_id', m.id);
                await sb().from('playing_xi').upsert(xiRows);
            }

            for (const inn of (m.innings || [])) {
                await sb().from('innings').upsert({
                    id: inn.id, match_id: m.id, innings_number: inn.inningNumber,
                    batting_team_id: inn.battingTeamId, batting_team_name: inn.battingTeamName || '',
                    bowling_team_id: inn.bowlingTeamId, bowling_team_name: inn.bowlingTeamName || '',
                    striker_id: inn.strikerId, non_striker_id: inn.nonStrikerId,
                    current_bowler_id: inn.currentBowlerId,
                    batsmen: inn.batsmen || [], bowlers: inn.bowlers || [],
                    fall_of_wickets: inn.fallOfWickets || [], partnerships: inn.partnerships || [],
                    extras: inn.extras || { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
                    total_runs: inn.totalRuns || 0, total_wickets: inn.totalWickets || 0,
                    legal_balls: inn.legalBalls || 0,
                    is_completed: !!inn.isCompleted, target: inn.target ?? null
                });

                // Deliveries — upsert (id key makes re-pushes harmless)
                if (inn.ballLog?.length) {
                    const isUuid = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');
                    const delRows = inn.ballLog.map(b => {
                        // Upgrade legacy non-uuid ball ids once — new id persists in local data
                        if (!isUuid(b.id)) b.id = crypto.randomUUID();
                        return {
                            id: b.id, innings_id: inn.id,
                            over_number: b.overIndex, ball_number: b.ballInOver,
                            striker_id: b.strikerId || null, striker_name: b.strikerName || '',
                            non_striker_id: b.nonStrikerId || null, non_striker_name: b.nonStrikerName || '',
                            bowler_id: b.bowlerId || null, bowler_name: b.bowlerName || '',
                            runs_batter: b.runsOffBat || 0,
                            runs_wide: b.extras?.wide || 0, runs_noball: b.extras?.noball || 0,
                            runs_bye: b.extras?.bye || 0, runs_legbye: b.extras?.legbye || 0,
                            is_legal: !!b.isLegal, is_wicket: !!b.isWicket,
                            dismissed_player_id: b.dismissedPlayerId || null,
                            dismissed_player_name: b.dismissedPlayerName || '',
                            dismissal_type: b.dismissalType || null,
                            fielder_id: b.fielderId || null, fielder_name: b.fielderName || '',
                            wicketkeeper_id: b.wicketkeeperId || null, wicketkeeper_name: b.wicketkeeperName || '',
                            dismissal_desc: b.dismissalDesc || '',
                            auto_commentary: b.autoCommentary || ''
                        };
                    });
                    await sb().from('deliveries').upsert(delRows);
                }
            }
        }
    }

    async function syncNow() {
        if (syncing) return;
        syncing = true;
        try {
            const tours = JSON.parse(localStorage.getItem('scoresh_tournaments_v3') || '[]');
            for (const t of tours) await pushTournament(t);
            localStorage.setItem('scoresh_tournaments_v3', JSON.stringify(tours));
            localStorage.setItem(LAST_KEY, localFingerprint());
            console.log('[sync] ☁️ Cloud sync complete', new Date().toLocaleTimeString());
        } catch (e) {
            console.error('[sync] push failed:', e.message || e);
        } finally {
            syncing = false;
        }
    }

    // Auto-sync: poll for local changes every 5 seconds
    setInterval(() => {
        if (localFingerprint() !== localStorage.getItem(LAST_KEY)) syncNow();
    }, 5000);

    window.supabaseSync = { sb_loadAllTournaments, syncNow };
    console.log('[Scoresh] supabase-sync ready: await window.supabaseSync.sb_loadAllTournaments()');
})();
