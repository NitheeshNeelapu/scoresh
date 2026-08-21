/**
 * Scoresh Data Models
 * Clean, hierarchical cricket data models for multi-tournament management.
 * Preserves C struct mathematical logic for Batsman and Bowler statistics while supporting
 * complete dynamic leagues, Playing XI rosters, delivery-derived scorecards, and partnerships.
 * Hierarchy: Tournament -> Teams -> Players -> Matches -> Innings -> Deliveries -> Derived Scorecards
 */

class Player {
    constructor({
        id = null,
        tournamentId = null,
        teamId = null,
        name = '',
        jersey = '',
        role = 'Batsman', // 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicketkeeper'
        battingStyle = 'Right-hand bat',
        bowlingStyle = 'Right-arm medium'
    } = {}) {
        this.id = id || 'plr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.tournamentId = tournamentId;
        this.teamId = teamId;
        this.name = (name || '').trim();
        this.jersey = jersey ? String(jersey).trim() : '';
        this.role = role || 'Batsman';
        this.battingStyle = battingStyle || 'Right-hand bat';
        this.bowlingStyle = bowlingStyle || 'Right-arm medium';
    }

    toJSON() {
        return {
            id: this.id,
            tournamentId: this.tournamentId,
            teamId: this.teamId,
            name: this.name,
            jersey: this.jersey,
            role: this.role,
            battingStyle: this.battingStyle,
            bowlingStyle: this.bowlingStyle
        };
    }
}

class Team {
    constructor({
        id = null,
        tournamentId = null,
        name = '',
        shortName = '',
        color = '#16a34a',
        logo = '',
        captainId = null,
        playerIds = []
    } = {}) {
        this.id = id || 'team_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.tournamentId = tournamentId;
        this.name = (name || '').trim();
        this.shortName = (shortName || (this.name.substring(0, 3).toUpperCase())).trim();
        this.color = color || '#16a34a';
        this.logo = logo || '';
        this.captainId = captainId;
        this.playerIds = Array.isArray(playerIds) ? [...playerIds] : [];
    }

    toJSON() {
        return {
            id: this.id,
            tournamentId: this.tournamentId,
            name: this.name,
            shortName: this.shortName,
            color: this.color,
            logo: this.logo,
            captainId: this.captainId,
            playerIds: [...this.playerIds]
        };
    }
}

class Batsman {
    constructor({
        id = null,
        playerId = null,
        name = '',
        ones = 0,
        twos = 0,
        threes = 0,
        fours = 0,
        sixes = 0,
        balls = 0,
        isOut = false,
        dismissal = 'Not Out',
        dismissalType = 'Not Out',
        bowlerName = '',
        fielderName = '',
        isOnStrike = false,
        isNonStriker = false
    } = {}) {
        this.id = id || 'bat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.playerId = playerId;
        this.name = (name || '').trim();
        this.ones = Math.max(0, parseInt(ones, 10) || 0);
        this.twos = Math.max(0, parseInt(twos, 10) || 0);
        this.threes = Math.max(0, parseInt(threes, 10) || 0);
        this.fours = Math.max(0, parseInt(fours, 10) || 0);
        this.sixes = Math.max(0, parseInt(sixes, 10) || 0);
        this.balls = Math.max(0, parseInt(balls, 10) || 0);
        this.isOut = Boolean(isOut);
        this.dismissal = dismissal || (this.isOut ? 'Out' : 'Not Out');
        this.dismissalType = dismissalType || (this.isOut ? 'Bowled' : 'Not Out');
        this.bowlerName = bowlerName || '';
        this.fielderName = fielderName || '';
        this.isOnStrike = Boolean(isOnStrike);
        this.isNonStriker = Boolean(isNonStriker);
    }

    /**
     * C Program Formula: Runs = 1s + 2(2s) + 3(3s) + 4(4s) + 6(6s)
     */
    get runs() {
        return (this.ones * 1) +
               (this.twos * 2) +
               (this.threes * 3) +
               (this.fours * 4) +
               (this.sixes * 6);
    }

    /**
     * C Program Formula: Strike Rate = (Runs / Balls) * 100
     */
    get strikeRate() {
        if (this.balls === 0) return 0.0;
        return (this.runs / this.balls) * 100;
    }

