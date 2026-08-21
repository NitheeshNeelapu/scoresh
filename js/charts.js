/**
 * Scoresh Visual Analytics & Charts Engine
 * Renders modern, responsive cricket analytics charts using Chart.js.
 * Dynamically updates from actual match and tournament data.
 */

const ScoreshCharts = {
    runsChart: null,
    distChart: null,
    bowlingChart: null,

    init() {
        // Ready
    },

    updateAllCharts(state) {
        if (typeof Chart === 'undefined') return;
        this.renderRunsChart(state);
        this.renderDistributionChart(state);
        this.renderBowlingChart(state);
    },

    renderRunsChart(state) {
        const ctx = document.getElementById('chart-runs-batsman');
        if (!ctx) return;

        const match = state.activeMatch;
        const inn = match ? match.currentInnings : null;
        const batsmen = inn ? inn.batsmen : [];

        if (this.runsChart) {
            this.runsChart.destroy();
            this.runsChart = null;
        }

        if (!batsmen || batsmen.length === 0) return;

        const labels = batsmen.map(b => b.name);
        const runsData = batsmen.map(b => b.runs);
        const ballsData = batsmen.map(b => b.balls);

        this.runsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Runs Scored',
                        data: runsData,
                        backgroundColor: '#16a34a',
                        borderRadius: 6,
                        maxBarThickness: 36
                    },
                    {
                        label: 'Balls Faced',
                        data: ballsData,
                        backgroundColor: '#94a3b8',
                        borderRadius: 6,
                        maxBarThickness: 36
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
                            color: '#334155',
                            usePointStyle: true,
                            boxWidth: 8
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { color: '#64748b', font: { size: 11 } } }
                }
            }
        });
    },

    renderDistributionChart(state) {
        const ctx = document.getElementById('chart-run-distribution');
        if (!ctx) return;

        const match = state.activeMatch;
        const inn = match ? match.currentInnings : null;
        const batsmen = inn ? inn.batsmen : [];

        if (this.distChart) {
            this.distChart.destroy();
            this.distChart = null;
        }

        if (!batsmen || batsmen.length === 0) return;

        const onesTotal = batsmen.reduce((sum, b) => sum + (b.ones * 1), 0);
        const twosTotal = batsmen.reduce((sum, b) => sum + (b.twos * 2), 0);
        const threesTotal = batsmen.reduce((sum, b) => sum + (b.threes * 3), 0);
        const foursTotal = batsmen.reduce((sum, b) => sum + (b.fours * 4), 0);
        const sixesTotal = batsmen.reduce((sum, b) => sum + (b.sixes * 6), 0);
        const extrasTotal = inn ? inn.totalExtras : 0;
        const totalRuns = onesTotal + twosTotal + threesTotal + foursTotal + sixesTotal + extrasTotal;

        if (totalRuns === 0) return;

        this.distChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['1s', '2s', '3s', '4s (Fours)', '6s (Sixes)', 'Extras'],
                datasets: [{
                    data: [onesTotal, twosTotal, threesTotal, foursTotal, sixesTotal, extrasTotal],
                    backgroundColor: ['#94a3b8', '#64748b', '#3b82f6', '#16a34a', '#0f172a', '#f59e0b'],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { font: { size: 11 }, color: '#334155', usePointStyle: true }
                    }
                }
            }
        });
    },

    renderBowlingChart(state) {
        const ctx = document.getElementById('chart-bowling-economy');
        if (!ctx) return;

        const match = state.activeMatch;
        const inn = match ? match.currentInnings : null;
        const bowlers = inn ? inn.bowlers : [];

        if (this.bowlingChart) {
            this.bowlingChart.destroy();
            this.bowlingChart = null;
        }

        if (!bowlers || bowlers.length === 0) return;

        const labels = bowlers.map(b => b.name);
        const econData = bowlers.map(b => parseFloat(b.economy.toFixed(2)));
        const wktsData = bowlers.map(b => b.wkttkn);

        this.bowlingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Economy (RPO)',
                        data: econData,
                        backgroundColor: '#0f172a',
                        borderRadius: 6,
                        yAxisID: 'y',
                        maxBarThickness: 32
                    },
                    {
                        label: 'Wickets',
                        data: wktsData,
                        backgroundColor: '#16a34a',
                        borderRadius: 6,
                        yAxisID: 'y1',
                        maxBarThickness: 32
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } } },
                    y: { position: 'left', beginAtZero: true, grid: { color: '#f1f5f9' }, title: { display: true, text: 'Economy (RPO)' } },
                    y1: { position: 'right', beginAtZero: true, grid: { display: false }, title: { display: true, text: 'Wickets' }, ticks: { stepSize: 1 } }
                }
            }
        });
    }
};

// Global Charts instance
window.ScoreshCharts = ScoreshCharts;
