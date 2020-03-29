import { CstNode, IRecognitionException, TokenType } from "chevrotain";
import { Range, DebugAdapterExecutable } from "vscode";
import { hoshieParser } from "./parser";
import { loc2Range } from "./util";
import { isNumber, isBoolean, isString } from "./util";
import { isArray } from "util";
import { type } from "os";
import { BooleanInstance } from "./lexer";
import { IpcNetConnectOpts } from "net";


export interface SyntaxError {
    error: { message: string };
    token: TokenType;
}

type TypeFunc = () => "boolean" | "string" | "row" | "number" | "structure" | "typeDef";
type TypeOfFunc = () => "primativeType" | "boolean" | "string" | "row" | "array" | "number" | "structure" | "typeDef";


interface IPrimativeType {
    type: TypeFunc;
    typeOf: TypeOfFunc;
}

interface IPrimativeTypeInstance extends IPrimativeType {

}
interface IConstant {
    type: TypeFunc;
    typeOf: TypeOfFunc;
}
interface IExpression extends IConstant {
}

interface IRow extends IConstant {

}
interface IArray extends IConstant { }

interface IAssign {
    type: TypeFunc;
    typeOf: TypeFunc;
}

interface IArrayEqual {
    (input: Array<any>): string
}
interface IDeclType {
    name;
    type: TypeFunc;
    typeOf: TypeOfFunc;
}
interface IDeclaration extends IDeclType {

    isArray: boolean;
    id: string;
}
interface IStructure {
    fields: { [key: string]: IDeclaration };
    type();
    typeOf();
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
        const typeID = this.typeIDLex(ctx.TypeID, param);
        const typeID2 = this.token(ctx.TypeID);
        const assign = this.token(ctx.assign);
        const structure = this.visit(ctx.structure, param)

        const retVal = {
            ...structure,
        }
        param.scope[typeID2.image] = retVal

    }

    clear() {
        this.errors = [];
        this.globalVariables = {};
    }

    assignment(ctx, param) {
        const declaration: IDeclaration = this.visit(ctx.declaration, param);
        const assign = this.token(ctx.Assign);
        const expression: IExpression = this.visit(ctx.expression, param);
        const a = declaration.typeOf();
        const b = expression.typeOf();
        if (declaration.type() === "structure" && expression.type() === "row") {
            if (!this.arrayCheck(declaration, expression)) {
                this.errors.push({
                    error: {
                        message: "structure dose not match assined value "
                    },
                    token: assign
                })
            }
        }

        else if (assign && declaration && expression && declaration.typeOf() !== expression.typeOf()) {
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

        if (LArray.length !== RArray.length) {
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
        if (!id) {
            this.errors.push({
                error: {
                    message: "No ID for declration"
                },
                token: declType
            })
        }
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
            ...declType,
            id,// short hand for id:id,
            isArray: !!ctx.ArrayType,


        }
        scope[id.image] = retVal;
        return retVal;
    }

    declType(ctx, param): IDeclType {
        const structure = this.visit(ctx.structure, param);
        const primativeType = this.visit(ctx.primativeType, param);
        const typeIdR = this.typeIDLex(ctx, param)
        return {
            ...structure,
            ...primativeType,
            ...typeIdR
        };
    }

    typeIDLex(ctx, param) {
        const typeID = this.token(ctx.TypeID)

        if (!!!typeID) {
            return undefined
        }
        return {
            type() {
                return param.scope[typeID.image].type();
            }, typeOf() {
                return param.scope[typeID.image].typeOf();
            }
        }
    }

    primativeType(ctx, param): IPrimativeType {
        const Boolean = this.token(ctx.Boolean)
        const Number = this.token(ctx.Number)
        const String = this.token(ctx.String)
        let bool = true
        let retVal
        if (Boolean) {
            retVal = "boolean"
        } else if (Number) {
            retVal = "number"
        } else if (String) {
            retVal = "string"
        } else {
            bool = false
            retVal = "boolean"
        }
        return {
            type() {
                return retVal
            },
            typeOf() {
                return "primativeType"
            }
        }
    }


    structure(ctx, param): IStructure {

        const newParam: { [key: string]: IDeclaration } = {};
        const declarations = ctx.declaration?.map((d: CstNode | CstNode[]) => this.visit(d, { scope: newParam }));
        return {
            ...declarations,
            typeOf() { return "structure" },
            type() {
                return declarations?.map(d => d.type())
            }

        };
    }

    expression(ctx, param): IExpression {
        const constant: IConstant = this.visit(ctx.constant, param);
        return {
            ...constant
        };
    }

    constant(ctx, param): IConstant {
        const row: IRow = this.visit(ctx.row, param);
        const array: IArray = this.visit(ctx.array, param);
        const primativeTypeInstance: IPrimativeTypeInstance = this.visit(ctx.primativeTypeInstance, param);

        return {
            ...row,
            ...array,
            ...primativeTypeInstance
        };
    }

    primativeTypeInstance(ctx, param): IPrimativeTypeInstance {
        const BooleanInstance = this.token(ctx.BooleanInstance)
        const NumberInstance = this.token(ctx.NumberInstance)
        const StringInstance = this.token(ctx.StringInstance)
        let retVal
        if (BooleanInstance) {
            retVal = "boolean"
        } else if (NumberInstance) {
            retVal = "number"
        } else if (StringInstance) {
            retVal = "string"
        } else {
            retVal = "boolean"
        }
        return {
            typeOf() {
                return "primativeType"
            },
            type() {
                return retVal
            }
        }

    }

    row(ctx, param): IRow {
        const expresions = ctx.expression?.map((e: CstNode | CstNode[]) => this.visit(e, param))
        return {
            typeOf() {
                return "row"
            },
            type() {
                return expresions?.map((e: IExpression) => e.type())
            }

        };
    }

    array(ctx, param): IArray {
        const LSquare = this.token(ctx.LSquare);
        const expressions = ctx.expression?.map((e: CstNode | CstNode[]) => this.visit(e, param));
        const expressionTypes = expressions?.map((e: IExpression) => e.typeOf());
        const result = this.allEqual(expressionTypes);

        if (!result.result) {
            this.errors.push({
                error: {
                    message: "Array Malformed"
                },
                token: LSquare
            });
        }

        return {
            typeOf() { return "array" },
            type() {
                return expressions?.map((e: IExpression) => e.type())



            }
        }
    }



    allEqual(array: Array<any>) {
        if (array.length == 0) {
            return { result: false }
        }
        var pervious = array[0]
        array.forEach(element => {
            if (pervious != element) {
                return { result: false }
            }
            pervious = element;
        });
        return {
            result: true,
            lastElType: pervious
        }

    }
}
