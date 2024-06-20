import { IdentifierDsAst, TermDsAst, ExpressionDsAst } from 'src/types/DesugaredAst';
import { make_identifier } from "src/utils/make_desugared_ast";

// export type DesugaredRepresentation = [ExpressionDsAst, TermDsAst[]];
export type DesugaredWithFrsh = [ExpressionDsAst, TermDsAst[], FreshLvarScope];
export class FreshLvarScope {
    private lvarCounter: number = 0;
    private currentlyScopedLvars: IdentifierDsAst[] = [];

    freshLvar(): IdentifierDsAst {
        const currLvars = make_identifier(`_lvar${this.lvarCounter++}`);
        this.currentlyScopedLvars.push(currLvars);
        return currLvars;
    }
}
