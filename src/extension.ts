
import {commands, ExtensionContext, workspace} from 'vscode';
import {cleanImports} from './command';

export function activate(context: ExtensionContext) {
	context.subscriptions.push(
		commands.registerCommand('vscode-clean-imports-on-save.cleanImports', cleanImports),
		workspace.onWillSaveTextDocument(() => cleanImports())
	);
}
