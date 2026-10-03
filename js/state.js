/**
 * Scoresh State Management
 * Reactive central state manager supporting Role-Based Access Control (Host vs Participant),
 * tournament switching, and mutation actions.
 */

class ScoreshState {
    constructor() {
        this.listeners = [];
        this.activeView = 'dashboard';
        this.searchQuery = '';
        this.activeTournamentId = null;
        this.activeMatchId = null;
        this.tournaments = [];

        this.init();
    }

    init() {
        this.tournaments = window.scoreStorage.getTournaments();
        this.activeTournamentId = window.scoreStorage.getActiveTournamentId();
        this.activeMatchId = window.scoreStorage.getActiveMatchId();

        // If no tournaments exist, start in tournaments directory view
        if (this.tournaments.length === 0) {
            this.activeView = 'tournaments';
            this.activeTournamentId = null;
            this.activeMatchId = null;
        } else {
            if (!this.activeTournamentId || !this.getTournament(this.activeTournamentId)) {
                this.activeTournamentId = this.tournaments[0].id;
                window.scoreStorage.setActiveTournamentId(this.activeTournamentId);
            }
            this.activeView = 'dashboard';
        }
    }

    get currentUser() {
        return window.authService ? window.authService.currentUser : null;
    }

    get isHost() {
        return window.authService ? window.authService.isHost() : false;
    }

    get isParticipant() {
        return window.authService ? window.authService.isParticipant() : true;
    }

    get activeTournament() {
        if (!this.activeTournamentId) return null;
        return this.getTournament(this.activeTournamentId);
    }

    get activeMatch() {
        if (!this.activeMatchId || !this.activeTournament) return null;
        return this.activeTournament.matches.find(m => m.id === this.activeMatchId) || null;
    }

    getTournament(id) {
        return this.tournaments.find(t => t.id === id) || null;
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(fn => fn(this));
    }

    setView(viewName) {
        this.activeView = viewName;
        this.notify();
    }

    setSearchQuery(q) {
        this.searchQuery = (q || '').trim().toLowerCase();
        this.notify();
    }

    // --- Tournament Mutations (Host Only) ---
    selectTournament(id) {
        const tournament = this.getTournament(id);
        if (tournament) {
            this.activeTournamentId = id;
            window.scoreStorage.setActiveTournamentId(id);
            this.activeView = 'dashboard';
            this.notify();
        }
    }

    createTournament(data) {
        if (!this.isHost) {
            window.ScoreshModals.showToast('Unauthorized: Only Hosts can create tournaments', 'error');
            return null;
        }

        const hostUser = this.currentUser;
        const tournament = new Tournament({
            ...data,
            hostId: hostUser ? hostUser.id : null,
            hostName: hostUser ? hostUser.name : 'Organizer'
        });

        this.tournaments.push(tournament);
        this.activeTournamentId = tournament.id;
        window.scoreStorage.saveTournament(tournament);
        window.scoreStorage.setActiveTournamentId(tournament.id);
        this.activeView = 'dashboard';
        this.notify();
        return tournament;
    }

    updateTournament(id, data) {
        if (!this.isHost) {
            window.ScoreshModals.showToast('Unauthorized: Only Hosts can edit tournaments', 'error');
            return null;
        }

        const tournament = this.getTournament(id);
        if (tournament) {
            Object.assign(tournament, data);
            window.scoreStorage.saveTournament(tournament);
            this.notify();
            return tournament;
        }
        return null;
    }

    deleteTournament(id) {
        if (!this.isHost) {
            window.ScoreshModals.showToast('Unauthorized: Only Hosts can delete tournaments', 'error');
            return;
        }

        this.tournaments = this.tournaments.filter(t => t.id !== id);
        window.scoreStorage.deleteTournament(id);

        if (this.tournaments.length === 0) {
            this.activeTournamentId = null;
            this.activeMatchId = null;
            this.activeView = 'tournaments';
        } else {
            this.activeTournamentId = this.tournaments[0].id;
            window.scoreStorage.setActiveTournamentId(this.activeTournamentId);
            this.activeView = 'dashboard';
        }
        this.notify();
    }

    // --- Team Mutations (Host Only) ---
    addTeam(tournamentId, data) {
        if (!this.isHost) return null;
        const tournament = this.getTournament(tournamentId);
        if (!tournament) return null;

        const team = new Team({ ...data, tournamentId });
        tournament.teams.push(team);
        window.scoreStorage.saveTournament(tournament);
        this.notify();
        return team;
    }

    updateTeam(tournamentId, teamId, data) {
        if (!this.isHost) return null;
        const tournament = this.getTournament(tournamentId);
        if (!tournament) return null;

        const team = tournament.teams.find(t => t.id === teamId);
        if (team) {
            Object.assign(team, data);
            window.scoreStorage.saveTournament(tournament);
            this.notify();
            return team;
        }
        return null;
    }

