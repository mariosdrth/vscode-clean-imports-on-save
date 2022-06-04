import * as assert from 'assert';
import {it} from 'mocha';
import path = require('path');
import {EndOfLine, TextDocument, Uri, window, workspace} from 'vscode';
import {removeUnusedAndFormatImports} from '../../command';

suite('Clean Up Imports Test Suite', () => {
	window.showInformationMessage('Start all tests.');

	// Test 1
	it('should not touch imports when file contains only import statements', () => {
		//In case only imports exist in the file on purpose we don't remove them
		getFileAndCompare('test-1.txt', '');
	});

	// Test 2
	it('should not touch imports when file contains only import statements and empty lines', () => {
		//In case only imports exist in the file on purpose we don't remove them
		getFileAndCompare('test-2.txt', '');
	});

	// Test 3
	it('should not touch imports when all are used', () => {
		getFileAndCompare('test-3.txt', '');
	});

	// Test 4
	it('should replace single unused import', () => {
		const codeClean: string = 'import {window} from "vscode";\r\n\r\nexport function jsFn() {window.test;}';

		getFileAndCompare('test-4.txt', codeClean);
	});

	// Test 5
	it('should replace single unused import on a file with LF eol', () => {
		const codeClean: string = 'import {window} from "vscode";\n\nexport function jsFn() {window.test;}';

		getFileAndCompare('test-5.txt', codeClean, EndOfLine.LF);
	});

	// Test 6
	it('should remove multiple unused imports and clean up hanging commas', () => {
		const codeClean: string = 'import {window} from "vscode";\r\n\r\nexport function jsFn() {window.test;}';

		getFileAndCompare('test-6.txt', codeClean);
	});

	// Test 7
	it('should remove import when referenced in the code only in comments', () => {
		const codeClean: string = 'import {window} from "vscode";\r\n\r\nexport function jsFn() {window.test;\r\n//unused.test;\r\n}';

		getFileAndCompare('test-7.txt', codeClean);
	});

	// Test 8
	it('should remove import when referenced in the code only in comments (multi-line comments)', () => {
		const codeClean: string = 'import {window} from "vscode";\r\n\r\nexport function jsFn() {window.test;\r\n/*unused.test;*/}';

		getFileAndCompare('test-8.txt', codeClean);
	});

	// Test 9
	it('should ignore commented imports', () => {
		const codeClean: string = 'import {window} from "vscode";\r\n//import {unused2} from "vscode";\r\n\r\nexport function jsFn() {window.test;}';

		getFileAndCompare('test-9.txt', codeClean);
	});

	// Test 10
	it('should ignore commented imports (multi-line comments)', () => {
		const codeClean: string = 'import {window} from "vscode";\r\n/*import {unused2} from "vscode";\r\nimport {unused3} from "vscode";*/\r\n\r\nexport function jsFn() {window.test;}';

		getFileAndCompare('test-10.txt', codeClean);
	});

	// Test 11
	it('should remove multiple unused imports and clean hanging commas or empty lines', () => {
		const codeClean: string = 'import {window, other} from "vscode";\r\n\r\nexport function jsFn() {\r\n    window.test;\r\n    other.test;\r\n}\r\n\r\nexport const jsConst = "1";\r\n\r\nexport class Test {\r\n}\r\n\r\nconst test2 = 2;';

		getFileAndCompare('test-11.txt', codeClean);
	});

	// Test 12
	it('should remove multiple multi-lined unused imports and clean hanging commas or empty lines', () => {
		const codeClean: string = 'import {window, other} from "vscode";\nimport {two} from "../../test2";\nimport {\n    four,\n    five\n} from "test3";\n\nexport function jsFn() {\n    window.test;\n    other.test;\n    two.test;\n    four.test;\n    five.test;\n}\n\nexport const jsConst = "1";\n\nexport class Test {\n}\n\nconst test2 = 2;';

		getFileAndCompare('test-10.txt', codeClean, EndOfLine.LF);
	});

	// Test 13
	it('should remove import if only mentioned in a string literal', () => {
		const codeClean: string = '\r\nexport function jsFn() {\r\n  "This is a string containing window";\r\n}';

		getFileAndCompare('test-13.txt', codeClean);
	});

	// Test 14
	it('should remove import if only mentioned in a string literal (multi-line string)', () => {
		const codeClean: string = '\r\nexport function jsFn() {\r\n  `This is a multi-line string containing \r\nwindow`;\r\n}';

		getFileAndCompare('test-14.txt', codeClean);
	});

	// Test 15
	it('should work on empty file', () => {
		getFileAndCompare('test-15.txt', '');
	});

	const getFileAndCompare: (fileName: string, expectedContent: string, eol?: EndOfLine) => Promise<void> = async (fileName, expectedContent, eol) => {
		const uri: Uri = Uri.file(
            path.join(__dirname, 'test-docs', fileName),
        );
		const document: TextDocument = await workspace.openTextDocument(uri);

		eol ? assert.strictEqual(expectedContent, removeUnusedAndFormatImports(document, eol)) : assert.strictEqual(expectedContent, removeUnusedAndFormatImports(document));
	};
});
