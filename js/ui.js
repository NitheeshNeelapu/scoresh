/**
 * Scoresh UI Rendering Engine
 * Renders dynamic views adapted for Role-Based Access Control (Host vs Participant),
 * tournament dashboards, live ball scoring, commentary timelines, derived scorecards,
 * fall of wickets, partnerships, points tables, and tournament records.
 */

const ScoreshUI = {
    render(state) {
        this.renderUserAuthPill(state);
        this.renderTournamentSwitcher(state);
        this.renderActiveView(state);

        // Update nav links visibility based on tournament existence and role
        const hasTournaments = state.tournaments.length > 0;
        document.querySelectorAll('.requires-tournament').forEach(el => {
            el.style.display = hasTournaments ? 'block' : 'none';
        });

        // Hide host-only controls if user is a participant
        const isHost = state.isHost;
        document.querySelectorAll('.host-only-control').forEach(el => {
            el.style.display = isHost ? '' : 'none';
        });
        document.querySelectorAll('.participant-only-notice').forEach(el => {
            el.style.display = isHost ? 'none' : '';
        });

        // Render current active view
        switch (state.activeView) {
            case 'welcome':
                this.renderWelcomeView(state);
                break;
            case 'dashboard':
                this.renderDashboardView(state);
                break;
            case 'tournaments':
                this.renderTournamentsView(state);
                break;
            case 'matches':
                this.renderMatchesView(state);
                break;
            case 'teams':
                this.renderTeamsView(state);
                break;
            case 'players':
                this.renderPlayersView(state);
                break;
            case 'live':
                this.renderLiveMatchView(state);
                break;
            case 'scorecard':
                this.renderScorecardView(state);
                break;
            case 'table':
                this.renderPointsTableView(state);
                break;
            case 'records':
                this.renderRecordsView(state);
                break;
            case 'analytics':
                this.renderAnalyticsView(state);
                break;
        }
    },

    renderUserAuthPill(state) {
        const user = state.currentUser;
        const pill = document.getElementById('top-user-auth-pill');
        if (!pill) return;

        if (user) {
            pill.innerHTML = `
                <div class="user-role-badge ${user.role === 'host' ? 'badge-host' : 'badge-participant'}" onclick="window.ScoreshModals.openAuthModal()">
                    <span class="user-role-dot"></span>
                    <span class="font-bold text-xs">${user.role.toUpperCase()}</span>
                    <span class="user-name-text">${user.name.split(' ')[0]}</span>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="window.authService.switchRole('${user.role === 'host' ? 'participant' : 'host'}'); window.scoreState.notify();" title="Switch Role (Testing)">
                    Switch to ${user.role === 'host' ? 'Participant' : 'Host'}
                </button>
            `;
        } else {
            pill.innerHTML = `
                <button class="btn btn-primary btn-sm" onclick="window.ScoreshModals.openAuthModal('login')">Login / Register</button>
            `;
        }
    },

    renderTournamentSwitcher(state) {
        const btn = document.getElementById('top-tourn-select-btn');
        const dropdown = document.getElementById('top-tourn-dropdown');
        if (!btn || !dropdown) return;

        const activeT = state.activeTournament;
        btn.querySelector('span').textContent = activeT ? `${activeT.name} ▾` : 'Select Tournament ▾';

        if (state.tournaments.length === 0) {
            dropdown.innerHTML = `
                <div style="padding:1rem; text-align:center;" class="text-sm text-muted">
                    No tournaments available.
                    <div style="margin-top:0.5rem;" class="host-only-control">
                        <button class="btn btn-accent btn-sm" onclick="window.tournamentWizard.open()">+ Create Tournament</button>
                    </div>
                </div>
            `;
            return;
        }

        dropdown.innerHTML = state.tournaments.map(t => `
            <div class="dropdown-item ${t.id === state.activeTournamentId ? 'active' : ''}" onclick="window.scoreState.selectTournament('${t.id}')">
                <div style="font-weight:700; font-size:0.9rem;">${t.logo || '🏆'} ${t.name}</div>
                <div class="text-xs text-muted">${t.format} • ${t.teams.length} Teams • ${t.location || 'Local'}</div>
            </div>
        `).join('') + `
            <div class="dropdown-item dropdown-create-btn host-only-control" onclick="window.tournamentWizard.open()">
                + Create New Tournament
            </div>
        `;
    },

    renderActiveView(state) {
        document.querySelectorAll('.spa-view').forEach(view => {
            const viewId = view.id.replace('view-', '');
            view.classList.toggle('active', viewId === state.activeView);
        });

        document.querySelectorAll('.nav-link, .mobile-nav-link').forEach(link => {
            const viewAttr = link.getAttribute('data-view');
            link.classList.toggle('active', viewAttr === state.activeView);
        });
    },

    // --- 1. WELCOME VIEW ---
    renderWelcomeView(state) {
        const existingCard = document.getElementById('welcome-existing-card');
        const list = document.getElementById('welcome-tournaments-list');
        const hostWelcomeNotice = document.getElementById('welcome-host-prompt');

        if (hostWelcomeNotice) {
            hostWelcomeNotice.textContent = state.isHost
                ? 'Do you have a new tournament to create?'
                : 'Welcome, Cricket Participant! Select a tournament to view live scores and standings.';
        }

        if (existingCard && list) {
            if (state.tournaments.length > 0) {
                existingCard.style.display = 'block';
                list.innerHTML = state.tournaments.map(t => `
                    <div class="welcome-tourn-row">
                        <div>
                            <strong style="font-size:1.05rem;">${t.logo || '🏆'} ${t.name}</strong>
                            <div class="text-xs text-muted">${t.format} Format • ${t.teams.length} Teams • ${t.matches.length} Matches • Host: ${t.organizer || 'Organizer'}</div>
                        </div>
                        <button class="btn btn-secondary btn-sm" onclick="window.scoreState.selectTournament('${t.id}')">Open Tournament &rarr;</button>
                    </div>
                `).join('');
            } else {
                existingCard.style.display = 'none';
            }
        }
    },

    // --- 2. DASHBOARD VIEW ---
    renderDashboardView(state) {
        const tournament = state.activeTournament;
        if (!tournament) return;

        const nameEl = document.getElementById('dash-tourn-name');
        const formatEl = document.getElementById('dash-tourn-format');
        if (nameEl) nameEl.textContent = `${tournament.logo || '🏆'} ${tournament.name}`;
        if (formatEl) formatEl.textContent = `${tournament.format} (${tournament.overs} Overs) • ${tournament.location || 'Local Ground'} • Organizer: ${tournament.organizer || 'Host'}`;

        const teamsCount = tournament.teams.length;
        const playedCount = tournament.matches.filter(m => m.status === 'completed').length;
        const remainingCount = tournament.matches.filter(m => m.status === 'upcoming' || m.status === 'live').length;

        const statTeams = document.getElementById('dash-stat-teams');
        const statPlayed = document.getElementById('dash-stat-played');
        const statRemaining = document.getElementById('dash-stat-remaining');
        const statLeader = document.getElementById('dash-stat-leader');

        if (statTeams) statTeams.textContent = teamsCount;
        if (statPlayed) statPlayed.textContent = playedCount;
        if (statRemaining) statRemaining.textContent = remainingCount;

        const standings = window.ScoreshCalculations.computePointsTable(tournament);
        if (statLeader) statLeader.textContent = (standings.length > 0 && standings[0].points > 0) ? standings[0].teamName : (standings[0]?.teamName || '—');

        // Live match active banner
        const liveMatch = tournament.matches.find(m => m.status === 'live');
        const liveCard = document.getElementById('dash-live-match-card');
        if (liveCard) {
            if (liveMatch) {
                liveCard.style.display = 'block';
                document.getElementById('dash-live-match-title').textContent = liveMatch.title;
                const inn = liveMatch.currentInnings;
                document.getElementById('dash-live-match-score').textContent = `${inn.battingTeamName}: ${inn.totalRuns}/${inn.totalWickets} (${inn.displayOvers} ov)`;
                document.getElementById('dash-live-match-status').textContent = `Innings ${liveMatch.currentInningIndex + 1} in progress • CRR: ${window.ScoreshCalculations.formatStat(inn.runRate)}`;
                document.getElementById('dash-live-match-btn').onclick = () => window.scoreState.selectMatch(liveMatch.id, 'live');
            } else {
                liveCard.style.display = 'none';
            }
        }

        // Summary cards
        const stats = window.ScoreshCalculations.computeTournamentStats(tournament);
        const topScorerEl = document.getElementById('dash-top-scorer');
        const topBowlerEl = document.getElementById('dash-top-bowler');
        const upcomingMatchEl = document.getElementById('dash-upcoming-match');
        const latestResultEl = document.getElementById('dash-latest-result');

        if (topScorerEl) {
            const leader = stats.orangeCap[0];
            topScorerEl.textContent = leader ? `${leader.playerName} (${leader.runs} runs, SR ${window.ScoreshCalculations.formatStat(leader.strikeRate)})` : 'No runs recorded yet';
        }

        if (topBowlerEl) {
            const leader = stats.purpleCap[0];
            topBowlerEl.textContent = leader ? `${leader.playerName} (${leader.wickets} wkts, Econ ${window.ScoreshCalculations.formatStat(leader.economy)})` : 'No wickets recorded yet';
        }

        const upcomingMatch = tournament.matches.find(m => m.status === 'upcoming');
        if (upcomingMatchEl) {
            upcomingMatchEl.textContent = upcomingMatch ? `${upcomingMatch.title} (${upcomingMatch.date} @ ${upcomingMatch.time})` : 'No upcoming fixtures pending';
        }

        const lastCompleted = tournament.matches.filter(m => m.status === 'completed').slice(-1)[0];
        if (latestResultEl) {
            latestResultEl.textContent = lastCompleted ? `${lastCompleted.title} — ${lastCompleted.resultSummary}` : 'No completed match results yet';
        }
    },

    // --- 3. TOURNAMENTS VIEW ---
    renderTournamentsView(state) {
        const grid = document.getElementById('tournaments-grid');
        if (!grid) return;

        if (state.tournaments.length === 0) {
            grid.innerHTML = `
                <div class="empty-state-card" style="grid-column: 1 / -1;">
                    <div class="empty-icon">🏆</div>
                    <h3 class="empty-title">No Tournaments Found</h3>
                    <p class="empty-desc">Create your first cricket tournament to begin organizing teams and matches.</p>
                    <div class="host-only-control">
                        <button class="btn btn-accent" onclick="window.tournamentWizard.open()">+ Create Tournament</button>
                    </div>
                </div>
            `;
            return;
        }

        grid.innerHTML = state.tournaments.map(t => {
            const isActive = t.id === state.activeTournamentId;
            return `
                <div class="stat-card" style="border-left: 4px solid ${isActive ? 'var(--color-green)' : 'var(--border-dark)'};">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
                        <div>
                            <span class="badge-strike" style="font-size:0.7rem;">${t.format} Format</span>
                            <h3 style="font-size:1.2rem; font-weight:800; margin-top:0.3rem;">${t.logo || '🏆'} ${t.name}</h3>
                        </div>
                        ${isActive ? '<span class="badge-strike">Active</span>' : ''}
                    </div>
                    <p class="text-xs text-muted" style="margin-bottom:0.85rem;">
                        📍 ${t.location || 'Local Ground'} • 👥 ${t.teams.length} Teams • 🏏 ${t.matches.length} Matches • Host: ${t.organizer || 'Organizer'}
                    </p>
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-top:1rem; border-top:1px solid var(--border-light); padding-top:0.75rem;">
                        <button class="btn btn-primary btn-sm" onclick="window.scoreState.selectTournament('${t.id}')">Select & Open</button>
                        ${state.isHost ? `
                            <button class="btn-action-sm btn-action-delete" onclick="window.ScoreshModals.confirm('Delete Tournament', 'Permanently delete ${t.name}?', 'Delete', () => window.scoreState.deleteTournament('${t.id}'))">Delete</button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // --- 4. MATCHES VIEW ---
    renderMatchesView(state) {
        const container = document.getElementById('matches-list-container');
        if (!container) return;

        const tournament = state.activeTournament;
        if (!tournament || tournament.matches.length === 0) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <div class="empty-icon">🏏</div>
                    <h3 class="empty-title">No Matches Scheduled</h3>
                    <p class="empty-desc">Create your first match or schedule fixtures between registered teams.</p>
                    ${state.isHost ? `<button class="btn btn-accent" onclick="window.ScoreshModals.openCreateMatchModal()">+ Create Match</button>` : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = tournament.matches.map(m => {
            const inn1 = m.innings[0];
            const inn2 = m.innings[1];

            return `
                <div class="match-fixture-card">
                    <div class="match-fixture-header">
                        <div>
                            <strong>${m.title}</strong>
                            <span class="text-xs text-muted" style="margin-left:0.5rem;">${m.date} @ ${m.time} • ${m.venue} • ${m.totalOvers} ov</span>
                        </div>
                        <span class="${m.status === 'live' ? 'live-indicator' : 'badge-strike'}">
                            ${m.status === 'live' ? '<span class="live-dot"></span> LIVE' : m.status.toUpperCase()}
                        </span>
                    </div>

                    <div class="match-fixture-body">
                        <div class="fixture-team-row">
                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                <span style="width:12px; height:12px; border-radius:50%; background-color:${m.teamAColor}; display:inline-block;"></span>
                                <strong style="font-size:1.05rem;">${m.teamAName}</strong>
                            </div>
                            <span class="font-mono font-bold">${(inn1 && inn1.battingTeamId === m.teamAId) ? `${inn1.totalRuns}/${inn1.totalWickets} (${inn1.displayOvers} ov)` : (inn2 && inn2.battingTeamId === m.teamAId ? `${inn2.totalRuns}/${inn2.totalWickets} (${inn2.displayOvers} ov)` : '—')}</span>
                        </div>
                        <div class="fixture-team-row">
                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                <span style="width:12px; height:12px; border-radius:50%; background-color:${m.teamBColor}; display:inline-block;"></span>
                                <strong style="font-size:1.05rem;">${m.teamBName}</strong>
                            </div>
                            <span class="font-mono font-bold">${(inn1 && inn1.battingTeamId === m.teamBId) ? `${inn1.totalRuns}/${inn1.totalWickets} (${inn1.displayOvers} ov)` : (inn2 && inn2.battingTeamId === m.teamBId ? `${inn2.totalRuns}/${inn2.totalWickets} (${inn2.displayOvers} ov)` : '—')}</span>
                        </div>
                    </div>

                    ${m.resultSummary ? `
                        <div class="match-result-summary-bar">
                            <span class="text-xs font-bold text-green">Result:</span>
                            <span class="text-sm font-semibold">${m.resultSummary}</span>
                            ${m.playerOfTheMatch ? `<span class="text-xs text-muted" style="margin-left:0.5rem;">(Player of Match: <strong>${m.playerOfTheMatch}</strong>)</span>` : ''}
                        </div>
                    ` : ''}

                    <div class="match-fixture-footer">
                        <div class="action-buttons-group">
                            ${m.status === 'upcoming' && state.isHost ? `
                                <button class="btn btn-accent btn-sm" onclick="window.ScoreshModals.openPlayingXIModal('${m.id}')">Select XI & Start 🏏</button>
                            ` : ''}
                            ${m.status === 'live' ? `
                                <button class="btn btn-accent btn-sm" onclick="window.scoreState.selectMatch('${m.id}', 'live')">${state.isHost ? 'Live Scoring Pad' : 'View Live Match'} &rarr;</button>
                            ` : ''}
                            <button class="btn btn-secondary btn-sm" onclick="window.scoreState.selectMatch('${m.id}', 'scorecard')">Scorecard</button>
                        </div>
                        ${state.isHost ? `
                            <button class="btn-action-sm btn-action-delete" onclick="window.ScoreshModals.confirm('Delete Match', 'Delete ${m.title}?', 'Delete', () => window.scoreState.deleteMatch('${tournament.id}', '${m.id}'))">Delete</button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    },

    // --- 5. TEAMS & SQUADS VIEW ---
    renderTeamsView(state) {
        const container = document.getElementById('teams-grid-container');
        if (!container) return;

        const tournament = state.activeTournament;
        if (!tournament || tournament.teams.length === 0) {
            container.innerHTML = `
                <div class="empty-state-card" style="grid-column: 1 / -1;">
                    <div class="empty-icon">👥</div>
                    <h3 class="empty-title">No Teams Registered</h3>
                    <p class="empty-desc">Register teams to build your tournament competition.</p>
                    ${state.isHost ? `<button class="btn btn-accent" onclick="window.ScoreshModals.openAddTeamModal()">+ Add Team</button>` : ''}
                </div>
            `;
            return;
        }

        container.innerHTML = tournament.teams.map(team => {
            const players = tournament.getTeamPlayers(team.id);

            return `
                <div class="team-squad-card" style="border-top: 4px solid ${team.color};">
                    <div class="team-squad-header">
                        <div>
                            <h3 style="font-size:1.15rem; font-weight:800;">${team.name}</h3>
                            <span class="text-xs text-muted">Short Code: <strong>${team.shortName}</strong> • ${players.length} Players</span>
                        </div>
                        ${state.isHost ? `
                            <button class="btn-action-sm" onclick="window.ScoreshModals.openAddPlayerModal('${team.id}')">+ Player</button>
                        ` : ''}
                    </div>

                    <div class="squad-players-list">
                        ${players.length === 0 ? '<p class="text-xs text-muted" style="padding:0.5rem 0;">No squad players added yet.</p>' : players.map(p => `
                            <div class="squad-player-item">
                                <div>
                                    <strong>${p.name}</strong>
                                    <span class="text-xs text-muted" style="margin-left:0.35rem;">(#${p.jersey || '—'})</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:0.4rem;">
                                    <span class="text-xs text-muted">${p.role}</span>
                                    ${state.isHost ? `
                                        <button class="btn-action-sm btn-action-delete" style="padding:0.1rem 0.3rem;" onclick="window.scoreState.deletePlayer('${tournament.id}', '${p.id}')">&times;</button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    },

    // --- 6. PLAYERS DIRECTORY VIEW ---
    renderPlayersView(state) {
        const tbody = document.getElementById('players-table-body');
        if (!tbody) return;

        const tournament = state.activeTournament;
        if (!tournament || tournament.players.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding:2rem;">No players in tournament roster.</td></tr>`;
            return;
        }

        let players = tournament.players;
        if (state.searchQuery) {
            players = players.filter(p => p.name.toLowerCase().includes(state.searchQuery) || p.role.toLowerCase().includes(state.searchQuery));
        }

        tbody.innerHTML = players.map((p, index) => {
            const team = tournament.getTeam(p.teamId);
            return `
                <tr>
                    <td class="font-mono text-muted">${index + 1}</td>
                    <td><strong>${p.name}</strong></td>
                    <td>${team ? `<span style="display:inline-flex; align-items:center; gap:0.4rem;"><span style="width:8px; height:8px; border-radius:50%; background-color:${team.color}; display:inline-block;"></span>${team.name}</span>` : '<span class="text-muted">Unassigned</span>'}</td>
                    <td><span class="badge-strike">${p.role}</span></td>
                    <td class="font-mono">${p.jersey || '—'}</td>
                    <td class="text-sm text-muted">${p.battingStyle} / ${p.bowlingStyle}</td>
                    <td class="text-right">
                        ${state.isHost ? `
                            <button class="btn-action-sm btn-action-delete" onclick="window.scoreState.deletePlayer('${tournament.id}', '${p.id}')">Remove</button>
                        ` : '<span class="text-xs text-muted">—</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    },

    // --- 7. LIVE MATCH SCORING VIEW ---
    renderLiveMatchView(state) {
        const emptyState = document.getElementById('live-no-match-empty');
        const content = document.getElementById('live-active-match-content');
        const match = state.activeMatch;

        if (!match) {
            if (emptyState) emptyState.style.display = 'block';
            if (content) content.style.display = 'none';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (content) content.style.display = 'block';

        const inn = match.currentInnings;
        document.getElementById('live-match-header-title').textContent = `${match.title} (${match.status.toUpperCase()})`;
        document.getElementById('live-match-header-venue').textContent = `📍 ${match.venue} • Format: ${match.matchFormat} (${match.totalOvers} ov)`;

        // Innings & Batting team scores
        document.getElementById('live-bat-team-name').textContent = inn.battingTeamName;
        document.getElementById('live-bat-team-runs').textContent = inn.totalRuns;
        document.getElementById('live-bat-team-wickets').textContent = inn.totalWickets;
        document.getElementById('live-bat-team-overs').textContent = `${inn.displayOvers} / ${match.totalOvers} ov`;

        const bowlTeamScoreEl = document.getElementById('live-bowl-team-score');
        document.getElementById('live-bowl-team-name').textContent = inn.bowlingTeamName;
        if (match.currentInningIndex === 1) {
            const inn1 = match.firstInnings;
            bowlTeamScoreEl.textContent = `${inn1.totalRuns}/${inn1.totalWickets} (${inn1.displayOvers} ov)`;
        } else {
            bowlTeamScoreEl.textContent = 'Yet to Bat';
        }

        // CRR & RRR
        document.getElementById('live-crr-val').textContent = window.ScoreshCalculations.formatStat(inn.runRate);
        const rrrContainer = document.getElementById('live-rrr-container');
        const rrrVal = document.getElementById('live-rrr-val');

        if (match.currentInningIndex === 1 && inn.target) {
            if (rrrContainer) rrrContainer.style.display = 'flex';
            const reqRR = window.ScoreshCalculations.calculateRequiredRunRate(inn.target, inn.totalRuns, match.totalOvers, inn.oversBowled);
            if (rrrVal) rrrVal.textContent = window.ScoreshCalculations.formatStat(reqRR);
        } else {
            if (rrrContainer) rrrContainer.style.display = 'none';
        }

        // Active Crease Batsmen & Bowler
        const striker = inn.batsmen.find(b => b.isOnStrike && !b.isOut);
        const nonStriker = inn.batsmen.find(b => b.isNonStriker && !b.isOut);
        const bowler = inn.bowlers.find(b => b.isCurrentBowler);

        document.getElementById('live-striker-name').textContent = striker ? striker.name : '—';
        document.getElementById('live-striker-runs').textContent = striker ? striker.runs : '0';
        document.getElementById('live-striker-balls').textContent = striker ? striker.balls : '0';
        document.getElementById('live-striker-fours').textContent = striker ? striker.fours : '0';
        document.getElementById('live-striker-sixes').textContent = striker ? striker.sixes : '0';
        document.getElementById('live-striker-sr').textContent = striker ? `SR ${window.ScoreshCalculations.formatStat(striker.strikeRate)}` : 'SR 0.00';

        document.getElementById('live-nonstriker-name').textContent = nonStriker ? nonStriker.name : '—';
        document.getElementById('live-nonstriker-runs').textContent = nonStriker ? nonStriker.runs : '0';
        document.getElementById('live-nonstriker-balls').textContent = nonStriker ? nonStriker.balls : '0';
        document.getElementById('live-nonstriker-sr').textContent = nonStriker ? `SR ${window.ScoreshCalculations.formatStat(nonStriker.strikeRate)}` : 'SR 0.00';

        document.getElementById('live-bowler-name').textContent = bowler ? bowler.name : '—';
        document.getElementById('live-bowler-wkts').textContent = bowler ? bowler.wkttkn : '0';
        document.getElementById('live-bowler-runs').textContent = bowler ? bowler.runsgv : '0';
        document.getElementById('live-bowler-overs').textContent = bowler ? bowler.overs : '0.0';
        document.getElementById('live-bowler-maidens').textContent = bowler ? bowler.maidens : '0';
        document.getElementById('live-bowler-econ').textContent = bowler ? `Econ ${window.ScoreshCalculations.formatStat(bowler.economy)}` : 'Econ 0.00';

        // Innings break / Match completed banners
        const breakBanner = document.getElementById('live-innings-break-banner');
        const targetText = document.getElementById('live-innings-target-text');
        const resultBanner = document.getElementById('live-match-result-banner');
        const resultText = document.getElementById('live-match-result-text');

        if (match.currentInningIndex === 0 && inn.isCompleted) {
            if (breakBanner) breakBanner.style.display = 'flex';
            if (targetText) targetText.textContent = `Target: ${inn.totalRuns + 1} runs in ${match.totalOvers} overs`;
        } else {
            if (breakBanner) breakBanner.style.display = 'none';
        }

        if (match.status === 'completed') {
            if (resultBanner) resultBanner.style.display = 'block';
            if (resultText) resultText.textContent = match.resultSummary || 'Match Completed';
        } else {
            if (resultBanner) resultBanner.style.display = 'none';
        }

        // Recent balls chip strip
        const recentBallsList = document.getElementById('live-recent-balls-list');
        if (recentBallsList) {
            const recent = inn.ballLog.slice(-12);
            recentBallsList.innerHTML = recent.length === 0
                ? '<span class="text-xs text-muted">Over starting...</span>'
                : recent.map(b => {
                    let chipClass = 'ball-chip';
                    let label = `${b.runsOffBat}`;
                    if (b.runsOffBat === 4) chipClass += ' ball-four';
                    else if (b.runsOffBat === 6) chipClass += ' ball-six';
                    else if (b.isWicket) { chipClass += ' ball-wicket'; label = 'W'; }
                    else if (b.extras.wide > 0) label = 'WD';
                    else if (b.extras.noball > 0) label = 'NB';
                    return `<span class="${chipClass}">${label}</span>`;
                }).join('');
        }

        // Ball-by-ball commentary timeline
        const commFeed = document.getElementById('live-commentary-feed');
        if (commFeed) {
            const logs = [...inn.ballLog].reverse();
            commFeed.innerHTML = logs.length === 0
                ? '<p class="text-xs text-muted" style="padding:1rem 0;">No balls bowled in this innings yet.</p>'
                : logs.map(d => `
                    <div class="commentary-item">
                        <span class="commentary-over">${d.displayOverNumber}</span>
                        <div class="commentary-text">
                            <strong>${d.autoCommentary || `${d.bowlerName} to ${d.strikerName}`}</strong>
                            <span class="text-xs text-muted">${new Date(d.timestamp).toLocaleTimeString()}</span>
                        </div>
                    </div>
                `).join('');
        }
    },

    // --- 8. FULL MATCH SCORECARD VIEW ---
    renderScorecardView(state) {
        const container = document.getElementById('scorecard-full-container');
        if (!container) return;

        const match = state.activeMatch;
        if (!match) {
            container.innerHTML = `<div class="empty-state-card"><p class="text-muted">No match selected to view scorecard.</p></div>`;
            return;
        }

        const renderInningsTable = (inn, innNumber) => {
            if (!inn || inn.batsmen.length === 0) {
                return `
                    <div class="table-wrapper" style="padding:1.5rem; margin-bottom:1.5rem;">
                        <h3 style="font-size:1.15rem; font-weight:700;">Innings ${innNumber}: ${inn.battingTeamName || 'Team'}</h3>
                        <p class="text-sm text-muted">Innings not started yet.</p>
                    </div>
                `;
            }

            return `
                <div class="table-wrapper" style="margin-bottom:1.5rem;">
                    <div style="padding:1rem 1.25rem; background-color:var(--bg-card-subtle); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                        <div>
                            <h3 style="font-size:1.2rem; font-weight:800;">${inn.battingTeamName} Innings</h3>
                            <span class="text-xs text-muted">${inn.isCompleted ? 'Innings Completed' : 'Innings in progress'} • Target: ${inn.target || '—'}</span>
                        </div>
                        <div class="runs-highlight" style="font-size:1.8rem;">
                            ${inn.totalRuns} / <span class="text-green">${inn.totalWickets}</span>
                            <span class="text-sm text-muted" style="font-weight:600;">(${inn.displayOvers} ov)</span>
                        </div>
                    </div>

                    <!-- Batting Scorecard -->
                    <div class="table-responsive">
                        <table class="scorecard-table">
                            <thead>
                                <tr>
                                    <th>Batter</th>
                                    <th>Dismissal</th>
                                    <th class="text-right">R</th>
                                    <th class="text-right">B</th>
                                    <th class="text-right">4s</th>
                                    <th class="text-right">6s</th>
                                    <th class="text-right">SR</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${inn.batsmen.map(b => `
                                    <tr class="${b.isOnStrike ? 'row-striker' : ''}">
                                        <td><strong>${b.name}</strong> ${b.isOnStrike ? '<span class="badge-strike">★ Striker</span>' : (b.isNonStriker ? '<span class="badge-nonstrike">• Non-striker</span>' : '')}</td>
                                        <td class="text-sm text-muted">${b.dismissal}</td>
                                        <td class="text-right font-mono font-bold">${b.runs}</td>
                                        <td class="text-right font-mono">${b.balls}</td>
                                        <td class="text-right font-mono">${b.fours}</td>
                                        <td class="text-right font-mono">${b.sixes}</td>
                                        <td class="text-right font-mono text-green">${window.ScoreshCalculations.formatStat(b.strikeRate)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="2"><strong>Extras:</strong> <span class="text-sm text-muted">(w ${inn.extras.wides}, nb ${inn.extras.noBalls}, b ${inn.extras.byes}, lb ${inn.extras.legByes})</span></td>
                                    <td colspan="5" class="text-right font-mono font-bold">${inn.totalExtras}</td>
                                </tr>
                                <tr>
                                    <td colspan="2"><strong>Total Runs:</strong></td>
                                    <td colspan="5" class="text-right font-mono font-bold text-lg">${inn.totalRuns} / ${inn.totalWickets} (${inn.displayOvers} ov, CRR: ${window.ScoreshCalculations.formatStat(inn.runRate)})</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <!-- Fall of Wickets Section -->
                    <div style="padding:0.85rem 1.25rem; background-color:var(--bg-card-subtle); border-top:1px solid var(--border-light);">
                        <span class="text-xs font-bold uppercase text-muted">Fall of Wickets:</span>
                        <div class="text-sm" style="margin-top:0.25rem;">
                            ${inn.fallOfWickets.length === 0 ? '<span class="text-muted">No wickets fallen</span>' : inn.fallOfWickets.map(f => `
                                <span style="margin-right:0.85rem;"><strong>${f.wicketNumber}-${f.runs}</strong> (${f.batsmanName}, ${f.overs} ov)</span>
                            `).join(', ')}
                        </div>
                    </div>

                    <!-- Partnerships Section -->
                    <div style="padding:0.85rem 1.25rem; border-top:1px solid var(--border-light);">
                        <span class="text-xs font-bold uppercase text-muted">Partnerships:</span>
                        <div class="text-sm" style="margin-top:0.25rem;">
                            ${inn.partnerships.length === 0 ? '<span class="text-muted">—</span>' : inn.partnerships.map(p => `
                                <span style="margin-right:1rem;"><strong>${p.runs} runs</strong> (${p.balls}b) — ${p.batsman1Name} & ${p.batsman2Name} ${p.isCurrent ? '<span class="badge-strike">Active</span>' : ''}</span>
                            `).join(' • ')}
                        </div>
                    </div>

                    <!-- Bowling Scorecard -->
                    <div class="table-responsive">
                        <table class="scorecard-table">
                            <thead>
                                <tr>
                                    <th>Bowler</th>
                                    <th class="text-right">O</th>
                                    <th class="text-right">M</th>
                                    <th class="text-right">R</th>
                                    <th class="text-right">W</th>
                                    <th class="text-right">Econ</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${inn.bowlers.map(bw => `
                                    <tr>
                                        <td><strong>${bw.name}</strong> ${bw.isCurrentBowler ? '<span class="badge-strike">Bowling</span>' : ''}</td>
                                        <td class="text-right font-mono">${bw.overs}</td>
                                        <td class="text-right font-mono">${bw.maidens}</td>
                                        <td class="text-right font-mono">${bw.runsgv}</td>
                                        <td class="text-right font-mono font-bold text-green">${bw.wkttkn}</td>
                                        <td class="text-right font-mono text-muted">${window.ScoreshCalculations.formatStat(bw.economy)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        };

        container.innerHTML = `
            <div style="background-color:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:1.25rem; margin-bottom:1.5rem;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                    <div>
                        <h2 style="font-size:1.4rem; font-weight:800;">${match.title}</h2>
                        <p class="text-sm text-muted">${match.venue} • ${match.date} • ${match.matchFormat} (${match.totalOvers} Overs)</p>
                    </div>
                    ${match.resultSummary ? `
                        <div style="text-align:right;">
                            <span class="badge-strike">Result</span>
                            <div style="font-weight:800; font-size:1.1rem; color:var(--color-green); margin-top:0.25rem;">${match.resultSummary}</div>
                            ${match.playerOfTheMatch ? `<div class="text-xs text-muted">Player of the Match: <strong>${match.playerOfTheMatch}</strong></div>` : ''}
                        </div>
                    ` : ''}
                </div>
            </div>

            ${renderInningsTable(match.firstInnings, 1)}
            ${renderInningsTable(match.secondInnings, 2)}
        `;
    },

    // --- 9. POINTS TABLE VIEW ---
    renderPointsTableView(state) {
        const tbody = document.getElementById('points-table-body');
        if (!tbody) return;

        const tournament = state.activeTournament;
        if (!tournament || tournament.teams.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted" style="padding:2rem;">No teams registered in tournament.</td></tr>`;
            return;
        }

        const standings = window.ScoreshCalculations.computePointsTable(tournament);

        tbody.innerHTML = standings.map((s, index) => {
            const formBadges = s.form.map(f => {
                if (f === 'W') return '<span class="form-badge form-w">W</span>';
                if (f === 'L') return '<span class="form-badge form-l">L</span>';
                return '<span class="form-badge form-t">T</span>';
            }).join(' ');

            return `
                <tr>
                    <td class="font-mono text-muted">${index + 1}</td>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.6rem;">
                            <span style="width:12px; height:12px; border-radius:50%; background-color:${s.color}; display:inline-block;"></span>
                            <strong>${s.teamName}</strong>
                            <span class="text-xs text-muted">(${s.shortName})</span>
                        </div>
                    </td>
                    <td class="text-right font-mono">${s.played}</td>
                    <td class="text-right font-mono font-bold text-green">${s.won}</td>
                    <td class="text-right font-mono text-red">${s.lost}</td>
                    <td class="text-right font-mono">${s.tied}</td>
                    <td class="text-right font-mono font-bold text-lg text-charcoal">${s.points}</td>
                    <td class="text-right font-mono ${s.nrr >= 0 ? 'text-green' : 'text-red'}">${s.nrr >= 0 ? '+' : ''}${window.ScoreshCalculations.formatStat(s.nrr, 3)}</td>
                    <td class="text-center">${formBadges || '<span class="text-muted">—</span>'}</td>
                </tr>
            `;
        }).join('');
    },

    // --- 10. RECORDS VIEW ---
    renderRecordsView(state) {
        const tournament = state.activeTournament;
        const stats = window.ScoreshCalculations.computeTournamentStats(tournament);

        const orange = stats.orangeCap[0];
        document.getElementById('rec-orange-cap-val').textContent = orange ? orange.runs : '0';
        document.getElementById('rec-orange-cap-name').textContent = orange ? orange.playerName : '—';
        document.getElementById('rec-orange-cap-sub').textContent = orange ? `Avg ${window.ScoreshCalculations.formatStat(orange.average)} • SR ${window.ScoreshCalculations.formatStat(orange.strikeRate)}` : 'Leaderboard leader';

        const purple = stats.purpleCap[0];
        document.getElementById('rec-purple-cap-val').textContent = purple ? purple.wickets : '0';
        document.getElementById('rec-purple-cap-name').textContent = purple ? purple.playerName : '—';
        document.getElementById('rec-purple-cap-sub').textContent = purple ? `Econ ${window.ScoreshCalculations.formatStat(purple.economy)} • Best ${purple.bestWkts}/${purple.bestRuns}` : 'Top wicket taker';

        const highScore = stats.highestScores[0];
        document.getElementById('rec-high-score-val').textContent = highScore ? highScore.runs : '0';
        document.getElementById('rec-high-score-name').textContent = highScore ? highScore.playerName : '—';
        document.getElementById('rec-high-score-sub').textContent = highScore ? `${highScore.balls}b (${highScore.fours}x4, ${highScore.sixes}x6)` : '—';

        const sixes = stats.mostSixes[0];
        document.getElementById('rec-most-sixes-val').textContent = sixes ? sixes.sixes : '0';
        document.getElementById('rec-most-sixes-name').textContent = sixes ? sixes.playerName : '—';

        const bestEcon = stats.bestEconomy[0];
        document.getElementById('rec-best-econ-val').textContent = bestEcon ? window.ScoreshCalculations.formatStat(bestEcon.economy) : '0.00';
        document.getElementById('rec-best-econ-name').textContent = bestEcon ? bestEcon.playerName : '—';

        document.getElementById('rec-total-runs').textContent = stats.totalTournamentRuns;
        document.getElementById('rec-total-wickets').textContent = stats.totalTournamentWickets;
        document.getElementById('rec-total-fours').textContent = stats.totalTournamentFours;
        document.getElementById('rec-total-sixes').textContent = stats.totalTournamentSixes;
        document.getElementById('rec-total-centuries').textContent = stats.centuriesCount;
        document.getElementById('rec-total-fifties').textContent = stats.fiftiesCount;
    },

    // --- 11. ANALYTICS VIEW ---
    renderAnalyticsView(state) {
        const tournament = state.activeTournament;
        const stats = window.ScoreshCalculations.computeTournamentStats(tournament);

        document.getElementById('ana-total-tourn-runs').textContent = stats.totalTournamentRuns;
        document.getElementById('ana-total-tourn-wkts').textContent = stats.totalTournamentWickets;
        document.getElementById('ana-total-tourn-boundaries').textContent = stats.totalTournamentFours + stats.totalTournamentSixes;

        if (window.ScoreshCharts) {
            window.ScoreshCharts.updateAll(stats);
        }
    }
};

// Global UI instance
window.ScoreshUI = ScoreshUI;