    get boundaryRuns() {
        return (this.fours * 4) + (this.sixes * 6);
    }

    get boundaryPercentage() {
        if (this.runs === 0) return 0.0;
        return (this.boundaryRuns / this.runs) * 100;
    }

    get dotBalls() {
        const scoringShots = this.ones + this.twos + this.threes + this.fours + this.sixes;
        return Math.max(0, this.balls - scoringShots);
    }

    toJSON() {
        return {
            id: this.id,
            playerId: this.playerId,
            name: this.name,
            ones: this.ones,
            twos: this.twos,
            threes: this.threes,
            fours: this.fours,
            sixes: this.sixes,
            balls: this.balls,
            isOut: this.isOut,
            dismissal: this.dismissal,
            dismissalType: this.dismissalType,
            bowlerName: this.bowlerName,
            fielderName: this.fielderName,
            isOnStrike: this.isOnStrike,
            isNonStriker: this.isNonStriker
        };
    }
}

class Bowler {
    constructor({
        id = null,
        playerId = null,
        name = '',
        runsgv = 0,
        overs = 0,
        wkttkn = 0,
        maidens = 0,
        wides = 0,
        noBalls = 0,
        isCurrentBowler = false
    } = {}) {
        this.id = id || 'bowl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.playerId = playerId;
        this.name = (name || '').trim();
        this.runsgv = Math.max(0, parseInt(runsgv, 10) || 0);
        this.overs = Math.max(0, parseFloat(overs) || 0);
        this.wkttkn = Math.max(0, parseInt(wkttkn, 10) || 0);
        this.maidens = Math.max(0, parseInt(maidens, 10) || 0);
        this.wides = Math.max(0, parseInt(wides, 10) || 0);
        this.noBalls = Math.max(0, parseInt(noBalls, 10) || 0);
        this.isCurrentBowler = Boolean(isCurrentBowler);
    }

    get totalLegalBalls() {
        const fullOvers = Math.floor(this.overs);
        const balls = Math.round((this.overs - fullOvers) * 10);
        return (fullOvers * 6) + (balls % 6);
    }

    get exactOversFraction() {
        const fullOvers = Math.floor(this.overs);
        const balls = Math.round((this.overs - fullOvers) * 10);
        return fullOvers + (balls / 6);
    }

    /**
     * C Program Formula: Economy = Runs Conceded / Overs
     */
    get economy() {
        const oversFraction = this.exactOversFraction;
        if (oversFraction === 0) return 0.0;
        return this.runsgv / oversFraction;
    }

    toJSON() {
        return {
            id: this.id,
            playerId: this.playerId,
            name: this.name,
            runsgv: this.runsgv,
            overs: this.overs,
            wkttkn: this.wkttkn,
            maidens: this.maidens,
            wides: this.wides,
            noBalls: this.noBalls,
            isCurrentBowler: this.isCurrentBowler
        };
    }
}

class Delivery {
    constructor({
        id = null,
        overIndex = 0,
        ballInOver = 1,
        strikerId = null,
        strikerName = '',
        nonStrikerId = null,
        nonStrikerName = '',
        bowlerId = null,
        bowlerName = '',
        runsOffBat = 0,
        extras = { wide: 0, noball: 0, bye: 0, legbye: 0 },
        isLegal = true,
        isWicket = false,
        wicketType = null, // 'Bowled' | 'Caught' | 'Run Out' | 'LBW' | 'Stumped' | 'Hit Wicket' | 'Retired Out'
        fielderId = null,
        fielderName = '',
        dismissalDesc = '',
        autoCommentary = '',
        timestamp = Date.now()
    } = {}) {
        this.id = id || 'del_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        this.overIndex = parseInt(overIndex, 10) || 0;
        this.ballInOver = parseInt(ballInOver, 10) || 1;
        this.strikerId = strikerId;
        this.strikerName = strikerName;
        this.nonStrikerId = nonStrikerId;
        this.nonStrikerName = nonStrikerName;
        this.bowlerId = bowlerId;
        this.bowlerName = bowlerName;
        this.runsOffBat = parseInt(runsOffBat, 10) || 0;
        this.extras = {
            wide: parseInt(extras?.wide, 10) || 0,
            noball: parseInt(extras?.noball, 10) || 0,
            bye: parseInt(extras?.bye, 10) || 0,
            legbye: parseInt(extras?.legbye, 10) || 0
        };
        this.isLegal = Boolean(isLegal);
        this.isWicket = Boolean(isWicket);
        this.wicketType = wicketType;
        this.fielderId = fielderId;
        this.fielderName = fielderName;
        this.dismissalDesc = dismissalDesc || '';
        this.autoCommentary = autoCommentary || '';
        this.timestamp = timestamp;
    }

