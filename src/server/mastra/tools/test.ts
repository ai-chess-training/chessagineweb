// import { analyzeVariationThemes, getThemeProgression, findCriticalMoments, compareVariations } from "./ovp";

// // Test Case 1: Spanish Opening (Ruy Lopez)
// console.log("=== TEST CASE 1: SPANISH OPENING ===");
// const startingFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
// const spanishMoves = ["e4", "e5", "Nf3", "Nc6", "Bb5"];

// console.log("Analyzing Spanish Opening for White...");
// const spanishAnalysis = analyzeVariationThemes(startingFen, spanishMoves, "w");

// console.log("Theme Changes:");
// spanishAnalysis.themeChanges.forEach(change => {
//     console.log(`${change.theme}: ${change.initialScore} → ${change.finalScore} (${change.change > 0 ? '+' : ''}${change.change.toFixed(2)})`);
// });

// console.log(`\nOverall Change: ${spanishAnalysis.overallChange.toFixed(2)}`);
// console.log("Strongest Improvement:", spanishAnalysis.strongestImprovement);
// console.log("Biggest Decline:", spanishAnalysis.biggestDecline);

// // Test Case 2: Queen's Gambit
// console.log("\n=== TEST CASE 2: QUEEN'S GAMBIT ===");
// const queensGambitMoves = ["d4", "d5", "c4", "e6", "Nc3"];

// console.log("Analyzing Queen's Gambit for White...");
// const queensGambitAnalysis = analyzeVariationThemes(startingFen, queensGambitMoves, "w");

// console.log("Theme Changes:");
// queensGambitAnalysis.themeChanges.forEach(change => {
//     console.log(`${change.theme}: ${change.initialScore} → ${change.finalScore} (${change.change > 0 ? '+' : ''}${change.change.toFixed(2)})`);
// });

// // Test Case 3: Track specific themes over time
// console.log("\n=== TEST CASE 3: THEME PROGRESSION ===");
// const sicilianMoves = ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6"];

// console.log("Sicilian Defense - Mobility progression for White:");
// const mobilityProgression = getThemeProgression(startingFen, sicilianMoves, "w", "mobility");
// mobilityProgression.forEach((score, index) => {
//     if (index === 0) {
//         console.log(`Start: ${score.toFixed(2)}`);
//     } else {
//         console.log(`After ${sicilianMoves[index - 1]}: ${score.toFixed(2)}`);
//     }
// });

// console.log("\nSpace control progression for White:");
// const spaceProgression = getThemeProgression(startingFen, sicilianMoves, "w", "space");
// spaceProgression.forEach((score, index) => {
//     if (index === 0) {
//         console.log(`Start: ${score.toFixed(2)}`);
//     } else {
//         console.log(`After ${sicilianMoves[index - 1]}: ${score.toFixed(2)}`);
//     }
// });

// // Test Case 4: Find critical moments
// console.log("\n=== TEST CASE 4: CRITICAL MOMENTS ===");
// const tacticalSequence = ["e4", "e5", "Nf3", "Nc6", "Bc4", "f5", "exf5", "d6"];

// console.log("Finding critical moments (threshold: 0.5):");
// const criticalMoments = findCriticalMoments(startingFen, tacticalSequence, "w", 0.5);

// if (criticalMoments.length > 0) {
//     criticalMoments.forEach(moment => {
//         console.log(`\nCritical move #${moment.moveIndex + 1}: ${moment.move}`);
//         moment.themeChanges.forEach(change => {
//             console.log(`  ${change.theme}: ${change.change > 0 ? '+' : ''}${change.change.toFixed(2)}`);
//         });
//     });
// } else {
//     console.log("No critical moments found with this threshold");
// }

// // Test Case 5: Compare multiple variations
// console.log("\n=== TEST CASE 5: VARIATION COMPARISON ===");
// const variations = [
//     { name: "Spanish Opening", moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"] },
//     { name: "Italian Game", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4"] },
//     { name: "King's Indian Attack", moves: ["e4", "e5", "Nf3", "Nc6", "g3"] }
// ];

// console.log("Comparing three openings for White:");
// const comparison = compareVariations(startingFen, variations, "w");

// comparison.forEach(result => {
//     console.log(`\n${result.name}:`);
//     console.log(`  Overall change: ${result.analysis.overallChange.toFixed(2)}`);
//     if (result.analysis.strongestImprovement) {
//         console.log(`  Best theme: ${result.analysis.strongestImprovement.theme} (+${result.analysis.strongestImprovement.change.toFixed(2)})`);
//     }
//     if (result.analysis.biggestDecline) {
//         console.log(`  Worst theme: ${result.analysis.biggestDecline.theme} (${result.analysis.biggestDecline.change.toFixed(2)})`);
//     }
// });



