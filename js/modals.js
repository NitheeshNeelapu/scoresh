/**
 * Scoresh Modals, Dialogs & Role Auth Controller
 * Handles Auth dialogs (Host vs Participant), Host Password Change Security,
 * Strict Playing XI selection (11 players), Toss setup, Dismissals with dynamic dropdowns,
 * Over-Complete / Next Bowler selectors with bowling limits, and Squad validation.
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

    // --- AUTHENTICATION MODAL (HOST vs PARTICIPANT) ---
    openAuthModal(mode = 'host') {
        const modal = document.getElementById('auth-modal');
        if (!modal) return;

        this.setAuthMode(mode);
        this.openModal('auth-modal');
    },

    setAuthMode(mode) {
        const hostTab = document.getElementById('auth-tab-host');
        const partTab = document.getElementById('auth-tab-participant');
        const hostPanel = document.getElementById('auth-panel-host');
        const partPanel = document.getElementById('auth-panel-participant');

        if (mode === 'host') {
            if (hostTab) hostTab.classList.add('active');
            if (partTab) partTab.classList.remove('active');
            if (hostPanel) hostPanel.style.display = 'block';
            if (partPanel) partPanel.style.display = 'none';
        } else {
            if (partTab) partTab.classList.add('active');
            if (hostTab) hostTab.classList.remove('active');
            if (partPanel) partPanel.style.display = 'block';
            if (hostPanel) hostPanel.style.display = 'none';
        }
    },

    // --- HOST SECURITY / PASSWORD CHANGE MODAL ---
    openSecurityModal() {
        if (!window.authService.isHost()) {
            this.showToast('Security settings are available for Tournament Hosts only', 'info');
            return;
        }

        const form = document.getElementById('modal-security-form');
        if (form) {
            form.reset();
            form.onsubmit = (e) => {
                e.preventDefault();
                const currPass = document.getElementById('sec-curr-pass')?.value || '';
                const newPass = document.getElementById('sec-new-pass')?.value || '';
                const confPass = document.getElementById('sec-conf-pass')?.value || '';

                if (newPass !== confPass) {
                    this.showToast('New passwords do not match', 'error');
                    return;
                }

                const res = window.authService.changeHostPassword(currPass, newPass);
                if (res.success) {
                    this.closeAll();
                    this.showToast('Host password updated successfully!', 'success');
                } else {
                    this.showToast(res.error || 'Password update failed', 'error');
                }
            };
        }

        this.openModal('security-modal');
    },

    // --- PLAYING XI SELECTION MODAL (STRICT 11 PLAYERS PER TEAM) ---
    openPlayingXIModal(matchId) {
        const tournament = window.scoreState.activeTournament;
        const match = tournament ? tournament.matches.find(m => m.id === matchId) : null;
        if (!match) return;

        const teamAPlayers = tournament.getTeamPlayers(match.teamAId);
        const teamBPlayers = tournament.getTeamPlayers(match.teamBId);

        // Validation: minimum 11 players in squad
        if (teamAPlayers.length < 11 || teamBPlayers.length < 11) {
            this.showToast(`Both teams must have at least 11 registered players. (${match.teamAName}: ${teamAPlayers.length}, ${match.teamBName}: ${teamBPlayers.length})`, 'error');
            return;
        }

        const modal = document.getElementById('playing-xi-modal');
        if (!modal) return;

        const listA = document.getElementById('xi-team-a-list');
        const listB = document.getElementById('xi-team-b-list');
        const teamANameLabel = document.getElementById('xi-team-a-name');
        const teamBNameLabel = document.getElementById('xi-team-b-name');

        if (teamANameLabel) teamANameLabel.textContent = `${match.teamAName} Playing XI (Select 11)`;
        if (teamBNameLabel) teamBNameLabel.textContent = `${match.teamBName} Playing XI (Select 11)`;

        const defaultSelectedA = match.teamAPlayingXI.length === 11 ? match.teamAPlayingXI : teamAPlayers.slice(0, 11).map(p => p.id);
        const defaultSelectedB = match.teamBPlayingXI.length === 11 ? match.teamBPlayingXI : teamBPlayers.slice(0, 11).map(p => p.id);

        if (listA) {
            listA.innerHTML = teamAPlayers.map(p => {
                const isChecked = defaultSelectedA.includes(p.id);
                return `
                    <label class="squad-player-item" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <input type="checkbox" name="xi_team_a" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="window.ScoreshModals.updateXICounter('a')">
                            <strong>${p.name}</strong>
                        </div>
                        <span class="text-xs text-muted">${p.role}${p.isWicketkeeper ? ' (WK)' : ''}</span>
                    </label>
                `;
            }).join('');
        }

        if (listB) {
            listB.innerHTML = teamBPlayers.map(p => {
                const isChecked = defaultSelectedB.includes(p.id);
                return `
                    <label class="squad-player-item" style="cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <input type="checkbox" name="xi_team_b" value="${p.id}" ${isChecked ? 'checked' : ''} onchange="window.ScoreshModals.updateXICounter('b')">
                            <strong>${p.name}</strong>
                        </div>
                        <span class="text-xs text-muted">${p.role}${p.isWicketkeeper ? ' (WK)' : ''}</span>
                    </label>
                `;
            }).join('');
        }

        this.updateXICounter('a');
        this.updateXICounter('b');

        const saveBtn = document.getElementById('save-playing-xi-btn');
        if (saveBtn) {
            saveBtn.onclick = () => {
                const selectedA = Array.from(document.querySelectorAll('input[name="xi_team_a"]:checked')).map(cb => cb.value);
                const selectedB = Array.from(document.querySelectorAll('input[name="xi_team_b"]:checked')).map(cb => cb.value);

                if (selectedA.length !== 11) {
                    this.showToast(`Please select exactly 11 players for ${match.teamAName} (Currently selected: ${selectedA.length})`, 'warning');
                    return;
                }

                if (selectedB.length !== 11) {
                    this.showToast(`Please select exactly 11 players for ${match.teamBName} (Currently selected: ${selectedB.length})`, 'warning');
                    return;
                }

                match.teamAPlayingXI = selectedA;
                match.teamBPlayingXI = selectedB;
                window.scoreState.saveCurrentTournament();
                window.scoreState.notify();
                this.closeAll();
                this.showToast('Playing XI squads confirmed (11 players each)!', 'success');
                this.openTossModal(match.id);
            };
        }

        this.openModal('playing-xi-modal');
    },

    updateXICounter(teamKey) {
        const checked = document.querySelectorAll(`input[name="xi_team_${teamKey}"]:checked`).length;
        const countEl = document.getElementById(`xi-team-${teamKey}-count`);
        if (countEl) {
            countEl.textContent = `${checked}/11 Selected`;
            countEl.className = checked === 11 ? 'badge-strike' : 'badge-nonstrike';
        }
    },

    // --- TOSS & MATCH INITIALIZATION MODAL ---
    openTossModal(matchId) {
        const tournament = window.scoreState.activeTournament;
        const match = tournament ? tournament.matches.find(m => m.id === matchId) : null;
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

            // Restrict choices strictly to the selected Playing XI
            const batXI = (batTeamId === match.teamAId) ? match.teamAPlayingXI : match.teamBPlayingXI;
            const bowlXI = (bowlTeamId === match.teamAId) ? match.teamAPlayingXI : match.teamBPlayingXI;

            let batPlayers = tournament.getTeamPlayers(batTeamId);
            let bowlPlayers = tournament.getTeamPlayers(bowlTeamId);

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

    // --- STRUCTURED WICKET DISMISSAL MODAL ---
    openWicketModal() {
        const match = window.scoreState.activeMatch;
        if (!match || match.status !== 'live') return;

        const inn = match.currentInnings;
        const tournament = window.scoreState.activeTournament;

        const striker = inn.batsmen.find(b => (b.playerId === inn.strikerId || b.id === inn.strikerId || b.id === 'bat_' + inn.strikerId) && !b.isOut) || inn.batsmen.find(b => b.isOnStrike && !b.isOut);
        const nonStriker = inn.batsmen.find(b => (b.playerId === inn.nonStrikerId || b.id === inn.nonStrikerId || b.id === 'bat_' + inn.nonStrikerId) && !b.isOut) || inn.batsmen.find(b => b.isNonStriker && !b.isOut);
        const bowler = inn.bowlers.find(b => b.playerId === inn.currentBowlerId || b.id === inn.currentBowlerId || b.id === 'bowl_' + inn.currentBowlerId) || inn.bowlers.find(b => b.isCurrentBowler);

        const dismissedBatSelect = document.getElementById('wicket-dismissed-batsman-select');
        const dismissTypeSelect = document.getElementById('wicket-type-select');
        const fielderGroup = document.getElementById('wicket-fielder-group');
        const fielderSelect = document.getElementById('wicket-fielder-select');
        const wkGroup = document.getElementById('wicket-wk-group');
        const wkSelect = document.getElementById('wicket-wk-select');
        const bowlerDisplay = document.getElementById('wicket-bowler-display');
        const nextBatSelect = document.getElementById('wicket-next-batsman-select');

        const cleanStrikerId = inn.strikerId ? String(inn.strikerId).replace(/^bat_/, '') : null;
        const cleanNonStrikerId = inn.nonStrikerId ? String(inn.nonStrikerId).replace(/^bat_/, '') : null;
        const strikerPlr = cleanStrikerId ? (tournament.getPlayer(cleanStrikerId) || window.getPlayerById?.(cleanStrikerId)) : null;
        const nonStrikerPlr = cleanNonStrikerId ? (tournament.getPlayer(cleanNonStrikerId) || window.getPlayerById?.(cleanNonStrikerId)) : null;

        const strikerDisplayName = strikerPlr ? strikerPlr.name : (striker ? striker.name : 'Striker');
        const nonStrikerDisplayName = nonStrikerPlr ? nonStrikerPlr.name : (nonStriker ? nonStriker.name : 'Non-Striker');

        // 1. Populate Dismissed Batsman (defaults to current Striker, allows Non-Striker)
        dismissedBatSelect.innerHTML = `
            ${cleanStrikerId ? `<option value="${cleanStrikerId}" selected>${strikerDisplayName} (Striker)</option>` : ''}
            ${cleanNonStrikerId ? `<option value="${cleanNonStrikerId}">${nonStrikerDisplayName} (Non-Striker)</option>` : ''}
        `;

        if (bowlerDisplay) {
            const bowlerPlr = inn.currentBowlerId ? (tournament.getPlayer(inn.currentBowlerId) || window.getPlayerById?.(inn.currentBowlerId)) : null;
            bowlerDisplay.textContent = bowlerPlr ? bowlerPlr.name : (bowler ? bowler.name : 'Bowler');
        }

        // 2. Populate Fielding Team Playing XI for Fielder & Wicketkeeper dropdowns
        const bowlTeamId = inn.bowlingTeamId;
        const bowlXI = (bowlTeamId === match.teamAId) ? match.teamAPlayingXI : match.teamBPlayingXI;
        let bowlPlayers = tournament.getTeamPlayers(bowlTeamId);
        if (bowlXI && bowlXI.length > 0) {
            bowlPlayers = bowlPlayers.filter(p => bowlXI.includes(p.id));
        }

        if (fielderSelect) {
            fielderSelect.innerHTML = bowlPlayers.map(p => `<option value="${p.id}">${p.name} (${p.role})</option>`).join('');
        }

        if (wkSelect) {
            const wkPlayers = bowlPlayers.filter(p => p.isWicketkeeper || p.role === 'Wicketkeeper');
            const availableWK = wkPlayers.length > 0 ? wkPlayers : bowlPlayers;
            wkSelect.innerHTML = availableWK.map(p => `<option value="${p.id}">${p.name}${p.isWicketkeeper ? ' (WK)' : ''}</option>`).join('');
        }

        // 3. Dynamic Field Toggling based on Dismissal Type
        const updateDismissalFields = () => {
            const type = dismissTypeSelect.value;
            if (fielderGroup) fielderGroup.style.display = (type === 'Caught' || type === 'Run Out') ? 'block' : 'none';
            if (wkGroup) wkGroup.style.display = (type === 'Stumped') ? 'block' : 'none';
        };

        dismissTypeSelect.onchange = updateDismissalFields;
        updateDismissalFields();

        // 4. Populate Incoming Batsman (eligible Batting Team Playing XI players not yet dismissed & not currently active)
        const batTeamId = inn.battingTeamId;
        const batXI = (batTeamId === match.teamAId) ? match.teamAPlayingXI : match.teamBPlayingXI;
        let allBatPlayers = tournament.getTeamPlayers(batTeamId);
        if (batXI && batXI.length > 0) {
            allBatPlayers = allBatPlayers.filter(p => batXI.includes(p.id));
        }

        const updateIncomingBatters = () => {
            const selectedDismissedId = String(dismissedBatSelect.value).replace(/^bat_/, '');
            const otherActiveId = (selectedDismissedId === cleanStrikerId) ? cleanNonStrikerId : cleanStrikerId;
            const dismissedPlayerIds = inn.batsmen.filter(b => b.isOut).map(b => b.playerId || String(b.id).replace(/^bat_/, ''));
            if (!dismissedPlayerIds.includes(selectedDismissedId)) {
                dismissedPlayerIds.push(selectedDismissedId);
            }

            const availableBatsmen = allBatPlayers.filter(p =>
                !dismissedPlayerIds.includes(p.id) &&
                p.id !== otherActiveId
            );

            if (availableBatsmen.length === 0) {
                nextBatSelect.innerHTML = '<option value="">All Out / No More Batsmen</option>';
            } else {
                nextBatSelect.innerHTML = availableBatsmen.map(p => `<option value="${p.id}">${p.name} (${p.role})</option>`).join('');
            }
        };

        dismissedBatSelect.onchange = updateIncomingBatters;
        updateIncomingBatters();

        const form = document.getElementById('modal-wicket-form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const dismissedId = dismissedBatSelect.value;
                const dismissalType = dismissTypeSelect.value;
                const incomingId = nextBatSelect.value || null;

                let fielderId = null;
                let fielderName = '';
                let wkId = null;
                let wkName = '';

                if (dismissalType === 'Caught' || dismissalType === 'Run Out') {
                    fielderId = fielderSelect ? fielderSelect.value : null;
                    const fPlr = tournament.getPlayer(fielderId) || window.getPlayerById?.(fielderId);
                    fielderName = fPlr ? fPlr.name : '';
                } else if (dismissalType === 'Stumped') {
                    wkId = wkSelect ? wkSelect.value : null;
                    const wkPlr = tournament.getPlayer(wkId) || window.getPlayerById?.(wkId);
                    wkName = wkPlr ? wkPlr.name : '';
                }

                const commentaryText = document.getElementById('wicket-commentary-text')?.value || '';

                window.scoreEngine.recordWicket(match, {
                    dismissedPlayerId: dismissedId,
                    dismissalType,
                    fielderId,
                    fielderName,
                    wicketkeeperId: wkId,
                    wicketkeeperName: wkName,
                    incomingPlayerId: incomingId,
                    commentaryText
                });

                this.closeAll();
                form.reset();
            };
        }

        this.openModal('wicket-modal');
    },

    // --- OVER COMPLETE / NEXT BOWLER SELECTION MODAL WITH QUOTA LIMITS ---
    openNextBowlerModal(match, overNumber, lastBowlerName = '') {
        const inn = match.currentInnings;
        const tournament = window.scoreState.activeTournament;
        const bowlTeamId = inn.bowlingTeamId;
        const bowlXI = (bowlTeamId === match.teamAId) ? match.teamAPlayingXI : match.teamBPlayingXI;

        let bowlPlayers = tournament.getTeamPlayers(bowlTeamId);
        if (bowlXI && bowlXI.length > 0) {
            bowlPlayers = bowlPlayers.filter(p => bowlXI.includes(p.id));
        }

        const maxOversPerBowler = Math.ceil(match.totalOvers / 5);

        // Filter eligible bowlers:
        // 1. Prohibit last bowler from bowling consecutive overs
        // 2. Prohibit bowlers who have reached format quota limit
        const availableBowlers = bowlPlayers.filter(p => {
            const isLast = (p.id === match.lastBowlerId || ('bowl_' + p.id) === match.lastBowlerId);
            if (isLast) return false;

            const existingBowler = inn.bowlers.find(b => b.playerId === p.id || b.id === 'bowl_' + p.id || b.id === p.id);
            if (existingBowler && (existingBowler.legalBalls >= maxOversPerBowler * 6)) {
                return false;
            }
            return true;
        });

        const container = document.getElementById('next-bowler-options-list');
        const headerTitle = document.getElementById('next-bowler-modal-title');
        const prevBowlerText = document.getElementById('next-bowler-prev-text');

        if (headerTitle) headerTitle.textContent = `OVER COMPLETE — ${overNumber} Overs Completed`;
        if (prevBowlerText) prevBowlerText.textContent = `Previous bowler: ${lastBowlerName || 'Bowler'} (Cannot bowl consecutive overs · Max limit: ${maxOversPerBowler} ov/bowler)`;

        if (container) {
            if (availableBowlers.length === 0) {
                container.innerHTML = `<p class="text-sm text-muted text-center" style="padding:1rem;">No other eligible bowlers available in Playing XI.</p>`;
            } else {
                container.innerHTML = availableBowlers.map(p => {
                    const existingBowler = inn.bowlers.find(b => b.playerId === p.id || b.id === 'bowl_' + p.id || b.id === p.id);
                    const overs = existingBowler ? existingBowler.overs : '0.0';
                    const maidens = existingBowler ? existingBowler.maidens : 0;
                    const runs = existingBowler ? existingBowler.runsgv : 0;
                    const wkts = existingBowler ? existingBowler.wkttkn : 0;
                    const econ = existingBowler ? window.ScoreshCalculations.formatStat(existingBowler.economy) : '0.00';

                    return `
                        <div class="next-bowler-card-option" onclick="window.ScoreshModals.selectNextBowler('${p.id}', '${p.name}')">
                            <div>
                                <strong style="font-size:1.05rem;">${p.name}</strong>
                                <div class="text-xs text-muted">${p.role} • ${p.bowlingStyle}</div>
                            </div>
                            <div style="text-align:right;">
                                <div class="font-mono font-bold text-green">${wkts}/${runs} (${overs} ov, ${maidens} mdn)</div>
                                <div class="text-xs text-muted font-mono">Econ ${econ}</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        this.openModal('next-bowler-modal');
    },

    selectNextBowler(bowlerId, bowlerName) {
        const match = window.scoreState.activeMatch;
        if (!match) return;

        window.scoreEngine.changeBowler(match, bowlerId, bowlerName);
        this.closeAll();
        this.showToast(`Current bowler is now ${bowlerName}`, 'success');
    },

    // --- CHANGE BOWLER MODAL (MANUAL TRIGGER) ---
    openChangeBowlerModal() {
        const match = window.scoreState.activeMatch;
        if (!match || match.status !== 'live') return;

        const inn = match.currentInnings;
        const tournament = window.scoreState.activeTournament;
        const bowlTeamId = inn.bowlingTeamId;
        const bowlXI = (bowlTeamId === match.teamAId) ? match.teamAPlayingXI : match.teamBPlayingXI;

        let bowlPlayers = tournament.getTeamPlayers(bowlTeamId);
        if (bowlXI && bowlXI.length > 0) {
            bowlPlayers = bowlPlayers.filter(p => bowlXI.includes(p.id));
        }

        const maxOversPerBowler = Math.ceil(match.totalOvers / 5);

        const availableBowlers = bowlPlayers.filter(p => {
            const isLast = (p.id === match.lastBowlerId || ('bowl_' + p.id) === match.lastBowlerId);
            if (isLast) return false;
            const existingBowler = inn.bowlers.find(b => b.playerId === p.id || b.id === 'bowl_' + p.id || b.id === p.id);
            if (existingBowler && (existingBowler.legalBalls >= maxOversPerBowler * 6)) {
                return false;
            }
            return true;
        });

        const select = document.getElementById('change-bowler-select');
        if (!select) return;

        select.innerHTML = availableBowlers.map(p => {
            const existingBowler = inn.bowlers.find(b => b.playerId === p.id || b.id === 'bowl_' + p.id);
            const stats = existingBowler ? `(${existingBowler.overs} ov, ${existingBowler.wkttkn}/${existingBowler.runsgv})` : '(Yet to bowl)';
            return `<option value="${p.id}">${p.name} ${stats}</option>`;
        }).join('');

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
            teamASelect.innerHTML = tournament.teams.map(t => `<option value="${t.id}">${t.name} (${t.playerIds.length} players)</option>`).join('');
            teamBSelect.innerHTML = tournament.teams.map((t, idx) => `<option value="${t.id}" ${idx === 1 ? 'selected' : ''}>${t.name} (${t.playerIds.length} players)</option>`).join('');
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

                if (teamA.playerIds.length < 11 || teamB.playerIds.length < 11) {
                    this.showToast(`Both teams must have at least 11 players to schedule a match. (${teamA.name}: ${teamA.playerIds.length}, ${teamB.name}: ${teamB.playerIds.length})`, 'error');
                    return;
                }

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

    // --- MATCH SUMMARY EDIT MODAL (HOST ONLY) ---
    openMatchSummaryEditModal(matchId) {
        if (!window.scoreState.isHost) return;
        const tournament = window.scoreState.activeTournament;
        const match = tournament ? tournament.matches.find(m => m.id === matchId) : null;
        if (!match) return;

        const potmInput = document.getElementById('summary-potm-val');
        const resultInput = document.getElementById('summary-result-val');
        const customTextInput = document.getElementById('summary-custom-text');

        if (potmInput) potmInput.value = match.playerOfTheMatch || '';
        if (resultInput) resultInput.value = match.resultSummary || '';
        if (customTextInput) customTextInput.value = match.customSummaryText || '';

        const form = document.getElementById('modal-summary-form');
        if (form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                match.playerOfTheMatch = potmInput ? potmInput.value.trim() : match.playerOfTheMatch;
                match.resultSummary = resultInput ? resultInput.value.trim() : match.resultSummary;
                match.customSummaryText = customTextInput ? customTextInput.value.trim() : '';

                window.scoreState.saveCurrentTournament();
                window.scoreState.notify();
                this.closeAll();
                this.showToast('Match summary updated successfully!', 'success');
            };
        }

        this.openModal('match-summary-modal');
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

    // --- ADD / EDIT PLAYER MODAL (STRICT 20 SQUAD LIMIT & TEAM ISOLATION) ---
    openAddPlayerModal(preselectedTeamId = null) {
        if (!window.scoreState.isHost) return;
        const tournament = window.scoreState.activeTournament;
        if (!tournament) return;

        const teamSelect = document.getElementById('modal-player-team-select');
        if (teamSelect) {
            teamSelect.innerHTML = tournament.teams.map(t =>
                `<option value="${t.id}" ${t.id === preselectedTeamId ? 'selected' : ''}>${t.name} (${t.playerIds.length}/20)</option>`
            ).join('');
        }

        const form = document.getElementById('modal-player-form');
        if (form) {
            form.reset();
            form.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('modal-player-name')?.value || '';
                const teamId = teamSelect?.value;

                const team = tournament.getTeam(teamId);
                if (team && team.playerIds.length >= 20) {
                    this.showToast(`Maximum squad size is 20 players. ${team.name} already has 20 players.`, 'error');
                    return;
                }

                const role = document.getElementById('modal-player-role')?.value || 'Batsman';
                const jersey = document.getElementById('modal-player-jersey')?.value || '';
                const isWk = document.getElementById('modal-player-is-wk')?.checked || role === 'Wicketkeeper';
                const batStyle = document.getElementById('modal-player-bat-style')?.value || 'Right-hand bat';
                const bowlStyle = document.getElementById('modal-player-bowl-style')?.value || 'Right-arm medium';

                window.scoreState.addPlayer(tournament.id, {
                    teamId,
                    name,
                    role,
                    jersey,
                    isWicketkeeper: isWk,
                    battingStyle: batStyle,
                    bowlingStyle: bowlStyle
                });

                this.closeAll();
                this.showToast(`Player "${name}" added to ${team ? team.name : 'Team'} (${team ? team.playerIds.length : 1}/20)!`, 'success');
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
        const hostForm = document.getElementById('auth-form-host');
        if (hostForm) {
            hostForm.onsubmit = (e) => {
                e.preventDefault();
                const email = document.getElementById('auth-host-email')?.value || '';
                const password = document.getElementById('auth-host-pass')?.value || '';
                const res = window.authService.loginAsHost(email, password);
                if (res.success) {
                    this.closeAll();
                    this.showToast(`Logged in as HOST: ${res.user.name}`, 'success');
                    window.scoreState.notify();
                } else {
                    this.showToast(res.error || 'Invalid host credentials', 'error');
                }
            };
        }

        const partForm = document.getElementById('auth-form-participant');
        if (partForm) {
            partForm.onsubmit = (e) => {
                e.preventDefault();
                const name = document.getElementById('auth-part-name')?.value || 'Cricket Fan';
                const res = window.authService.loginAsParticipant(name);
                if (res.success) {
                    this.closeAll();
                    this.showToast(`Logged in as PARTICIPANT: ${res.user.name}`, 'success');
                    window.scoreState.notify();
                } else {
                    this.showToast(res.error || 'Participant login failed', 'error');
                }
            };
        }
    }
};

// Global modals instance
window.ScoreshModals = ScoreshModals;
