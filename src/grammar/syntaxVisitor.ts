import { CstNode, IRecognitionException, TokenType } from "chevrotain";
import { Range, DebugAdapterExecutable } from "vscode";
import { hoshieParser } from "./parser";
import { loc2Range } from "./util";
import { isNumber, isBoolean, isString } from "./util";
import { isArray } from "util";
import { type } from "os";


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



    program(ctx, param) {
        const programGlobalVariables: { [key: string]: IDeclaration } = {};
        //const xStatments = this.visit(ctx.statement);
        const statements = ctx.statement?.map((s => this.visit(s, { scope: programGlobalVariables })));


    }

    statement(ctx, param) {
        const assignment = this.visit(ctx.assignment, param);
        const typeDefinition = this.visit(ctx.typeDefinition, param)
    }

    typeDefinition(ctx, param) {
        const structType = this.visit(ctx.structureType, param)
    }

    structureType(ctx, param) {
        const typeID = this.token(ctx.TypeID);
        const assign = this.token(ctx.assign);
        const structure = this.visit(ctx.structure, param)
        if (param.scope[typeID.image]) {
            this.errors.push({
                error: {
                    message: "Duplacate decliration"
                },
                token: typeID
            });
        }
        const retVal = {
            //...declType,
            typeID,// short hand for id:id,
            isArray: !!ctx.ArrayType,
            type() {
                return structure.type()
            }
        }
        param.scope[typeID.image] = retVal
    }

    clear() {
        this.errors = [];
        this.globalVariables = {};
    }

    assignment(ctx, param) {
        const declaration: IDeclaration = this.visit(ctx.declaration, param);
        const assign = this.token(ctx.Assign);
        const expression: IExpression = this.visit(ctx.expression, param);
        const a = declaration.type();
        const b = expression.type();
        if (Array.isArray(a) && Array.isArray(b)) {
            if (!this.arrayCheck(a, b)) {
                this.errors.push({
                    error: {
                        message: "structure dose not match assined value "
                    },
                    token: assign
                })
            }
        }

        else if (assign && declaration && expression && declaration.isArray !== expression.isArray) {
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

    arrayCheck(LArray, RArray) {
        //const retVal = { isSame: true, errorMessage: "" }
        if (LArray.length !== RArray.length) {
            //retVal.isSame = false;
            //retVal.errorMessage = `"Too ${LArray.length() > RArray.length() ? "little" : "many"} right hand"`
            return false
        }

        for (let index = 0; index < LArray.length; index++) {
            if (LArray[index] !== RArray[index]) {
                if (Array.isArray(LArray[index]) && Array.isArray(RArray[index])) {
                    return this.arrayCheck(LArray[index], RArray[index])
                } else {
                    return false
                }
            }

        }
        return true
    }



    declaration(ctx, param): IDeclaration {
        const declType: IDeclType = this.visit(ctx.declType, param);
        const id = this.token(ctx.ID);

        const scope = param?.scope;
        if (scope[id.image]) {
            this.errors.push({
                error: {
                    message: "Duplacate decliration"
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
        const structure = this.visit(ctx.structure, param);
        const primativeType = this.token(ctx.PrimativeType);
        const typeID = this.token(ctx.TypeID);

        return {
            //...structure,
            type() {
                if (typeID) {
                    const a = param.scope[typeID.image].type()
                    return a;
                }
                else if (structure) {
                    //return "structure";  //...structure.type()}

                    return structure.type()
                }
                return primativeType?.image;
            }

        };
    }


    structure(ctx, param): IStructure {

        const newParam: { [key: string]: IDeclaration } = {};
        const declarations = ctx.declaration?.map(d => this.visit(d, { scope: newParam }));
        return {
            ...declarations,
            isStructure: true,
            iamge: "structure",
            type() { return declarations?.map(d => d.type()) }

        };
    }

    expression(ctx, param): IExpression {
        const constExpression = this.visit(ctx.constantExpression, param);
        return {
            isArray: !!constExpression.isArray,
            type() {
                return constExpression.type();
            }
        };
    }

    constantExpression(ctx, param) {
        const constant = this.visit(ctx.constant, param);
        const constantArray = this.visit(ctx.constantArray, param);

        return {
            ...constant,
            ...constantArray,
            type() {
                return !!constant ? constant.type() : constantArray.type();
                //else return constantArray.type()
            }
        };
    }

    constant(ctx, param) {
        const row = this.visit(ctx.row, param);
        return {
            ...row,
            isNumber: !!ctx.Number,
            isBoolean: !!ctx.Boolean,
            isString: !!ctx.String,
            type() {
                if (ctx.Number) {
                    return "number"
                } else if (ctx.Boolean) {
                    return "boolean"
                } else if (ctx.String) {
                    return "string"
                }
                return row.type()
            }
        };
    }

    row(ctx, param) {
        const constantsExpresions = ctx.constantExpression?.map(c => this.visit(c))
        return {
            isRow: true,
            type() {
                return constantsExpresions?.map(c => c.type())
            }
        };
    }

    constantArray(ctx, param) {
        const constants = ctx.constant?.map(c => this.visit(c))
        return {
            isArray: true,
            type() {
                return constants?.map(c => c.type())
            }
        }
    }
}
