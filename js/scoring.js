/**
 * Scoresh Live Scoring Engine
 * Event-driven cricket state machine with strict delivery logging, automatic commentary generation,
 * automatic strike rotation, consecutive bowler checks, and accurate wicket attributions.
 * Scorecards are derived from ball deliveries to guarantee 100% data consistency.
 */

class ScoringEngine {
    constructor() {
        // Scoring Engine
    }

    /**
     * Start Match with Toss, Playing XI, and Openers
     */
    startMatch(match, { tossWinnerId, tossDecision, strikerPlayerId, nonStrikerPlayerId, openingBowlerPlayerId }) {
        if (!window.authService.canManageTournament(match.tournamentId)) {
            window.ScoreshModals.showToast('Unauthorized: Only Hosts can start matches', 'error');
            return;
        }

        match.status = 'live';
        match.tossWinnerId = tossWinnerId;
        match.tossDecision = tossDecision;

        const tournament = window.scoreState.getTournament(match.tournamentId);

        // Determine 1st Innings batting & bowling teams
        let batTeamId, bowlTeamId, batTeamName, bowlTeamName;
        if (tossDecision === 'Bat') {
            batTeamId = tossWinnerId;
            bowlTeamId = (tossWinnerId === match.teamAId) ? match.teamBId : match.teamAId;
        } else {
            bowlTeamId = tossWinnerId;
            batTeamId = (tossWinnerId === match.teamAId) ? match.teamBId : match.teamAId;
        }

        batTeamName = (batTeamId === match.teamAId) ? match.teamAName : match.teamBName;
        bowlTeamName = (bowlTeamId === match.teamAId) ? match.teamAName : match.teamBName;

        const inn1 = match.innings[0];
        inn1.battingTeamId = batTeamId;
        inn1.bowlingTeamId = bowlTeamId;
        inn1.battingTeamName = batTeamName;
        inn1.bowlingTeamName = bowlTeamName;
        inn1.ballLog = [];

        const inn2 = match.innings[1];
        inn2.battingTeamId = bowlTeamId;
        inn2.bowlingTeamId = batTeamId;
        inn2.battingTeamName = bowlTeamName;
        inn2.bowlingTeamName = batTeamName;
        inn2.ballLog = [];

        // Openers setup
        const strikerPlr = tournament ? tournament.getPlayer(strikerPlayerId) : null;
        const nonStrikerPlr = tournament ? tournament.getPlayer(nonStrikerPlayerId) : null;
        const openingBowlerPlr = tournament ? tournament.getPlayer(openingBowlerPlayerId) : null;

        inn1.batsmen = [
            new Batsman({
                id: 'bat_' + strikerPlayerId,
                playerId: strikerPlayerId,
                name: strikerPlr ? strikerPlr.name : 'Striker',
                isOnStrike: true,
                isNonStriker: false
            }),
            new Batsman({
                id: 'bat_' + nonStrikerPlayerId,
                playerId: nonStrikerPlayerId,
                name: nonStrikerPlr ? nonStrikerPlr.name : 'Non-Striker',
                isOnStrike: false,
                isNonStriker: true
            })
        ];

        inn1.bowlers = [
            new Bowler({
                id: 'bowl_' + openingBowlerPlayerId,
                playerId: openingBowlerPlayerId,
                name: openingBowlerPlr ? openingBowlerPlr.name : 'Opening Bowler',
                isCurrentBowler: true
            })
        ];

        match.currentInningIndex = 0;
        match.lastBowlerId = null;

        window.ScoreshCalculations.deriveScorecardFromDeliveries(inn1);
        window.scoreState.saveCurrentTournament();
        window.scoreState.notify();
    }

