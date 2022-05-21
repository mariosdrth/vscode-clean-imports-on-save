import {EndOfLine, Range, TextEditor, window, workspace, WorkspaceConfiguration} from "vscode";
import {ParseResult, parseSync, traverse} from '@babel/core';

export const cleanImports: (ignoreSettings?: boolean) => void = (ignoreSettings = false) => {
    const {activeTextEditor} = window;
    const configuration: WorkspaceConfiguration = workspace.getConfiguration("cleanImports");
    const enabled: boolean = configuration.get<boolean>("enableOnSave", true);
    const languages: string[] = [
        'javascript',
        'javascriptreact',
        'typescript',
        'typescriptreact'
    ];

    if (!ignoreSettings && !enabled) {
        return;
    }

    if (!activeTextEditor || !activeTextEditor.document || activeTextEditor.document.uri.scheme !== "file") {
        return;
    }

    if (!languages.includes(activeTextEditor.document.languageId)) {
        return;
    }

    updateEditorContent(activeTextEditor);
};

export const updateEditorContent: (editor: TextEditor) => void = (editor) => {
    const maxRange: Range = new Range(0, 0, Number.MAX_VALUE, Number.MAX_VALUE);
    const code = removeUnusedAndFormatImports(editor.document.getText(), editor.document.eol);

    // If the contents of the editor are the same just return and continue the save operation
    if (code.length === 0) {
        return;
    }

    return editor.edit((edit) => edit.replace(maxRange, code));
};

export const removeUnusedAndFormatImports: (code: string, eol?: EndOfLine) => string = (code, eol) => {
    const unusedImports: string[] = getUnusedImports(code);

    // If no unused imports found return
    if (!unusedImports || unusedImports.length === 0) {
        return "";
    }

    let endOfLineCharacter: string = "\r\n";
    if (eol === EndOfLine.LF) {
        endOfLineCharacter = "\n";
    }

    // Split editor content to imports and "actual" code
    const matches: RegExpMatchArray[] = [...code.matchAll(new RegExp(`.*import(?:["'\\s]*([\\w*{}\\t${endOfLineCharacter}, ]+)from\\s*)?["'\\s]*([@\\w./_-]+)["'\\s].*`, "gmi"))];
    let importStatementsInitial: string = matches.map(i => i[0]).join(endOfLineCharacter);
    const pureCode: string = code.replace(importStatementsInitial, "");
    importStatementsInitial = importStatementsInitial + endOfLineCharacter;
    let importStatementsReformed: string = importStatementsInitial;

    // If no "actual" code found return
    if (!pureCode.match(/\S/)) {
        return "";
    }

    unusedImports.forEach(_import => {
        importStatementsReformed = importStatementsReformed.replace(_import.replace("* as", ""), "");
    });

    // Clean up empty spaces, empty lines, "hanging" commas after the removal of unused imports
    importStatementsReformed = importStatementsReformed
                                .replace(new RegExp(`\\B, |^\\s+,${endOfLineCharacter}`, "gm"), "")
                                .replace(new RegExp(`\\s*,${endOfLineCharacter}\\s*}`, "gm"), `${endOfLineCharacter}}`)
                                .replace(new RegExp(`,\\s*[^${endOfLineCharacter}]}|,}`, "gm"), `}`)
                                .replace(new RegExp(`import.*?{[, ${endOfLineCharacter}]*?}.*?;`, "gm"), "")
                                .replace(new RegExp("import\\s*\\*\\s*as\\s*from\\s+.*;", "gm"), "")
                                .replace(new RegExp(`^(?:[\\t ]*(?:${endOfLineCharacter}))+`, "gm"), "");
    
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
        ImportDeclaration: function(path) {
            path.node.specifiers.forEach(specifier => {
                if (!path.scope.bindings[specifier.local.name].referenced) {
                    unusedImports.push(specifier.local.name);
                }
            });
        }
    });

    return unusedImports;
};