import { CstNode, IRecognitionException, TokenType } from "chevrotain";
import { Range, DebugAdapterExecutable } from "vscode";
import { hoshieParser } from "./parser";
import { loc2Range } from "./util";
import { isNumber, isBoolean, isString } from "./util";


export interface SyntaxError {
    error: { message: string };
    token: TokenType;
}

type CodeGenFunc = () => string
type TypeFunc = () => "boolean" | "string" | "number" | "structure" | "typeDef";

interface IDeclType {
    type: TypeFunc;
}

interface IDeclaration extends IDeclType {
    isArray: boolean;
    id: string;
    codeGen: CodeGenFunc;
}


interface IExpression {
    isArray: boolean;
    type: TypeFunc;
    codeGen: CodeGenFunc;
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
        const declaration: IDeclaration = this.visit(ctx.declaration, param);
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
        const test = `${declaration.codeGen()} = ${expression.codeGen()}` // Line for debug
        return {
            codeGen() {
                return `${declaration.codeGen()} = ${expression.codeGen()}`
            }
        }
    }

    declaration(ctx, param): IDeclaration {
        const declType: IDeclType = this.visit(ctx.declType, param);
        const id = this.token(ctx.ID);

        const scope = param?.scope || this.globalVariables;
        if (scope[id.image]) {
            this.errors.push({
                error: {
                    message: "Duplacate declaration"
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
            },
            codeGen() {
                return `var ${id.image}: ${this.type().replace(/^\w/, c => c.toUpperCase())}${this.isArray ? "[]" : ""}`
            }
        }
        scope[id.image] = retVal;
        return retVal;
    }

    declType(ctx, param): IDeclType {
        const structure = this.visit(ctx.structure, param);
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
        const declarations = ctx.declaration?.map(d => this.visit(d, param));
        return {
            ...declarations,
            isStructure: true,
            image: "structure",
            type() {
                return true
            },
            codeGen() {
                return '';
            }
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
            },
            codeGen() {
                return constExpression.codeGen();
            }
        };
    }

    constantExpression(ctx, param) {
        const constant = this.visit(ctx.constant, param);
        const constantArray = this.visit(ctx.constantArray, param);
        var token = this.token(constant || constantArray);
        return {
            ...constant,
            isArray: !!ctx.constantArray,
            codeGen() {
                return token.codeGen();
            }
        };
    }

    constant(ctx, param) {
        const isRow = !!ctx.row
        const isNumber = !!ctx.Number
        const isBoolean = !!ctx.Boolean
        const isString = !!ctx.String

        const image = isRow ? "Row support WIP" : this.token(ctx.Number || ctx.Boolean || ctx.String).image;

        return {
            isRow,
            isNumber,
            isBoolean,
            isString,
            codeGen() {
                return `${image}`
            }
        };
    }

    constantArray(ctx, param) {
        const constants = ctx.constant?.map(c => this.visit(c, param));

        return {
            isArray: true,
            codeGen() {
                var codeStr = '[';
                for (let i = 0; i < constants.length - 1; i++) {
                    codeStr += constants[i].codeGen() + ","
                }
                codeStr += constants[constants.length - 1].codeGen() + "]"
                return codeStr
            }
        };
    }
}
