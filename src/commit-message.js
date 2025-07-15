const vscode = require('vscode');
const { execSync } = require('child_process');

const SHORT_SYSTEM_PROMPT = `Writ me a maximum 110 char long git commit message based on the following:
- Respond in plain text
- Don't use semantic commit message format
- Use present tense
- DO NOT include implementation details
- Don't include how something was changed`;

const LONG_SYSTEM_PROMPT = `Writ me a git commit message based on the following:
- Response in plain text
- Use very simple language
- Use present tense
- Don't use semantic commit message format
- Start with a title no longer than 90 chars
- Add a short description to summarize the changes on a functional/product level using bullet points only
  - Use min 0, max 3 bullet points
  - If a bullet point is longer than 80 chars, split it into multiple lines
  - Ignore the minor tech details, focus on the functional changes
  - Merge similar bullet points into one`;

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

  const instructions = getInstructions(textEditor);

  const prompt = [
    vscode.LanguageModelChatMessage.User(systemPrompt),
    vscode.LanguageModelChatMessage.User(instructions),
  ];

  console.log('Prompt instructions:', instructions);

  let chatResponse;

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

    replaceEditorContent(textEditor, fullResponse);
  } catch (err) {
    // async response stream may fail, e.g network interruption or server side error
    replaceEditorContent(textEditor, err.message);
  }
}

function getInstructions(textEditor) {
  let result = textEditor.document.getText().trim();

  if (result === '') {
    result = '[diff]';
  } else if (!result.includes('[diff]')) {
    return result;
  }

  let gitDiff = '';

  try {
    gitDiff = execSync('git diff --cached', {
      cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd(),
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    }).trim();
  } catch (err) {
    vscode.window.showErrorMessage('Failed to get Git diff for staged files.');
    console.error(err);
    return;
  }

  if (gitDiff !== '') {
    gitDiff = `\n\nGit diff:\n\`\`\`${gitDiff}\n\`\`\``;
  }

  return result.replace('[diff]', gitDiff);
}

async function replaceEditorContent(textEditor, newContent) {
  await textEditor.edit((edit) => {
    const start = new vscode.Position(0, 0);
    const end = new vscode.Position(
      textEditor.document.lineCount - 1,
      textEditor.document.lineAt(textEditor.document.lineCount - 1).text.length
    );
    edit.replace(new vscode.Range(start, end), newContent);
  });
}

module.exports = {
  generateShortCommitMessage,
  generateLongCommitMessage,
};
