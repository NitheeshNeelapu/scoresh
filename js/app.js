/**
 * Scoresh Main Bootstrapper & Controller
 * Glues Authentication, RBAC, State, Live Scoring Engine, Modals, Wizard, and DOM events.
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Modals
    window.ScoreshModals.init();

    // 2. Initialize Charts
    if (window.ScoreshCharts) {
        window.ScoreshCharts.init();
    }

    // 3. Subscribe UI to State changes
    window.scoreState.subscribe((state) => {
        window.ScoreshUI.render(state);
    });

    // 4. Initial Render
    window.ScoreshUI.render(window.scoreState);

    // 5. Setup Navigation & Routing
    setupNavigation();

    // 6. Setup Live Scoring Pad
    setupScoringPad();

    // 7. Setup Action Buttons & Global Triggers
    setupGlobalActions();

    // 8. Setup Tournament Switcher Dropdown
    setupTournamentSwitcher();

    // 9. Setup Mobile Drawer
    setupMobileMenu();
});

/**
 * Tab and View Routing
 */
function setupNavigation() {
    const handleNav = (viewName) => {
        if (!viewName) return;

        // If no tournaments and user tries to navigate to a tournament view, redirect to welcome
        if (window.scoreState.tournaments.length === 0 && !['welcome', 'tournaments'].includes(viewName)) {
            window.scoreState.setView('welcome');
            window.ScoreshModals.showToast('Please create or select a tournament first', 'info');
            return;
        }

        window.scoreState.setView(viewName);
        window.location.hash = `#${viewName}`;
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const mobileDrawer = document.getElementById('mobile-drawer');
        if (mobileDrawer) mobileDrawer.classList.remove('open');
    };

    document.querySelectorAll('[data-view]').forEach(elem => {
        elem.addEventListener('click', (e) => {
            e.preventDefault();
            const view = elem.getAttribute('data-view');
            handleNav(view);
        });
    });

    // Hash change handler
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '');
        if (['welcome', 'dashboard', 'tournaments', 'matches', 'teams', 'players', 'live', 'scorecard', 'table', 'records', 'analytics'].includes(hash)) {
            handleNav(hash);
        }
    });

    // Check initial hash
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && ['welcome', 'dashboard', 'tournaments', 'matches', 'teams', 'players', 'live', 'scorecard', 'table', 'records', 'analytics'].includes(initialHash)) {
        handleNav(initialHash);
    }
}

/**
 * Interactive Live Scoring Pad
 */
function setupScoringPad() {
    document.querySelectorAll('.btn-live-ball').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!window.scoreState.isHost) {
                window.ScoreshModals.showToast('Participants have view-only access. Switch to Host role to score.', 'info');
                return;
            }

            const match = window.scoreState.activeMatch;
            if (!match || match.status !== 'live') {
                window.ScoreshModals.showToast('No live match active for scoring', 'warning');
                return;
            }

            const shot = btn.getAttribute('data-shot');
            const commInput = document.getElementById('live-custom-commentary');
            const customComm = commInput ? commInput.value.trim() : '';

            if (shot === 'W') {
                // Open Dismissal Modal
                window.ScoreshModals.openWicketModal();
            } else if (shot === 'CHANGE_BOWLER') {
                window.ScoreshModals.openChangeBowlerModal();
            } else {
                window.scoreEngine.recordBall(match, shot, 0, customComm);
                if (commInput) commInput.value = '';
            }

            // Touch pulse animation
            btn.classList.add('ball-pressed');
            setTimeout(() => btn.classList.remove('ball-pressed'), 180);
        });
    });

    // Start 2nd Innings button on banner
    const start2ndInnBtn = document.getElementById('btn-start-second-innings');
    if (start2ndInnBtn) {
        start2ndInnBtn.addEventListener('click', () => {
            if (window.scoreState.isHost) {
                window.ScoreshModals.openSecondInningsModal();
            }
        });
    }

    // Rotate Strike button
    const rotateStrikeBtn = document.getElementById('btn-manual-rotate-strike');
    if (rotateStrikeBtn) {
        rotateStrikeBtn.addEventListener('click', () => {
            if (!window.scoreState.isHost) return;
            const match = window.scoreState.activeMatch;
            if (match && match.currentInnings) {
                window.scoreEngine.rotateStrike(match.currentInnings);
                window.scoreState.saveCurrentTournament();
                window.scoreState.notify();
                window.ScoreshModals.showToast('Strike rotated manually', 'info');
            }
        });
    }
}