    get totalRuns() {
        return this.runsOffBat + this.extras.wide + this.extras.noball + this.extras.bye + this.extras.legbye;
    }

    get isExtra() {
        return (this.extras.wide > 0 || this.extras.noball > 0 || this.extras.bye > 0 || this.extras.legbye > 0);
    }

    get displayOverNumber() {
        return `${this.overIndex}.${this.ballInOver}`;
    }

    toJSON() {
        return {
            id: this.id,
            overIndex: this.overIndex,
            ballInOver: this.ballInOver,
            strikerId: this.strikerId,
            strikerName: this.strikerName,
            nonStrikerId: this.nonStrikerId,
            nonStrikerName: this.nonStrikerName,
            bowlerId: this.bowlerId,
            bowlerName: this.bowlerName,
            runsOffBat: this.runsOffBat,
            extras: { ...this.extras },
            isLegal: this.isLegal,
            isWicket: this.isWicket,
            wicketType: this.wicketType,
            fielderId: this.fielderId,
            fielderName: this.fielderName,
            dismissalDesc: this.dismissalDesc,
            autoCommentary: this.autoCommentary,
            timestamp: this.timestamp
        };
    }
}

class Innings {
    constructor({
        id = null,
        inningNumber = 1,
        battingTeamId = null,
        bowlingTeamId = null,
        battingTeamName = '',
        bowlingTeamName = '',
        totalRuns = 0,
        totalWickets = 0,
        oversBowled = 0.0,
        legalBalls = 0,
        target = null,
        isCompleted = false,
        extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
        batsmen = [],
        bowlers = [],
        ballLog = [],
        fallOfWickets = [],
        partnerships = []
    } = {}) {
        this.id = id || 'inn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        this.inningNumber = parseInt(inningNumber, 10) || 1;
        this.battingTeamId = battingTeamId;
        this.bowlingTeamId = bowlingTeamId;
        this.battingTeamName = battingTeamName || '';
        this.bowlingTeamName = bowlingTeamName || '';
        this.totalRuns = parseInt(totalRuns, 10) || 0;
        this.totalWickets = parseInt(totalWickets, 10) || 0;
        this.oversBowled = parseFloat(oversBowled) || 0.0;
        this.legalBalls = parseInt(legalBalls, 10) || 0;
        this.target = target !== null && target !== undefined ? parseInt(target, 10) : null;
        this.isCompleted = Boolean(isCompleted);
        this.extras = {
            wides: Math.max(0, parseInt(extras?.wides, 10) || 0),
            noBalls: Math.max(0, parseInt(extras?.noBalls, 10) || 0),
            byes: Math.max(0, parseInt(extras?.byes, 10) || 0),
            legByes: Math.max(0, parseInt(extras?.legByes, 10) || 0)
        };
        this.batsmen = Array.isArray(batsmen) ? batsmen.map(b => b instanceof Batsman ? b : new Batsman(b)) : [];
        this.bowlers = Array.isArray(bowlers) ? bowlers.map(b => b instanceof Bowler ? b : new Bowler(b)) : [];
        this.ballLog = Array.isArray(ballLog) ? ballLog.map(b => b instanceof Delivery ? b : new Delivery(b)) : [];
        this.fallOfWickets = Array.isArray(fallOfWickets) ? [...fallOfWickets] : [];
        this.partnerships = Array.isArray(partnerships) ? [...partnerships] : [];
    }

    get totalExtras() {
        return this.extras.wides + this.extras.noBalls + this.extras.byes + this.extras.legByes;
    }

    get displayOvers() {
        const fullOvers = Math.floor(this.legalBalls / 6);
        const remBalls = this.legalBalls % 6;
        return `${fullOvers}.${remBalls}`;
    }

