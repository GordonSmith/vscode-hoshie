import * as vscode from "vscode";
import { Commands } from "./command";
import { Diagnostic } from "./diagnostic";
import { DocumentSymbolProvider } from "./documentSymbolProvider";

export function activate(ctx: vscode.ExtensionContext): void {
    Commands.attach(ctx);
    Diagnostic.attach(ctx);
    DocumentSymbolProvider.attach(ctx);
}
