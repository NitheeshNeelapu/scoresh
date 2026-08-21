/**
 * Scoresh Modals, Dialogs & Role Auth Controller
 * Handles Auth dialogs (Host vs Participant), Playing XI selection,
 * Toss setup, Dismissals, Bowler changes, Summary editors, and Toasts.
 */

const ScoreshModals = {
    init() {
        this.setupBackdropClick();
        this.setupFormSubmits();
    },

    setupBackdropClick() {
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    this.closeAll();
                }
            });
        });

        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAll();
            });
        });
    },

    closeAll() {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
        document.body.classList.remove('modal-open');
    },

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    },

    // --- AUTHENTICATION MODAL ---
    openAuthModal(tab = 'login') {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;

        this.setAuthTab(tab);
        this.openModal('auth-modal');
    },

    setAuthTab(tab) {
        const loginTab = document.getElementById('auth-tab-login');
        const registerTab = document.getElementById('auth-tab-register');
        const loginPanel = document.getElementById('auth-panel-login');
        const registerPanel = document.getElementById('auth-panel-register');

        if (tab === 'login') {
            if (loginTab) loginTab.classList.add('active');
            if (registerTab) registerTab.classList.remove('active');
            if (loginPanel) loginPanel.style.display = 'block';
            if (registerPanel) registerPanel.style.display = 'none';
        } else {
            if (registerTab) registerTab.classList.add('active');
            if (loginTab) loginTab.classList.remove('active');
            if (registerPanel) registerPanel.style.display = 'block';
            if (loginPanel) loginPanel.style.display = 'none';
        }
    },

    // --- PLAYING XI SELECTION MODAL ---
    openPlayingXIModal(matchId) {
        const match = window.scoreState.getTournament(window.scoreState.activeTournamentId)?.matches.find(m => m.id === matchId);
        if (!match) return;

        const modal = document.getElementById('playing-xi-modal');
        if (!modal) return;

        const tournament = window.scoreState.activeTournament;
        const teamAPlayers = tournament.getTeamPlayers(match.teamAId);
        const teamBPlayers = tournament.getTeamPlayers(match.teamBId);

        const listA = document.getElementById('xi-team-a-list');
        const listB = document.getElementById('xi-team-b-list');
        const teamANameLabel = document.getElementById('xi-team-a-name');
        const teamBNameLabel = document.getElementById('xi-team-b-name');

        if (teamANameLabel) teamANameLabel.textContent = `${match.teamAName} Playing XI`;
        if (teamBNameLabel) teamBNameLabel.textContent = `${match.teamBName} Playing XI`;

        if (listA) {
            listA.innerHTML = teamAPlayers.length === 0
                ? '<p class="text-xs text-muted">No squad players found.</p>'
                : teamAPlayers.map(p => {
                    const isChecked = match.teamAPlayingXI.includes(p.id) || match.teamAPlayingXI.length === 0;
                    return `
                        <label class="squad-player-item" style="cursor:pointer;">
                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                <input type="checkbox" name="xi_team_a" value="${p.id}" ${isChecked ? 'checked' : ''}>
                                <strong>${p.name}</strong>
                            </div>
                            <span class="text-xs text-muted">${p.role}</span>
                        </label>
                    `;
                }).join('');
        }

        if (listB) {
            listB.innerHTML = teamBPlayers.length === 0
                ? '<p class="text-xs text-muted">No squad players found.</p>'
                : teamBPlayers.map(p => {
                    const isChecked = match.teamBPlayingXI.includes(p.id) || match.teamBPlayingXI.length === 0;
                    return `
                        <label class="squad-player-item" style="cursor:pointer;">
                            <div style="display:flex; align-items:center; gap:0.5rem;">
                                <input type="checkbox" name="xi_team_b" value="${p.id}" ${isChecked ? 'checked' : ''}>
                                <strong>${p.name}</strong>
                            </div>
                            <span class="text-xs text-muted">${p.role}</span>
                        </label>
                    `;
                }).join('');
        }

        const saveBtn = document.getElementById('save-playing-xi-btn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const selectedA = Array.from(document.querySelectorAll('input[name="xi_team_a"]:checked')).map(cb => cb.value);
                const selectedB = Array.from(document.querySelectorAll('input[name="xi_team_b"]:checked')).map(cb => cb.value);

                match.teamAPlayingXI = selectedA;
                match.teamBPlayingXI = selectedB;
                window.scoreState.saveCurrentTournament();
                window.scoreState.notify();
                this.closeAll();
                this.showToast('Playing XI squads confirmed!', 'success');
                this.openTossModal(match.id);
            };
        }

        this.openModal('playing-xi-modal');
    },

    // --- TOSS & MATCH INITIALIZATION MODAL ---
    openTossModal(matchId) {
        const match = window.scoreState.getTournament(window.scoreState.activeTournamentId)?.matches.find(m => m.id === matchId);
        if (!match) return;

        const winnerSelect = document.getElementById('toss-winner-select');
        const decisionSelect = document.getElementById('toss-decision-select');
        const strikerSelect = document.getElementById('toss-striker-select');
        const nonStrikerSelect = document.getElementById('toss-nonstriker-select');
        const bowlerSelect = document.getElementById('toss-bowler-select');

        if (!winnerSelect || !strikerSelect || !bowlerSelect) return;

        winnerSelect.innerHTML = `
            <option value="${match.teamAId}">${match.teamAName}</option>
            <option value="${match.teamBId}">${match.teamBName}</option>
        `;

        const populatePlayers = () => {
            const tossWinner = winnerSelect.value;
            const tossDecision = decisionSelect.value;

            const batTeamId = (tossDecision === 'Bat') ? tossWinner : (tossWinner === match.teamAId ? match.teamBId : match.teamAId);
            const bowlTeamId = (batTeamId === match.teamAId) ? match.teamBId : match.teamAId;

            const tournament = window.scoreState.activeTournament;
            let batPlayers = tournament.getTeamPlayers(batTeamId);
            let bowlPlayers = tournament.getTeamPlayers(bowlTeamId);

            // Filter by selected Playing XI if defined
            const batXI = (batTeamId === match.teamAId) ? match.teamAPlayingXI : match.teamBPlayingXI;
            const bowlXI = (bowlTeamId === match.teamAId) ? match.teamAPlayingXI : match.teamBPlayingXI;

            if (batXI && batXI.length > 0) batPlayers = batPlayers.filter(p => batXI.includes(p.id));
            if (bowlXI && bowlXI.length > 0) bowlPlayers = bowlPlayers.filter(p => bowlXI.includes(p.id));

            strikerSelect.innerHTML = batPlayers.map(p => `<option value="${p.id}">${p.name} (${p.role})</option>`).join('');
            nonStrikerSelect.innerHTML = batPlayers.map((p, idx) => `<option value="${p.id}" ${idx === 1 ? 'selected' : ''}>${p.name} (${p.role})</option>`).join('');
            bowlerSelect.innerHTML = bowlPlayers.map(p => `<option value="${p.id}">${p.name} (${p.role})</option>`).join('');
        };

        winnerSelect.onchange = populatePlayers;
        decisionSelect.onchange = populatePlayers;
        populatePlayers();

        const tossForm = document.getElementById('modal-toss-form');
        if (tossForm) {
            tossForm.onsubmit = (e) => {
                e.preventDefault();
                const strikerId = strikerSelect.value;
                const nonStrikerId = nonStrikerSelect.value;
                const openingBowlerId = bowlerSelect.value;

                if (strikerId === nonStrikerId) {
                    this.showToast('Striker and Non-Striker cannot be the same batsman', 'warning');
                    return;
                }

                window.scoreEngine.startMatch(match, {
                    tossWinnerId: winnerSelect.value,
                    tossDecision: decisionSelect.value,
                    strikerPlayerId: strikerId,
                    nonStrikerPlayerId: nonStrikerId,
                    openingBowlerPlayerId: openingBowlerId
                });

                this.closeAll();
                window.scoreState.selectMatch(match.id, 'live');
            };
        }

        this.openModal('toss-modal');
    },

    // --- WICKET DISMISSAL MODAL ---
    openWicketModal() {
        const match = window.scoreState.activeMatch;
        if (!match || match.status !== 'live') return;

        const inn = match.currentInnings;
        const tournament = window.scoreState.activeTournament;

        const nextBatSelect = document.getElementById('wicket-next-batsman-select');
        const dismissTypeSelect = document.getElementById('wicket-type-select');

        if (!nextBatSelect) return;

        // Find available squad players from batting team who are NOT out yet and NOT currently on crease
        const batTeamId = inn.battingTeamId;
        let allBatPlayers = tournament.getTeamPlayers(batTeamId);
        const playingXI = (batTeamId === match.teamAId) ? match.teamAPlayingXI : match.teamBPlayingXI;
        if (playingXI && playingXI.length > 0) {
            allBatPlayers = allBatPlayers.filter(p => playingXI.includes(p.id));
        }

        const outOrCreaseIds = inn.batsmen.map(b => b.playerId);
        const availableBatsmen = allBatPlayers.filter(p => !outOrCreaseIds.includes(p.id));

        if (availableBatsmen.length === 0) {
            nextBatSelect.innerHTML = '<option value="">All Out / No More Batsmen</option>';
        } else {
            nextBatSelect.innerHTML = availableBatsmen.map(p => `<option value="${p.id}">${p.name} (${p.role})</option>`).join('');
        }

        const form = document.getElementById('modal-wicket-form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const dismissalType = dismissTypeSelect ? dismissTypeSelect.value : 'Bowled';
                const nextBatsmanId = nextBatSelect ? nextBatSelect.value : null;
                const fielderName = document.getElementById('wicket-fielder-name')?.value || '';
                const commentaryText = document.getElementById('wicket-commentary-text')?.value || '';

                window.scoreEngine.recordWicket(match, {
                    dismissalType,
                    nextBatsmanPlayerId: nextBatsmanId,
                    fielderName,
                    commentaryText
                });

                this.closeAll();
                form.reset();
            };
        }

        this.openModal('wicket-modal');
    },

    // --- CHANGE BOWLER MODAL ---
    openChangeBowlerModal() {
        const match = window.scoreState.activeMatch;
        if (!match || match.status !== 'live') return;

        const inn = match.currentInnings;
        const tournament = window.scoreState.activeTournament;
        const select = document.getElementById('change-bowler-select');
        if (!select) return;

        const bowlTeamId = inn.bowlingTeamId;
        let bowlPlayers = tournament.getTeamPlayers(bowlTeamId);
        const bowlXI = (bowlTeamId === match.teamAId) ? match.teamAPlayingXI : match.teamBPlayingXI;
        if (bowlXI && bowlXI.length > 0) {
            bowlPlayers = bowlPlayers.filter(p => bowlXI.includes(p.id));
        }

        // Prohibit last bowler from being chosen for consecutive over
        const availableBowlers = bowlPlayers.filter(p => ('bowl_' + p.id) !== match.lastBowlerId && p.id !== match.lastBowlerId);

        select.innerHTML = availableBowlers.map(p => `<option value="${p.id}">${p.name} (${p.role})</option>`).join('');

        const form = document.getElementById('modal-change-bowler-form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const bowlerId = select.value;
                const selectedPlr = tournament.getPlayer(bowlerId);
                window.scoreEngine.changeBowler(match, bowlerId, selectedPlr ? selectedPlr.name : '');
                this.closeAll();
            };
        }

        this.openModal('change-bowler-modal');
    },

    // --- 2nd INNINGS MODAL ---
    openSecondInningsModal() {
        const match = window.scoreState.activeMatch;
        if (!match) return;

        const inn1 = match.firstInnings;
        const inn2 = match.secondInnings;
        const tournament = window.scoreState.activeTournament;

        const targetBadge = document.getElementById('sec-target-badge');
        if (targetBadge) {
            targetBadge.textContent = `Target: ${inn1.totalRuns + 1} runs (${match.totalOvers} overs)`;
        }

        const strikerSelect = document.getElementById('sec-striker-select');
        const nonStrikerSelect = document.getElementById('sec-nonstriker-select');
        const bowlerSelect = document.getElementById('sec-bowler-select');

        if (!strikerSelect || !bowlerSelect) return;

        const batTeamId = inn2.battingTeamId;
        const bowlTeamId = inn2.bowlingTeamId;

        let batPlayers = tournament.getTeamPlayers(batTeamId);
        let bowlPlayers = tournament.getTeamPlayers(bowlTeamId);

        const batXI = (batTeamId === match.teamAId) ? match.teamAPlayingXI : match.teamBPlayingXI;
        const bowlXI = (bowlTeamId === match.teamAId) ? match.teamAPlayingXI : match.teamBPlayingXI;

        if (batXI && batXI.length > 0) batPlayers = batPlayers.filter(p => batXI.includes(p.id));
        if (bowlXI && bowlXI.length > 0) bowlPlayers = bowlPlayers.filter(p => bowlXI.includes(p.id));

        strikerSelect.innerHTML = batPlayers.map(p => `<option value="${p.id}">${p.name} (${p.role})</option>`).join('');
        nonStrikerSelect.innerHTML = batPlayers.map((p, idx) => `<option value="${p.id}" ${idx === 1 ? 'selected' : ''}>${p.name} (${p.role})</option>`).join('');
        bowlerSelect.innerHTML = bowlPlayers.map(p => `<option value="${p.id}">${p.name} (${p.role})</option>`).join('');

        const form = document.getElementById('modal-second-inn-form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const strikerId = strikerSelect.value;
                const nonStrikerId = nonStrikerSelect.value;
                const openingBowlerId = bowlerSelect.value;

                if (strikerId === nonStrikerId) {
                    this.showToast('Striker and Non-Striker cannot be the same batsman', 'warning');
                    return;
                }

                window.scoreEngine.startSecondInnings(match, {
                    strikerPlayerId: strikerId,
                    nonStrikerPlayerId: nonStrikerId,
                    openingBowlerPlayerId: openingBowlerId
                });

                this.closeAll();
            };
        }

        this.openModal('second-inn-modal');
    },

    // --- CREATE MATCH MODAL ---
    openCreateMatchModal() {
        if (!window.scoreState.isHost) {
            this.showToast('Unauthorized: Only Hosts can create matches', 'error');
            return;
        }

        const tournament = window.scoreState.activeTournament;
        if (!tournament || tournament.teams.length < 2) {
            this.showToast('Please register at least 2 teams in the tournament first', 'warning');
            return;
        }

        const teamASelect = document.getElementById('match-teama-select');
        const teamBSelect = document.getElementById('match-teamb-select');
        const oversInput = document.getElementById('match-overs-val');
        const venueInput = document.getElementById('match-venue-val');

        if (teamASelect && teamBSelect) {
            teamASelect.innerHTML = tournament.teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            teamBSelect.innerHTML = tournament.teams.map((t, idx) => `<option value="${t.id}" ${idx === 1 ? 'selected' : ''}>${t.name}</option>`).join('');
        }

        if (oversInput) oversInput.value = tournament.overs || 20;
        if (venueInput) venueInput.value = tournament.location || 'Cricket Ground';

        const form = document.getElementById('modal-match-form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const teamAId = teamASelect.value;
                const teamBId = teamBSelect.value;

                if (teamAId === teamBId) {
                    this.showToast('Match teams must be distinct', 'warning');
                    return;
                }

                const teamA = tournament.getTeam(teamAId);
                const teamB = tournament.getTeam(teamBId);
                const title = document.getElementById('match-title-val')?.value || `${teamA.name} vs ${teamB.name}`;
                const overs = parseInt(oversInput?.value, 10) || 20;
                const venue = venueInput?.value || 'Cricket Ground';
                const date = document.getElementById('match-date-val')?.value || new Date().toISOString().split('T')[0];
                const time = document.getElementById('match-time-val')?.value || '14:00';
                const umpires = document.getElementById('match-umpires-val')?.value || '';

                const match = window.scoreState.createMatch(tournament.id, {
                    title,
                    teamAId,
                    teamBId,
                    totalOvers: overs,
                    venue,
                    date,
                    time,
                    umpires
                });

                if (match) {
                    this.closeAll();
                    this.showToast('Match scheduled successfully!', 'success');
                    form.reset();
                }
            };
        }

        this.openModal('create-match-modal');
    },

    // --- ADD / EDIT TEAM MODAL ---
    openAddTeamModal() {
        if (!window.scoreState.isHost) return;
        const title = document.getElementById('modal-team-title');
        if (title) title.textContent = 'Add Tournament Team';

        const form = document.getElementById('modal-team-form');
        if (form) {
            form.reset();
            form.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('modal-team-name')?.value || '';
                const short = document.getElementById('modal-team-short')?.value || name.substring(0, 3).toUpperCase();
                const color = document.getElementById('modal-team-color')?.value || '#16a34a';

                window.scoreState.addTeam(window.scoreState.activeTournamentId, {
                    name,
                    shortName: short,
                    color
                });

                this.closeAll();
                this.showToast(`Team "${name}" added!`, 'success');
            };
        }

        this.openModal('team-modal');
    },

    // --- ADD / EDIT PLAYER MODAL ---
    openAddPlayerModal(preselectedTeamId = null) {
        if (!window.scoreState.isHost) return;
        const tournament = window.scoreState.activeTournament;
        if (!tournament) return;

        const teamSelect = document.getElementById('modal-player-team-select');
        if (teamSelect) {
            teamSelect.innerHTML = tournament.teams.map(t =>
                `<option value="${t.id}" ${t.id === preselectedTeamId ? 'selected' : ''}>${t.name}</option>`
            ).join('');
        }

        const form = document.getElementById('modal-player-form');
        if (form) {
            form.reset();
            form.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('modal-player-name')?.value || '';
                const teamId = teamSelect?.value;
                const role = document.getElementById('modal-player-role')?.value || 'Batsman';
                const jersey = document.getElementById('modal-player-jersey')?.value || '';
                const batStyle = document.getElementById('modal-player-bat-style')?.value || 'Right-hand bat';
                const bowlStyle = document.getElementById('modal-player-bowl-style')?.value || 'Right-arm medium';

                window.scoreState.addPlayer(tournament.id, {
                    teamId,
                    name,
                    role,
                    jersey,
                    battingStyle: batStyle,
                    bowlingStyle: bowlStyle
                });

                this.closeAll();
                this.showToast(`Player "${name}" added!`, 'success');
            };
        }

        this.openModal('player-modal');
    },

    // --- CONFIRMATION DIALOG ---
    confirm(title, message, confirmBtnText = 'Confirm', onConfirm = null) {
        const titleEl = document.getElementById('confirm-modal-title');
        const msgEl = document.getElementById('confirm-modal-msg');
        const btn = document.getElementById('confirm-modal-btn');

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (btn) {
            btn.textContent = confirmBtnText;
            btn.onclick = () => {
                this.closeAll();
                if (typeof onConfirm === 'function') onConfirm();
            };
        }

        this.openModal('confirm-modal');
    },

    // --- TOAST NOTIFICATIONS ---
    showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast-message toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
            <span>${message}</span>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 250);
        }, 3200);
    },

    setupFormSubmits() {
        // Setup Auth Form Submits
        const loginForm = document.getElementById('auth-form-login');
        if (loginForm) {
            loginForm.onsubmit = (e) => {
                e.preventDefault();
                const email = document.getElementById('auth-login-email')?.value || '';
                const password = document.getElementById('auth-login-pass')?.value || '';
                const res = window.authService.login(email, password);
                if (res.success) {
                    this.closeAll();
                    this.showToast(`Logged in as ${res.user.role.toUpperCase()}: ${res.user.name}`, 'success');
                    window.scoreState.notify();
                } else {
                    this.showToast(res.error || 'Login failed', 'error');
                }
            };
        }

        const registerForm = document.getElementById('auth-form-register');
        if (registerForm) {
            registerForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('auth-reg-name')?.value || '';
                const email = document.getElementById('auth-reg-email')?.value || '';
                const password = document.getElementById('auth-reg-pass')?.value || '';
                const roleRadio = document.querySelector('input[name="auth_reg_role"]:checked');
                const role = roleRadio ? roleRadio.value : 'host';

                const res = window.authService.register(name, email, password, role);
                if (res.success) {
                    this.closeAll();
                    this.showToast(`Registered successfully as ${role.toUpperCase()}!`, 'success');
                    window.scoreState.notify();
                } else {
                    this.showToast(res.error || 'Registration failed', 'error');
                }
            };
        }
    }
};

// Global modals instance
window.ScoreshModals = ScoreshModals;