    /**
     * Record a ball delivery event
     */
    recordBall(match, actionType, extraRuns = 0, commentaryOverride = '') {
        if (!window.authService.canManageTournament(match.tournamentId)) {
            window.ScoreshModals.showToast('Unauthorized: Only Hosts can score live balls', 'error');
            return;
        }

        if (!match || match.status !== 'live') return;
        const inn = match.currentInnings;
        if (!inn || inn.isCompleted) return;

        let striker = inn.batsmen.find(b => b.isOnStrike && !b.isOut);
        let nonStriker = inn.batsmen.find(b => b.isNonStriker && !b.isOut);
        let bowler = inn.bowlers.find(b => b.isCurrentBowler);

        if (!striker || !nonStriker || !bowler) {
            window.ScoreshModals.showToast('Please ensure Striker, Non-striker, and Current Bowler are active', 'warning');
            return;
        }

        const overIndex = Math.floor(inn.legalBalls / 6);
        const ballInOver = (inn.legalBalls % 6) + 1;

        let runsOffBat = 0;
        let extras = { wide: 0, noball: 0, bye: 0, legbye: 0 };
        let isLegal = true;
        let autoCommentary = '';

        const overDisplay = `${overIndex}.${ballInOver}`;
        const bName = bowler.name;
        const sName = striker.name;

        switch (actionType) {
            case '0': // Dot ball
                runsOffBat = 0;
                autoCommentary = `${overDisplay} — ${bName} to ${sName} — dot ball`;
                break;
            case '1':
                runsOffBat = 1;
                autoCommentary = `${overDisplay} — ${bName} to ${sName} — 1 run`;
                break;
            case '2':
                runsOffBat = 2;
                autoCommentary = `${overDisplay} — ${bName} to ${sName} — 2 runs`;
                break;
            case '3':
                runsOffBat = 3;
                autoCommentary = `${overDisplay} — ${bName} to ${sName} — 3 runs`;
                break;
            case '4':
                runsOffBat = 4;
                autoCommentary = `${overDisplay} — ${bName} to ${sName} — FOUR`;
                break;
            case '6':
                runsOffBat = 6;
                autoCommentary = `${overDisplay} — ${bName} to ${sName} — SIX`;
                break;
            case 'WD': // Wide
                isLegal = false;
                extras.wide = 1 + extraRuns;
                autoCommentary = `${overIndex}.${(inn.legalBalls % 6)} — ${bName} to ${sName} — Wide (+${1 + extraRuns} run)`;
                break;
            case 'NB': // No ball
                isLegal = false;
                extras.noball = 1;
                runsOffBat = extraRuns;
                autoCommentary = `${overIndex}.${(inn.legalBalls % 6)} — ${bName} to ${sName} — NO BALL (+1 run, Free Hit)`;
                break;
            case 'B': // Bye
                extras.bye = Math.max(1, extraRuns || 1);
                autoCommentary = `${overDisplay} — ${bName} to ${sName} — Bye (+${extras.bye})`;
                break;
            case 'LB': // Leg Bye
                extras.legbye = Math.max(1, extraRuns || 1);
                autoCommentary = `${overDisplay} — ${bName} to ${sName} — Leg Bye (+${extras.legbye})`;
                break;
        }

        if (commentaryOverride) {
            autoCommentary += ` (${commentaryOverride})`;
        }

        const delivery = new Delivery({
            overIndex,
            ballInOver,
            strikerId: striker.id,
            strikerName: striker.name,
            nonStrikerId: nonStriker.id,
            nonStrikerName: nonStriker.name,
            bowlerId: bowler.id,
            bowlerName: bowler.name,
            runsOffBat,
            extras,
            isLegal,
            isWicket: false,
            autoCommentary
        });

        inn.ballLog.push(delivery);

        // Derive scorecard from all deliveries
        window.ScoreshCalculations.deriveScorecardFromDeliveries(inn);

        // Strike rotation on odd runs
        if (runsOffBat === 1 || runsOffBat === 3 || (extras.bye % 2 !== 0 && extras.bye > 0) || (extras.legbye % 2 !== 0 && extras.legbye > 0)) {
            this.rotateStrike(inn);
        }

        // End of Over Completion Check (6 legal balls)
        if (isLegal && (inn.legalBalls % 6 === 0)) {
            this.rotateStrike(inn); // strike rotates at end of over
            match.lastBowlerId = bowler.id;
            bowler.isCurrentBowler = false;
            window.ScoreshModals.showToast(`Over ${inn.legalBalls / 6} complete! Strike rotated. Please change bowler.`, 'info');
        }

        this.checkMatchConditions(match);
        window.scoreState.saveCurrentTournament();
        window.scoreState.notify();
    }

