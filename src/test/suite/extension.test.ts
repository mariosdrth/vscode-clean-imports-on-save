import * as assert from 'assert';
import {it} from 'mocha';
import {EndOfLine, window} from 'vscode';
import {removeUnusedAndFormatImports} from '../../command';

suite('Clean Up Imports Test Suite', () => {
	window.showInformationMessage('Start all tests.');

	it('should not touch imports when file contains only import statements', () => {
		//In case only imports exist in the file on purpose we don't remove them
		const code: string = 'import {window, unused} from "vscode";';

		assert.strictEqual('', removeUnusedAndFormatImports(code));
	});

	it('should not touch imports when file contains only import statements and empty lines', () => {
		//In case only imports exist in the file on purpose we don't remove them
		const code: string = 'import {window, unused} from "vscode";\r\n\r\n\r\n';

		assert.strictEqual('', removeUnusedAndFormatImports(code));
	});

	it('should not touch imports when all are used', () => {
		const code: string = 'import {window, used} from "vscode";\r\nexport function jsFn() {used.test;window.test;}';

		assert.strictEqual('', removeUnusedAndFormatImports(code));
	});

	it('should replace single unused import', () => {
		const code: string = 'import {window, unused} from "vscode";\r\n\r\nexport function jsFn() {window.test;}';
		const codeClean: string = 'import {window} from "vscode";\r\n\r\nexport function jsFn() {window.test;}';

		assert.strictEqual(codeClean, removeUnusedAndFormatImports(code));
	});

	it('should replace single unused import on a file with LF eol', () => {
		const code: string = 'import {window, unused} from "vscode";\n\nexport function jsFn() {window.test;}';
		const codeClean: string = 'import {window} from "vscode";\n\nexport function jsFn() {window.test;}';

		assert.strictEqual(codeClean, removeUnusedAndFormatImports(code, EndOfLine.LF));
	});

	it('should remove multiple unused imports and clean up hanging commas', () => {
		const code: string = 'import {unused2, window, unused} from "vscode";\r\n\r\nexport function jsFn() {window.test;}';
		const codeClean: string = 'import {window} from "vscode";\r\n\r\nexport function jsFn() {window.test;}';

		assert.strictEqual(codeClean, removeUnusedAndFormatImports(code));
	});

	it('should remove import when referenced in the code only in comments', () => {
		const code: string = 'import {window, unused} from "vscode";\r\n\r\nexport function jsFn() {window.test;\r\n//unused.test;}';
		const codeClean: string = 'import {window} from "vscode";\r\n\r\nexport function jsFn() {window.test;\r\n//unused.test;}';

		assert.strictEqual(codeClean, removeUnusedAndFormatImports(code));
	});

	it('should remove import when referenced in the code only in comments (multi-line comments)', () => {
		const code: string = 'import {window, unused} from "vscode";\r\n\r\nexport function jsFn() {window.test;\r\n/*unused.test;*/}';
		const codeClean: string = 'import {window} from "vscode";\r\n\r\nexport function jsFn() {window.test;\r\n/*unused.test;*/}';

		assert.strictEqual(codeClean, removeUnusedAndFormatImports(code));
	});

	it('should ignore commented imports', () => {
		const code: string = 'import {window, unused} from "vscode";\r\n//import {unused2} from "vscode";\r\n\r\nexport function jsFn() {window.test;}';
		const codeClean: string = 'import {window} from "vscode";\r\n//import {unused2} from "vscode";\r\n\r\nexport function jsFn() {window.test;}';

		assert.strictEqual(codeClean, removeUnusedAndFormatImports(code));
	});

	it('should ignore commented imports (multi-line comments)', () => {
		const code: string = 'import {window, unused} from "vscode";\r\n/*import {unused2} from "vscode";\r\nimport {unused3} from "vscode";*/\r\n\r\nexport function jsFn() {window.test;}';
		const codeClean: string = 'import {window} from "vscode";\r\n/*import {unused2} from "vscode";\r\nimport {unused3} from "vscode";*/\r\n\r\nexport function jsFn() {window.test;}';

		assert.strictEqual(codeClean, removeUnusedAndFormatImports(code));
	});

	it('should remove multiple unused imports and clean hanging commas or empty lines', () => {
		const code: string = 'import {window, other} from "vscode";\r\nimport {one} from "test";\r\nimport {two, three} from "test2";\r\nimport  {\r\n    four,\r\n    five\r\n} from "test3";\r\n\r\nexport function jsFn() {\r\n    window.test;\r\n    other.test;\r\n}\r\n\r\nexport const jsConst = "1";\r\n\r\nexport class Test {\r\n}\r\n\r\nconst test2 = 2;';
		const codeClean: string = 'import {window, other} from "vscode";\r\n\r\nexport function jsFn() {\r\n    window.test;\r\n    other.test;\r\n}\r\n\r\nexport const jsConst = "1";\r\n\r\nexport class Test {\r\n}\r\n\r\nconst test2 = 2;';

		assert.strictEqual(codeClean, removeUnusedAndFormatImports(code));
	});

	it('should remove multiple multi-lined unused imports and clean hanging commas or empty lines', () => {
		const code: string = 'import * as React from "react";\nimport {unused2, window, other, unused} from "vscode";\nimport {one} from "test";\nimport {two, three} from "../../test2";\nimport {\n    four,\n    five,\n    six\n} from "test3";\n\nexport function jsFn() {\n    window.test;\n    other.test;\n    two.test;\n    four.test;\n    five.test;\n}\n\nexport const jsConst = "1";\n\nexport class Test {\n}\n\nconst test2 = 2;';
		const codeClean: string = 'import {window, other} from "vscode";\nimport {two} from "../../test2";\nimport {\n    four,\n    five\n} from "test3";\n\nexport function jsFn() {\n    window.test;\n    other.test;\n    two.test;\n    four.test;\n    five.test;\n}\n\nexport const jsConst = "1";\n\nexport class Test {\n}\n\nconst test2 = 2;';

		assert.strictEqual(codeClean, removeUnusedAndFormatImports(code, EndOfLine.LF));
	});
});
