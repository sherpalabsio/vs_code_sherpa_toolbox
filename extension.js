const vscode = require('vscode');
const {
  generateShortCommitMessage,
  generateLongCommitMessage,
} = require('./src/commit-message');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  let disposable = vscode.commands.registerTextEditorCommand(
    'sherpa-toolbox.generateShortCommitMessage',
    generateShortCommitMessage
  );

  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerTextEditorCommand(
    'sherpa-toolbox.generateLongCommitMessage',
    generateLongCommitMessage
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
