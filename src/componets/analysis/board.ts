enum PieceType {
  Pawn = 'P',
  Knight = 'N',
  Bishop = 'B',
  Rook = 'R',
  Queen = 'Q',
  King = 'K',
  None = ''
}

enum PieceColour {
  White = 'W',
  Black = 'B'
}

export class Board {

  private board: string[][] = Array.from({ length: 8 }, () => Array(8).fill(''));
  private squaresAttackedByWhite: number[][] = Array.from({ length: 8 }, () => Array(8).fill(0));
  private squaresAttackedByBlack: number[][] = Array.from({ length: 8 }, () => Array(8).fill(0));

  private hangingPieceDescriptions: string[] = [];
  private hangingPieceCoordinates: string[] = [];
  private semiProtectedPieceDescriptions: string[] = [];
  private semiProtectedPieceCoordinates: string[] = [];

  // note that 0,0 is the top left

  constructor(fen: string) {
    this.parseFEN(fen);
    this.calculateDefendersAndAttackers();
    this.calculatePieceVulnerability();
  }

  public get HangingPieceDescriptions(): string[] {
    return this.hangingPieceDescriptions;
  }

  public get HangingPieceCoordinates(): string[] {
    return this.hangingPieceCoordinates;
  }

  public get SemiProtectedPieceDescriptions(): string[] {
    return this.semiProtectedPieceDescriptions;
  }

  public get SemiProtectedPieceCoordinates(): string[] {
    return this.semiProtectedPieceCoordinates;
  }

  public toString(): string {
    const lines: string[] = [];
    
    lines.push('PIECE VULNERABILITY ANALYSIS:');
    lines.push('');
    
    lines.push('PIECE VULNERABILITY CATEGORIES:');
    lines.push('');
    
    lines.push('1. HANGING PIECES (Critical Threats):');
    lines.push('   Definition: Pieces that are attacked by the opponent but have NO defenders.');
    lines.push('   These pieces can be captured for free without any compensation.');
    lines.push('   Priority: IMMEDIATE attention required - these pieces should be moved or defended.');
    if (this.hangingPieceDescriptions.length > 0) {
      lines.push('   Current hanging pieces:');
      for (let i = 0; i < this.hangingPieceDescriptions.length; i++) {
        lines.push(`   - ${this.hangingPieceDescriptions[i]} (coordinate: ${this.hangingPieceCoordinates[i]})`);
      }
    } else {
      lines.push('   No hanging pieces found.');
    }
    lines.push('');
    
    lines.push('2. SEMI-PROTECTED PIECES (Contested):');
    lines.push('   Definition: Pieces where the number of attackers EQUALS the number of defenders.');
    lines.push('   These pieces are in a tactical balance - capturing them leads to equal exchanges.');
    lines.push('   Priority: MEDIUM - monitor for tactical opportunities or threats.');
    if (this.semiProtectedPieceDescriptions.length > 0) {
      lines.push('   Current semi-protected pieces:');
      for (let i = 0; i < this.semiProtectedPieceDescriptions.length; i++) {
        lines.push(`   - ${this.semiProtectedPieceDescriptions[i]} (coordinate: ${this.semiProtectedPieceCoordinates[i]})`);
      }
    } else {
      lines.push('   No semi-protected pieces found.');
    }
    
    lines.push('');
    lines.push('TACTICAL RECOMMENDATIONS:');
    lines.push('- Address hanging pieces immediately (move or defend)');
    lines.push('- Look for tactical opportunities involving semi-protected pieces');
    lines.push('- Check if any opponent pieces fall into these categories for potential attacks');

    return lines.join('\n');
  }

  private getPieceMap(p: PieceType): string {
    switch(p) {
      case PieceType.Bishop:
        return "bishop";
      case PieceType.Knight:
        return "knight";
      case PieceType.Pawn:
        return "pawn";
      case PieceType.Queen:
        return "queen";
      case PieceType.Rook:
        return "rook";
      case PieceType.King:
        return "king";          
    }

    return "";
  }

  private getColor(p: PieceColour){
    if(p === PieceColour.White){
      return "white";
    }

    return "black";
  }

