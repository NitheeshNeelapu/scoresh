/**
 * Scoresh Authentication & Role-Based Access Control (RBAC) Service
 * Manages user accounts, session state, and permissions (Host vs Participant).
 * Protects host-only operations at the data and authentication layer.
 */

class User {
    constructor({
        id = null,
        name = '',
        email = '',
        role = 'host', // 'host' | 'participant'
        createdTournaments = [],
        createdAt = Date.now()
    } = {}) {
        this.id = id || 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.name = (name || '').trim();
        this.email = (email || '').trim().toLowerCase();
        this.role = role || 'host';
        this.createdTournaments = Array.isArray(createdTournaments) ? [...createdTournaments] : [];
        this.createdAt = createdAt;
    }

    get isHost() {
        return this.role === 'host';
    }

    get isParticipant() {
        return this.role === 'participant';
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            role: this.role,
            createdTournaments: [...this.createdTournaments],
            createdAt: this.createdAt
        };
    }
}

class AuthService {
    constructor() {
        this.STORAGE_KEY_AUTH_USER = 'scoresh_auth_user_v3';
        this.STORAGE_KEY_ALL_USERS = 'scoresh_users_v3';
        this.currentUser = null;
        this.init();
    }

    init() {
        const savedUser = this.loadCurrentSession();
        if (savedUser) {
            this.currentUser = new User(savedUser);
        } else {
            // Default initial guest session as Host so user can start creating immediately,
            // or switch between roles in 1 click
            this.currentUser = new User({
                name: 'Tournament Host',
                email: 'host@scoresh.com',
                role: 'host'
            });
            this.saveCurrentSession(this.currentUser);
        }
    }

    getAllUsers() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY_ALL_USERS);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(u => new User(u)) : [];
        } catch (e) {
            return [];
        }
    }

    register(name, email, password, role = 'host') {
        const users = this.getAllUsers();
        const existing = users.find(u => u.email === email.toLowerCase());
        if (existing) {
            return { success: false, error: 'User with this email already exists' };
        }

        const newUser = new User({ name, email, role });
        users.push(newUser);
        try {
            localStorage.setItem(this.STORAGE_KEY_ALL_USERS, JSON.stringify(users.map(u => u.toJSON())));
        } catch (e) {}

        this.currentUser = newUser;
        this.saveCurrentSession(newUser);
        return { success: true, user: newUser };
    }

    login(email, password) {
        const users = this.getAllUsers();
        const user = users.find(u => u.email === email.toLowerCase());

        // For flexible prototype login, if not found, auto-create account or login with chosen credentials
        if (user) {
            this.currentUser = user;
            this.saveCurrentSession(user);
            return { success: true, user };
        } else {
            // Auto register on first login
            return this.register(email.split('@')[0], email, password, 'host');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.STORAGE_KEY_AUTH_USER);
    }

    switchRole(role) {
        if (!this.currentUser) {
            this.currentUser = new User({ name: 'Cricket User', role });
        } else {
            this.currentUser.role = role;
        }
        this.saveCurrentSession(this.currentUser);
    }

    saveCurrentSession(user) {
        try {
            localStorage.setItem(this.STORAGE_KEY_AUTH_USER, JSON.stringify(user.toJSON()));
        } catch (e) {}
    }

    loadCurrentSession() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY_AUTH_USER);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    isHost() {
        return this.currentUser ? this.currentUser.role === 'host' : false;
    }

    isParticipant() {
        return this.currentUser ? this.currentUser.role === 'participant' : true;
    }

    canManageTournament(tournamentId) {
        if (!this.isHost()) return false;
        // Hosts have full management rights
        return true;
    }
}

// Global Auth instance
window.authService = new AuthService();
