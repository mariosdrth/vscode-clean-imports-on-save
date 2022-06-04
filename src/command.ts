import {EndOfLine, Position, Range, TextDocument, TextDocumentWillSaveEvent, TextEditor, window, workspace, WorkspaceConfiguration, WorkspaceEdit} from 'vscode';
import {NodePath, ParseResult, parseSync, traverse, types} from '@babel/core';

export class ActiveTextEditorsProvider {
    activeTextEditors: TextEditor[];

    constructor() {
        this.activeTextEditors = [];
    }

    addEditor(textEditor: TextEditor | undefined): void {
        if (!textEditor || this.activeTextEditors.some(editor => editor.document.uri === textEditor.document.uri)) {
            return;
        }
        this.activeTextEditors.push(textEditor);    }
}

export const cleanImports: (ignoreSettings: boolean, activeTextEditorsProvider?: ActiveTextEditorsProvider, e?: TextDocumentWillSaveEvent) => void = (ignoreSettings, activeTextEditorsProvider, e) => {
    if (e) {
        activeTextEditorsProvider?.addEditor(window.activeTextEditor);
    }
    const textEditor: TextEditor | undefined = activeTextEditorsProvider?.activeTextEditors.filter(editor => editor.document.uri === e?.document.uri)[0];
    const activeTextEditor: TextEditor | undefined = textEditor ? textEditor : window.activeTextEditor;
    const configuration: WorkspaceConfiguration = workspace.getConfiguration('cleanImports');
    const enabled: boolean = configuration.get<boolean>('enableOnSave', true);
    const languages: string[] = [
        'javascript',
        'javascriptreact',
        'typescript',
        'typescriptreact'
    ];

    if (!ignoreSettings && !enabled) {
        return;
    }

    if (!activeTextEditor || !activeTextEditor.document || activeTextEditor.document.uri.scheme !== 'file') {
        return;
    }

    if (!languages.includes(activeTextEditor.document.languageId)) {
        return;
    }

    updateEditorContent(activeTextEditor);
};

export const updateEditorContent: (editor: TextEditor) => Promise<void> = async (editor) => {
    const maxRange: Range = new Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE);
    const code: string = removeUnusedAndFormatImports(editor.document, editor.document.eol);

    // If the contents of the editor are the same just return and continue the save operation
    if (code.length === 0) {
        return;
    }

    const edit: WorkspaceEdit = new WorkspaceEdit();
    edit.replace(editor.document.uri, maxRange, code);
    await workspace.applyEdit(edit);
    editor.document.save();
};

export const removeUnusedAndFormatImports: (document: TextDocument, eol?: EndOfLine) => string = (document, eol) => {
    const code: string = document.getText();
    const unusedImports: string[] = getUnusedImports(code)[0];
    const importLines: Set<number> = getUnusedImports(code)[1];
    const lastLine: number | undefined = Array.from(importLines).sort((a, b) => a - b).pop();

    // If no unused imports found return
    if (!unusedImports || unusedImports.length === 0 || !lastLine) {
        return '';
    }

    let endOfLineCharacter: string = '\r\n';
    if (eol === EndOfLine.LF) {
        endOfLineCharacter = '\n';
    }

    // Split editor content to imports and "actual" code
    let importStatementsInitial: string = document.getText(new Range(new Position(0, 0), new Position(lastLine, lastLine)));
    const pureCode: string = code.replace(importStatementsInitial, '');
    let importStatementsReformed: string = importStatementsInitial;

    // If no "actual" code found return
    if (!pureCode.match(/\S/)) {
        return '';
    }

    unusedImports.forEach(_import => {
        if (importStatementsReformed.includes(`* as ${_import}`)) {
            importStatementsReformed = importStatementsReformed.replace(`* as ${_import}`, '');
        } else {
            const repl: RegExp = new RegExp(`({[a-z,\\s]*\\s*)${_import}`);
            importStatementsReformed = importStatementsReformed.replace(repl, '$1');
        }
    });

    // Clean up empty spaces, empty lines, "hanging" commas after the removal of unused imports
    importStatementsReformed = importStatementsReformed
                                .replace(new RegExp(`\\B, |^\\s+,${endOfLineCharacter}`, 'gm'), '')
                                .replace(new RegExp(`\\s*,${endOfLineCharacter}\\s*}`, 'gm'), `${endOfLineCharacter}}`)
                                .replace(new RegExp(`,\\s*[^${endOfLineCharacter}]}|,}`, 'gm'), `}`)
                                .replace(new RegExp(`import.*?{[, ${endOfLineCharacter}]*?}.*?;`, 'gm'), '')
                                .replace(new RegExp('import\\s*\\*\\s*as\\s*from\\s*.*', 'gm'), '')
                                .replace(new RegExp('import\\s*\\s*from\\s*.*', 'gm'), '')
                                .replace(new RegExp(`^(?:[\\t ]*(?:${endOfLineCharacter}))+`, 'gm'), '');
    
    return code.replace(importStatementsInitial, importStatementsReformed);
};

const getUnusedImports: (code: string) => [string[], Set<number>] = (code) => {
    const unusedImports: string[] = [];
    const importLines: Set<number> = new Set();

    const ast: ParseResult | null = parseSync(code, {
        plugins: [
          require('@babel/plugin-syntax-jsx'),
          [require('@babel/plugin-syntax-typescript'), { isTSX: true }],
          [require('@babel/plugin-proposal-decorators'), {legacy: true}]
        ],
        parserOpts: {tokens: true}
    });

    traverse(ast, {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        ImportDeclaration: function(path: NodePath<types.ImportDeclaration>): void {
            path.node.specifiers.forEach(specifier => {
                if (!path.scope.bindings[specifier.local.name].referenced) {
                    unusedImports.push(specifier.local.name);
                }
                if (specifier.local.loc) {
                    importLines.add(specifier.local.loc.start.line);
                    importLines.add(specifier.local.loc.end.line);
                }
            });
        }
    });

    return [unusedImports, importLines];
};