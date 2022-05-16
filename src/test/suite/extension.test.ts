import * as assert from 'assert';
import * as vscode from 'vscode';
import {removeUnused} from '../../command';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Only Imports', () => {
		//In case of only imports in the file on purpose we don't remove them
		const code: string = `import {window, unused} from "vscode";`;

		assert.strictEqual("", removeUnused(code), new Error("Imports wrongly updated"));
	});

	test('Only Imports and New Lines', () => {
		//In case of only imports in the file on purpose we don't remove them
		const code: string = `import {window, unused} from "vscode";
		
		
		`;

		assert.strictEqual("", removeUnused(code), new Error("Imports wrongly updated"));
	});

	test('All Imports are Used', () => {
		const code: string = `import {window, used} from "vscode";

		export function jsFn() {used.test;window.test;}`;

		assert.strictEqual("", removeUnused(code), new Error("Imports wrongly updated"));
	});

	test('Simple Case', () => {
		const code: string = `import {window, unused} from "vscode";

		export function jsFn() {window.test;}`;

		const codeClean: string = `import {window} from "vscode";

		export function jsFn() {window.test;}`;

		assert.strictEqual(codeClean, removeUnused(code), new Error("Imports wrongly updated"));
	});

	test('Two Unused Imports Scattered', () => {
		const code: string = `import {unused2, window, unused} from "vscode";

		export function jsFn() {window.test;}`;

		const codeClean: string = `import {window} from "vscode";

		export function jsFn() {window.test;}`;

		assert.strictEqual(codeClean, removeUnused(code), new Error("Imports wrongly updated"));
	});

	test('Complex Case', () => {
		const code: string = 'import {window, other} from "vscode";\r\nimport {one} from "test";\r\nimport {two, three} from "test2";\r\nimport  {\r\n    four,\r\n    five\r\n} from "test3";\r\n\r\nexport function jsFn() {\r\n    window.test;\r\n    other.test;\r\n}\r\n\r\nexport const jsConst = "1";\r\n\r\nexport class Test {\r\n}\r\n\r\nconst test2 = 2;';
		const codeClean: string = 'import {window, other} from \"vscode\";\r\n\r\nexport function jsFn() {\r\n    window.test;\r\n    other.test;\r\n}\r\n\r\nexport const jsConst = \"1\";\r\n\r\nexport class Test {\r\n}\r\n\r\nconst test2 = 2;';

		assert.strictEqual(codeClean, removeUnused(code), new Error("Imports wrongly updated"));
	});
});
