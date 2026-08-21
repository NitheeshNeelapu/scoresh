/**
 * Scoresh Pure Calculations & Scorecard Derivation Engine
 * Translates the C program mathematical logic and guarantees 100% data consistency
 * by deriving Batsman scorecards, Bowler figures, Fall of Wickets, and Partnerships
 * directly from the underlying sequence of Ball Deliveries.
 */

const ScoreshCalculations = {
    /**
     * C Program Formula: Runs = (ones * 1) + (twos * 2) + (threes * 3) + (fours * 4) + (sixes * 6)
     */
    calculateRuns(ones = 0, twos = 0, threes = 0, fours = 0, sixes = 0) {
        const o1 = Math.max(0, parseInt(ones, 10) || 0);
        const o2 = Math.max(0, parseInt(twos, 10) || 0);
        const o3 = Math.max(0, parseInt(threes, 10) || 0);
        const o4 = Math.max(0, parseInt(fours, 10) || 0);
        const o6 = Math.max(0, parseInt(sixes, 10) || 0);
        return (o1 * 1) + (o2 * 2) + (o3 * 3) + (o4 * 4) + (o6 * 6);
    },

    /**
     * C Program Formula: Strike Rate = (Runs / Balls) * 100
     */
    calculateStrikeRate(runs = 0, balls = 0) {
        const r = Math.max(0, parseFloat(runs) || 0);
        const b = Math.max(0, parseInt(balls, 10) || 0);
        if (b === 0) return 0.0;
        return (r / b) * 100;
    },

    /**
     * Converts cricket decimal notation (e.g. 4.5 ov = 4 overs + 5 balls) to exact decimal fraction (4 + 5/6 = 4.8333 ov)
     */
    oversToFraction(overs = 0) {
        const ov = Math.max(0, parseFloat(overs) || 0);
        const fullOvers = Math.floor(ov);
        const balls = Math.round((ov - fullOvers) * 10);
        return fullOvers + (balls / 6);
    },

    /**
     * Converts total balls to cricket display notation (e.g. 23 balls -> "3.5")
     */
    ballsToOversDisplay(totalBalls = 0) {
        const b = Math.max(0, parseInt(totalBalls, 10) || 0);
        const fullOvers = Math.floor(b / 6);
        const remBalls = b % 6;
        return `${fullOvers}.${remBalls}`;
    },

    /**
     * Converts display overs string/number (e.g. 3.4) to total balls (22)
     */
    oversDisplayToBalls(overs = 0) {
        const ov = Math.max(0, parseFloat(overs) || 0);
        const fullOvers = Math.floor(ov);
        const remBalls = Math.round((ov - fullOvers) * 10) % 6;
        return (fullOvers * 6) + remBalls;
    },

    /**
     * C Program Formula: Economy = Runs Conceded / Overs
     */
    calculateEconomy(runsConceded = 0, overs = 0) {
        const runs = Math.max(0, parseFloat(runsConceded) || 0);
        const ovFraction = this.oversToFraction(overs);
        if (ovFraction === 0) return 0.0;
        return runs / ovFraction;
    },

    /**
     * Current Run Rate: Total Runs / Total Overs Fraction
     */
    calculateRunRate(totalRuns = 0, totalOversFraction = 0) {
        const runs = Math.max(0, parseFloat(totalRuns) || 0);
        const ov = Math.max(0, parseFloat(totalOversFraction) || 0);
        if (ov === 0) return 0.0;
        return runs / ov;
    },

    /**
     * Required Run Rate: (Target - Current Runs) / Remaining Overs Fraction
     */
    calculateRequiredRunRate(target = 0, currentRuns = 0, maxOvers = 20, currentOversDisplay = 0) {
        if (!target || target <= 0) return null;
        const runsNeeded = target - currentRuns;
        if (runsNeeded <= 0) return 0.0;

        const maxOv = parseFloat(maxOvers) || 20;
        const curOvFrac = this.oversToFraction(currentOversDisplay);
        const remOvFrac = Math.max(0, maxOv - curOvFrac);

        if (remOvFrac === 0) return runsNeeded > 0 ? 999.0 : 0.0;
        return runsNeeded / remOvFrac;
    },

    formatStat(num, decimals = 2) {
        if (num === null || num === undefined || isNaN(num)) return '0.00';
        return Number(num).toFixed(decimals);
    },

    /**
     * DERIVE COMPLETE SCORECARD FROM UNDERLYING BALL DELIVERIES
     * Ensures absolute data integrity by deriving batsman scores, bowler figures,
     * fall of wickets, partnerships, extras, and match totals directly from ballLog.
     */
    deriveScorecardFromDeliveries(innings) {
        if (!innings) return;

        const ballLog = innings.ballLog || [];
        const batMap = {};
        const bowlMap = {};
        const fallOfWickets = [];
        const partnerships = [];

        let currentPartnership = {
            batsman1Name: '',
            batsman2Name: '',
            runs: 0,
            balls: 0
        };

        const extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
        let totalRuns = 0;
        let totalWickets = 0;
        let legalBalls = 0;

        // Initialize existing registered batsmen & bowlers
        (innings.batsmen || []).forEach(b => {
            batMap[b.id] = {
                id: b.id,
                playerId: b.playerId,
                name: b.name,
                ones: 0,
                twos: 0,
                threes: 0,
                fours: 0,
                sixes: 0,
                balls: 0,
                isOut: false,
                dismissal: 'Not Out',
                dismissalType: 'Not Out',
                bowlerName: '',
                fielderName: '',
                isOnStrike: b.isOnStrike,
                isNonStriker: b.isNonStriker
            };
        });

        (innings.bowlers || []).forEach(bw => {
            bowlMap[bw.id] = {
                id: bw.id,
                playerId: bw.playerId,
                name: bw.name,
                runsgv: 0,
                legalBalls: 0,
                overs: 0.0,
                wkttkn: 0,
                maidens: 0,
                wides: 0,
                noBalls: 0,
                dots: 0,
                isCurrentBowler: bw.isCurrentBowler,
                overRunsMap: {} // overIndex -> runs in that over
            };
        });

        // Replay every delivery in order
        ballLog.forEach((d) => {
            const strikerId = d.strikerId;
            const nonStrikerId = d.nonStrikerId;
            const bowlerId = d.bowlerId;

            // Ensure striker is in batMap
            if (strikerId && !batMap[strikerId]) {
                batMap[strikerId] = {
                    id: strikerId,
                    playerId: d.strikerId,
                    name: d.strikerName || 'Batter',
                    ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0, balls: 0,
                    isOut: false, dismissal: 'Not Out', dismissalType: 'Not Out',
                    bowlerName: '', fielderName: '', isOnStrike: true, isNonStriker: false
                };
            }

            // Ensure bowler is in bowlMap
            if (bowlerId && !bowlMap[bowlerId]) {
                bowlMap[bowlerId] = {
                    id: bowlerId,
                    playerId: d.bowlerId,
                    name: d.bowlerName || 'Bowler',
                    runsgv: 0, legalBalls: 0, overs: 0.0, wkttkn: 0, maidens: 0,
                    wides: 0, noBalls: 0, dots: 0, isCurrentBowler: true,
                    overRunsMap: {}
                };
            }

            const bat = batMap[strikerId];
            const bowl = bowlMap[bowlerId];

            // 1. Extras tracking
            const extraWide = d.extras?.wide || 0;
            const extraNoball = d.extras?.noball || 0;
            const extraBye = d.extras?.bye || 0;
            const extraLegbye = d.extras?.legbye || 0;

            extras.wides += extraWide;
            extras.noBalls += extraNoball;
            extras.byes += extraBye;
            extras.legByes += extraLegbye;

            const totalDeliveryRuns = d.runsOffBat + extraWide + extraNoball + extraBye + extraLegbye;
            totalRuns += totalDeliveryRuns;

            // 2. Striker statistics
            if (bat) {
                if (d.isLegal || d.extras.noball > 0 || d.extras.bye > 0 || d.extras.legbye > 0) {
                    bat.balls += 1;
                }
                if (d.runsOffBat === 1) bat.ones += 1;
                else if (d.runsOffBat === 2) bat.twos += 1;
                else if (d.runsOffBat === 3) bat.threes += 1;
                else if (d.runsOffBat === 4) bat.fours += 1;
                else if (d.runsOffBat === 6) bat.sixes += 1;
            }

            // 3. Bowler statistics
            if (bowl) {
                const bowlerRuns = d.runsOffBat + extraWide + extraNoball; // Byes & Leg Byes don't count against bowler
                bowl.runsgv += bowlerRuns;

                if (!bowl.overRunsMap[d.overIndex]) bowl.overRunsMap[d.overIndex] = 0;
                bowl.overRunsMap[d.overIndex] += bowlerRuns;

                if (extraWide > 0) bowl.wides += extraWide;
                if (extraNoball > 0) bowl.noBalls += extraNoball;

                if (d.isLegal) {
                    bowl.legalBalls += 1;
                    if (d.runsOffBat === 0 && !d.isExtra) bowl.dots += 1;
                }
            }

            // 4. Legal Deliveries & Overs
            if (d.isLegal) {
                legalBalls += 1;
            }

            // 5. Partnership
            currentPartnership.runs += totalDeliveryRuns;
            if (d.isLegal) currentPartnership.balls += 1;

            // 6. Dismissal / Wickets
            if (d.isWicket) {
                totalWickets += 1;
                const dismissalDesc = d.dismissalDesc || (d.wicketType === 'Bowled' ? `b ${d.bowlerName}` : (d.wicketType === 'Caught' ? `c ${d.fielderName} b ${d.bowlerName}` : `out (${d.wicketType})`));

                if (bat) {
                    bat.isOut = true;
                    bat.dismissal = dismissalDesc;
                    bat.dismissalType = d.wicketType;
                    bat.bowlerName = d.bowlerName;
                    bat.fielderName = d.fielderName;
                    bat.isOnStrike = false;
                }

                // Bowler wicket attribution (Run Out does NOT credit bowler)
                if (bowl && d.wicketType !== 'Run Out' && d.wicketType !== 'Retired Out') {
                    bowl.wkttkn += 1;
                }

                // Fall of Wickets
                fallOfWickets.push({
                    wicketNumber: totalWickets,
                    runs: totalRuns,
                    overs: this.ballsToOversDisplay(legalBalls),
                    batsmanName: d.strikerName
                });

                // End partnership on wicket
                partnerships.push({
                    batsman1Name: d.strikerName,
                    batsman2Name: d.nonStrikerName,
                    runs: currentPartnership.runs,
                    balls: currentPartnership.balls,
                    isCurrent: false
                });

                currentPartnership = {
                    batsman1Name: '',
                    batsman2Name: d.nonStrikerName,
                    runs: 0,
                    balls: 0
                };
            }
        });

        // Compute Maidens and display overs for bowlers
        Object.values(bowlMap).forEach(b => {
            b.overs = parseFloat(this.ballsToOversDisplay(b.legalBalls));
            // Check completed overs with 0 runs
            const fullOvers = Math.floor(b.legalBalls / 6);
            let maidens = 0;
            for (let ov = 0; ov < fullOvers; ov++) {
                if (b.overRunsMap[ov] === 0) maidens++;
            }
            b.maidens = maidens;
        });

        // Set current active partnership
        const activeStriker = Object.values(batMap).find(b => b.isOnStrike && !b.isOut);
        const activeNonStriker = Object.values(batMap).find(b => b.isNonStriker && !b.isOut);
        if (activeStriker && activeNonStriker) {
            currentPartnership.batsman1Name = activeStriker.name;
            currentPartnership.batsman2Name = activeNonStriker.name;
            currentPartnership.isCurrent = true;
            partnerships.push(currentPartnership);
        }

        // Assign derived values to innings
        innings.extras = extras;
        innings.totalRuns = totalRuns;
        innings.totalWickets = totalWickets;
        innings.legalBalls = legalBalls;
        innings.oversBowled = parseFloat(this.ballsToOversDisplay(legalBalls));
        innings.fallOfWickets = fallOfWickets;
        innings.partnerships = partnerships;

        innings.batsmen = Object.values(batMap).map(b => new Batsman(b));
        innings.bowlers = Object.values(bowlMap).map(bw => new Bowler(bw));
    },

    /**
     * DYNAMIC POINTS TABLE WITH NET RUN RATE (NRR)
     */
    computePointsTable(tournament) {
        if (!tournament || !tournament.teams || tournament.teams.length === 0) {
            return [];
        }

        const tableMap = {};
        tournament.teams.forEach(team => {
            tableMap[team.id] = {
                teamId: team.id,
                teamName: team.name,
                shortName: team.shortName,
                color: team.color,
                logo: team.logo,
                played: 0,
                won: 0,
                lost: 0,
                tied: 0,
                nr: 0,
                points: 0,
                runsScored: 0,
                oversFacedBalls: 0,
                runsConceded: 0,
                oversBowledBalls: 0,
                nrr: 0.0,
                form: []
            };
        });

        const completedMatches = (tournament.matches || []).filter(m => m.status === 'completed');

        completedMatches.forEach(match => {
            const teamAId = match.teamAId;
            const teamBId = match.teamBId;
            const inn1 = match.innings[0];
            const inn2 = match.innings[1];

            if (!tableMap[teamAId] || !tableMap[teamBId]) return;

            const tA = tableMap[teamAId];
            const tB = tableMap[teamBId];

            tA.played += 1;
            tB.played += 1;

            if (match.winnerTeamId === teamAId) {
                tA.won += 1;
                tA.points += 2;
                tA.form.push('W');
                tB.lost += 1;
                tB.form.push('L');
            } else if (match.winnerTeamId === teamBId) {
                tB.won += 1;
                tB.points += 2;
                tB.form.push('W');
                tA.lost += 1;
                tA.form.push('L');
            } else if (match.resultSummary && match.resultSummary.toLowerCase().includes('tie')) {
                tA.tied += 1;
                tB.tied += 1;
                tA.points += 1;
                tB.points += 1;
                tA.form.push('T');
                tB.form.push('T');
            } else {
                tA.nr += 1;
                tB.nr += 1;
                tA.points += 1;
                tB.points += 1;
                tA.form.push('NR');
                tB.form.push('NR');
            }

            // NRR Calculation
            if (inn1 && inn2) {
                const team1BatId = inn1.battingTeamId;
                const team2BatId = inn2.battingTeamId;

                const inn1Runs = inn1.totalRuns;
                const inn1Balls = (inn1.totalWickets >= 10) ? (match.totalOvers * 6) : (inn1.legalBalls || (match.totalOvers * 6));

                const inn2Runs = inn2.totalRuns;
                const inn2Balls = (inn2.totalWickets >= 10) ? (match.totalOvers * 6) : (inn2.legalBalls || (match.totalOvers * 6));

                if (tableMap[team1BatId]) {
                    tableMap[team1BatId].runsScored += inn1Runs;
                    tableMap[team1BatId].oversFacedBalls += Math.max(1, inn1Balls);
                    tableMap[team1BatId].runsConceded += inn2Runs;
                    tableMap[team1BatId].oversBowledBalls += Math.max(1, inn2Balls);
                }

                if (tableMap[team2BatId]) {
                    tableMap[team2BatId].runsScored += inn2Runs;
                    tableMap[team2BatId].oversFacedBalls += Math.max(1, inn2Balls);
                    tableMap[team2BatId].runsConceded += inn1Runs;
                    tableMap[team2BatId].oversBowledBalls += Math.max(1, inn1Balls);
                }
            }
        });

        const standings = Object.values(tableMap).map(team => {
            const forRate = team.oversFacedBalls > 0 ? (team.runsScored / (team.oversFacedBalls / 6)) : 0;
            const againstRate = team.oversBowledBalls > 0 ? (team.runsConceded / (team.oversBowledBalls / 6)) : 0;
            team.nrr = forRate - againstRate;
            return team;
        });

        standings.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (Math.abs(b.nrr - a.nrr) > 0.0001) return b.nrr - a.nrr;
            if (b.won !== a.won) return b.won - a.won;
            return a.teamName.localeCompare(b.teamName);
        });

        return standings;
    },

    /**
     * DYNAMIC TOURNAMENT RECORDS & STATS
     */
    computeTournamentStats(tournament) {
        if (!tournament || !tournament.matches || tournament.matches.length === 0) {
            return {
                orangeCap: [],
                purpleCap: [],
                mostCatches: [],
                highestScores: [],
                bestStrikeRates: [],
                mostSixes: [],
                mostFours: [],
                bestEconomy: [],
                bestFigures: [],
                teamTotals: [],
                totalTournamentRuns: 0,
                totalTournamentWickets: 0,
                totalTournamentSixes: 0,
                totalTournamentFours: 0,
                centuriesCount: 0,
                fiftiesCount: 0
            };
        }

        const playerBatMap = {};
        const playerBowlMap = {};
        const playerFieldMap = {};

        let totalTournamentRuns = 0;
        let totalTournamentWickets = 0;
        let totalTournamentSixes = 0;
        let totalTournamentFours = 0;
        let centuriesCount = 0;
        let fiftiesCount = 0;
        const highestIndividualInnings = [];
        const bestBowlingInnings = [];
        const teamTotals = [];

        tournament.matches.forEach(match => {
            match.innings.forEach(inn => {
                totalTournamentRuns += inn.totalRuns;
                totalTournamentWickets += inn.totalWickets;

                if (inn.totalRuns > 0) {
                    teamTotals.push({
                        teamName: inn.battingTeamName,
                        runs: inn.totalRuns,
                        wickets: inn.totalWickets,
                        overs: inn.displayOvers,
                        matchTitle: match.title,
                        date: match.date
                    });
                }

                // Aggregate Batting
                inn.batsmen.forEach(bat => {
                    if (!bat.name) return;
                    const key = bat.playerId || bat.name;
                    if (!playerBatMap[key]) {
                        playerBatMap[key] = {
                            playerId: bat.playerId,
                            playerName: bat.name,
                            inningsCount: 0,
                            runs: 0,
                            balls: 0,
                            ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0,
                            fifties: 0, centuries: 0, highestScore: 0, notOuts: 0
                        };
                    }

                    const p = playerBatMap[key];
                    if (bat.balls > 0 || bat.isOut) p.inningsCount += 1;
                    p.runs += bat.runs;
                    p.balls += bat.balls;
                    p.ones += bat.ones;
                    p.twos += bat.twos;
                    p.threes += bat.threes;
                    p.fours += bat.fours;
                    p.sixes += bat.sixes;
                    totalTournamentFours += bat.fours;
                    totalTournamentSixes += bat.sixes;

                    if (!bat.isOut) p.notOuts += 1;
                    if (bat.runs >= 100) { p.centuries += 1; centuriesCount += 1; }
                    else if (bat.runs >= 50) { p.fifties += 1; fiftiesCount += 1; }
                    if (bat.runs > p.highestScore) p.highestScore = bat.runs;

                    if (bat.runs > 0) {
                        highestIndividualInnings.push({
                            playerName: bat.name,
                            runs: bat.runs,
                            balls: bat.balls,
                            strikeRate: bat.strikeRate,
                            fours: bat.fours,
                            sixes: bat.sixes,
                            matchTitle: match.title,
                            isOut: bat.isOut
                        });
                    }
                });

                // Aggregate Bowling
                inn.bowlers.forEach(bowl => {
                    if (!bowl.name) return;
                    const key = bowl.playerId || bowl.name;
                    if (!playerBowlMap[key]) {
                        playerBowlMap[key] = {
                            playerId: bowl.playerId,
                            playerName: bowl.name,
                            inningsCount: 0,
                            oversBalls: 0,
                            runsConceded: 0,
                            wickets: 0,
                            maidens: 0,
                            bestWkts: 0,
                            bestRuns: 999
                        };
                    }

                    const b = playerBowlMap[key];
                    if (bowl.overs > 0) b.inningsCount += 1;
                    b.oversBalls += bowl.totalLegalBalls;
                    b.runsConceded += bowl.runsgv;
                    b.wickets += bowl.wkttkn;
                    b.maidens += bowl.maidens;

                    if (bowl.wkttkn > b.bestWkts || (bowl.wkttkn === b.bestWkts && bowl.runsgv < b.bestRuns)) {
                        b.bestWkts = bowl.wkttkn;
                        b.bestRuns = bowl.runsgv;
                    }

                    if (bowl.overs > 0) {
                        bestBowlingInnings.push({
                            playerName: bowl.name,
                            overs: bowl.overs,
                            runs: bowl.runsgv,
                            wickets: bowl.wkttkn,
                            economy: bowl.economy,
                            matchTitle: match.title
                        });
                    }
                });

                // Aggregate Fielding (Catches & Run Outs)
                (inn.ballLog || []).forEach(d => {
                    if (d.isWicket && (d.wicketType === 'Caught' || d.wicketType === 'Stumped' || d.wicketType === 'Run Out')) {
                        const fielder = d.fielderName;
                        if (fielder) {
                            if (!playerFieldMap[fielder]) {
                                playerFieldMap[fielder] = { playerName: fielder, catches: 0, stumpings: 0, runouts: 0, total: 0 };
                            }
                            if (d.wicketType === 'Caught') playerFieldMap[fielder].catches += 1;
                            else if (d.wicketType === 'Stumped') playerFieldMap[fielder].stumpings += 1;
                            else if (d.wicketType === 'Run Out') playerFieldMap[fielder].runouts += 1;
                            playerFieldMap[fielder].total += 1;
                        }
                    }
                });
            });
        });

        const orangeCap = Object.values(playerBatMap).map(p => {
            p.strikeRate = p.balls > 0 ? (p.runs / p.balls) * 100 : 0.0;
            const dismissals = p.inningsCount - p.notOuts;
            p.average = dismissals > 0 ? (p.runs / dismissals) : p.runs;
            return p;
        }).sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate);

        const purpleCap = Object.values(playerBowlMap).map(b => {
            const oversFraction = b.oversBalls / 6;
            b.displayOvers = ScoreshCalculations.ballsToOversDisplay(b.oversBalls);
            b.economy = oversFraction > 0 ? (b.runsConceded / oversFraction) : 0.0;
            b.average = b.wickets > 0 ? (b.runsConceded / b.wickets) : 999.0;
            return b;
        }).sort((a, b) => b.wickets - a.wickets || a.economy - b.economy);

        const mostCatches = Object.values(playerFieldMap).sort((a, b) => b.total - a.total);
        highestIndividualInnings.sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate);
        const mostSixes = [...orangeCap].filter(p => p.sixes > 0).sort((a, b) => b.sixes - a.sixes);
        const mostFours = [...orangeCap].filter(p => p.fours > 0).sort((a, b) => b.fours - a.fours);
        const bestStrikeRates = [...orangeCap].filter(p => p.balls >= 10).sort((a, b) => b.strikeRate - a.strikeRate);
        const bestEconomy = [...purpleCap].filter(b => b.oversBalls >= 12).sort((a, b) => a.economy - b.economy);
        bestBowlingInnings.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);
        teamTotals.sort((a, b) => b.runs - a.runs);

        return {
            orangeCap,
            purpleCap,
            mostCatches,
            highestScores: highestIndividualInnings,
            bestStrikeRates,
            mostSixes,
            mostFours,
            bestEconomy,
            bestFigures: bestBowlingInnings,
            teamTotals,
            totalTournamentRuns,
            totalTournamentWickets,
            totalTournamentSixes,
            totalTournamentFours,
            centuriesCount,
            fiftiesCount
        };
    }
};

// Export to window
if (typeof window !== 'undefined') {
    window.ScoreshCalculations = ScoreshCalculations;
}
