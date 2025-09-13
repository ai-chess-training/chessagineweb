export const ChessTips = {
    Opening: [
        "Open with a center pawn",
        "Develop with threats",
        "Develop knights before bishops",
        "Don't move the same piece twice if you can help it",
        "Make as few pawn moves as possible",
        "Don't bring your queen out too early",
        "Castle as soon as possible, preferably on the kingside",
        "Play to get control of the center",
        "Try to maintain at least one pawn in the center",
        "Don't sacrifice without a clear and adequate reason"
    ],
    Middlegame: [
        "Have all your moves fit into a definite plan",
        "When you are ahead in material, exchange as many pieces as possible, especially queens",
        "Avoid doubled, isolated, or backward pawns",
        "In cramped positions, free yourself by exchanging",
        "Don't expose your king while the enemy queen is still on the board",
        "All combinations are based on a double attack",
        "When your opponent has one or more pieces exposed, look for a combination",
        "To attack the enemy king, you must first open a file (or less often a diagonal) to gain access for your heavy pieces",
        "Centralize the action of all your pieces",
        "The best defense is a counterattack"
    ],
    Endgame: [
        "To win without pawns, you must be a rook or two minor pieces ahead",
        "The king must be active in the ending",
        "Passed pawns must be pushed",
        "The easiest endings to win are pure pawn endings",
        "If you are only one pawn ahead, trade pieces but not pawns",
        "Don't place pawns on the same color squares as your bishop",
        "A bishop is better than a knight in all but blocked pawn positions",
        "It is worth a pawn to get a rook on the seventh rank",
        "Rooks belong behind passed pawns",
        "Blockade passed pawns with the king"
    ]
};

export function getChessTipsByPhase(phase: string): string[] {
    const key = Object.keys(ChessTips).find(
        k => k.toLowerCase() === phase.toLowerCase()
    ) as keyof typeof ChessTips | undefined;
    return key ? ChessTips[key] : [];
}