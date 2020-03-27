import { CstParser } from "chevrotain";
import * as lex from "./lexer";

class HoshieParser extends CstParser {

    defineRule(name, implementation, config) {
        // @ts-ignore
        const origRule = super.defineRule(name, implementation, config);
        const wrappedGrammarRule = (idxInCallingRule, args) => {
            const errCount = this.errors.length;
            const retVal = origRule.call(this, idxInCallingRule, args);
            retVal["errors"] = this.errors.slice(errCount, this.errors.length);
            return retVal;
        };
        wrappedGrammarRule["ruleName"] = origRule["ruleName"];
        wrappedGrammarRule["originalGrammarAction"] = origRule["originalGrammarAction"];
        return wrappedGrammarRule;
    }

    constructor() {
        super(lex.allTokens, {
            nodeLocationTracking: "full",
            recoveryEnabled: true
        });

        // not mandatory, using $ (or any other sign) to reduce verbosity (this. this. this. this. .......)
        const $: any = this;

        $.RULE("program", () => {
            $.MANY(() => {
                $.OR([
                    { ALT: () => $.SUBRULE($.comment) },
                    { ALT: () => $.SUBRULE($.statement) },
                ]);
            });
        });

        $.RULE("comment", () => {
            $.OR([
                { ALT: () => $.CONSUME(lex.CommentSingle) },
                { ALT: () => $.CONSUME(lex.CommentMulti) }
            ]);
        });

        $.RULE("statement", () => {
            $.OR([
                { ALT: () => $.SUBRULE($.assignment) },
                { ALT: () => $.SUBRULE($.typeDefinition) },
            ]);
            $.CONSUME(lex.SemiColon);
        });

        $.RULE("assignment", () => {
            $.SUBRULE($.declaration);
            $.CONSUME(lex.Assign);
            $.SUBRULE($.expression);
        });

        //#region Type Definitions  ---
        $.RULE("typeDefinition", () => {
            $.OR([
                { ALT: () => $.SUBRULE($.structureType) },
            ]);
        });

        $.RULE("structureType", () => {
            $.CONSUME(lex.StructureType);
            $.CONSUME(lex.TypeID);
            $.CONSUME(lex.Assign);
            $.SUBRULE($.structure);
        });

        $.RULE("structure", () => {
            $.CONSUME(lex.LCurley);
            $.MANY_SEP({
                SEP: lex.Comma,
                DEF: () => {
                    $.SUBRULE($.declaration);
                }
            });
            $.CONSUME(lex.RCurley);
        });

        $.RULE("declaration", () => {
            $.SUBRULE($.declType);
            $.OPTION(() => {
                $.CONSUME(lex.ArrayType);
            });
            $.CONSUME(lex.ID);
        });

        $.RULE("declType", () => {
            $.OR([
                { ALT: () => $.SUBRULE($.structure) },
                { ALT: () => $.CONSUME(lex.PrimativeType) },
                { ALT: () => $.CONSUME(lex.TypeID) }
            ]);
        });
        //#endregion 

        //#region Constants  ---
        $.RULE("constantExpression", () => {
            $.OR([
                { ALT: () => $.SUBRULE($.constantArray) },
                { ALT: () => $.SUBRULE($.constant) },
            ]);
        });

        $.RULE("constantArray", () => {
            $.CONSUME(lex.LSquare);
            $.MANY_SEP({
                SEP: lex.Comma,
                DEF: () => {
                    $.SUBRULE($.constant);
                }
            });
            $.CONSUME(lex.RSquare);
        });

        $.RULE("constant", () => {
            $.OR([
                { ALT: () => $.SUBRULE($.row) },
                { ALT: () => $.CONSUME(lex.String) },
                { ALT: () => $.CONSUME(lex.Number) },
                { ALT: () => $.CONSUME(lex.Boolean) }
            ]);
        });

        $.RULE("row", () => {
            $.CONSUME(lex.LCurley);
            $.MANY_SEP({
                SEP: lex.Comma,
                DEF: () => {
                    $.SUBRULE($.constantExpression);// changed constant to constantExpression
                }
            });
            $.CONSUME(lex.RCurley);
        });
        //#endregion

        //#region Expressions  ---
        $.RULE("expression", () => {
            $.OR([
                { ALT: () => $.SUBRULE($.constantExpression) },
            ]);
        });
        //#endregion

        this.performSelfAnalysis();
    }

    getAllRules() {
        return this["allRuleNames"];
    }
}

// We only ever need one as the parser internal state is reset for each new input.
interface HoshieParser {
    program();
}
export const hoshieParser = new HoshieParser();
