import { Position, Range } from "vscode";

export function loc2Range(loc): Range {
    const start = new Position(loc.startLine - 1, loc.startColumn - 1);
    const end = new Position(loc.endLine - 1, loc.endColumn);
    return new Range(start, end);
}

export const isBoolean = (str: string) => str === "boolean";
export const isString = (str: string) => str === "string";
export const isNumber = (str: string) => str === "number";


function AsssignmentComparison(declaration, expression) {

    if (declaration.isRow) { }
    if (declaration.isArray) { }
    if (expression.isRow) { }
    if (expression.isArray) { }
    if (declaration.type() !== expression.type()) {

        const error = {
            message: `Value not of type ${declaration.type()}`
        }
        return { isError: true, errorMessage: error };
    }



    /*
    const errors: SyntaxError[] = [];
    const xDecleration = xParam?.xDecleration;
    const xExpression = xParam?.xExpression;

    if (!!!xParam?.gen) {
        xParam.gen = true
        xParam.genDec = xDecleration();
        xParam.genExp = xExpression();
    }

    const cDecVal = xDecleration.next().value;
    const cExpVal = xExpression.next().value;

    if (cDecVal !== cExpVal) */

}
export function dteCheck(x, y) {

    if (x !== y) {
        return false
    }
    return true
}