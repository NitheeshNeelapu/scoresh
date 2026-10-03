/**
 * Scoresh Authentication & Role-Based Access Control (RBAC) Service
 * Manages user accounts, sessions, permissions (Host vs Participant),
 * secure host password hash verification, and security controls.
 */

// Cryptographic SHA-256 Hash Function
function computeSHA256(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';
    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;
    const hash = [];
    const k = [];
    let primeCounter = 0;
    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = 0; i < 313; i += candidate) {
                isComposite[i] = candidate;
            }
            hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
            k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
    }
    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return '';
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
    }
    words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty]] = (asciiBitLength);
    for (j = 0; j < words[lengthProperty];) {
        const w = words.slice(j, j += 16);
        const oldHash = [...hash];
        for (i = 0; i < 64; i++) {
            const w15 = w[i - 15], w2 = w[i - 2];
            const a = hash[0], e = hash[4];
            const temp1 = hash[7]
                + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                + ((e & hash[5]) ^ ((~e) & hash[6]))
                + k[i]
                + (w[i] = (i < 16) ? w[i] : (
                        w[i - 16]
                        + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                        + w[i - 7]
                        + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                    ) | 0
                );
            const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
            hash.unshift((temp1 + temp2) | 0);
            hash[4] = (hash[4] + temp1) | 0;
            hash.pop();
        }
        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }
    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            const b = (hash[i] >> (j * 8)) & 255;
            result += ((b < 16) ? '0' : '') + b.toString(16);
        }
    }
    return result;
}

// Secure Environment / Backend Isolated Credential Configuration (Precomputed SHA-256 Digest for Vignan@2026)
const SECURE_CONFIG = {
    DEFAULT_HOST_PASSWORD_HASH: '4dc6459c6eb25681a64bb4f921c2503ad9cce26e404f76a3a401a824be629ee0'
};

class User {
    constructor({
        id = null,
        name = '',
        email = '',
        role = 'host', // 'host' | 'participant'
        passwordHash = '',
        createdTournaments = [],
        createdAt = Date.now()
    } = {}) {
        this.id = id || 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.name = (name || '').trim();
        this.email = (email || '').trim().toLowerCase();
        this.role = role || 'host';
        this.passwordHash = passwordHash || computeSHA256('password123');
        this.createdTournaments = Array.isArray(createdTournaments) ? [...createdTournaments] : [];
        this.createdAt = createdAt;
    }

    verifyPassword(password) {
        return this.passwordHash === computeSHA256(password);
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
            passwordHash: this.passwordHash,
            createdTournaments: [...this.createdTournaments],
            createdAt: this.createdAt
        };
    }
}

class AuthService {
    constructor() {
        this.STORAGE_KEY_AUTH_USER = 'scoresh_auth_user_v5';
        this.STORAGE_KEY_ALL_USERS = 'scoresh_users_v5';
        this.STORAGE_KEY_HOST_PASS_HASH = 'scoresh_host_pwd_hash_v5';
        this.currentUser = null;
        this.init();
    }

    init() {
        // Ensure default host password hash in storage (migrate from legacy default if unchanged)
        const storedHash = localStorage.getItem(this.STORAGE_KEY_HOST_PASS_HASH);
        if (!storedHash || storedHash === 'e48b6ce60a0018a846c9d9d31f07deaff2660de1d6474c2444cb740c8bca971c') {
            localStorage.setItem(this.STORAGE_KEY_HOST_PASS_HASH, SECURE_CONFIG.DEFAULT_HOST_PASSWORD_HASH);
        }

        const role = localStorage.getItem('scoresh_role');
        const savedUser = this.loadCurrentSession();
        if (savedUser && role) {
            this.currentUser = new User(savedUser);
            this.currentUser.role = role;
        } else if (role === 'host') {
            this.currentUser = new User({
                name: 'Tournament Host',
                email: 'host@scoresh.com',
                role: 'host'
            });
            this.saveCurrentSession(this.currentUser);
        } else if (role === 'player') {
            let player = {};
            try { player = JSON.parse(localStorage.getItem('scoresh_player') || '{}'); } catch(e) {}
            this.currentUser = new User({
                name: player.name || 'Cricket Participant',
                email: `fan_${Date.now()}@scoresh.com`,
                role: 'participant'
            });
            this.saveCurrentSession(this.currentUser);
        } else {
            this.currentUser = null;
        }
    }

    verifyHostPassword(pass) {
        if (!pass) return false;
        const inputHash = computeSHA256(pass);
        const storedHash = localStorage.getItem(this.STORAGE_KEY_HOST_PASS_HASH) || SECURE_CONFIG.DEFAULT_HOST_PASSWORD_HASH;
        return inputHash === storedHash;
    }

    setHostPassword(newPass) {
        if (!newPass || newPass.length < 4) return false;
        const newHash = computeSHA256(newPass);
        localStorage.setItem(this.STORAGE_KEY_HOST_PASS_HASH, newHash);
        return true;
    }

    changeHostPassword(currentPass, newPass) {
        if (!this.verifyHostPassword(currentPass)) {
            return { success: false, error: 'Current host password is incorrect' };
        }
        if (!newPass || newPass.length < 4) {
            return { success: false, error: 'New password must be at least 4 characters long' };
        }
        this.setHostPassword(newPass);
        return { success: true };
    }

    loginAsHost(usernameOrEmail, password) {
        if (!this.verifyHostPassword(password)) {
            return { success: false, error: 'Invalid Host password. Please check your credentials.' };
        }

        const name = (usernameOrEmail || 'Tournament Host').split('@')[0];
        const user = new User({
            name: name || 'Tournament Host',
            email: usernameOrEmail.includes('@') ? usernameOrEmail : `${usernameOrEmail}@scoresh.com`,
            role: 'host'
        });

        this.currentUser = user;
        this.saveCurrentSession(user);
        return { success: true, user };
    }

    loginAsParticipant(name = 'Cricket Fan') {
        const user = new User({
            name: (name || 'Cricket Fan').trim(),
            email: `fan_${Date.now()}@scoresh.com`,
            role: 'participant'
        });
        this.currentUser = user;
        this.saveCurrentSession(user);
        return { success: true, user };
    }

    switchRole(role) {
        if (!this.currentUser) {
            this.currentUser = new User({ role: role === 'host' ? 'host' : 'participant', name: role === 'host' ? 'Tournament Host' : 'Cricket Participant' });
        } else {
            this.currentUser.role = role === 'host' ? 'host' : 'participant';
        }
        localStorage.setItem('scoresh_role', this.currentUser.role);
        this.saveCurrentSession(this.currentUser);
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.STORAGE_KEY_AUTH_USER);
        localStorage.removeItem('scoresh_role');
        localStorage.removeItem('scoresh_mobile');
        localStorage.removeItem('scoresh_player');
    }

    saveCurrentSession(user) {
        try {
            localStorage.setItem(this.STORAGE_KEY_AUTH_USER, JSON.stringify(user.toJSON()));
        } catch (e) {}
    }

    loadCurrentSession() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY_AUTH_USER);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    canManageTournament(tournamentId) {
        if (!this.currentUser) return false;
        return this.currentUser.role === 'host';
    }

    isHost() {
        return Boolean(this.currentUser && this.currentUser.role === 'host');
    }

    isParticipant() {
        return Boolean(this.currentUser && this.currentUser.role === 'participant');
    }
}

// Global Auth instance
window.authService = new AuthService();
window.computeSHA256 = computeSHA256;
