import { CstNode, IRecognitionException, TokenType } from "chevrotain";
import { Range, DebugAdapterExecutable } from "vscode";
import { hoshieParser } from "./parser";
import { loc2Range } from "./util";
import { isNumber, isBoolean, isString } from "./util";


export interface SyntaxError {
    error: { message: string };
    token: TokenType;
}

type TypeFunc = () => "boolean" | "string" | "number" | "structure" | "typeDef";


interface IDeclType {
    type: TypeFunc;
}

interface IDeclaration extends IDeclType {
    isArray: boolean;
    id: string;
}


interface IExpression {

    isArray: boolean;
    type: TypeFunc;
}

interface IStructure {
    fields: { [key: string]: IDeclaration };
}
interface IConstantExpresion extends IExpression { }

export class SyntaxVisitor extends hoshieParser.getBaseCstVisitorConstructorWithDefaults() {

    errors: SyntaxError[] = [];
    globalVariables: { [key: string]: IDeclaration } = {};
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

    clear() {
        this.errors = [];
        this.globalVariables = {};
    }

    assignment(ctx, param) {
        const declaration: IDeclaration = this.visit(ctx.declaration);
        const assign = this.token(ctx.Assign);
        const expression: IExpression = this.visit(ctx.expression, { scope: declaration });
        if (assign && declaration && expression && declaration.isArray !== expression.isArray) {
            this.errors.push({
                error: {
                    message: "Mismatched Array []"
                },
                token: assign
            });
        }

        else if (assign && declaration && expression && (declaration.type() !== expression.type())) {
            this.errors.push({
                error: {

                    message: `Value not of type ${declaration.type()} `
                },
                token: assign
            });
        }


    }

    declaration(ctx, param): IDeclaration {
        const declType: IDeclType = this.visit(ctx.declType);
        const id = this.token(ctx.ID);

        const scope = param?.scope || this.globalVariables;
        if (scope[id.image]) {
            this.errors.push({
                error: {
                    message: "Duplacate decleration"
                },
                token: id
            });
        }

        const retVal = {
            //...declType,
            id,// short hand for id:id,
            isArray: !!ctx.ArrayType,
            type() {
                return declType.type()


            }
        }
        scope[id.image] = retVal;
        return retVal;
    }

    declType(ctx, param): IDeclType {
        const structure = this.visit(ctx.structure);
        const primativeType = this.token(ctx.PrimativeType);
        const typeID = this.token(ctx.TypeID);

        return {

            type() {
                if (structure || typeID) {
                    return "structure";  //...structure.type()}
                }
                return primativeType.image;
            }

        };
    }


    structure(ctx, param): IStructure {
        const declarations = ctx.declaration?.map(d => this.visit(d, { scope: {} }));
        return {
            ...declarations,
            isStructure: true,
            iamge: "structure",
            type() { return true }

        };
    }

    expression(ctx, param): IExpression {
        const constExpression = this.visit(ctx.constantExpression, param);
        return {
            isArray: constExpression.isArray,
            type() {
                if (constExpression?.isRow) return "structure";
                if (constExpression?.isNumber) return "number";
                if (constExpression?.isBoolean) return "boolean";
                return "string";


            }
        };
    }

    constantExpression(ctx, param) {
        const constant = this.visit(ctx.constant, param);
        const constantArray = this.visit(ctx.constantArray, param);
        return {
            ...constant,
            isArray: !!ctx.constantArray
        };
    }

    constant(ctx, param) {
        return {
            isRow: !!ctx.row,
            isNumber: !!ctx.Number,
            isBoolean: !!ctx.Boolean,
            isString: !!ctx.String
        };
    }
    constantArray(ctx, param) {
        return true;
    }
}
