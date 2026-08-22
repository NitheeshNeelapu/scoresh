/**
 * Scoresh Live Scoring Engine & Dynamic Commentary Generator
 * Authoritative Player-ID-driven cricket state machine with real-time delivery logging,
 * rich randomized commentary with repetition prevention, accurate single-run and end-of-over strike rotation,
 * consecutive bowler enforcement, bowling quota limits, and delivery-derived scorecards.
 * Uses real player names throughout without generic placeholders.
 */

// Organized Commentary Text Arrays
const COMMENTARY_ARRAYS = {
    DOT_BALL: [
        "Swing and a miss! Beaten all ends up.",
        "A solid delivery, straight to the fielder. No run.",
        "Defended watchfully. Dot ball.",
        "Beaten outside off! The bowler wins that battle.",
        "Nothing doing. Another dot ball.",
        "Good length, good line, and no run.",
        "Tucked away, but straight to the fielder.",
        "Lovely delivery! The batter can only watch it go by."
    ],
    ONE_RUN: [
        "Just a gentle touch, and they'll pick up a single.",
        "Worked into the gap for a quick single.",
        "Nudged away and they're off for one.",
        "Easy single taken.",
        "Good placement, and they'll get one."
    ],
    TWO_RUNS: [
        "Good running between the wickets. They'll come back for two.",
        "Driven into the gap, and they race back for two.",
        "Two runs comfortably taken.",
        "They push hard and come back for a couple."
    ],
    THREE_RUNS: [
        "Excellent running! They come back for three.",
        "Beautifully placed into the gap. Three runs.",
        "They keep running and complete three.",
        "Great awareness between the wickets. Three taken."
    ],
    FOUR_RUNS: [
        "That's beautifully timed! Finds the boundary.",
        "Cracking shot! That races away for four.",
        "Lovely stroke through the gap. Four runs!",
        "Edged away and it flies to the boundary!",
        "Pulled away in style! That's four.",
        "Driven sweetly through the covers. Four!",
        "Short and punished! That disappears to the boundary."
    ],
    SIX_RUNS: [
        "That's gone miles! What a hit!",
        "Into the stands! Massive six!",
        "That's enormous! The batter has launched it.",
        "Clean strike! That's six!",
        "What a shot! Straight into the crowd.",
        "High, handsome, and over the ropes!",
        "That's been absolutely hammered! Six runs."
    ],
    WICKET: [
        "Got him! The batter has to walk back.",
        "Gone! The bowler strikes.",
        "That's out! A huge breakthrough.",
        "Clean bowled! What a delivery.",
        "Caught! The fielding side celebrates.",
        "The stumps are shattered! What a ball.",
        "That's the breakthrough they were looking for!",
        "Wicket! The partnership is finally broken."
    ],
    WIDE: [
        "Too wide! The keeper has to move across.",
        "That's well outside off. Wide called.",
        "Wayward delivery, and that's an extra.",
        "Too far down the leg side. Wide."
    ],
    NO_BALL: [
        "That's a no-ball! Free hit coming up.",
        "Overstepped! No-ball called.",
        "That's an illegal delivery, and the batting side gets an extra.",
        "No-ball! The bowler has overstepped the mark."
    ],
    LEG_BYE: [
        "Off the pads, and they'll come back for a leg-bye.",
        "Deflects off the pads. They'll take one leg-bye.",
        "No bat involved, but they get a leg-bye."
    ],
    BYE: [
        "It beats everyone! They'll run a bye.",
        "Past the keeper, and they pick up a bye.",
        "No contact from the batter, but they'll get an extra."
    ]
};

class ScoringEngine {
    constructor() {
        this.lastCommentary = {}; // Category -> last phrase string
    }

