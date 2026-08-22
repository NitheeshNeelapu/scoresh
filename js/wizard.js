/**
 * Scoresh Tournament Setup Wizard
 * Guides the Host through the complete onboarding experience:
 * Step 1: Details (Name, Logo, Description, Format, Location, Dates, Rules)
 * Step 2: Teams (Names, Short codes, Colors)
 * Step 3: Squads (11–20 Players per team, Roles, Wicketkeepers, Batting/Bowling styles)
 * Step 4: Schedule (Auto round-robin fixture pairings)
 */

class TournamentWizard {
    constructor() {
        this.currentStep = 1;
        this.data = {
            name: '',
            logo: '🏆',
            description: '',
            format: 'T20',
            overs: 20,
            location: '',
            organizer: '',
            startDate: '',
            endDate: '',
            numberOfTeams: 4,
            rules: 'Standard ICC Cricket Rules',
            teams: [],
            players: [],
            matches: []
        };
    }

    open() {
        if (window.authService && !window.authService.isHost()) {
            window.ScoreshModals.showToast('Please switch to Host role to create tournaments', 'info');
            window.ScoreshModals.openAuthModal();
            return;
        }

        this.currentStep = 1;
        const currentUser = window.authService ? window.authService.currentUser : null;
        this.data = {
            name: '',
            logo: '🏆',
            description: '',
            format: 'T20',
            overs: 20,
            location: '',
            organizer: currentUser ? currentUser.name : 'Tournament Host',
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            numberOfTeams: 4,
            rules: 'Standard T20 Tournament Rules',
            teams: [],
            players: [],
            matches: []
        };

        const modal = document.getElementById('wizard-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
            this.renderStep();
        }
    }