    /**
     * Record a Wicket Dismissal with accurate bowler/fielder attribution
     */
    recordWicket(match, { dismissalType = 'Bowled', nextBatsmanPlayerId = null, fielderId = null, fielderName = '', commentaryText = '' }) {
        if (!window.authService.canManageTournament(match.tournamentId)) {
            window.ScoreshModals.showToast('Unauthorized: Only Hosts can record wickets', 'error');
            return;
        }

        if (!match || match.status !== 'live') return;
        const inn = match.currentInnings;
        if (!inn || inn.isCompleted) return;

        const striker = inn.batsmen.find(b => b.isOnStrike && !b.isOut);
        const nonStriker = inn.batsmen.find(b => b.isNonStriker && !b.isOut);
        const bowler = inn.bowlers.find(b => b.isCurrentBowler);

        if (!striker || !bowler) return;

        const overIndex = Math.floor(inn.legalBalls / 6);
        const ballInOver = (inn.legalBalls % 6) + 1;
        const overDisplay = `${overIndex}.${ballInOver}`;

        let dismissalNotation = '';
        if (dismissalType === 'Bowled') dismissalNotation = `b ${bowler.name}`;
        else if (dismissalType === 'Caught') dismissalNotation = `c ${fielderName || 'Fielder'} b ${bowler.name}`;
        else if (dismissalType === 'LBW') dismissalNotation = `lbw b ${bowler.name}`;
        else if (dismissalType === 'Run Out') dismissalNotation = `run out (${fielderName || 'Fielder'})`;
        else if (dismissalType === 'Stumped') dismissalNotation = `st ${fielderName || 'WK'} b ${bowler.name}`;
        else if (dismissalType === 'Hit Wicket') dismissalNotation = `hit wicket b ${bowler.name}`;
        else if (dismissalType === 'Retired Out') dismissalNotation = `retired out`;
        else dismissalNotation = `out (${dismissalType})`;

        const autoCommentary = `${overDisplay} — ${bowler.name} to ${striker.name} — WICKET! ${striker.name} ${dismissalNotation}` + (commentaryText ? ` (${commentaryText})` : '');

        const delivery = new Delivery({
            overIndex,
            ballInOver,
            strikerId: striker.id,
            strikerName: striker.name,
            nonStrikerId: nonStriker ? nonStriker.id : null,
            nonStrikerName: nonStriker ? nonStriker.name : '',
            bowlerId: bowler.id,
            bowlerName: bowler.name,
            runsOffBat: 0,
            extras: { wide: 0, noball: 0, bye: 0, legbye: 0 },
            isLegal: true,
            isWicket: true,
            wicketType: dismissalType,
            fielderId,
            fielderName,
            dismissalDesc: dismissalNotation,
            autoCommentary
        });

        inn.ballLog.push(delivery);

        // Derive scorecard
        window.ScoreshCalculations.deriveScorecardFromDeliveries(inn);

        // Add Incoming Batsman if not all out
        if (inn.totalWickets < 10 && nextBatsmanPlayerId) {
            const tournament = window.scoreState.getTournament(match.tournamentId);
            const nextPlr = tournament ? tournament.getPlayer(nextBatsmanPlayerId) : null;

            const newBatsman = new Batsman({
                id: 'bat_' + nextBatsmanPlayerId,
                playerId: nextBatsmanPlayerId,
                name: nextPlr ? nextPlr.name : 'Incoming Batter',
                isOnStrike: true,
                isNonStriker: false
            });
            inn.batsmen.push(newBatsman);
        }

        // End of over check
        if (inn.legalBalls % 6 === 0) {
            this.rotateStrike(inn);
            match.lastBowlerId = bowler.id;
            bowler.isCurrentBowler = false;
        }

        this.checkMatchConditions(match);
        window.scoreState.saveCurrentTournament();
        window.scoreState.notify();
    }

    /**
     * Swaps on-strike and non-striker positions
     */
    rotateStrike(inn) {
        const striker = inn.batsmen.find(b => b.isOnStrike && !b.isOut);
        const nonStriker = inn.batsmen.find(b => b.isNonStriker && !b.isOut);

        if (striker && nonStriker) {
            striker.isOnStrike = false;
            striker.isNonStriker = true;
            nonStriker.isOnStrike = true;
            nonStriker.isNonStriker = false;
        }
    }

    /**
     * Change bowler with consecutive over restriction check
     */
    changeBowler(match, bowlerPlayerId, bowlerName = '') {
        if (!window.authService.canManageTournament(match.tournamentId)) {
            window.ScoreshModals.showToast('Unauthorized: Only Hosts can change bowlers', 'error');
            return;
        }

        const inn = match.currentInnings;
        if (!inn) return;

        // Prohibit same bowler bowling consecutive overs
        if (match.lastBowlerId && ('bowl_' + bowlerPlayerId === match.lastBowlerId || bowlerPlayerId === match.lastBowlerId)) {
            window.ScoreshModals.showToast('Rule Violation: Bowler cannot bowl consecutive overs', 'error');
            return;
        }

        inn.bowlers.forEach(b => b.isCurrentBowler = false);

        let bowler = inn.bowlers.find(b => b.playerId === bowlerPlayerId || b.id === 'bowl_' + bowlerPlayerId);
        if (bowler) {
            bowler.isCurrentBowler = true;
        } else {
            bowler = new Bowler({
                id: 'bowl_' + bowlerPlayerId,
                playerId: bowlerPlayerId,
                name: bowlerName || 'Bowler',
                isCurrentBowler: true
            });
            inn.bowlers.push(bowler);
        }

        window.scoreState.saveCurrentTournament();
        window.scoreState.notify();
    }

