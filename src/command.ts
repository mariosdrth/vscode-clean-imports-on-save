import {EndOfLine, Range, TextDocumentWillSaveEvent, TextEditor, window, workspace, WorkspaceConfiguration, WorkspaceEdit} from 'vscode';
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
    const code: string = removeUnusedAndFormatImports(editor.document.getText(), editor.document.eol);

    // If the contents of the editor are the same just return and continue the save operation
    if (code.length === 0) {
        return;
    }

    const edit: WorkspaceEdit = new WorkspaceEdit();
    edit.replace(editor.document.uri, maxRange, code);
    await workspace.applyEdit(edit);
    editor.document.save();
};

export const removeUnusedAndFormatImports: (code: string, eol?: EndOfLine) => string = (code, eol) => {
    const unusedImports: string[] = getUnusedImports(code);

    // If no unused imports found return
    if (!unusedImports || unusedImports.length === 0) {
        return '';
    }

    let endOfLineCharacter: string = '\r\n';
    if (eol === EndOfLine.LF) {
        endOfLineCharacter = '\n';
    }

    // Split editor content to imports and "actual" code
    const matches: RegExpMatchArray[] = [...code.matchAll(new RegExp(`.*import(?:["'\\s]*([\\w*!@#$%^&_{}\\t${endOfLineCharacter}, ]+)from\\s*)?["'\\s]*([@\\w./_-]+)["'\\s].*`, 'gmi'))];
    let importStatementsInitial: string = matches.map(i => i[0]).join(endOfLineCharacter);
    const pureCode: string = code.replace(importStatementsInitial, '');
    importStatementsInitial = importStatementsInitial + endOfLineCharacter;
    let importStatementsReformed: string = importStatementsInitial;

    // If no "actual" code found return
    if (!pureCode.match(/\S/)) {
        return '';
    }

    unusedImports.forEach(_import => {
        importStatementsReformed = importStatementsReformed.replace(_import.replace('* as', ''), '');
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

const getUnusedImports: (code: string) => string[] = (code) => {
    const unusedImports: string[] = [];

    const ast: ParseResult | null = parseSync(code, {
        plugins: [
          require('@babel/plugin-syntax-jsx'),
          require('@babel/plugin-syntax-typescript'),
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
            });
        }
    });

    return unusedImports;
};