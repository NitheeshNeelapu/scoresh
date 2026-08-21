/**
 * Scoresh Storage Service & Repository Layer
 * Decoupled data layer for persistence with built-in RBAC authorization checks.
 * Starts clean with zero hardcoded data and allows migration to any backend database.
 */

class StorageService {
    constructor() {
        this.STORAGE_KEY_TOURNAMENTS = 'scoresh_tournaments_v3';
        this.STORAGE_KEY_ACTIVE_TOURNAMENT = 'scoresh_active_tournament_v3';
        this.STORAGE_KEY_ACTIVE_MATCH = 'scoresh_active_match_v3';
    }

    /**
     * Load all tournaments
     */
    getTournaments() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY_TOURNAMENTS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.map(t => new Tournament(t));
        } catch (e) {
            console.error('Failed to load tournaments', e);
            return [];
        }
    }

    /**
     * Get a specific tournament
     */
    getTournament(id) {
        if (!id) return null;
        const tournaments = this.getTournaments();
        return tournaments.find(t => t.id === id) || null;
    }

    /**
     * Save or update tournament with Host authorization check
     */
    saveTournament(tournament) {
        if (!tournament || !tournament.id) return { success: false, error: 'Invalid tournament object' };

        // RBAC Guard: Participants cannot mutate tournament data
        if (window.authService && !window.authService.canManageTournament(tournament.id)) {
            console.warn('Unauthorized: Only tournament hosts can save or edit tournament data.');
            return { success: false, error: 'Unauthorized: Host role required' };
        }

        const tournaments = this.getTournaments();
        const index = tournaments.findIndex(t => t.id === tournament.id);

        if (index >= 0) {
            tournaments[index] = tournament;
        } else {
            tournaments.push(tournament);
        }

        try {
            localStorage.setItem(this.STORAGE_KEY_TOURNAMENTS, JSON.stringify(tournaments.map(t => t.toJSON())));
            return { success: true };
        } catch (e) {
            console.error('Failed to save tournament', e);
            return { success: false, error: e.message };
        }
    }

    /**
     * Delete a tournament by ID
     */
    deleteTournament(id) {
        if (!id) return;
        if (window.authService && !window.authService.canManageTournament(id)) {
            console.warn('Unauthorized: Only tournament hosts can delete tournaments.');
            return;
        }

        let tournaments = this.getTournaments();
        tournaments = tournaments.filter(t => t.id !== id);

        try {
            localStorage.setItem(this.STORAGE_KEY_TOURNAMENTS, JSON.stringify(tournaments.map(t => t.toJSON())));
            if (this.getActiveTournamentId() === id) {
                this.setActiveTournamentId(tournaments.length > 0 ? tournaments[0].id : null);
            }
        } catch (e) {
            console.error('Failed to delete tournament', e);
        }
    }

    /**
     * Active Tournament ID
     */
    getActiveTournamentId() {
        return localStorage.getItem(this.STORAGE_KEY_ACTIVE_TOURNAMENT) || null;
    }

    setActiveTournamentId(id) {
        if (id) {
            localStorage.setItem(this.STORAGE_KEY_ACTIVE_TOURNAMENT, id);
        } else {
            localStorage.removeItem(this.STORAGE_KEY_ACTIVE_TOURNAMENT);
        }
    }

    /**
     * Active Match ID
     */
    getActiveMatchId() {
        return localStorage.getItem(this.STORAGE_KEY_ACTIVE_MATCH) || null;
    }

    setActiveMatchId(id) {
        if (id) {
            localStorage.setItem(this.STORAGE_KEY_ACTIVE_MATCH, id);
        } else {
            localStorage.removeItem(this.STORAGE_KEY_ACTIVE_MATCH);
        }
    }

    /**
     * Export all platform data to JSON backup
     */
    exportAllJSON() {
        const tournaments = this.getTournaments();
        const users = window.authService ? window.authService.getAllUsers() : [];
        const exportObj = {
            app: 'Scoresh',
            version: '3.0',
            exportedAt: new Date().toISOString(),
            users: users.map(u => u.toJSON()),
            tournaments: tournaments.map(t => t.toJSON())
        };
        return JSON.stringify(exportObj, null, 2);
    }

    /**
     * Import platform data from JSON backup
     */
    importAllJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (!data.tournaments || !Array.isArray(data.tournaments)) {
                throw new Error('Invalid Scoresh JSON backup format');
            }
            const tournaments = data.tournaments.map(t => new Tournament(t));
            localStorage.setItem(this.STORAGE_KEY_TOURNAMENTS, JSON.stringify(tournaments.map(t => t.toJSON())));
            if (tournaments.length > 0) {
                this.setActiveTournamentId(tournaments[0].id);
            }
            return { success: true, count: tournaments.length };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Reset platform data
     */
    clearAllData() {
        localStorage.removeItem(this.STORAGE_KEY_TOURNAMENTS);
        localStorage.removeItem(this.STORAGE_KEY_ACTIVE_TOURNAMENT);
        localStorage.removeItem(this.STORAGE_KEY_ACTIVE_MATCH);
    }
}

// Global Storage instance
window.scoreStorage = new StorageService();
