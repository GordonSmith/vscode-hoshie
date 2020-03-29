import { CstNode, IRecognitionException, TokenType, Lexer } from "chevrotain";
import { Range, DebugAdapterExecutable } from "vscode";
import { hoshieParser } from "./parser";
import { loc2Range } from "./util";
import { isNumber, isBoolean, isString } from "./util";
import { isArray, isDeepStrictEqual } from "util";
import { type } from "os";


export interface SyntaxError {
    error: { message: string };
    token: TokenType;
}

type CodeGenFunc = () => string
type Types = "boolean" | "string" | "number" | "structure" | "array" | "typeDef";
type TypeFunc = () => Types;

interface IVisited {
    visitedType: string;
}

interface IDeclType extends IVisited {
    type: TypeFunc;
    details: IStructure | TokenType;
}

interface IDeclaration extends IDeclType {
    isArray: boolean;
    id: string;
    codeGen: CodeGenFunc;
}

interface IExpression extends IVisited {
    isArray: boolean;
    instanceOf: Types;
    codeGen: CodeGenFunc;
}

interface IStructure extends IVisited {
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
                    message: "Duplacate declaration"
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
        const b = expression.instanceOf;
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
        else if (assign && declaration && expression && (declaration.type() !== expression.instanceOf)) {
            this.errors.push({
                error: {
                    message: `Value not of type ${declaration.type()} `
                },
                token: assign
            });
        }
        else if (declaration.type() == "structure" && expression.instanceOf == "structure") {

        }
        const test = `${declaration.codeGen()} = ${expression.codeGen()}` // Line for debug
        return {
            codeGen() {
                return `${declaration.codeGen()} = ${expression.codeGen()}`
            }
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
                    message: "Duplacate declaration"
                },
                token: id
            });
        }

        const retVal = {
            visitedType: "IDeclaration",
            //...declType,
            id,// short hand for id:id,
            isArray: !!ctx.ArrayType,
            details: declType.details,
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
            visitedType: "IDeclType",
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
            },
            details: structure || primativeType
        };
    }


    structure(ctx, param): IStructure {
        const newParam: { [key: string]: IDeclaration } = {};
        const declarations = ctx.declaration?.map(d => this.visit(d, { scope: newParam }));
        return {
            visitedType: "IStructure",
            ...declarations,
            isStructure: true,
            type() {
                return "structure"
            },
            fields: declarations?.map(d => d.type()),
            codeGen() {
                return '';
            }
        };
    }

    expression(ctx, param): IExpression {
        const constExpression = this.visit(ctx.constantExpression, param);
        return {
            visitedType: "IExpression",
            isArray: !!constExpression.isArray,
            codeGen() {
                return constExpression.codeGen();
            },
            instanceOf: constExpression.instanceOf()
        };
    }

    constantExpression(ctx, param) {
        const constant = this.visit(ctx.constant, param);
        const constantArray = this.visit(ctx.constantArray, param);

        return {
            ...constant,
            ...constantArray,
            instanceOf() {
                return !!constant ? constant.instanceOf() : constantArray.instanceOF();
                //else return constantArray.type()
            },
            codeGen() {
                return !!constant ? constant.codeGen() : constantArray.codeGen();
            }
        };
    }

    constant(ctx, param) {
        const row = this.visit(ctx.row, param);
        const image = !!row ? "Row support WIP" : this.token(ctx.Number || ctx.Boolean || ctx.String).image;
        return {
            ...row,
            isNumber: !!ctx.Number,
            isBoolean: !!ctx.Boolean,
            isString: !!ctx.String,
            instanceOf() {
                if (ctx.Number) {
                    return "number"
                } else if (ctx.Boolean) {
                    return "boolean"
                } else if (ctx.String) {
                    return "string"
                }
                return row.instanceOf()
            },
            codeGen() {
                return `${image}`
            }
        };
    }

    row(ctx, param) {
        const constantsExpresions = ctx.constantExpression?.map(c => this.visit(c))
        return {
            isRow: true,
            instanceOf() {
                return constantsExpresions?.map(c => c.instanceOf())
            },
            // calculateDeclTypes(): IDeclType[] {
            //     const retVal :IDeclType[] =[];
            //     constantsExpresions?.forEach(c => {
            //         retVal.push({
            //             type:()=>c.type(),
            //             details: c.details // || Primative TokenType
            //         })
            //     })
            // return retVal
            // },
        };
    }

    constantArray(ctx, param) {
        const constants = ctx.constant?.map(c => this.visit(c))
        return {
            isArray: true,
            values: constants?.map(c => c.instanceOf()),
            instanceOF() {
                return "array"
            },
            codeGen() {
                // var codeStr = '[';
                // for (let i = 0; i < constants.length - 1; i++) {
                //     codeStr += constants[i].codeGen() + ","
                // }
                // codeStr += constants[constants.length - 1].codeGen() + "]"
                // return codeStr
                const a = JSON.stringify(constants?.map(c => c.codeGen()));
                return a// JSON.stringify(constants?.map(c => c.codeGen())); 
            }
        }
    }
}
