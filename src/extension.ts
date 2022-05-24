
import {commands, ExtensionContext, TextDocumentWillSaveEvent, TextEditor, TextEditorSelectionChangeEvent, window, workspace} from 'vscode';
import {ActiveTextEditorsProvider, cleanImports} from './command';

export function activate(context: ExtensionContext): void {
	const activeTextEditorsProvider: ActiveTextEditorsProvider = new ActiveTextEditorsProvider();

	context.subscriptions.push(
		commands.registerCommand('vscode-clean-imports-on-save.cleanImports', () => cleanImports(true, activeTextEditorsProvider)),
		workspace.onWillSaveTextDocument((e: TextDocumentWillSaveEvent) => cleanImports(false, activeTextEditorsProvider, e)),
		window.onDidChangeTextEditorSelection((e: TextEditorSelectionChangeEvent) => activeTextEditorsProvider.addEditor(e.textEditor)),
		window.onDidChangeActiveTextEditor((editor: TextEditor | undefined) => activeTextEditorsProvider.addEditor(editor))
	);
}
