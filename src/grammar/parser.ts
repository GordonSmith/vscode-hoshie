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
                    { ALT: () => $.SUBRULE($.statement) }
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
                { ALT: () => $.SUBRULE($.typeDefinition) }
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
                { ALT: () => $.SUBRULE($.structureType) }
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
                { ALT: () => $.SUBRULE($.primativeType) },
                { ALT: () => $.CONSUME(lex.TypeID) }
            ]);
        });

        $.RULE("primativeType", () => {
            $.OR([
                { ALT: () => $.CONSUME(lex.Boolean) },
                { ALT: () => $.CONSUME(lex.Number) },
                { ALT: () => $.CONSUME(lex.String) }
            ])
        })
        //#endregion

        //#region Constants  ---
        $.RULE("constant", () => {
            $.OR([
                { ALT: () => $.SUBRULE($.array) },
                { ALT: () => $.SUBRULE($.row) },
                { ALT: () => $.SUBRULE($.primativeTypeInstance) }
            ]);
        });

        $.RULE("primativeTypeInstance", () => {
            $.OR([
                { ALT: () => $.CONSUME(lex.StringInstance) },
                { ALT: () => $.CONSUME(lex.NumberInstance) },
                { ALT: () => $.CONSUME(lex.BooleanInstance) }
            ]);
        });

        $.RULE("array", () => {
            $.CONSUME(lex.LSquare);
            $.MANY_SEP({
                SEP: lex.Comma,
                DEF: () => {
                    $.SUBRULE($.expression);
                }
            });
            $.CONSUME(lex.RSquare);
        });

        $.RULE("row", () => {
            $.CONSUME(lex.LCurley);
            $.MANY_SEP({
                SEP: lex.Comma,
                DEF: () => {
                    $.SUBRULE($.expression);
                }
            });
            $.CONSUME(lex.RCurley);
        });
        //#endregion

        //#region Expressions  ---
        $.RULE("expression", () => {
            $.OR([
                { ALT: () => $.SUBRULE($.constant) }
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
