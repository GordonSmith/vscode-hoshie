import { allTokens, HoshieLexer } from "./lexer";
import { hoshieParser } from "./parser";
import { loc2Range } from "./util";
import { SyntaxVisitor } from "./syntaxVisitor";
import { Range, Position } from "vscode";
import { ILexingError, IRecognitionException } from "chevrotain";

const syntaxVisitor = new SyntaxVisitor(hoshieParser.getAllRules(), allTokens);

const NullPosition = new Position(0, 0);
const NullRange = new Range(NullPosition, NullPosition);

interface IError {
    source: string;
    range: Range;
    error: { message: string };
}

export function parse(text: string) {
    const errors: IError[] = [];

    try {
        const lexResult = HoshieLexer.tokenize(text);
        lexResult.errors.forEach(error => {
            errors.push({
                source: "HoshieLexer",
                range: loc2Range(error),
                error
            });
        });

        try {
            hoshieParser.input = lexResult.tokens;
            const cst = hoshieParser.program();
            hoshieParser.errors.forEach(error => {
                errors.push({
                    source: "hoshieParser",
                    range: loc2Range(error.token),
                    error
                });
            });

            try {
                syntaxVisitor.clear();
                syntaxVisitor.visit(cst, {});
                syntaxVisitor.errors.forEach(error => {
                    errors.push({
                        source: "syntaxVisitor",
                        range: loc2Range(error.token),
                        error: error.error
                    });
                });
            } catch (e) {
                errors.push({
                    source: "syntaxVisitor",
                    range: NullRange,
                    error: e
                });
            }

        } catch (e) {
            errors.push({
                source: "hoshieParser",
                range: NullRange,
                error: e
            });
        }

    } catch (e) {
        errors.push({
            source: "HoshieLexer",
            range: NullRange,
            error: e
        });
    }

    return {
        type: "parse",
        text,
        errors
    };
}
