import * as vscode from "vscode";

let eclDiagnosticCollection: vscode.DiagnosticCollection;

export let diagnostic: Diagnostic;
export class Diagnostic {
    _ctx: vscode.ExtensionContext;

    private constructor(ctx: vscode.ExtensionContext) {
        this._ctx = ctx;
        eclDiagnosticCollection = vscode.languages.createDiagnosticCollection("hoshie");
        ctx.subscriptions.push(eclDiagnosticCollection);
    }

    static attach(ctx: vscode.ExtensionContext): Diagnostic {
        if (!diagnostic) {
            diagnostic = new Diagnostic(ctx);
        }
        return diagnostic;
    }

    set(uri: vscode.Uri, diagnostics: vscode.Diagnostic[]) {
        eclDiagnosticCollection.set(uri, diagnostics);
    }
}
