/**
 * Scoresh Pure Calculations & Scorecard Derivation Engine
 * Translates C program mathematical logic and guarantees 100% data consistency
 * by deriving Batsman scorecards, Bowler figures, Fall of Wickets, and Partnerships
 * directly from the underlying sequence of Ball Deliveries.
 * Resolves all player entities strictly by Player IDs from tournament player database.
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
     * DYNAMIC WINNING PROBABILITY ENGINE
     * Estimates dynamic win probabilities (0-100%, summing to 100%) for batting vs bowling teams.
     * Evaluates current score, wickets in hand, balls remaining, target, CRR, RRR, and recent momentum.
     */
    calculateWinningProbability(match, currentInnings = null) {
        if (!match) {
            return {
                battingTeamProb: 50,
                bowlingTeamProb: 50,
                teamAProb: 50,
                teamBProb: 50,
                teamAName: 'Team A',
                teamBName: 'Team B',
                teamAColor: '#16a34a',
                teamBColor: '#0f172a',
                runsRequired: null,
                ballsRemaining: null,
                requiredRunRate: null,
                currentRunRate: 0.0,
                equationText: 'Match ready'
            };
        }

        const inn = currentInnings || match.currentInnings;
        const totalOvers = match.totalOvers || 20;
        const totalBalls = totalOvers * 6;
        const isSecondInnings = match.currentInningIndex === 1 || inn.inningNumber === 2;

        const battingTeamName = inn.battingTeamName || match.teamAName;
        const bowlingTeamName = inn.bowlingTeamName || match.teamBName;

        // Completed match
        if (match.status === 'completed') {
            const isBatWon = match.winnerTeamId === inn.battingTeamId;
            const batProb = isBatWon ? 100 : (match.winnerTeamId ? 0 : 50);
            return {
                battingTeamId: inn.battingTeamId,
                bowlingTeamId: inn.bowlingTeamId,
                battingTeamName,
                bowlingTeamName,
                battingTeamProb: batProb,
                bowlingTeamProb: 100 - batProb,
                teamAProb: match.winnerTeamId === match.teamAId ? 100 : (match.winnerTeamId === match.teamBId ? 0 : 50),
                teamBProb: match.winnerTeamId === match.teamBId ? 100 : (match.winnerTeamId === match.teamAId ? 0 : 50),
                teamAName: match.teamAName,
                teamBName: match.teamBName,
                teamAColor: match.teamAColor || '#16a34a',
                teamBColor: match.teamBColor || '#0f172a',
                runsRequired: null,
                ballsRemaining: null,
                requiredRunRate: null,
                currentRunRate: inn.runRate,
                equationText: match.resultSummary || 'Match Completed'
            };
        }

        // Match upcoming / not started
        if (match.status === 'upcoming' || inn.legalBalls === 0) {
            return {
                battingTeamId: inn.battingTeamId,
                bowlingTeamId: inn.bowlingTeamId,
                battingTeamName,
                bowlingTeamName,
                battingTeamProb: 50,
                bowlingTeamProb: 50,
                teamAProb: 50,
                teamBProb: 50,
                teamAName: match.teamAName,
                teamBName: match.teamBName,
                teamAColor: match.teamAColor || '#16a34a',
                teamBColor: match.teamBColor || '#0f172a',
                runsRequired: isSecondInnings && inn.target ? Math.max(0, inn.target - inn.totalRuns) : null,
                ballsRemaining: isSecondInnings ? totalBalls : null,
                requiredRunRate: isSecondInnings && inn.target ? (inn.target / totalOvers) : null,
                currentRunRate: 0.0,
                equationText: isSecondInnings && inn.target ? `Target: ${inn.target} (${totalOvers} ov)` : 'Match ready to begin'
            };
        }

        let battingProb = 50;
        let equationText = '';
        const crr = inn.runRate;
        const wicketsLost = inn.totalWickets;
        const wicketsInHand = Math.max(0, 10 - wicketsLost);
        const ballsBowled = inn.legalBalls;
        const ballsRemaining = Math.max(0, totalBalls - ballsBowled);

        if (!isSecondInnings) {
            // --- 1ST INNINGS ESTIMATION MODEL ---
            const parRPO = 8.2;
            const parTotal = totalOvers * parRPO;
            const oversRemaining = ballsRemaining / 6;
            const wicketPowerFactor = Math.pow(wicketsInHand / 10, 0.45);
            const projectedRuns = inn.totalRuns + (oversRemaining * parRPO * wicketPowerFactor);

            const projectedDiff = projectedRuns - parTotal;
            battingProb = 50 + (projectedDiff * 0.65);

            // Recent momentum (last 6 balls)
            const recent6 = (inn.ballLog || []).slice(-6);
            const recentBoundaries = recent6.filter(d => d.runsOffBat >= 4).length;
            const recentWickets = recent6.filter(d => d.isWicket).length;
            battingProb += (recentBoundaries * 1.5) - (recentWickets * 4.0);

            battingProb = Math.min(88, Math.max(12, battingProb));
            equationText = `Projected Total: ~${Math.round(projectedRuns)} (CRR: ${this.formatStat(crr)})`;
        } else {
            // --- 2ND INNINGS CHASE ESTIMATION MODEL ---
            const target = inn.target || (match.firstInnings ? match.firstInnings.totalRuns + 1 : 150);
            const runsNeeded = Math.max(0, target - inn.totalRuns);
            const rrr = this.calculateRequiredRunRate(target, inn.totalRuns, totalOvers, inn.oversBowled) || 0;

            if (runsNeeded <= 0) {
                battingProb = 100;
                equationText = `${battingTeamName} won`;
            } else if (wicketsInHand <= 0 || (ballsRemaining <= 0 && runsNeeded > 0)) {
                battingProb = 0;
                equationText = `${bowlingTeamName} won`;
            } else {
                const runsPerBall = runsNeeded / (ballsRemaining > 0 ? ballsRemaining : 1);
                const wicketFactor = Math.pow(wicketsInHand / 10, 0.70);

                if (runsPerBall <= 0.8) {
                    battingProb = 75 + (0.8 - runsPerBall) * 20 + (wicketsInHand * 1.0);
                } else if (runsPerBall <= 1.2) {
                    battingProb = 55 + (1.2 - runsPerBall) * 50 * wicketFactor;
                } else if (runsPerBall <= 1.8) {
                    battingProb = 45 - (runsPerBall - 1.2) * 40 * (1.2 - wicketFactor);
                } else if (runsPerBall <= 2.5) {
                    battingProb = 25 - (runsPerBall - 1.8) * 25 * (1.2 - wicketFactor);
                } else {
                    battingProb = Math.max(1, (12 - (runsPerBall - 2.5) * 8) * wicketFactor);
                }

                if (rrr > 12 && wicketsInHand <= 3) {
                    battingProb = Math.max(2, battingProb * 0.4);
                } else if (rrr > 18) {
                    battingProb = Math.max(1, battingProb * 0.3);
                }

                const recent6 = (inn.ballLog || []).slice(-6);
                const recentBoundaries = recent6.filter(d => d.runsOffBat >= 4).length;
                const recentWickets = recent6.filter(d => d.isWicket).length;
                battingProb += (recentBoundaries * 2.0) - (recentWickets * 6.0);

                battingProb = Math.min(99, Math.max(1, battingProb));
                equationText = `Need ${runsNeeded} runs in ${ballsRemaining} balls (RRR: ${this.formatStat(rrr)})`;
            }
        }

        battingProb = Math.round(battingProb);
        const bowlingProb = 100 - battingProb;

        const isBatTeamA = inn.battingTeamId === match.teamAId;
        const teamAProb = isBatTeamA ? battingProb : bowlingProb;
        const teamBProb = isBatTeamA ? bowlingProb : battingProb;

        return {
            battingTeamId: inn.battingTeamId,
            bowlingTeamId: inn.bowlingTeamId,
            battingTeamName,
            bowlingTeamName,
            battingTeamProb: battingProb,
            bowlingTeamProb: bowlingProb,
            teamAProb,
            teamBProb,
            teamAName: match.teamAName,
            teamBName: match.teamBName,
            teamAColor: match.teamAColor || '#16a34a',
            teamBColor: match.teamBColor || '#0f172a',
            runsRequired: isSecondInnings && inn.target ? Math.max(0, inn.target - inn.totalRuns) : null,
            ballsRemaining: isSecondInnings ? Math.max(0, (totalOvers * 6) - inn.legalBalls) : null,
            requiredRunRate: isSecondInnings && inn.target ? this.calculateRequiredRunRate(inn.target, inn.totalRuns, totalOvers, inn.oversBowled) : null,
            currentRunRate: crr,
            equationText
        };
    },

    /**
     * DERIVE COMPLETE SCORECARD FROM UNDERLYING BALL DELIVERIES
     * Ensures absolute data integrity by deriving batsman scores, bowler figures,
     * fall of wickets, partnerships, extras, and match totals directly from ballLog.
     * Always resolves actual player names from Player ID database.
     */
    deriveScorecardFromDeliveries(innings, match = null) {
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

        // Initialize existing registered batsmen & bowlers, resolving real names
        (innings.batsmen || []).forEach(b => {
            const pId = b.playerId || String(b.id).replace(/^bat_/, '');
            const realPlr = typeof window !== 'undefined' && window.getPlayerById ? window.getPlayerById(pId) : null;
            const resolvedName = realPlr ? realPlr.name : (b.name || '');

            const key = pId;
            batMap[key] = {
                id: 'bat_' + pId,
                playerId: pId,
                name: resolvedName,
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
                wicketkeeperName: '',
                isOnStrike: (pId === innings.strikerId),
                isNonStriker: (pId === innings.nonStrikerId)
            };
        });

        (innings.bowlers || []).forEach(bw => {
            const pId = bw.playerId || String(bw.id).replace(/^bowl_/, '');
            const realPlr = typeof window !== 'undefined' && window.getPlayerById ? window.getPlayerById(pId) : null;
            const resolvedName = realPlr ? realPlr.name : (bw.name || '');

            const key = pId;
            bowlMap[key] = {
                id: 'bowl_' + pId,
                playerId: pId,
                name: resolvedName,
                runsgv: 0,
                legalBalls: 0,
                overs: 0.0,
                wkttkn: 0,
                maidens: 0,
                wides: 0,
                noBalls: 0,
                dots: 0,
                isCurrentBowler: (pId === innings.currentBowlerId),
                overRunsMap: {}
            };
        });

        // Replay every delivery in order
        ballLog.forEach((d) => {
            const strikerKey = d.strikerId ? String(d.strikerId).replace(/^bat_/, '') : null;
            const bowlerKey = d.bowlerId ? String(d.bowlerId).replace(/^bowl_/, '') : null;

            // Ensure striker is in batMap with real player name
            if (strikerKey && !batMap[strikerKey]) {
                const realPlr = typeof window !== 'undefined' && window.getPlayerById ? window.getPlayerById(strikerKey) : null;
                const sName = realPlr ? realPlr.name : (d.strikerName || '');

                batMap[strikerKey] = {
                    id: 'bat_' + strikerKey,
                    playerId: strikerKey,
                    name: sName,
                    ones: 0, twos: 0, threes: 0, fours: 0, sixes: 0, balls: 0,
                    isOut: false, dismissal: 'Not Out', dismissalType: 'Not Out',
                    bowlerName: '', fielderName: '', wicketkeeperName: '',
                    isOnStrike: (strikerKey === innings.strikerId),
                    isNonStriker: (strikerKey === innings.nonStrikerId)
                };
            }

            // Ensure bowler is in bowlMap with real player name
            if (bowlerKey && !bowlMap[bowlerKey]) {
                const realPlr = typeof window !== 'undefined' && window.getPlayerById ? window.getPlayerById(bowlerKey) : null;
                const bName = realPlr ? realPlr.name : (d.bowlerName || '');

                bowlMap[bowlerKey] = {
                    id: 'bowl_' + bowlerKey,
                    playerId: bowlerKey,
                    name: bName,
                    runsgv: 0, legalBalls: 0, overs: 0.0, wkttkn: 0, maidens: 0,
                    wides: 0, noBalls: 0, dots: 0,
                    isCurrentBowler: (bowlerKey === innings.currentBowlerId),
                    overRunsMap: {}
                };
            }

            const bat = strikerKey ? batMap[strikerKey] : null;
            const bowl = bowlerKey ? bowlMap[bowlerKey] : null;

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
                const bowlerRuns = d.runsOffBat + extraWide + extraNoball;
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

            // 4. Legal Deliveries
            if (d.isLegal) {
                legalBalls += 1;
            }

            // 5. Partnership
            currentPartnership.runs += totalDeliveryRuns;
            if (d.isLegal) currentPartnership.balls += 1;

            // 6. Dismissal / Wickets
            if (d.isWicket) {
                totalWickets += 1;

                const rawDismissedId = d.dismissedPlayerId || strikerKey;
                const dismissedKey = rawDismissedId ? String(rawDismissedId).replace(/^bat_/, '') : null;
                const dismissedBat = dismissedKey ? batMap[dismissedKey] : bat;

                let dismissalNotation = '';
                const type = d.dismissalType || 'Bowled';

                const bName = bowl ? bowl.name : (d.bowlerName || '');
                const fName = d.fielderName || '';
                const wkName = d.wicketkeeperName || d.fielderName || '';

                if (type === 'Bowled') dismissalNotation = `b ${bName}`;
                else if (type === 'Caught') dismissalNotation = `c ${fName} b ${bName}`;
                else if (type === 'Caught & Bowled') dismissalNotation = `c & b ${bName}`;
                else if (type === 'LBW') dismissalNotation = `lbw b ${bName}`;
                else if (type === 'Run Out') dismissalNotation = `run out (${fName})`;
                else if (type === 'Stumped') dismissalNotation = `st ${wkName} b ${bName}`;
                else if (type === 'Hit Wicket') dismissalNotation = `hit wicket b ${bName}`;
                else if (type === 'Retired Out') dismissalNotation = `retired out`;
                else dismissalNotation = `out (${type})`;

                if (dismissedBat) {
                    dismissedBat.isOut = true;
                    dismissedBat.dismissal = dismissalNotation;
                    dismissedBat.dismissalType = type;
                    dismissedBat.bowlerName = bName;
                    dismissedBat.fielderName = fName;
                    dismissedBat.wicketkeeperName = wkName;
                    dismissedBat.isOnStrike = false;
                    dismissedBat.isNonStriker = false;
                }

                // Bowler wicket credit: Run Out & Retired Out do NOT credit bowler
                if (bowl && type !== 'Run Out' && type !== 'Retired Out' && type !== 'Obstructing the Field') {
                    bowl.wkttkn += 1;
                }

                // Fall of Wickets
                fallOfWickets.push({
                    wicketNumber: totalWickets,
                    runs: totalRuns,
                    overs: this.ballsToOversDisplay(legalBalls),
                    batsmanName: dismissedBat ? dismissedBat.name : (d.dismissedPlayerName || d.strikerName)
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
            const fullOvers = Math.floor(b.legalBalls / 6);
            let maidens = 0;
            for (let ov = 0; ov < fullOvers; ov++) {
                if (b.overRunsMap[ov] === 0) maidens++;
            }
            b.maidens = maidens;
            b.isCurrentBowler = (b.playerId === innings.currentBowlerId);
        });

        // Set isOnStrike and isNonStriker strictly to match innings.strikerId and innings.nonStrikerId
        Object.values(batMap).forEach(b => {
            const isMatchStriker = (b.playerId === innings.strikerId || b.id === 'bat_' + innings.strikerId || b.id === innings.strikerId);
            const isMatchNonStriker = (b.playerId === innings.nonStrikerId || b.id === 'bat_' + innings.nonStrikerId || b.id === innings.nonStrikerId);
            b.isOnStrike = isMatchStriker && !b.isOut;
            b.isNonStriker = isMatchNonStriker && !b.isOut;
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

        // Update Winning Probability on match if match provided or active
        const activeMatch = match || (typeof window !== 'undefined' && window.scoreState ? window.scoreState.activeMatch : null);
        if (activeMatch) {
            const prob = this.calculateWinningProbability(activeMatch, innings);
            activeMatch.winProbability = prob;

            if (!Array.isArray(activeMatch.probabilityHistory)) {
                activeMatch.probabilityHistory = [];
            }

            const overStr = this.ballsToOversDisplay(legalBalls);
            const lastSnap = activeMatch.probabilityHistory[activeMatch.probabilityHistory.length - 1];

            if (!lastSnap || lastSnap.over !== overStr || lastSnap.inning !== innings.inningNumber) {
                activeMatch.probabilityHistory.push({
                    inning: innings.inningNumber,
                    over: overStr,
                    legalBalls,
                    score: `${totalRuns}/${totalWickets}`,
                    teamAProb: prob.teamAProb,
                    teamBProb: prob.teamBProb,
                    battingTeamProb: prob.battingTeamProb,
                    bowlingTeamProb: prob.bowlingTeamProb,
                    equationText: prob.equationText,
                    timestamp: Date.now()
                });
            }
        }
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
                noResult: 0,
                points: 0,
                runsScored: 0,
                oversFacedBalls: 0,
                runsConceded: 0,
                oversBowledBalls: 0,
                form: []
            };
        });

        const completedMatches = (tournament.matches || []).filter(m => m.status === 'completed');

        completedMatches.forEach(m => {
            const tA = tableMap[m.teamAId];
            const tB = tableMap[m.teamBId];
            if (!tA || !tB) return;

            tA.played += 1;
            tB.played += 1;

            const inn1 = m.firstInnings;
            const inn2 = m.secondInnings;

            if (inn1 && inn2) {
                const innA = inn1.battingTeamId === m.teamAId ? inn1 : inn2;
                const innB = inn1.battingTeamId === m.teamBId ? inn1 : inn2;

                if (innA) {
                    tA.runsScored += innA.totalRuns;
                    tA.oversFacedBalls += (innA.totalWickets >= 10 ? m.totalOvers * 6 : innA.legalBalls);
                }
                if (innB) {
                    tB.runsScored += innB.totalRuns;
                    tB.oversFacedBalls += (innB.totalWickets >= 10 ? m.totalOvers * 6 : innB.legalBalls);
                }

                if (innB) {
                    tA.runsConceded += innB.totalRuns;
                    tA.oversBowledBalls += (innB.totalWickets >= 10 ? m.totalOvers * 6 : innB.legalBalls);
                }
                if (innA) {
                    tB.runsConceded += innA.totalRuns;
                    tB.oversBowledBalls += (innA.totalWickets >= 10 ? m.totalOvers * 6 : innA.legalBalls);
                }
            }

            if (m.winnerTeamId === m.teamAId) {
                tA.won += 1;
                tA.points += 2;
                tA.form.push('W');
                tB.lost += 1;
                tB.form.push('L');
            } else if (m.winnerTeamId === m.teamBId) {
                tB.won += 1;
                tB.points += 2;
                tB.form.push('W');
                tA.lost += 1;
                tA.form.push('L');
            } else {
                tA.tied += 1;
                tA.points += 1;
                tA.form.push('T');
                tB.tied += 1;
                tB.points += 1;
                tB.form.push('T');
            }
        });

        const standings = Object.values(tableMap).map(row => {
            const forOvFrac = row.oversFacedBalls > 0 ? (row.oversFacedBalls / 6) : 0;
            const agOvFrac = row.oversBowledBalls > 0 ? (row.oversBowledBalls / 6) : 0;

            const forRR = forOvFrac > 0 ? (row.runsScored / forOvFrac) : 0;
            const agRR = agOvFrac > 0 ? (row.runsConceded / agOvFrac) : 0;
            const nrr = forRR - agRR;

            return {
                ...row,
                nrr: isNaN(nrr) ? 0.0 : nrr,
                form: row.form.slice(-5)
            };
        });

        standings.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.won !== a.won) return b.won - a.won;
            return b.nrr - a.nrr;
        });

        return standings;
    },

    /**
     * DYNAMIC TOURNAMENT RECORDS & LEADERBOARDS
     */
    computeTournamentStats(tournament) {
        if (!tournament) {
            return {
                orangeCap: [],
                purpleCap: [],
                highestScores: [],
                mostSixes: [],
                mostFours: [],
                bestEconomy: [],
                totalTournamentRuns: 0,
                totalTournamentWickets: 0,
                totalTournamentFours: 0,
                totalTournamentSixes: 0,
                centuriesCount: 0,
                fiftiesCount: 0
            };
        }

        const playerBatMap = {};
        const playerBowlMap = {};

        let totalTournRuns = 0;
        let totalTournWkts = 0;
        let totalTournFours = 0;
        let totalTournSixes = 0;
        let centuries = 0;
        let fifties = 0;

        (tournament.matches || []).forEach(match => {
            (match.innings || []).forEach(inn => {
                // Batting stats
                (inn.batsmen || []).forEach(b => {
                    const pId = b.playerId || String(b.id).replace(/^bat_/, '');
                    const realPlr = typeof window !== 'undefined' && window.getPlayerById ? window.getPlayerById(pId) : null;
                    const pName = realPlr ? realPlr.name : b.name;

                    if (!playerBatMap[pId]) {
                        playerBatMap[pId] = {
                            playerId: pId,
                            playerName: pName,
                            innings: 0,
                            runs: 0,
                            balls: 0,
                            fours: 0,
                            sixes: 0,
                            highestScore: 0,
                            dismissals: 0,
                            fifties: 0,
                            centuries: 0
                        };
                    }

                    const rec = playerBatMap[pId];
                    if (b.balls > 0 || b.runs > 0 || b.isOut) {
                        rec.innings += 1;
                        rec.runs += b.runs;
                        rec.balls += b.balls;
                        rec.fours += b.fours;
                        rec.sixes += b.sixes;

                        if (b.runs > rec.highestScore) rec.highestScore = b.runs;
                        if (b.isOut) rec.dismissals += 1;
                        if (b.runs >= 100) { rec.centuries += 1; centuries += 1; }
                        else if (b.runs >= 50) { rec.fifties += 1; fifties += 1; }

                        totalTournRuns += b.runs;
                        totalTournFours += b.fours;
                        totalTournSixes += b.sixes;
                    }
                });

                // Bowling stats
                (inn.bowlers || []).forEach(bw => {
                    const pId = bw.playerId || String(bw.id).replace(/^bowl_/, '');
                    const realPlr = typeof window !== 'undefined' && window.getPlayerById ? window.getPlayerById(pId) : null;
                    const pName = realPlr ? realPlr.name : bw.name;

                    if (!playerBowlMap[pId]) {
                        playerBowlMap[pId] = {
                            playerId: pId,
                            playerName: pName,
                            innings: 0,
                            legalBalls: 0,
                            runsgv: 0,
                            wkttkn: 0,
                            maidens: 0,
                            bestWkts: 0,
                            bestRuns: 999
                        };
                    }

                    const rec = playerBowlMap[pId];
                    if (bw.legalBalls > 0 || bw.runsgv > 0 || bw.wkttkn > 0) {
                        rec.innings += 1;
                        rec.legalBalls += bw.legalBalls;
                        rec.runsgv += bw.runsgv;
                        rec.wkttkn += bw.wkttkn;
                        rec.maidens += bw.maidens;

                        if (bw.wkttkn > rec.bestWkts || (bw.wkttkn === rec.bestWkts && bw.runsgv < rec.bestRuns)) {
                            rec.bestWkts = bw.wkttkn;
                            rec.bestRuns = bw.runsgv;
                        }

                        totalTournWkts += bw.wkttkn;
                    }
                });
            });
        });

        // Orange Cap list
        const orangeCap = Object.values(playerBatMap).map(p => ({
            ...p,
            strikeRate: p.balls > 0 ? (p.runs / p.balls) * 100 : 0.0,
            average: p.dismissals > 0 ? (p.runs / p.dismissals) : p.runs
        })).sort((a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate);

        // Purple Cap list
        const purpleCap = Object.values(playerBowlMap).map(p => {
            const ovFrac = p.legalBalls / 6;
            return {
                ...p,
                overs: (Math.floor(p.legalBalls / 6)) + '.' + (p.legalBalls % 6),
                economy: ovFrac > 0 ? (p.runsgv / ovFrac) : 0.0
            };
        }).sort((a, b) => b.wkttkn - a.wkttkn || a.economy - b.economy);

        const highestScores = [...orangeCap].sort((a, b) => b.highestScore - a.highestScore);
        const mostSixes = [...orangeCap].sort((a, b) => b.sixes - a.sixes);
        const mostFours = [...orangeCap].sort((a, b) => b.fours - a.fours);
        const bestEconomy = purpleCap.filter(p => p.legalBalls >= 6).sort((a, b) => a.economy - b.economy);

        return {
            orangeCap,
            purpleCap,
            highestScores,
            mostSixes,
            mostFours,
            bestEconomy,
            totalTournamentRuns: totalTournRuns,
            totalTournamentWickets: totalTournWkts,
            totalTournamentFours: totalTournFours,
            totalTournamentSixes: totalTournSixes,
            centuriesCount: centuries,
            fiftiesCount: fifties
        };
    }
};

// Global Calculations instance
window.ScoreshCalculations = ScoreshCalculations;
