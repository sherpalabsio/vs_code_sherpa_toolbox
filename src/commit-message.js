const vscode = require('vscode');

const SHORT_SYSTEM_PROMPT = `Writ me a short git commit message based on the following:
- Response in plain text
- Don't use semantic commit message format
- Use present tense`;

const LONG_SYSTEM_PROMPT = `Writ me a git commit message based on the following:
- Response in plain text
- Use very simple language
- Use present tense
- Don't use semantic commit message format
- Start with a title no longer than 90 chars then add a description using the following format:
  <title>
  <blank line>
  <description>
- Break the description into paragraphs of no more than 80 chars per line`;

async function generateShortCommitMessage(textEditor) {
  generateCommitMessage(textEditor, SHORT_SYSTEM_PROMPT);
}

async function generateLongCommitMessage(textEditor) {
  generateCommitMessage(textEditor, LONG_SYSTEM_PROMPT);
}

async function generateCommitMessage(textEditor, systemPrompt) {
  const [model] = await vscode.lm.selectChatModels({
    vendor: 'copilot',
    family: 'gpt-4o',
  });

  if (!model) {
    vscode.window.showErrorMessage(
      'No suitable chat model available. Make sure GitHub Copilot is enabled.'
    );
    return;
  }

  let chatResponse;

  const instructions = textEditor.document.getText();

  const prompt = [
    vscode.LanguageModelChatMessage.User(systemPrompt),
    vscode.LanguageModelChatMessage.User(instructions),
  ];

  try {
    chatResponse = await model.sendRequest(
      prompt,
      {},
      new vscode.CancellationTokenSource().token
    );
  } catch (err) {
    if (err instanceof vscode.LanguageModelError) {
      console.log(err.message, err.code, err.cause);
    } else {
      throw err;
    }
    return;
  }

  try {
    let fullResponse = '';
    for await (const fragment of chatResponse.text) {
      fullResponse += fragment;
    }

    await clearEditorContent(textEditor);

    await textEditor.edit((edit) => {
      const position = new vscode.Position(0, 0);
      edit.insert(position, fullResponse);
    });
  } catch (err) {
    // async response stream may fail, e.g network interruption or server side error
    await textEditor.edit((edit) => {
      const position = new vscode.Position(0, 0);
      edit.insert(position, err.message);
    });
  }
}

async function clearEditorContent(textEditor) {
  await textEditor.edit((edit) => {
    const start = new vscode.Position(0, 0);
    const end = new vscode.Position(
      textEditor.document.lineCount - 1,
      textEditor.document.lineAt(textEditor.document.lineCount - 1).text.length
    );
    edit.delete(new vscode.Range(start, end));
  });
}

module.exports = {
  generateShortCommitMessage,
  generateLongCommitMessage,
};
