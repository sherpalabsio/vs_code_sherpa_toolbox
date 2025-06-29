const vscode = require('vscode');

const systemPrompt = `Writ me a short git commit message based on the following:`;

async function generateCommitMessage(textEditor) {
  console.log('Commit message 2');

  const [model] = await vscode.lm.selectChatModels({
    vendor: 'copilot',
    family: 'gpt-4o',
  });

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

  await clearEditorContent(textEditor);

  try {
    // Stream the code into the editor as it is coming in from the Language Model
    for await (const fragment of chatResponse.text) {
      await textEditor.edit((edit) => {
        const lastLine = textEditor.document.lineAt(
          textEditor.document.lineCount - 1
        );
        const position = new vscode.Position(
          lastLine.lineNumber,
          lastLine.text.length
        );
        edit.insert(position, fragment);
      });
    }
  } catch (err) {
    // async response stream may fail, e.g network interruption or server side error
    await textEditor.edit((edit) => {
      const lastLine = textEditor.document.lineAt(
        textEditor.document.lineCount - 1
      );
      const position = new vscode.Position(
        lastLine.lineNumber,
        lastLine.text.length
      );
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
  generateCommitMessage,
};