    close() {
        const modal = document.getElementById('wizard-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    }

    goToStep(step) {
        if (step < 1 || step > 4) return;

        if (step > this.currentStep) {
            // Validate current step
            if (this.currentStep === 1) {
                const nameInput = document.getElementById('wiz-name');
                if (!nameInput || !nameInput.value.trim()) {
                    window.ScoreshModals.showToast('Please enter a Tournament Name', 'warning');
                    return;
                }
                this.saveStep1Data();
            } else if (this.currentStep === 2) {
                if (this.data.teams.length < 2) {
                    window.ScoreshModals.showToast('Please register at least 2 teams', 'warning');
                    return;
                }
            } else if (this.currentStep === 3) {
                // Check if every team has at least 11 players
                const invalidTeams = this.data.teams.filter(t => t.playerIds.length < 11);
                if (invalidTeams.length > 0) {
                    window.ScoreshModals.showToast(`Minimum 11 players required per team squad. (${invalidTeams.map(t => `${t.name}: ${t.playerIds.length}/11`).join(', ')})`, 'warning');
                    return;
                }
            }
        }

        this.currentStep = step;
        this.renderStep();
    }

    saveStep1Data() {
        const name = document.getElementById('wiz-name')?.value || '';
        const logo = document.getElementById('wiz-logo')?.value || '🏆';
        const desc = document.getElementById('wiz-desc')?.value || '';
        const format = document.getElementById('wiz-format')?.value || 'T20';
        const overs = parseInt(document.getElementById('wiz-overs')?.value, 10) || 20;
        const location = document.getElementById('wiz-location')?.value || '';
        const organizer = document.getElementById('wiz-organizer')?.value || '';
        const startDate = document.getElementById('wiz-start-date')?.value || '';
        const endDate = document.getElementById('wiz-end-date')?.value || '';
        const rules = document.getElementById('wiz-rules')?.value || 'Standard Cricket Rules';

        this.data.name = name.trim();
        this.data.logo = logo;
        this.data.description = desc.trim();
        this.data.format = format;
        this.data.overs = overs;
        this.data.location = location.trim();
        this.data.organizer = organizer.trim();
        this.data.startDate = startDate;
        this.data.endDate = endDate;
        this.data.rules = rules;
    }

    renderStep() {
        document.querySelectorAll('.wizard-step-indicator').forEach(ind => {
            const stepNum = parseInt(ind.getAttribute('data-step'), 10);
            ind.classList.remove('active', 'completed');
            if (stepNum === this.currentStep) ind.classList.add('active');
            else if (stepNum < this.currentStep) ind.classList.add('completed');
        });

        document.querySelectorAll('.wizard-step-panel').forEach(panel => {
            const stepNum = parseInt(panel.getAttribute('data-step'), 10);
            panel.style.display = (stepNum === this.currentStep) ? 'block' : 'none';
        });

        const prevBtn = document.getElementById('wiz-prev-btn');
        const nextBtn = document.getElementById('wiz-next-btn');
        const finishBtn = document.getElementById('wiz-finish-btn');

        if (prevBtn) prevBtn.style.display = (this.currentStep > 1) ? 'inline-flex' : 'none';
        if (nextBtn) nextBtn.style.display = (this.currentStep < 4) ? 'inline-flex' : 'none';
        if (finishBtn) finishBtn.style.display = (this.currentStep === 4) ? 'inline-flex' : 'none';

        if (this.currentStep === 2) this.renderStep2Teams();
        if (this.currentStep === 3) this.renderStep3Squads();
        if (this.currentStep === 4) this.generateSchedulePreview();
    }

    renderStep2Teams() {
        const list = document.getElementById('wiz-teams-list');
        if (!list) return;

        if (this.data.teams.length === 0) {
            list.innerHTML = `<p class="text-sm text-muted text-center" style="padding:1rem;">No teams added yet. Add at least 2 teams below.</p>`;
            return;
        }

        list.innerHTML = this.data.teams.map((t, index) => `
            <div class="wizard-item-row">
                <div style="display:flex; align-items:center; gap:0.65rem;">
                    <span style="width:14px; height:14px; border-radius:50%; background-color:${t.color}; display:inline-block;"></span>
                    <strong>${t.name}</strong>
                    <span class="text-xs text-muted">(${t.shortName} • ${t.playerIds.length} players)</span>
                </div>
                <button type="button" class="btn btn-danger btn-sm" onclick="window.tournamentWizard.removeTeam(${index})">Remove</button>
            </div>
        `).join('');
    }

    addTeamFromInput() {
        const nameInput = document.getElementById('wiz-team-name');
        const shortInput = document.getElementById('wiz-team-short');
        const colorInput = document.getElementById('wiz-team-color');

        const name = (nameInput?.value || '').trim();
        const short = (shortInput?.value || (name.substring(0, 3).toUpperCase())).trim();
        const color = colorInput?.value || '#16a34a';

        if (!name) {
            window.ScoreshModals.showToast('Please enter a team name', 'warning');
            return;
        }

        const team = new Team({
            id: 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            name,
            shortName: short,
            color
        });

        this.data.teams.push(team);
        if (nameInput) nameInput.value = '';
        if (shortInput) shortInput.value = '';
        this.renderStep2Teams();
    }

    removeTeam(index) {
        const removed = this.data.teams.splice(index, 1)[0];
        if (removed) {
            this.data.players = this.data.players.filter(p => p.teamId !== removed.id);
        }
        this.renderStep2Teams();
    }

    renderStep3Squads() {
        const teamSelect = document.getElementById('wiz-player-team-select');
        if (teamSelect) {
            teamSelect.innerHTML = this.data.teams.map(t => `<option value="${t.id}">${t.name} (${t.playerIds.length}/20 players)</option>`).join('');
            teamSelect.onchange = () => this.renderPlayersList();
        }
        this.renderPlayersList();
    }

    renderPlayersList() {
        const teamSelect = document.getElementById('wiz-player-team-select');
        const list = document.getElementById('wiz-players-list');
        if (!list) return;

        const currentTeamId = teamSelect ? teamSelect.value : (this.data.teams[0]?.id || null);
        const currentTeam = this.data.teams.find(t => t.id === currentTeamId);

        // Strict Team Isolation: Show only players of currentTeamId
        const teamPlayers = this.data.players.filter(p => p.teamId === currentTeamId);

        const squadCounter = document.getElementById('wiz-squad-counter');
        if (squadCounter) {
            squadCounter.textContent = `${teamPlayers.length}/20 Players (Min: 11, Max: 20)`;
            squadCounter.className = teamPlayers.length >= 11 ? 'badge-strike' : 'badge-nonstrike';
        }

        if (teamPlayers.length === 0) {
            list.innerHTML = `<p class="text-sm text-muted text-center" style="padding:1rem;">No players added to ${currentTeam ? currentTeam.name : 'this team'} yet. (Need min 11, max 20)</p>`;
            return;
        }

        list.innerHTML = teamPlayers.map((p) => {
            return `
                <div class="wizard-item-row">
                    <div>
                        <strong>${p.name}</strong>
                        <span class="text-xs text-muted" style="margin-left:0.4rem;">(${currentTeam ? currentTeam.shortName : 'Team'} • ${p.role}${p.isWicketkeeper ? ' • WK' : ''} • #${p.jersey || '—'})</span>
                    </div>
                    <button type="button" class="btn btn-danger btn-sm" onclick="window.tournamentWizard.removePlayerById('${p.id}')">&times;</button>
                </div>
            `;
        }).join('');
    }

    addPlayerFromInput() {
        const nameInput = document.getElementById('wiz-player-name');
        const teamSelect = document.getElementById('wiz-player-team-select');
        const roleSelect = document.getElementById('wiz-player-role');
        const jerseyInput = document.getElementById('wiz-player-jersey');
        const isWkCheck = document.getElementById('wiz-player-is-wk');
        const batSelect = document.getElementById('wiz-player-bat-style');
        const bowlSelect = document.getElementById('wiz-player-bowl-style');

        const name = (nameInput?.value || '').trim();
        const teamId = teamSelect?.value;
        const role = roleSelect?.value || 'Batsman';
        const jersey = jerseyInput?.value || '';
        const isWk = Boolean(isWkCheck?.checked || role === 'Wicketkeeper');
        const batStyle = batSelect?.value || 'Right-hand bat';
        const bowlStyle = bowlSelect?.value || 'Right-arm medium';

        if (!name) {
            window.ScoreshModals.showToast('Please enter a player name', 'warning');
            return;
        }
        if (!teamId) {
            window.ScoreshModals.showToast('Please select a team', 'warning');
            return;
        }

        const team = this.data.teams.find(t => t.id === teamId);
        if (!team) return;

        // Strict 20 player maximum limit check
        if (team.playerIds.length >= 20) {
            window.ScoreshModals.showToast(`Maximum squad size is 20 players. ${team.name} already has 20 players.`, 'error');
            return;
        }

        const player = new Player({
            id: 'plr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            teamId,
            name,
            role,
            jersey,
            isWicketkeeper: isWk,
            battingStyle: batStyle,
            bowlingStyle: bowlStyle
        });

        this.data.players.push(player);
        team.playerIds.push(player.id);
        if (isWk && !team.wicketkeeperIds.includes(player.id)) {
            team.wicketkeeperIds.push(player.id);
        }

        if (nameInput) nameInput.value = '';
        if (jerseyInput) jerseyInput.value = '';
        if (isWkCheck) isWkCheck.checked = false;

        this.renderStep3Squads();
    }

    removePlayerById(playerId) {
        const pIndex = this.data.players.findIndex(p => p.id === playerId);
        if (pIndex !== -1) {
            const player = this.data.players.splice(pIndex, 1)[0];
            const team = this.data.teams.find(t => t.id === player.teamId);
            if (team) {
                team.playerIds = team.playerIds.filter(id => id !== playerId);
                team.wicketkeeperIds = team.wicketkeeperIds.filter(id => id !== playerId);
            }
        }
        this.renderStep3Squads();
    }

    generateSchedulePreview() {
        const container = document.getElementById('wiz-fixtures-list');
        if (!container) return;

        const teams = this.data.teams;
        const matches = [];
        let matchIndex = 1;

        // Round Robin generation
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const teamA = teams[i];
                const teamB = teams[j];

                const match = new Match({
                    id: 'match_' + Date.now() + '_' + matchIndex,
                    title: `${teamA.name} vs ${teamB.name}`,
                    teamAId: teamA.id,
                    teamBId: teamB.id,
                    teamAName: teamA.name,
                    teamBName: teamB.name,
                    teamAShort: teamA.shortName,
                    teamBShort: teamB.shortName,
                    teamAColor: teamA.color,
                    teamBColor: teamB.color,
                    teamAPlayingXI: teamA.playerIds.slice(0, 11),
                    teamBPlayingXI: teamB.playerIds.slice(0, 11),
                    date: this.data.startDate || new Date().toISOString().split('T')[0],
                    time: '14:00',
                    venue: this.data.location || 'Main Cricket Ground',
                    matchFormat: this.data.format,
                    totalOvers: this.data.overs,
                    status: 'upcoming'
                });

                matches.push(match);
                matchIndex++;
            }
        }

        this.data.matches = matches;

        container.innerHTML = matches.map(m => `
            <div class="wizard-item-row">
                <div>
                    <strong>${m.title}</strong>
                    <span class="text-xs text-muted" style="margin-left:0.5rem;">(${m.venue} • ${m.totalOvers} Overs)</span>
                </div>
                <span class="badge-strike">Scheduled</span>
            </div>
        `).join('');
    }

    finalizeTournament() {
        this.saveStep1Data();

        // Final check: minimum 11 players per team
        const invalidTeams = this.data.teams.filter(t => t.playerIds.length < 11);
        if (invalidTeams.length > 0) {
            window.ScoreshModals.showToast(`Minimum 11 players required per team squad. (${invalidTeams.map(t => `${t.name}: ${t.playerIds.length}/11`).join(', ')})`, 'error');
            return;
        }

        const tournament = window.scoreState.createTournament({
            name: this.data.name,
            logo: this.data.logo,
            description: this.data.description,
            format: this.data.format,
            overs: this.data.overs,
            location: this.data.location,
            organizer: this.data.organizer,
            startDate: this.data.startDate,
            endDate: this.data.endDate,
            rules: this.data.rules,
            teams: this.data.teams,
            players: this.data.players,
            matches: this.data.matches
        });

        if (tournament) {
            this.close();
            window.ScoreshModals.showToast(`Tournament "${tournament.name}" created successfully!`, 'success');
        }
    }
}

// Global wizard instance
window.tournamentWizard = new TournamentWizard();
