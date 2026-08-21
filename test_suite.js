const fs = require('fs');
const path = require('path');

// Load scripts
const modelsCode = fs.readFileSync(path.join(__dirname, 'js/models.js'), 'utf8');
const calcCode = fs.readFileSync(path.join(__dirname, 'js/calculations.js'), 'utf8');

eval(modelsCode);
eval(calcCode);

console.log('=== SCORESH AUTOMATED TEST SUITE ===\n');

// Test 1: Batsman runs formula
console.log('1. Testing Batsman runs formula...');
// Rahul: 18x1 + 6x2 + 2x3 + 5x4 + 3x6 = 18 + 12 + 6 + 20 + 18 = 74
const rahulRuns = ScoreshCalculations.calculateRuns(18, 6, 2, 5, 3);
if (rahulRuns === 74) {
    console.log('   ✓ Runs calculation correct: 74');
} else {
    throw new Error(`Runs calculation mismatch: got ${rahulRuns}, expected 74`);
}

// Test 2: Strike rate calculation
console.log('2. Testing Strike Rate calculation...');
const rahulSR = ScoreshCalculations.calculateStrikeRate(74, 42);
if (Math.abs(rahulSR - 176.19) < 0.01) {
    console.log(`   ✓ Strike rate calculation correct: ${rahulSR.toFixed(2)}`);
} else {
    throw new Error(`Strike rate mismatch: got ${rahulSR}, expected ~176.19`);
}

// Test 3: Zero balls division handling
console.log('3. Testing Zero Balls division handling...');
const zeroSR = ScoreshCalculations.calculateStrikeRate(0, 0);
if (zeroSR === 0.0) {
    console.log('   ✓ Zero balls safely handled: 0.00');
} else {
    throw new Error(`Zero balls failed: got ${zeroSR}`);
}

// Test 4: Bowler Economy calculation
console.log('4. Testing Bowler Economy calculation...');
const rohitEcon = ScoreshCalculations.calculateEconomy(28, 4.0);
if (Math.abs(rohitEcon - 7.00) < 0.01) {
    console.log(`   ✓ Bowler economy correct: ${rohitEcon.toFixed(2)}`);
} else {
    throw new Error(`Bowler economy mismatch: got ${rohitEcon}, expected 7.00`);
}

// Test 5: Zero overs division handling
console.log('5. Testing Zero Overs division handling...');
const zeroEcon = ScoreshCalculations.calculateEconomy(15, 0);
if (zeroEcon === 0.0) {
    console.log('   ✓ Zero overs safely handled: 0.00');
} else {
    throw new Error(`Zero overs failed: got ${zeroEcon}`);
}

// Test 6: Cricket fractional overs conversion
console.log('6. Testing Cricket fractional overs conversion...');
const frac34 = ScoreshCalculations.oversToFraction(3.4);
if (Math.abs(frac34 - 3.6667) < 0.001) {
    console.log(`   ✓ 3.4 overs converted to fraction: ${frac34.toFixed(4)} (22 balls)`);
} else {
    throw new Error(`Fraction conversion mismatch: got ${frac34}`);
}

// Test 7: Match totals and Records engine
console.log('7. Testing Match Totals & Records computation...');
const b1 = new Batsman({ name: 'Rahul', ones: 18, twos: 6, threes: 2, fours: 5, sixes: 3, balls: 42 });
const b2 = new Batsman({ name: 'Arjun', ones: 15, twos: 4, threes: 1, fours: 4, sixes: 1, balls: 31, isOut: true });
const bw1 = new Bowler({ name: 'Rohit', runsgv: 28, overs: 4.0, wkttkn: 3 });
const bw2 = new Bowler({ name: 'Vikram', runsgv: 32, overs: 4.0, wkttkn: 2 });
const match = new Match({ extras: { wides: 4, noBalls: 1, byes: 2, legByes: 1 } });

const totals = ScoreshCalculations.computeMatchTotals([b1, b2], [bw1, bw2], match);
const records = ScoreshCalculations.computeRecords([b1, b2], [bw1, bw2], match);

if (totals.totalBatsmanRuns === (74 + 48) && totals.totalExtras === 8 && totals.totalRuns === 130) {
    console.log(`   ✓ Match total runs correct: ${totals.totalRuns} (${totals.totalBatsmanRuns} bat + ${totals.totalExtras} extras)`);
} else {
    throw new Error(`Match totals mismatch: got totalRuns=${totals.totalRuns}`);
}

if (records.highestScore && records.highestScore.name === 'Rahul' && records.highestScore.runs === 74) {
    console.log('   ✓ Highest individual score record: Rahul (74 runs)');
} else {
    throw new Error('Highest score record calculation failed');
}

if (records.mostWickets && records.mostWickets.name === 'Rohit' && records.mostWickets.wkttkn === 3) {
    console.log('   ✓ Most wickets record: Rohit (3 wickets)');
} else {
    throw new Error('Most wickets record calculation failed');
}

console.log('\n✅ ALL 7 VERIFICATION CHECKS PASSED WITH 100% SUCCESS!\n');