    /**
     * Get randomized commentary phrase avoiding immediate repetition
     */
    getRandomCommentary(category) {
        const pool = COMMENTARY_ARRAYS[category] || COMMENTARY_ARRAYS.DOT_BALL;
        const last = this.lastCommentary[category];
        const candidates = pool.length > 1 ? pool.filter(phrase => phrase !== last) : pool;
        const chosen = candidates[Math.floor(Math.random() * candidates.length)] || pool[0];
        this.lastCommentary[category] = chosen;
        return chosen;
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

        const cleanStrikerId = String(strikerPlayerId).replace(/^bat_/, '');
        const cleanNonStrikerId = String(nonStrikerPlayerId).replace(/^bat_/, '');
        const cleanBowlerId = String(openingBowlerPlayerId).replace(/^bowl_/, '');

        const inn1 = match.innings[0];
        inn1.battingTeamId = batTeamId;
        inn1.bowlingTeamId = bowlTeamId;
        inn1.battingTeamName = batTeamName;
        inn1.bowlingTeamName = bowlTeamName;
        inn1.strikerId = cleanStrikerId;
        inn1.nonStrikerId = cleanNonStrikerId;
        inn1.currentBowlerId = cleanBowlerId;
        inn1.ballLog = [];

        const inn2 = match.innings[1];
        inn2.battingTeamId = bowlTeamId;
        inn2.bowlingTeamId = batTeamId;
        inn2.battingTeamName = bowlTeamName;
        inn2.bowlingTeamName = batTeamName;
        inn2.strikerId = null;
        inn2.nonStrikerId = null;
        inn2.currentBowlerId = null;
        inn2.ballLog = [];

        // Openers setup with actual Player records from database
        const strikerPlr = tournament ? tournament.getPlayer(cleanStrikerId) : (window.getPlayerById ? window.getPlayerById(cleanStrikerId) : null);
        const nonStrikerPlr = tournament ? tournament.getPlayer(cleanNonStrikerId) : (window.getPlayerById ? window.getPlayerById(cleanNonStrikerId) : null);
        const openingBowlerPlr = tournament ? tournament.getPlayer(cleanBowlerId) : (window.getPlayerById ? window.getPlayerById(cleanBowlerId) : null);

        const strikerName = strikerPlr ? strikerPlr.name : 'Select player';
        const nonStrikerName = nonStrikerPlr ? nonStrikerPlr.name : 'Select player';
        const openingBowlerName = openingBowlerPlr ? openingBowlerPlr.name : 'Select player';

        inn1.batsmen = [
            new Batsman({
                id: 'bat_' + cleanStrikerId,
                playerId: cleanStrikerId,
                name: strikerName,
                isOnStrike: true,
                isNonStriker: false
            }),
            new Batsman({
                id: 'bat_' + cleanNonStrikerId,
                playerId: cleanNonStrikerId,
                name: nonStrikerName,
                isOnStrike: false,
                isNonStriker: true
            })
        ];

        inn1.bowlers = [
            new Bowler({
                id: 'bowl_' + cleanBowlerId,
                playerId: cleanBowlerId,
                name: openingBowlerName,
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

        const tournament = window.scoreState.getTournament(match.tournamentId);

        // Find active striker, nonStriker, and bowler from authoritative IDs
        let striker = inn.batsmen.find(b => (b.playerId === inn.strikerId || b.id === inn.strikerId || b.id === 'bat_' + inn.strikerId) && !b.isOut);
        let nonStriker = inn.batsmen.find(b => (b.playerId === inn.nonStrikerId || b.id === inn.nonStrikerId || b.id === 'bat_' + inn.nonStrikerId) && !b.isOut);
        let bowler = inn.bowlers.find(b => b.playerId === inn.currentBowlerId || b.id === inn.currentBowlerId || b.id === 'bowl_' + inn.currentBowlerId);

        if (!striker) striker = inn.batsmen.find(b => b.isOnStrike && !b.isOut);
        if (!nonStriker) nonStriker = inn.batsmen.find(b => b.isNonStriker && !b.isOut);
        if (!bowler) bowler = inn.bowlers.find(b => b.isCurrentBowler);

        if (!striker || !nonStriker || !bowler) {
            window.ScoreshModals.showToast('Please ensure active Striker, Non-striker, and Bowler are on crease', 'warning');
            return;
        }

        // Resolve real names from database
        const strikerPlr = tournament ? tournament.getPlayer(inn.strikerId) : (window.getPlayerById ? window.getPlayerById(inn.strikerId) : null);
        const nonStrikerPlr = tournament ? tournament.getPlayer(inn.nonStrikerId) : (window.getPlayerById ? window.getPlayerById(inn.nonStrikerId) : null);
        const bowlerPlr = tournament ? tournament.getPlayer(inn.currentBowlerId) : (window.getPlayerById ? window.getPlayerById(inn.currentBowlerId) : null);

        const sName = strikerPlr ? strikerPlr.name : striker.name;
        const nsName = nonStrikerPlr ? nonStrikerPlr.name : nonStriker.name;
        const bName = bowlerPlr ? bowlerPlr.name : bowler.name;

        // Keep authoritative IDs synced
        inn.strikerId = strikerPlr ? strikerPlr.id : (striker.playerId || striker.id);
        inn.nonStrikerId = nonStrikerPlr ? nonStrikerPlr.id : (nonStriker.playerId || nonStriker.id);
        inn.currentBowlerId = bowlerPlr ? bowlerPlr.id : (bowler.playerId || bowler.id);

        const overIndex = Math.floor(inn.legalBalls / 6);
        const ballInOver = (inn.legalBalls % 6) + 1;

        let runsOffBat = 0;
        let extras = { wide: 0, noball: 0, bye: 0, legbye: 0 };
        let isLegal = true;
        let autoCommentary = '';

        const overDisplay = `${overIndex}.${ballInOver}`;

        switch (actionType) {
            case '0': // Dot ball
                runsOffBat = 0;
                autoCommentary = `${overDisplay} ${bName} to ${sName} — ${this.getRandomCommentary('DOT_BALL')}`;
                break;
            case '1':
                runsOffBat = 1;
                autoCommentary = `${overDisplay} ${bName} to ${sName} — 1 run. ${this.getRandomCommentary('ONE_RUN')}`;
                break;
            case '2':
                runsOffBat = 2;
                autoCommentary = `${overDisplay} ${bName} to ${sName} — 2 runs. ${this.getRandomCommentary('TWO_RUNS')}`;
                break;
            case '3':
                runsOffBat = 3;
                autoCommentary = `${overDisplay} ${bName} to ${sName} — 3 runs. ${this.getRandomCommentary('THREE_RUNS')}`;
                break;
            case '4':
                runsOffBat = 4;
                autoCommentary = `${overDisplay} ${bName} to ${sName} — FOUR! ${this.getRandomCommentary('FOUR_RUNS')}`;
                break;
            case '6':
                runsOffBat = 6;
                autoCommentary = `${overDisplay} ${bName} to ${sName} — SIX! ${this.getRandomCommentary('SIX_RUNS')}`;
                break;
            case 'WD': // Wide
                isLegal = false;
                extras.wide = 1 + extraRuns;
                autoCommentary = `${overIndex}.${(inn.legalBalls % 6)} ${bName} to ${sName} — Wide (+${1 + extraRuns} run). ${this.getRandomCommentary('WIDE')}`;
                break;
            case 'NB': // No ball
                isLegal = false;
                extras.noball = 1;
                runsOffBat = extraRuns;
                autoCommentary = `${overIndex}.${(inn.legalBalls % 6)} ${bName} to ${sName} — NO BALL! ${this.getRandomCommentary('NO_BALL')}`;
                break;
            case 'B': // Bye
                extras.bye = Math.max(1, extraRuns || 1);
                autoCommentary = `${overDisplay} ${bName} to ${sName} — Bye (+${extras.bye}). ${this.getRandomCommentary('BYE')}`;
                break;
            case 'LB': // Leg Bye
                extras.legbye = Math.max(1, extraRuns || 1);
                autoCommentary = `${overDisplay} ${bName} to ${sName} — Leg Bye (+${extras.legbye}). ${this.getRandomCommentary('LEG_BYE')}`;
                break;
        }

        if (commentaryOverride) {
            autoCommentary += ` (${commentaryOverride})`;
        }

        const delivery = new Delivery({
            matchId: match.id,
            inningsId: inn.id,
            overIndex,
            ballInOver,
            strikerId: inn.strikerId,
            strikerName: sName,
            nonStrikerId: inn.nonStrikerId,
            nonStrikerName: nsName,
            bowlerId: inn.currentBowlerId,
            bowlerName: bName,
            runsOffBat,
            extras,
            isLegal,
            isWicket: false,
            autoCommentary
        });

        inn.ballLog.push(delivery);

        // 1. Strike rotation on odd runs (1, 3, or odd byes/leg-byes)
        const isOddRuns = (runsOffBat === 1 || runsOffBat === 3 || (extras.bye % 2 !== 0 && extras.bye > 0) || (extras.legbye % 2 !== 0 && extras.legbye > 0));
        if (isOddRuns) {
            this.rotateStrike(inn);
        }

        // 2. End of Over Completion Check (6 legal balls in current over)
        let isOverComplete = false;
        const totalLegalNow = inn.legalBalls + (isLegal ? 1 : 0);
        if (isLegal && (totalLegalNow % 6 === 0)) {
            isOverComplete = true;
            this.rotateStrike(inn); // strike rotates at end of over
            match.lastBowlerId = inn.currentBowlerId;
        }

        // Derive scorecard from all deliveries
        window.ScoreshCalculations.deriveScorecardFromDeliveries(inn);

        this.checkMatchConditions(match);
        window.scoreState.saveCurrentTournament();
        window.scoreState.notify();

        // Prompt next bowler selection if over complete and match still live
        if (isOverComplete && match.status === 'live' && !inn.isCompleted) {
            const completedOverNum = totalLegalNow / 6;
            window.ScoreshModals.openNextBowlerModal(match, completedOverNum, bName);
        }
    }

    /**
     * Record a Wicket Dismissal with accurate bowler/fielder attribution and real player names
     */
    recordWicket(match, {
        dismissedPlayerId = null,
        dismissalType = 'Bowled',
        fielderId = null,
        fielderName = '',
        wicketkeeperId = null,
        wicketkeeperName = '',
        incomingPlayerId = null,
        commentaryText = ''
    }) {
        if (!window.authService.canManageTournament(match.tournamentId)) {
            window.ScoreshModals.showToast('Unauthorized: Only Hosts can record wickets', 'error');
            return;
        }

        if (!match || match.status !== 'live') return;
        const inn = match.currentInnings;
        if (!inn || inn.isCompleted) return;

        const tournament = window.scoreState.getTournament(match.tournamentId);

        let striker = inn.batsmen.find(b => (b.playerId === inn.strikerId || b.id === inn.strikerId || b.id === 'bat_' + inn.strikerId) && !b.isOut);
        let nonStriker = inn.batsmen.find(b => (b.playerId === inn.nonStrikerId || b.id === inn.nonStrikerId || b.id === 'bat_' + inn.nonStrikerId) && !b.isOut);
        let bowler = inn.bowlers.find(b => b.playerId === inn.currentBowlerId || b.id === inn.currentBowlerId || b.id === 'bowl_' + inn.currentBowlerId);

        if (!striker) striker = inn.batsmen.find(b => b.isOnStrike && !b.isOut);
        if (!nonStriker) nonStriker = inn.batsmen.find(b => b.isNonStriker && !b.isOut);
        if (!bowler) bowler = inn.bowlers.find(b => b.isCurrentBowler);

        if (!striker || !bowler) return;

        // Resolve real names from database
        const cleanStrikerId = inn.strikerId ? String(inn.strikerId).replace(/^bat_/, '') : null;
        const cleanNonStrikerId = inn.nonStrikerId ? String(inn.nonStrikerId).replace(/^bat_/, '') : null;
        const cleanBowlerId = inn.currentBowlerId ? String(inn.currentBowlerId).replace(/^bowl_/, '') : null;

        const strikerPlr = tournament ? tournament.getPlayer(cleanStrikerId) : (window.getPlayerById ? window.getPlayerById(cleanStrikerId) : null);
        const nonStrikerPlr = tournament ? tournament.getPlayer(cleanNonStrikerId) : (window.getPlayerById ? window.getPlayerById(cleanNonStrikerId) : null);
        const bowlerPlr = tournament ? tournament.getPlayer(cleanBowlerId) : (window.getPlayerById ? window.getPlayerById(cleanBowlerId) : null);

        const sName = strikerPlr ? strikerPlr.name : striker.name;
        const nsName = nonStrikerPlr ? nonStrikerPlr.name : (nonStriker ? nonStriker.name : '');
        const bName = bowlerPlr ? bowlerPlr.name : bowler.name;

        // Determine which batter was dismissed
        let isDismissedStriker = true;
        let dismissedPlrId = cleanStrikerId;
        let dismissedPlrName = sName;
        let dismissedBat = striker;

        if (dismissedPlayerId) {
            const cleanDismissedId = String(dismissedPlayerId).replace(/^bat_/, '');
            if (cleanNonStrikerId && cleanDismissedId === cleanNonStrikerId) {
                isDismissedStriker = false;
                dismissedPlrId = cleanNonStrikerId;
                dismissedPlrName = nsName;
                dismissedBat = nonStriker;
            }
        }

        // Resolve fielder & wicketkeeper names
        let fPlrName = fielderName || '';
        if (fielderId) {
            const cleanFielderId = String(fielderId).replace(/^bat_/, '').replace(/^bowl_/, '');
            const fPlr = tournament ? tournament.getPlayer(cleanFielderId) : (window.getPlayerById ? window.getPlayerById(cleanFielderId) : null);
            if (fPlr) fPlrName = fPlr.name;
        }

        let wkPlrName = wicketkeeperName || fPlrName;
        if (wicketkeeperId) {
            const cleanWKId = String(wicketkeeperId).replace(/^bat_/, '').replace(/^bowl_/, '');
            const wkPlr = tournament ? tournament.getPlayer(cleanWKId) : (window.getPlayerById ? window.getPlayerById(cleanWKId) : null);
            if (wkPlr) wkPlrName = wkPlr.name;
        }

        const overIndex = Math.floor(inn.legalBalls / 6);
        const ballInOver = (inn.legalBalls % 6) + 1;
        const overDisplay = `${overIndex}.${ballInOver}`;

        let dismissalNotation = '';
        if (dismissalType === 'Bowled') dismissalNotation = `b ${bName}`;
        else if (dismissalType === 'Caught') dismissalNotation = `c ${fPlrName} b ${bName}`;
        else if (dismissalType === 'Caught & Bowled') dismissalNotation = `c & b ${bName}`;
        else if (dismissalType === 'LBW') dismissalNotation = `lbw b ${bName}`;
        else if (dismissalType === 'Run Out') dismissalNotation = `run out (${fPlrName})`;
        else if (dismissalType === 'Stumped') dismissalNotation = `st ${wkPlrName} b ${bName}`;
        else if (dismissalType === 'Hit Wicket') dismissalNotation = `hit wicket b ${bName}`;
        else if (dismissalType === 'Retired Out') dismissalNotation = `retired out`;
        else dismissalNotation = `out (${dismissalType})`;

        const randomWktPhrase = this.getRandomCommentary('WICKET');
        let autoCommentary = '';
        if (dismissalType === 'Run Out') {
            autoCommentary = `${overDisplay} ${bName} to ${sName} — WICKET! ${randomWktPhrase} (${dismissedPlrName} run out (${fPlrName}))`;
        } else {
            autoCommentary = `${overDisplay} ${bName} to ${sName} — WICKET! ${randomWktPhrase} (${dismissedPlrName} ${dismissalNotation})`;
        }

        if (commentaryText) {
            autoCommentary += ` [${commentaryText}]`;
        }

        const delivery = new Delivery({
            matchId: match.id,
            inningsId: inn.id,
            overIndex,
            ballInOver,
            strikerId: cleanStrikerId,
            strikerName: sName,
            nonStrikerId: cleanNonStrikerId,
            nonStrikerName: nsName,
            bowlerId: cleanBowlerId,
            bowlerName: bName,
            runsOffBat: 0,
            extras: { wide: 0, noball: 0, bye: 0, legbye: 0 },
            isLegal: true,
            isWicket: true,
            dismissedPlayerId: dismissedPlrId,
            dismissedPlayerName: dismissedPlrName,
            dismissalType,
            fielderId,
            fielderName: fPlrName,
            wicketkeeperId,
            wicketkeeperName: wkPlrName,
            dismissalDesc: dismissalNotation,
            autoCommentary
        });

        inn.ballLog.push(delivery);

        // Mark dismissed batter as out
        if (dismissedBat) {
            dismissedBat.isOut = true;
            dismissedBat.isOnStrike = false;
            dismissedBat.isNonStriker = false;
            dismissedBat.dismissal = dismissalNotation;
        }

        // Assign incoming batsman to the dismissed position with real player name
        if (incomingPlayerId) {
            const cleanIncId = String(incomingPlayerId).replace(/^bat_/, '');
            const nextPlr = tournament ? tournament.getPlayer(cleanIncId) : (window.getPlayerById ? window.getPlayerById(cleanIncId) : null);
            const incName = nextPlr ? nextPlr.name : 'Incoming Batter';

            const newBatsman = new Batsman({
                id: 'bat_' + cleanIncId,
                playerId: cleanIncId,
                name: incName,
                isOnStrike: isDismissedStriker,
                isNonStriker: !isDismissedStriker
            });
            inn.batsmen.push(newBatsman);

            if (isDismissedStriker) {
                inn.strikerId = cleanIncId;
            } else {
                inn.nonStrikerId = cleanIncId;
            }
        } else {
            if (isDismissedStriker) inn.strikerId = null;
            else inn.nonStrikerId = null;
        }

        // End of over check
        let isOverComplete = false;
        const totalLegalNow = inn.legalBalls + 1;
        if (totalLegalNow % 6 === 0) {
            isOverComplete = true;
            this.rotateStrike(inn);
            match.lastBowlerId = inn.currentBowlerId;
        }

        // Derive scorecard
        window.ScoreshCalculations.deriveScorecardFromDeliveries(inn);

        this.checkMatchConditions(match);
        window.scoreState.saveCurrentTournament();
        window.scoreState.notify();

        if (isOverComplete && match.status === 'live' && !inn.isCompleted) {
            const completedOverNum = totalLegalNow / 6;
            window.ScoreshModals.openNextBowlerModal(match, completedOverNum, bName);
        }
    }

    /**
     * Swaps on-strike and non-striker player IDs and positions
     */
    rotateStrike(inn) {
        if (!inn) return;
        const temp = inn.strikerId;
        inn.strikerId = inn.nonStrikerId;
        inn.nonStrikerId = temp;

        inn.batsmen.forEach(b => {
            const cleanBId = b.playerId || String(b.id).replace(/^bat_/, '');
            const isMatchStriker = (cleanBId === inn.strikerId || b.id === 'bat_' + inn.strikerId || b.id === inn.strikerId);
            const isMatchNonStriker = (cleanBId === inn.nonStrikerId || b.id === 'bat_' + inn.nonStrikerId || b.id === inn.nonStrikerId);
            b.isOnStrike = Boolean(isMatchStriker && !b.isOut);
            b.isNonStriker = Boolean(isMatchNonStriker && !b.isOut);
        });
    }

    /**
     * Change bowler with consecutive over & max overs quota restriction check
     */
    changeBowler(match, bowlerPlayerId, bowlerName = '') {
        if (!window.authService.canManageTournament(match.tournamentId)) {
            window.ScoreshModals.showToast('Unauthorized: Only Hosts can change bowlers', 'error');
            return;
        }

        const inn = match.currentInnings;
        if (!inn) return;

        const cleanBowlerId = String(bowlerPlayerId).replace(/^bowl_/, '');

        // Prohibit same bowler bowling consecutive overs
        if (match.lastBowlerId && (cleanBowlerId === match.lastBowlerId || ('bowl_' + cleanBowlerId) === match.lastBowlerId)) {
            window.ScoreshModals.showToast('Rule Violation: Bowler cannot bowl consecutive overs', 'error');
            return;
        }

        // Check format max bowling limit (e.g. 20 overs match -> max 4 overs per bowler)
        const maxOversPerBowler = Math.ceil(match.totalOvers / 5);
        const existingBowler = inn.bowlers.find(b => b.playerId === cleanBowlerId || b.id === 'bowl_' + cleanBowlerId || b.id === cleanBowlerId);
        if (existingBowler && (existingBowler.legalBalls >= maxOversPerBowler * 6)) {
            window.ScoreshModals.showToast(`Quota Limit: ${existingBowler.name} has completed maximum allowed ${maxOversPerBowler} overs`, 'error');
            return;
        }

        inn.currentBowlerId = cleanBowlerId;
        inn.bowlers.forEach(b => b.isCurrentBowler = false);

        let bowler = existingBowler;
        if (bowler) {
            bowler.isCurrentBowler = true;
        } else {
            const tournament = window.scoreState.getTournament(match.tournamentId);
            const plr = tournament ? tournament.getPlayer(cleanBowlerId) : (window.getPlayerById ? window.getPlayerById(cleanBowlerId) : null);
            const bName = plr ? plr.name : (bowlerName || 'Select player');
            bowler = new Bowler({
                id: 'bowl_' + cleanBowlerId,
                playerId: cleanBowlerId,
                name: bName,
                isCurrentBowler: true
            });
            inn.bowlers.push(bowler);
        }

        window.ScoreshCalculations.deriveScorecardFromDeliveries(inn);
        window.scoreState.saveCurrentTournament();
        window.scoreState.notify();
    }

    /**
     * Undo last delivery event and recalculate match state safely
     */
    undoLastBall(match) {
        if (!window.authService.canManageTournament(match.tournamentId)) {
            window.ScoreshModals.showToast('Unauthorized: Only Hosts can undo balls', 'error');
            return;
        }

        if (!match) return;
        const inn = match.currentInnings;
        if (!inn || !inn.ballLog || inn.ballLog.length === 0) {
            window.ScoreshModals.showToast('No balls to undo in this innings', 'info');
            return;
        }

        const poppedDelivery = inn.ballLog.pop();

        // If match was completed, reopen it
        if (match.status === 'completed') {
            match.status = 'live';
            inn.isCompleted = false;
            match.resultSummary = '';
            match.winnerTeamId = null;
        }

        // Restore strikerId, nonStrikerId, bowlerId from the popped delivery state
        inn.strikerId = poppedDelivery.strikerId;
        inn.nonStrikerId = poppedDelivery.nonStrikerId;
        inn.currentBowlerId = poppedDelivery.bowlerId;

        // Re-derive scorecard and totals from the remaining delivery sequence
        window.ScoreshCalculations.deriveScorecardFromDeliveries(inn);

        window.scoreState.saveCurrentTournament();
        window.scoreState.notify();
        window.ScoreshModals.showToast(`Undid delivery ${poppedDelivery.displayOverNumber}`, 'info');
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

        const cleanStrikerId = String(strikerPlayerId).replace(/^bat_/, '');
        const cleanNonStrikerId = String(nonStrikerPlayerId).replace(/^bat_/, '');
        const cleanBowlerId = String(openingBowlerPlayerId).replace(/^bowl_/, '');

        inn2.strikerId = cleanStrikerId;
        inn2.nonStrikerId = cleanNonStrikerId;
        inn2.currentBowlerId = cleanBowlerId;

        const strikerPlr = tournament ? tournament.getPlayer(cleanStrikerId) : (window.getPlayerById ? window.getPlayerById(cleanStrikerId) : null);
        const nonStrikerPlr = tournament ? tournament.getPlayer(cleanNonStrikerId) : (window.getPlayerById ? window.getPlayerById(cleanNonStrikerId) : null);
        const openingBowlerPlr = tournament ? tournament.getPlayer(cleanBowlerId) : (window.getPlayerById ? window.getPlayerById(cleanBowlerId) : null);

        inn2.batsmen = [
            new Batsman({
                id: 'bat_' + cleanStrikerId,
                playerId: cleanStrikerId,
                name: strikerPlr ? strikerPlr.name : 'Select player',
                isOnStrike: true,
                isNonStriker: false
            }),
            new Batsman({
                id: 'bat_' + cleanNonStrikerId,
                playerId: cleanNonStrikerId,
                name: nonStrikerPlr ? nonStrikerPlr.name : 'Select player',
                isOnStrike: false,
                isNonStriker: true
            })
        ];

        inn2.bowlers = [
            new Bowler({
                id: 'bowl_' + cleanBowlerId,
                playerId: cleanBowlerId,
                name: openingBowlerPlr ? openingBowlerPlr.name : 'Select player',
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

        if (!match.playerOfTheMatch) {
            if (topScorer && (!bestBowler || topScorer.runs >= 40)) {
                match.playerOfTheMatch = topScorer.name;
            } else if (bestBowler) {
                match.playerOfTheMatch = bestBowler.name;
            }
        }
    }
}

// Global scoring engine instance
window.scoreEngine = new ScoringEngine();
