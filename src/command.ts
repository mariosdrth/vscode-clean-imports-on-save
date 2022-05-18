import {EndOfLine, Range, TextEditor, window, workspace, WorkspaceConfiguration} from "vscode";

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
    let endOfLineCharacter: string = "\r\n";
    if (eol && eol === EndOfLine.LF) {
        endOfLineCharacter = "\n";
    }
    const commentCharacters: string[] = ["//", "/*", "*/"];

    // Get all imports and split editor content to imports and "actual" code
    const matches: RegExpMatchArray[] = [...code.matchAll(new RegExp(`.*import(?:["'\\s]*([\\w*{}\\t${endOfLineCharacter}, ]+)from\\s*)?["'\\s]*([@\\w./_-]+)["'\\s].*`, "gmi"))];
    const importStatementsInitial: string = matches.map(i => i[0]).join(endOfLineCharacter) + endOfLineCharacter;
    const pureCode: string = code.replace(importStatementsInitial, "");
    let importStatementsReformed: string = importStatementsInitial;

    // If no imports found or no "actual" code found return
    if (!matches || matches.length === 0 || !pureCode.match(/\S/)) {
        return "";
    }

    matches.forEach(match => {
        // If the import is commented ignore it
        if (!commentCharacters.some(character => match[0].includes(character)) && match[1]) {
            const imports = match[1]
                                .replace(/{|}/gm, "")
                                .split(",")
                                .map(importStatement => importStatement.trim().replace("'", ""));

            // If import statement is referenced in the code (not in a comment) the import remains, otherwise it is removed
            imports.forEach(_import => {
                if (!pureCode.match(new RegExp(`^(?!.*(\\/\\/|\\/\\*)).*${_import.replace("* as", "")}.*$`, "gm"))) {
                    importStatementsReformed = importStatementsReformed.replace(_import, "");
                } 
            });
        }
    });

    // If all imports are used return
    if (importStatementsInitial === importStatementsReformed) {
        return "";
    }

    // Clean up empty spaces, empty lines, "hanging" commas after the removal of unused imports
    importStatementsReformed = importStatementsReformed
                                .replace(new RegExp(`, \\B|\\B, |^\\s+,${endOfLineCharacter}`, "gm"), "")
                                .replace(new RegExp(`\\s*,${endOfLineCharacter}\\s+}`, "gm"), `${endOfLineCharacter}}`)
                                .replace(new RegExp(`import.*?{[, ${endOfLineCharacter}]*?}.*?;`, "gm"), "")
                                .replace(new RegExp("import\\s+from\\s+.*;", "gm"), "")
                                .replace(new RegExp(`^(?:[\\t ]*(?:${endOfLineCharacter}))+`, "gm"), "");
    
    return code.replace(importStatementsInitial, importStatementsReformed);
};
