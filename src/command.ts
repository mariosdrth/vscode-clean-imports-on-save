import {Range, TextEditor, window, workspace, WorkspaceConfiguration} from "vscode";

export const cleanImports: () => void = () => {
    const {activeTextEditor} = window;
    const configuration: WorkspaceConfiguration = workspace.getConfiguration("cleanImports");
    const enabled: boolean = configuration.get<boolean>("enableOnSave", true);
    const languages: string[] = [
        'javascript',
        'javascriptreact',
        'typescript',
        'typescriptreact'
    ];

    if (!enabled) {
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
    const code = removeUnused(editor.document.getText());

    if (code.length === 0) {
        return;
    }

    return editor.edit((edit) => edit.replace(maxRange, code));
};

export const removeUnused: (code: string) => string = (code) => {
    const matches: RegExpMatchArray[] = [...code.matchAll(/import(?:["'\s]*([\w*{}\r\t\n, ]+)from\s*)?["'\s]*([@\w/_-]+)["'\s].*/gmi)];
    const importStatementsInitial: string = matches.map(i => i[0]).join("\r\n");
    const pureCode: string = code.replace(importStatementsInitial, "");
    let importStatementsReformed: string = importStatementsInitial;

    if (!matches || matches.length === 0 || !pureCode.match(/\S/)) {
        return "";
    }

    matches.forEach(match => {
        const imports = match[1].replace("{", "").replace("}", "").split(",").map(i => i.trim().replace("'", ""));
        imports.forEach(_import => {
            if (!pureCode.match(new RegExp(_import, "gm"))) {
                importStatementsReformed = importStatementsReformed.replace(_import, "");
            } 
        });
    });

    if (importStatementsInitial === importStatementsReformed) {
        return "";
    }

    importStatementsReformed = importStatementsReformed.replace(/, \B|\B, /gm, "").replace(/import.*?{[, \r\n]*?}.*?;/gm, "").replaceAll("\r\n", "");
    return code.replace(importStatementsInitial, importStatementsReformed);
};