import { Color } from "chess.js";
import { BoardState, getBoardState } from "./state";

export class PositionScorer {

    private state: BoardState | undefined;
    private side: Color;


    constructor(fen: string, color: Color){
        this.state = getBoardState(fen);
        this.side = color;
    }

    public get calculateMaterialForSide(): number {
        if(this.side == "w"){
            return this.calculateWhiteMaterial;
        }

        return this.calculateBlackMaterial;
    }

    private get calculateBlackMaterial(): number {
        if(!this.state){
            return 0;
        }
        return this.state.blackmaterial.materialcount;
    }

    private get calculateWhiteMaterial(): number {
         if(!this.state){
            return 0;
        }
        return this.state.whitematerial.materialcount;
    }

    public get calculateMobilityScore(): number {
        if(this.side == "w"){
            return this.calculateWhiteMobilityScore;
        }

        return this.calculateBlackMobilityScore;
    }

    private get calculateWhiteMobilityScore(): number {
         if(!this.state){
            return 0;
        }
        return this.state.whitemobility.totalmobility;
    }

    private get calculateBlackMobilityScore(): number {
         if(!this.state){
            return 0;
        }
        return this.state.blackmobility.totalmobility;
    }

    public get calculateSpaceScore(): number {
        if(this.side == "w"){
            return this.calculateWhiteSpaceScore;
        }

        return this.calculateBlackSpaceScore;
    }

    private get calculateWhiteSpaceScore(): number {
         if(!this.state){
            return 0;
        }
        return this.state.whitespacescore.totalspacecontrolscore;
    }

    private get calculateBlackSpaceScore(): number {
         if(!this.state){
            return 0;
        }
        return this.state.blackspacescore.totalspacecontrolscore;
    }

    public get calculatePositionalScore(): number {
        if(this.side == "w"){
            return this.calculateWhitePositionalScore;
        }

        return this.calculateBlackPositionalScore;
    }

    private get calculateWhitePositionalScore(): number {
         if(!this.state){
            return 0;
        }

        return this.state.whitepositionalscore.weaknessscore;
    }

     private get calculateBlackPositionalScore(): number {
         if(!this.state){
            return 0;
        }

        return this.state.blackpositionalscore.weaknessscore;
    }

    public get calculateKingSafetyScore(): number {
        if(this.side == "w"){
            return this.calculateWhiteKingSafetyScore;
        }

        return this.calculateBlackKingSafetyScore;
    }

    private get calculateWhiteKingSafetyScore(): number {
         if(!this.state){
            return 0;
        }

        return this.state.whitekingsafety.kingsafetyscore;
    }

     private get calculateBlackKingSafetyScore(): number {
         if(!this.state){
            return 0;
        }

        return this.state.blackkingsafety.kingsafetyscore;
    }

}