const vscode = require('vscode');
const { generateCommitMessage } = require('./src/commit-message');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  const disposable = vscode.commands.registerTextEditorCommand(
    'sherpa-toolbox.writeGitCommit',
    generateCommitMessage
  );

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
