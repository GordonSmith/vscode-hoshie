import { CstNode, IRecognitionException, TokenType } from "chevrotain";
import { Range } from "vscode";
import { hoshieParser } from "./parser";
import { loc2Range } from "./util";

export type Node = { range: Range, recoveredNode: boolean, errors: IRecognitionException[] };
export type program = ReturnType<HoshieVisitor["program"]>;
export type statement = ReturnType<HoshieVisitor["statement"]> & Node;
export type assignment = ReturnType<HoshieVisitor["assignment"]> & Node;
export type embed = ReturnType<HoshieVisitor["embed"]> & Node;
export type comment = ReturnType<HoshieVisitor["comment"]> & Node;
export type declaration = ReturnType<HoshieVisitor["declaration"]> & Node;
export type expression = ReturnType<HoshieVisitor["expression"]> & Node;
export type declType = ReturnType<HoshieVisitor["declType"]> & Node;
export type constant = ReturnType<HoshieVisitor["constant"]> & Node;
export type functionT = ReturnType<HoshieVisitor["function"]> & Node;
export type record = ReturnType<HoshieVisitor["constant"]> & Node;

export class HoshieVisitor extends hoshieParser.getBaseCstVisitorConstructorWithDefaults() {

    constructor(ruleNames: string[], tokenTypes: TokenType[]) {
        super();
        this.validateVisitor();
    }

    protected walk<T>(cstNode: CstNode | CstNode[], param?): T | undefined {
        const node = Array.isArray(cstNode) ? cstNode[0] : cstNode;
        if (node === undefined) { return undefined; }
        const retVal = this.visit.call(this, cstNode, param);
        if (retVal === undefined) { return undefined; }
        retVal.recoveredNode = retVal.recoveredNode || node.recoveredNode;
        retVal.range = loc2Range(node.location);
        retVal.errors = node["errors"] || [];
        return retVal;
    }

    protected walkMany<T extends Node>(items: CstNode[]): T[] {
        if (items === undefined) { return []; }
        return items.map(item => this.walk<T>(item)).filter(item => !!item) as T[];
    }

    protected walkOr<T extends Node>(...items: CstNode[]): T | undefined {
        const manyItems = this.walkMany<T>(items);
        return manyItems[0];
    }

    protected tokenMap(ctx) {
        if (ctx === undefined) { return undefined; }
        return ctx.map(item => this.token(item));
    }

    protected token(ctx) {
        if (ctx === undefined) { return undefined; }
        const node = Array.isArray(ctx) ? ctx[0] : ctx;
        if (!node) { throw new Error("Invalid token"); }
        return {
            type: node.tokenType.name,
            image: node.image,
            range: loc2Range(node)
        };
    }

    program(ctx, param) {
        return {
            type: "program",
            statements: this.walkMany<statement>(ctx.statement)
        };
    }

    // statementComma(ctx, param) {
    //     return {
    //         type: "statementLine",
    //         content: this.walk<statement>(ctx.statement),
    //         semiColon: this.token(ctx.SemiColon),
    //         format(this: any, prefix: string = "") {
    //             return `${prefix}${this.content.format()}${this.semiColon ? ", " : ""}`;
    //         }
    //     };
    // }

    statement(ctx, param) {
        return {
            type: "statement",
            content: this.walkOr<comment | embed | assignment | declaration | constant>(ctx.comment, ctx.embed, ctx.assignment, ctx.declaration, ctx.constant),
            format(this: any, prefix: string = "") {
                return `${prefix}${this.content.format()}${this.semiColon ? ";" : ""}`;
            }
        };
    }

    unknown(ctx, param) {
        return undefined;
    }

    comment(ctx, param) {
        return this.token(ctx.CommentSingle) || this.token(ctx.CommentMulti);
    }

    embed(ctx, param) {
        return this.token(ctx.Embed) || this.token(ctx.EmbedCPP);
    }

    assignment(ctx, param) {
        return {
            type: "assignment",
            lhs: this.walk<declaration>(ctx.declaration),
            assign: this.token(ctx.Assign),
            rhs: this.walk<expression>(ctx.expression),
            format(this: any) {
                return `${this.lhs.format()} := ${this.rhs.format()}`;
            }
        };
    }

    declaration(ctx, param) {
        return {
            type: "declaration",
            declType: this.walk<declType>(ctx.declType),
            id: this.token(ctx.ID),
            format(this: any) {
                return `${this.declType ? this.declType.image + " " : ""}${this.id.image}`;
            }
        };
    }

    declType(ctx, param) {
        return this.token(ctx.RealType) ||
            this.token(ctx.DecimalType) ||
            this.token(ctx.IntegerType) ||
            this.token(ctx.StringType)
            ;
    }

    expression(ctx, param) {
        return {
            type: "expression",
            content: this.walkOr<functionT | constant | record>(ctx.function, ctx.record, ctx.constant),
            format(this: any) {
                return `${this.content.format()}`;
            }
        };
    }

    constant(ctx, param) {
        return {
            type: "constant",
            content:
                this.walk(ctx.structure) ||
                this.token(ctx.String) ||
                this.token(ctx.Number) ||
                this.token(ctx.Boolean),
            format(this: any) {
                return `${this.content.image}`;
            }
        };
    }

    function(ctx, param) {
        return {
            type: "function",
            function: this.token(ctx.Function),
            lparen: this.token(ctx.LParen),
            content: this.walkMany<constant>(ctx.function || ctx.constant || ctx.ID),
            rparen: this.token(ctx.RParen),
            format(this: any) {
                return `${this.function.image}(${this.content.map(s => s.format()).join(", ")})`;
            }
        };
    }

    structure(ctx, param) {
        return {
            type: "structure",
            content: this.walkMany<declaration>(ctx.declaration),
            format(this: any) {
                return `${this.record.image}\n${this.content.map(s => s.format("    ")).join("\n")}\n${this.end.image}`;
            }
        };
    }
}