  private calculatePieceVulnerability(): void {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const [colour, piece] = this.getPieceAt(x, y);

        if (piece !== PieceType.None && piece !== PieceType.King) {
          const defended = colour === PieceColour.White ? this.squaresAttackedByWhite : this.squaresAttackedByBlack;
          const attacked = colour === PieceColour.Black ? this.squaresAttackedByWhite : this.squaresAttackedByBlack;

          const attackers = attacked[x][y];
          const defenders = defended[x][y];

          const xcoord = String.fromCharCode(x + 'a'.charCodeAt(0));
          const ycoord = String.fromCharCode((7 - y) + '1'.charCodeAt(0));
          const coord = `${xcoord}${ycoord}`;

          const pieceDescription = `${this.getColor(colour)} ${this.getPieceMap(piece)}`;

          if (attackers > defenders && defenders === 0) {
            this.hangingPieceDescriptions.push(pieceDescription);
            this.hangingPieceCoordinates.push(coord);
          } else if (attackers === defenders && attackers > 0) {
            this.semiProtectedPieceDescriptions.push(pieceDescription);
            this.semiProtectedPieceCoordinates.push(coord);
          }
        }
      }
    }
  }

  private isInBoard(x: number, y: number): boolean {
    return x >= 0 && x <= 7 && y >= 0 && y <= 7;
  }

  private getPieceType(piece: string): PieceType {
    return piece.toUpperCase() as PieceType;
  }

  private getPieceColour(piece: string): PieceColour {
    return piece === piece.toUpperCase() ? PieceColour.White : PieceColour.Black;
  }

  private getPieceAt(x: number, y: number): [PieceColour, PieceType] {
    const piece = this.board[x][y];
    return [this.getPieceColour(piece), this.getPieceType(piece)];
  }

  private addAttackedSquare(squares: number[][], x: number, y: number): void {
    if (this.isInBoard(x, y)) {
      squares[x][y]++;
    }
  }

  private addAttackedDiagonals(squares: number[][], colour: PieceColour, x: number, y: number): void {
    this.addAttackedDiagonalOrLine(squares, colour, x, y, -1, -1);
    this.addAttackedDiagonalOrLine(squares, colour, x, y, 1, -1);
    this.addAttackedDiagonalOrLine(squares, colour, x, y, 1, 1);
    this.addAttackedDiagonalOrLine(squares, colour, x, y, -1, 1);
  }

  private addAttackedRanksAndFiles(squares: number[][], colour: PieceColour, x: number, y: number): void {
    this.addAttackedDiagonalOrLine(squares, colour, x, y, -1, 0);
    this.addAttackedDiagonalOrLine(squares, colour, x, y, 1, 0);
    this.addAttackedDiagonalOrLine(squares, colour, x, y, 0, 1);
    this.addAttackedDiagonalOrLine(squares, colour, x, y, 0, -1);
  }

  private addAttackedDiagonalOrLine(squares: number[][], colour: PieceColour, x: number, y: number, dx: number, dy: number): void {
    let i = x;
    let j = y;

    let xrays: string[];

    if (dx === 0 || dy === 0) {
      // can x-ray through rooks and queen of same colour
      xrays = colour === PieceColour.White ? ['R', 'Q'] : ['r', 'q'];
    } else {
      // can x-ray through bishops and queen of same colour
      xrays = colour === PieceColour.White ? ['B', 'Q'] : ['b', 'q'];
    }

    while (true) {
      i += dx;
      j += dy;

      if (!this.isInBoard(i, j)) 
        {
            break;
        }

      squares[i][j]++;

      if (!this.board[i][j]) {
        // there is no piece on the square, so continue until the end of the board
        continue;
      }

      if (xrays.includes(this.board[i][j])) {
        // can x-ray right through this
        continue;
      }

      // got to stop now
      break;
    }
  }

  private calculateDefendersAndAttackers(): void {
    // starting top left
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const [colour, piece] = this.getPieceAt(x, y);
        const squares = (colour === PieceColour.White) ? this.squaresAttackedByWhite : this.squaresAttackedByBlack;

        switch (piece) {
          case PieceType.Pawn:
            const dir = colour === PieceColour.White ? -1 : 1;
            this.addAttackedSquare(squares, x - 1, y + dir);
            this.addAttackedSquare(squares, x + 1, y + dir);
            break;
          case PieceType.Knight:
            const knightMoves = [
              [-2, -1], [-2, 1], [-1, -2], [1, -2],
              [2, -1], [2, 1], [-1, 2], [1, 2]
            ];
            for (const [dx, dy] of knightMoves) {
              this.addAttackedSquare(squares, x + dx, y + dy);
            }
            break;
          case PieceType.Bishop:
            this.addAttackedDiagonals(squares, colour, x, y);
            break;
          case PieceType.Rook:
            this.addAttackedRanksAndFiles(squares, colour, x, y);
            break;
          case PieceType.Queen:
            this.addAttackedDiagonals(squares, colour, x, y);
            this.addAttackedRanksAndFiles(squares, colour, x, y);
            break;
          case PieceType.King:
            for (let dx = -1; dx <= 1; dx++) {
              for (let dy = -1; dy <= 1; dy++) {
                if (dx !== 0 || dy !== 0) {
                  this.addAttackedSquare(squares, x + dx, y + dy);
                }
              }
            }
            break;
        }
      }
    }
  }

  private parseFEN(fen: string): void {
    let rank = 0;
    let file = 0;

    for (let i = 0; i < fen.length; i++) {
      const char = fen[i];

      if (char > '0' && char <= '8') {
        const blankCount = parseInt(char, 10);
        file += blankCount;
      } else if (char === '/') {
        rank++;
        file = 0;
      } else {
        if (char === ' ') break;
        this.board[file][rank] = char;
        file++;
      }
    }
  }
}