/**
 * Global Buttons & Triggers
 */
function setupGlobalActions() {
    // Open Tournament Setup Wizard
    document.querySelectorAll('[data-action="open-wizard"]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.tournamentWizard.open();
        });
    });

    // Wizard Next & Prev buttons
    const wizPrevBtn = document.getElementById('wiz-prev-btn');
    const wizNextBtn = document.getElementById('wiz-next-btn');
    const wizFinishBtn = document.getElementById('wiz-finish-btn');

    if (wizPrevBtn) {
        wizPrevBtn.addEventListener('click', () => {
            window.tournamentWizard.goToStep(window.tournamentWizard.currentStep - 1);
        });
    }

    if (wizNextBtn) {
        wizNextBtn.addEventListener('click', () => {
            window.tournamentWizard.goToStep(window.tournamentWizard.currentStep + 1);
        });
    }

    if (wizFinishBtn) {
        wizFinishBtn.addEventListener('click', () => {
            window.tournamentWizard.finalizeTournament();
        });
    }

    // Wizard Team & Player add buttons
    const wizAddTeamBtn = document.getElementById('wiz-add-team-btn');
    if (wizAddTeamBtn) {
        wizAddTeamBtn.addEventListener('click', () => {
            window.tournamentWizard.addTeamFromInput();
        });
    }

    const wizAddPlrBtn = document.getElementById('wiz-add-player-btn');
    if (wizAddPlrBtn) {
        wizAddPlrBtn.addEventListener('click', () => {
            window.tournamentWizard.addPlayerFromInput();
        });
    }

    // Global Search Input
    document.querySelectorAll('.search-input').forEach(input => {
        input.addEventListener('input', (e) => {
            window.scoreState.setSearchQuery(e.target.value);
        });
    });

    // Print Scorecard
    document.querySelectorAll('[data-action="print-scorecard"]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.print();
        });
    });

    // Export JSON Backup
    document.querySelectorAll('[data-action="export-json"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const jsonStr = window.scoreStorage.exportAllJSON();
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scoresh_backup_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            window.ScoreshModals.showToast('All tournament and account data exported!', 'success');
        });
    });

    // Import JSON Backup
    const fileInput = document.getElementById('import-json-file-input');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const res = window.scoreStorage.importAllJSON(event.target.result);
                if (res.success) {
                    window.scoreState.init();
                    window.ScoreshModals.showToast(`Imported ${res.count} tournament(s) successfully!`, 'success');
                } else {
                    window.ScoreshModals.showToast(`Import failed: ${res.error}`, 'error');
                }
                fileInput.value = '';
            };
            reader.readAsText(file);
        });
    }

    document.querySelectorAll('[data-action="trigger-import"]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (fileInput) fileInput.click();
        });
    });

    // Reset All Data
    document.querySelectorAll('[data-action="clear-all-data"]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.ScoreshModals.confirm(
                'Clear All Stored Data',
                'This will permanently delete all tournaments, teams, players, and match records. Are you sure you want to reset everything?',
                'Wipe All Data',
                () => {
                    window.scoreStorage.clearAllData();
                    window.scoreState.init();
                    window.ScoreshModals.showToast('All platform data reset.', 'info');
                }
            );
        });
    });
}

/**
 * Tournament Switcher Dropdown in Navigation Bar
 */
function setupTournamentSwitcher() {
    const btn = document.getElementById('top-tourn-select-btn');
    const dropdown = document.getElementById('top-tourn-dropdown');

    if (btn && dropdown) {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });

        document.addEventListener('click', (e) => {
            if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.classList.remove('show');
            }
        });
    }
}

/**
 * Mobile Navigation Drawer
 */
function setupMobileMenu() {
    const hamburger = document.getElementById('hamburger-btn');
    const drawer = document.getElementById('mobile-drawer');
    const closeBtn = document.getElementById('close-drawer-btn');

    if (hamburger && drawer) {
        hamburger.addEventListener('click', () => drawer.classList.add('open'));
    }

    if (closeBtn && drawer) {
        closeBtn.addEventListener('click', () => drawer.classList.remove('open'));
    }
}
