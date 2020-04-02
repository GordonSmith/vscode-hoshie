import * as vscode from "vscode";

export let commands: Commands;
export class Commands {
    _ctx: vscode.ExtensionContext;

    private constructor(ctx: vscode.ExtensionContext) {
        this._ctx = ctx;
        ctx.subscriptions.push(vscode.commands.registerCommand("hoshie.helloHoshie", this.helloWorld));
    }

    static attach(ctx: vscode.ExtensionContext): Commands {
        if (!commands) {
            commands = new Commands(ctx);
        }
        return commands;
    }

    helloWorld() {
        vscode.window.showInformationMessage('Woof!');
    }
}
