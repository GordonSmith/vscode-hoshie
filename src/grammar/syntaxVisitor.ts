import { CstNode, IRecognitionException, TokenType } from "chevrotain";
import { Range } from "vscode";
import { hoshieParser } from "./parser";
import { loc2Range } from "./util";

export interface SyntaxError {
    error: { message: string };
    token: TokenType;
}

export class SyntaxVisitor extends hoshieParser.getBaseCstVisitorConstructorWithDefaults() {

    errors: SyntaxError[] = [];

    protected token(ctx) {
        if (ctx === undefined) return undefined;
        const node = Array.isArray(ctx) ? ctx[0] : ctx;
        if (!node) throw new Error("Invalid token");
        return node;
    }

    constructor(ruleNames: string[], tokenTypes: TokenType[]) {
        super();
        this.validateVisitor();
    }

    assignment(ctx, param) {
        const declaration = this.visit(ctx.declaration);
        const assign = this.token(ctx.Assign);
        const expression = this.visit(ctx.expression);
        if (assign && declaration && expression && declaration.isArray !== expression.isArray) {
            this.errors.push({
                error: {
                    message: "Mismatched Array []"
                },
                token: assign
            });
        }
    }

    declaration(ctx, param) {
        return {
            isArray: !!ctx.ArrayType
        }
    }

    expression(ctx, param) {
        const constExpression = this.visit(ctx.constantExpression);
        return {
            isArray: constExpression?.isArray
        }
    }

    constantExpression(ctx, param) {
        return {
            isArray: !!ctx.constantArray
        }
    }
}
