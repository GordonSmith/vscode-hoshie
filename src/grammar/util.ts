import { Position, Range } from "vscode";

export function loc2Range(loc): Range {
    const start = new Position(loc.startLine - 1, loc.startColumn - 1);
    const end = new Position(loc.endLine - 1, loc.endColumn);
    return new Range(start, end);
}

export const isBoolean = (str: string) => str === "boolean";
export const isString = (str: string) => str === "string";
export const isNumber = (str: string) => str === "number";