    get exactOversFraction() {
        return this.legalBalls / 6;
    }

    get runRate() {
        if (this.legalBalls === 0) return 0.0;
        return this.totalRuns / (this.legalBalls / 6);
    }

    toJSON() {
        return {
            id: this.id,
            inningNumber: this.inningNumber,
            battingTeamId: this.battingTeamId,
            bowlingTeamId: this.bowlingTeamId,
            battingTeamName: this.battingTeamName,
            bowlingTeamName: this.bowlingTeamName,
            totalRuns: this.totalRuns,
            totalWickets: this.totalWickets,
            oversBowled: this.oversBowled,
            legalBalls: this.legalBalls,
            target: this.target,
            isCompleted: this.isCompleted,
            extras: { ...this.extras },
            batsmen: this.batsmen.map(b => b.toJSON()),
            bowlers: this.bowlers.map(b => b.toJSON()),
            ballLog: this.ballLog.map(b => b.toJSON()),
            fallOfWickets: [...this.fallOfWickets],
            partnerships: [...this.partnerships]
        };
    }
}

class Match {
    constructor({
        id = null,
        tournamentId = null,
        title = '',
        teamAId = null,
        teamBId = null,
        teamAName = '',
        teamBName = '',
        teamAShort = '',
        teamBShort = '',
        teamAColor = '#16a34a',
        teamBColor = '#0f172a',
        teamAPlayingXI = [],
        teamBPlayingXI = [],
        date = '',
        time = '',
        venue = '',
        matchFormat = 'T20',
        totalOvers = 20,
        status = 'upcoming', // 'upcoming' | 'live' | 'completed' | 'abandoned'
        tossWinnerId = null,
        tossDecision = 'Bat', // 'Bat' | 'Bowl'
        umpires = '',
        currentInningIndex = 0,
        innings = [],
        resultSummary = '',
        winnerTeamId = null,
        playerOfTheMatch = '',
        lastBowlerId = null
    } = {}) {
        this.id = id || 'match_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.tournamentId = tournamentId;
        this.title = title || `${teamAName || 'Team A'} vs ${teamBName || 'Team B'}`;
        this.teamAId = teamAId;
        this.teamBId = teamBId;
        this.teamAName = teamAName || 'Team A';
        this.teamBName = teamBName || 'Team B';
        this.teamAShort = teamAShort || this.teamAName.substring(0, 3).toUpperCase();
        this.teamBShort = teamBShort || this.teamBName.substring(0, 3).toUpperCase();
        this.teamAColor = teamAColor || '#16a34a';
        this.teamBColor = teamBColor || '#0f172a';
        this.teamAPlayingXI = Array.isArray(teamAPlayingXI) ? [...teamAPlayingXI] : [];
        this.teamBPlayingXI = Array.isArray(teamBPlayingXI) ? [...teamBPlayingXI] : [];
        this.date = date || new Date().toISOString().split('T')[0];
        this.time = time || '14:00';
        this.venue = venue || 'Main Cricket Ground';
        this.matchFormat = matchFormat || 'T20';
        this.totalOvers = parseInt(totalOvers, 10) || 20;
        this.status = status || 'upcoming';
        this.tossWinnerId = tossWinnerId;
        this.tossDecision = tossDecision || 'Bat';
        this.umpires = umpires || '';
        this.currentInningIndex = parseInt(currentInningIndex, 10) || 0;
        this.innings = Array.isArray(innings) && innings.length > 0
            ? innings.map(inn => inn instanceof Innings ? inn : new Innings(inn))
            : [
                new Innings({ inningNumber: 1, battingTeamId: this.teamAId, bowlingTeamId: this.teamBId, battingTeamName: this.teamAName, bowlingTeamName: this.teamBName }),
                new Innings({ inningNumber: 2, battingTeamId: this.teamBId, bowlingTeamId: this.teamAId, battingTeamName: this.teamBName, bowlingTeamName: this.teamAName })
            ];
        this.resultSummary = resultSummary || '';
        this.winnerTeamId = winnerTeamId;
        this.playerOfTheMatch = playerOfTheMatch || '';
        this.lastBowlerId = lastBowlerId;
    }

