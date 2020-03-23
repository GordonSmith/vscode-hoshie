import { scopedLogger } from "@hpcc-js/util";
import * as vscode from "vscode";
import { parse } from "../grammar/index";
import { assignment, declaration } from "../grammar/visitor";
import { Diagnostic } from "./diagnostic";

const logger = scopedLogger("documentSymbolProvider.ts");

export let documentSymbolProvider: DocumentSymbolProvider;
export class DocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    protected _ctx: vscode.ExtensionContext;

    protected _Diagnostic: Diagnostic;

    private constructor(ctx: vscode.ExtensionContext) {
        this._ctx = ctx;
        ctx.subscriptions.push(vscode.languages.registerDocumentSymbolProvider("hoshie", this));
        this._Diagnostic = Diagnostic.attach(ctx);
    }

    static attach(ctx: vscode.ExtensionContext): DocumentSymbolProvider {
        if (!documentSymbolProvider) {
            documentSymbolProvider = new DocumentSymbolProvider(ctx);
        }
        return documentSymbolProvider;
    }

    provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SymbolInformation[] | vscode.DocumentSymbol[]> {
        const retVal: vscode.DocumentSymbol[] = [];
        function addSymbol(name: string | undefined, detail: string, kind: vscode.SymbolKind, range: vscode.Range, selectionRange: vscode.Range | undefined) {
            if (name) {
                retVal.push(new vscode.DocumentSymbol(name, detail, kind, range, selectionRange ?? range));
            }
        }

        const parsed = parse(document.getText());
        if (parsed) {
            parsed.ast.statements.filter(s => s.content).forEach(s => {
                switch (s.content?.type) {
                    case "assignment":
                        const assign = s.content as assignment;
                        addSymbol(assign.lhs?.id?.image, "assignment - " + (assign.errors.length ? "partial" : "full"), vscode.SymbolKind.Variable, s.range, assign.lhs?.range);
                        break;
                    case "declaration":
                        const decl = s.content as declaration;
                        addSymbol(decl.id?.image, "declaration - " + (decl.errors.length ? "partial" : "full"), vscode.SymbolKind.Variable, s.range, decl.id?.range);
                        break;
                }
            });
            const parserErrors = parsed.errors.map(e => {
                return new vscode.Diagnostic(e.range, e.error.message, vscode.DiagnosticSeverity.Error);
            });
            this._Diagnostic.set(document.uri, parserErrors);
        }

        return retVal;
    }
}