    /**
     * Check 1st Innings and 2nd Innings match completion conditions
     */
    checkMatchConditions(match) {
        const inn = match.currentInnings;
        const maxBalls = match.totalOvers * 6;
        const isAllOut = inn.totalWickets >= 10;
        const isOversFinished = inn.legalBalls >= maxBalls;

        if (match.currentInningIndex === 0) {
            // 1st Innings
            if (isAllOut || isOversFinished) {
                inn.isCompleted = true;
                const target = inn.totalRuns + 1;
                match.secondInnings.target = target;
                window.ScoreshModals.showToast(`1st Innings Complete! Target: ${target} runs`, 'success');
            }
        } else {
            // 2nd Innings (Chase)
            const target = inn.target || (match.firstInnings.totalRuns + 1);

            if (inn.totalRuns >= target) {
                inn.isCompleted = true;
                match.status = 'completed';
                match.winnerTeamId = inn.battingTeamId;
                const wktsRemaining = 10 - inn.totalWickets;
                match.resultSummary = `${inn.battingTeamName} won by ${wktsRemaining} wicket${wktsRemaining === 1 ? '' : 's'}`;
                this.generateMatchSummary(match);
                window.ScoreshModals.showToast(`Match Completed! ${match.resultSummary}`, 'success');
            } else if (isAllOut || isOversFinished) {
                inn.isCompleted = true;
                match.status = 'completed';

                if (inn.totalRuns === target - 1) {
                    match.winnerTeamId = null;
                    match.resultSummary = `Match Tied (${match.firstInnings.totalRuns} runs each)`;
                } else {
                    match.winnerTeamId = inn.bowlingTeamId;
                    const runsDiff = (target - 1) - inn.totalRuns;
                    match.resultSummary = `${inn.bowlingTeamName} won by ${runsDiff} run${runsDiff === 1 ? '' : 's'}`;
                }
                this.generateMatchSummary(match);
                window.ScoreshModals.showToast(`Match Completed! ${match.resultSummary}`, 'success');
            }
        }
    }

    /**
     * Start 2nd Innings (Chase)
     */
    startSecondInnings(match, { strikerPlayerId, nonStrikerPlayerId, openingBowlerPlayerId }) {
        if (!window.authService.canManageTournament(match.tournamentId)) return;

        match.currentInningIndex = 1;
        const inn2 = match.secondInnings;
        const tournament = window.scoreState.getTournament(match.tournamentId);

        const strikerPlr = tournament ? tournament.getPlayer(strikerPlayerId) : null;
        const nonStrikerPlr = tournament ? tournament.getPlayer(nonStrikerPlayerId) : null;
        const openingBowlerPlr = tournament ? tournament.getPlayer(openingBowlerPlayerId) : null;

        inn2.batsmen = [
            new Batsman({
                id: 'bat_' + strikerPlayerId,
                playerId: strikerPlayerId,
                name: strikerPlr ? strikerPlr.name : 'Striker',
                isOnStrike: true,
                isNonStriker: false
            }),
            new Batsman({
                id: 'bat_' + nonStrikerPlayerId,
                playerId: nonStrikerPlayerId,
                name: nonStrikerPlr ? nonStrikerPlr.name : 'Non-Striker',
                isOnStrike: false,
                isNonStriker: true
            })
        ];

        inn2.bowlers = [
            new Bowler({
                id: 'bowl_' + openingBowlerPlayerId,
                playerId: openingBowlerPlayerId,
                name: openingBowlerPlr ? openingBowlerPlr.name : 'Opening Bowler',
                isCurrentBowler: true
            })
        ];

        inn2.ballLog = [];
        match.lastBowlerId = null;

        window.ScoreshCalculations.deriveScorecardFromDeliveries(inn2);
        window.scoreState.saveCurrentTournament();
        window.scoreState.notify();
        window.ScoreshModals.showToast('2nd Innings Chase started!', 'success');
    }

    /**
     * Automatically generate Match Summary & Player of the Match
     */
    generateMatchSummary(match) {
        const inn1 = match.firstInnings;
        const inn2 = match.secondInnings;
        const allBatsmen = [...(inn1.batsmen || []), ...(inn2.batsmen || [])];
        const allBowlers = [...(inn1.bowlers || []), ...(inn2.bowlers || [])];

        const topScorer = allBatsmen.reduce((max, b) => (!max || b.runs > max.runs ? b : max), null);
        const bestBowler = allBowlers.reduce((best, bw) => (!best || bw.wkttkn > best.wkttkn || (bw.wkttkn === best.wkttkn && bw.runsgv < best.runsgv) ? bw : best), null);

        // Pick Player of the Match (top performer from winning team or overall top)
        if (topScorer && (!bestBowler || topScorer.runs >= 40)) {
            match.playerOfTheMatch = topScorer.name;
        } else if (bestBowler) {
            match.playerOfTheMatch = bestBowler.name;
        }
    }
}

// Global scoring engine instance
window.scoreEngine = new ScoringEngine();