    get currentInnings() {
        return this.innings[this.currentInningIndex] || this.innings[0];
    }

    get firstInnings() {
        return this.innings[0];
    }

    get secondInnings() {
        return this.innings[1];
    }

    toJSON() {
        return {
            id: this.id,
            tournamentId: this.tournamentId,
            title: this.title,
            teamAId: this.teamAId,
            teamBId: this.teamBId,
            teamAName: this.teamAName,
            teamBName: this.teamBName,
            teamAShort: this.teamAShort,
            teamBShort: this.teamBShort,
            teamAColor: this.teamAColor,
            teamBColor: this.teamBColor,
            teamAPlayingXI: [...this.teamAPlayingXI],
            teamBPlayingXI: [...this.teamBPlayingXI],
            date: this.date,
            time: this.time,
            venue: this.venue,
            matchFormat: this.matchFormat,
            totalOvers: this.totalOvers,
            status: this.status,
            tossWinnerId: this.tossWinnerId,
            tossDecision: this.tossDecision,
            umpires: this.umpires,
            currentInningIndex: this.currentInningIndex,
            innings: this.innings.map(inn => inn.toJSON()),
            resultSummary: this.resultSummary,
            winnerTeamId: this.winnerTeamId,
            playerOfTheMatch: this.playerOfTheMatch,
            lastBowlerId: this.lastBowlerId
        };
    }
}

class Tournament {
    constructor({
        id = null,
        hostId = null,
        hostName = '',
        name = '',
        logo = '',
        description = '',
        format = 'T20', // 'T10' | 'T20' | 'ODI' | 'Test' | 'Custom'
        overs = 20,
        location = '',
        organizer = '',
        startDate = '',
        endDate = '',
        numberOfTeams = 4,
        rules = 'Standard ICC Cricket Rules',
        teams = [],
        players = [],
        matches = [],
        status = 'upcoming' // 'upcoming' | 'ongoing' | 'completed'
    } = {}) {
        this.id = id || 'tourn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.hostId = hostId;
        this.hostName = hostName || 'Organizer';
        this.name = (name || '').trim();
        this.logo = logo || '';
        this.description = description || '';
        this.format = format || 'T20';
        this.overs = parseInt(overs, 10) || (format === 'T10' ? 10 : format === 'T20' ? 20 : format === 'ODI' ? 50 : 20);
        this.location = (location || '').trim();
        this.organizer = organizer || this.hostName;
        this.startDate = startDate || '';
        this.endDate = endDate || '';
        this.numberOfTeams = parseInt(numberOfTeams, 10) || 4;
        this.rules = rules || 'Standard Cricket Tournament Rules';
        this.teams = Array.isArray(teams) ? teams.map(t => t instanceof Team ? t : new Team(t)) : [];
        this.players = Array.isArray(players) ? players.map(p => p instanceof Player ? p : new Player(p)) : [];
        this.matches = Array.isArray(matches) ? matches.map(m => m instanceof Match ? m : new Match(m)) : [];
        this.status = status || 'upcoming';
    }

    getTeam(teamId) {
        return this.teams.find(t => t.id === teamId);
    }

    getPlayer(playerId) {
        return this.players.find(p => p.id === playerId);
    }

    getTeamPlayers(teamId) {
        return this.players.filter(p => p.teamId === teamId);
    }

    toJSON() {
        return {
            id: this.id,
            hostId: this.hostId,
            hostName: this.hostName,
            name: this.name,
            logo: this.logo,
            description: this.description,
            format: this.format,
            overs: this.overs,
            location: this.location,
            organizer: this.organizer,
            startDate: this.startDate,
            endDate: this.endDate,
            numberOfTeams: this.numberOfTeams,
            rules: this.rules,
            teams: this.teams.map(t => t.toJSON()),
            players: this.players.map(p => p.toJSON()),
            matches: this.matches.map(m => m.toJSON()),
            status: this.status
        };
    }
}

// Export to window
if (typeof window !== 'undefined') {
    window.User = User;
    window.Player = Player;
    window.Team = Team;
    window.Batsman = Batsman;
    window.Bowler = Bowler;
    window.Delivery = Delivery;
    window.Innings = Innings;
    window.Match = Match;
    window.Tournament = Tournament;
}