    deleteTeam(tournamentId, teamId) {
        if (!this.isHost) return;
        const tournament = this.getTournament(tournamentId);
        if (!tournament) return;

        tournament.teams = tournament.teams.filter(t => t.id !== teamId);
        tournament.players.forEach(p => {
            if (p.teamId === teamId) p.teamId = null;
        });
        window.scoreStorage.saveTournament(tournament);
        this.notify();
    }

    // --- Player Mutations (Host Only) ---
    addPlayer(tournamentId, data) {
        if (!this.isHost) return null;
        const tournament = this.getTournament(tournamentId);
        if (!tournament) return null;

        const player = new Player({ ...data, tournamentId });
        tournament.players.push(player);

        if (player.teamId) {
            const team = tournament.teams.find(t => t.id === player.teamId);
            if (team && !team.playerIds.includes(player.id)) {
                team.playerIds.push(player.id);
            }
        }

        window.scoreStorage.saveTournament(tournament);
        this.notify();
        return player;
    }

    updatePlayer(tournamentId, playerId, data) {
        if (!this.isHost) return null;
        const tournament = this.getTournament(tournamentId);
        if (!tournament) return null;

        const player = tournament.players.find(p => p.id === playerId);
        if (player) {
            const oldTeamId = player.teamId;
            Object.assign(player, data);

            if (oldTeamId !== player.teamId) {
                if (oldTeamId) {
                    const oldTeam = tournament.teams.find(t => t.id === oldTeamId);
                    if (oldTeam) oldTeam.playerIds = oldTeam.playerIds.filter(id => id !== playerId);
                }
                if (player.teamId) {
                    const newTeam = tournament.teams.find(t => t.id === player.teamId);
                    if (newTeam && !newTeam.playerIds.includes(playerId)) newTeam.playerIds.push(playerId);
                }
            }

            window.scoreStorage.saveTournament(tournament);
            this.notify();
            return player;
        }
        return null;
    }

    deletePlayer(tournamentId, playerId) {
        if (!this.isHost) return;
        const tournament = this.getTournament(tournamentId);
        if (!tournament) return;

        tournament.players = tournament.players.filter(p => p.id !== playerId);
        tournament.teams.forEach(t => {
            t.playerIds = t.playerIds.filter(id => id !== playerId);
        });

        window.scoreStorage.saveTournament(tournament);
        this.notify();
    }

    // --- Match Mutations (Host Only) ---
    createMatch(tournamentId, data) {
        if (!this.isHost) {
            window.ScoreshModals.showToast('Unauthorized: Only Hosts can create matches', 'error');
            return null;
        }

        const tournament = this.getTournament(tournamentId);
        if (!tournament) return null;

        const teamA = tournament.getTeam(data.teamAId);
        const teamB = tournament.getTeam(data.teamBId);

        const match = new Match({
            ...data,
            tournamentId,
            teamAName: teamA ? teamA.name : 'Team A',
            teamBName: teamB ? teamB.name : 'Team B',
            teamAShort: teamA ? teamA.shortName : 'TMA',
            teamBShort: teamB ? teamB.shortName : 'TMB',
            teamAColor: teamA ? teamA.color : '#16a34a',
            teamBColor: teamB ? teamB.color : '#0f172a',
            teamAPlayingXI: data.teamAPlayingXI || (teamA ? teamA.playerIds.slice(0, 11) : []),
            teamBPlayingXI: data.teamBPlayingXI || (teamB ? teamB.playerIds.slice(0, 11) : [])
        });

        tournament.matches.push(match);
        window.scoreStorage.saveTournament(tournament);
        this.notify();
        return match;
    }

    selectMatch(matchId, view = 'live') {
        this.activeMatchId = matchId;
        window.scoreStorage.setActiveMatchId(matchId);
        this.setView(view);
    }

    updateMatch(tournamentId, matchId, data) {
        if (!this.isHost) return null;
        const tournament = this.getTournament(tournamentId);
        if (!tournament) return null;

        const match = tournament.matches.find(m => m.id === matchId);
        if (match) {
            Object.assign(match, data);
            window.scoreStorage.saveTournament(tournament);
            this.notify();
            return match;
        }
        return null;
    }

    deleteMatch(tournamentId, matchId) {
        if (!this.isHost) return;
        const tournament = this.getTournament(tournamentId);
        if (!tournament) return;

        tournament.matches = tournament.matches.filter(m => m.id !== matchId);
        if (this.activeMatchId === matchId) {
            this.activeMatchId = null;
            window.scoreStorage.setActiveMatchId(null);
        }
        window.scoreStorage.saveTournament(tournament);
        this.notify();
    }

    saveCurrentTournament() {
        if (this.activeTournament) {
            window.scoreStorage.saveTournament(this.activeTournament);
        }
    }
}

// Global state instance
window.scoreState = new ScoreshState();
