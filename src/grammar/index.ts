import { allTokens, HoshieLexer } from "./lexer";
import { hoshieParser } from "./parser";
import { loc2Range } from "./util";
import { HoshieVisitor, program } from "./visitor";
import { SyntaxVisitor } from "./syntaxVisitor";

const visitor = new HoshieVisitor(hoshieParser.getAllRules(), allTokens);
const syntaxVisitor = new SyntaxVisitor(hoshieParser.getAllRules(), allTokens);

export function parse(text: string) {
    try {
        const lexResult = HoshieLexer.tokenize(text);
        const lexErrors = lexResult.errors.map(error => {
            return {
                range: loc2Range(error),
                error
            };
        });
        hoshieParser.input = lexResult.tokens;
        const cst = hoshieParser.program();
        const parserErrors = hoshieParser.errors.map(error => {
            return {
                range: loc2Range(error.token),
                error
            };
        });
        const ast: program = visitor.visit(cst);
        let syntaxErrors: any[] = [];
        try {
            syntaxVisitor.clear();
            syntaxVisitor.visit(cst, {});
            syntaxErrors = syntaxVisitor.errors.map(error => {
                return {
                    range: loc2Range(error.token),
                    error: error.error
                };
            });
        } catch (e) {
            //debugger;
        }
        return {
            type: "parse",
            text,
            ast,
            errors: [...lexErrors, ...parserErrors, ...syntaxErrors],
            cst,
            tokens: lexResult.tokens,
            lexErrors: lexResult.errors
        };
    } catch (e) {
        debugger;
    }
}
