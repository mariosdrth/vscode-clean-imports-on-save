# Clean Imports

## Description

VS Code extension to clean the imports of JavaScript and TypeScript files (`.js`, `.jsx`, `.ts` and `.tsx`). The main difference with the "Organize Imports" of VS Code is that it doesn't re-sort the imports or adds spaces before and after the curly braces. Also, all file formatting (whitespace, indentation etc) remains untouched.
<br/>The extension is triggered by default on saving (configurable in the extension settings) or by the Command Palette (a keybinding can be assigned there with the cog icon).
<br/>The extension will also format all open editors with **pending changes** when "Save All" is triggered from VS Code (look in [Limitations](#limitations) for more details on this).

![Clean Imports](images/clean_imports.gif)

## How to Use

The extension will be triggered when saving a file with one of the file extension mentioned in the description.
This can be toggled in the settings:

![Settings Screenshot](images/settings.png)

or in the settings.json:

![Settings Screenshot](images/settings_json.png)

The command can also be separately triggered from the Command Palette. The command **ignores** the setting to trigger the extension on save:

![Settings Screenshot](images/command.png)

## Limitations

When activating "Save All" with VS Code only editors in a dirty state are saved, not the currently open editor (if not dirty). This means if an editor with unused imports is open with no pending changes then the extension will not be triggered.
<br/>Saving an editor directly on the other hand always triggers the save event on the open editor so the extension will be triggered (if enabled).

## License

This project is licensed under the [MIT License](LICENSE).