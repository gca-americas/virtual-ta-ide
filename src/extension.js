const vscode = require('vscode');

class VirtualTAWebviewProvider {
    static viewType = 'virtual-ta-sidebar';
    constructor(extensionUri) { this._extensionUri = extensionUri; }

    resolveWebviewView(webviewView, context, token) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage': {
                    const editor = vscode.window.activeTextEditor;
                    let activeCode = '';
                    let activeFileName = '';
                    let diagnosticsList = [];

                    if (editor) {
                        activeCode = editor.document.getText();
                        activeFileName = editor.document.fileName;

                        const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
                        diagnosticsList = diagnostics.map(d => `Line ${d.range.start.line + 1}: ${d.message}`);
                    }

                    // Package the context seamlessly into the prompt
                    const combinedMessage = `[Source: IDE]
IDE CONTEXT:
Active File: ${activeFileName || 'None'}
Code Contents:
\`\`\`
${activeCode || 'No code actively selected or open.'}
\`\`\`
Diagnostics: ${diagnosticsList.length > 0 ? diagnosticsList.join('\n') : 'None'}

USER QUESTION:
${data.text}`;

                    try {
                        // Blast the payload directly to the central Workshop TA
                        const response = await fetch('http://127.0.0.1:8080/api/chat', {
                            method: 'POST',
                            body: new URLSearchParams({
                                name: data.name || 'IDE_Student',
                                workshop: data.workshop || 'none',
                                message: combinedMessage,
                                interface: 'ide',
                                language: data.language || 'English'
                            })
                        });

                        const result = await response.json();
                        webviewView.webview.postMessage({
                            type: 'proxyResponse',
                            text: result.response || "No response generated."
                        });
                    } catch (error) {
                        webviewView.webview.postMessage({
                            type: 'proxyResponse',
                            text: `**Connection Error:** Could not reach the TA Server at http://127.0.0.1:8080. Is it running? \n\n(${error.message})`
                        });
                    }
                    break;
                }
            }
        });

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    }

    _getHtmlForWebview(webview) {
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'style.css'));
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'webview', 'main.js'));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Virtual TA</title>
                <link href="${styleUri}" rel="stylesheet">
            </head>
            <body>
                <div id="login-container" class="login-container">
                    <select id="language-select" style="position: absolute; top: 10px; right: 10px; padding: 4px; font-size: 11px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border);">
                        <option value="English">English</option>
                        <option value="Spanish">Español</option>
                        <option value="Portuguese">Português</option>
                        <option value="Chinese (Simplified)">简体中文</option>
                        <option value="Chinese (Traditional)">繁體中文</option>
                        <option value="Japanese">日本語</option>
                    </select>
                    <h2 data-i18n="title">Welcome to Virtual TA</h2>
                    <p style="margin-top: 0; font-size: 13px;" data-i18n="subtitle">Please enter your name and select your course:</p>

                    <div id="service-status" class="status-indicator">
                        <div class="status-light pending"></div>
                        <span id="status-text">Checking Service Connection...</span>
                    </div>

                    <input type="text" id="name-input" placeholder="Your Name" data-i18n-placeholder="name_placeholder" />
                    <select id="course-select">
                        <option value="" data-i18n="select_course">Loading courses...</option>
                    </select>
                    <button id="login-btn" data-i18n="start_btn">Start Chatting</button>

                    <div style="margin-top: 15px; text-align: center; font-size: 13px;">
                        <a href="http://127.0.0.1:8080" style="color: var(--vscode-textLink-foreground); text-decoration: none;">🌐 Open Virtual TA Web Interface</a>
                    </div>

                    <div class="warning-box">
                        <strong>⚠️ Ephemeral Service Limit</strong><br>
                        This backend AI service is only available for the next <strong>5 hours</strong>.<br><br>
                        When the workshop concludes, please uninstall this extension visually from your <strong>Extensions Panel (Blocks Icon) -> Virtual TA -> Gear Icon -> Uninstall</strong>.
                    </div>
                </div>

                <div id="chat-container" class="chat-container" style="display: none;">
                    <div class="chat-header">
                        <span id="current-course-display" data-i18n="chat_title">Chat</span>
                        <div>
                            <button id="clear-btn" style="margin-right: 5px;" data-i18n="clear_chat">Clear Chat</button>
                            <button id="reset-btn" data-i18n="switch_course">Switch Course</button>
                        </div>
                    </div>
                    <div id="messages" class="messages-area">
                        <!-- Messages will render dynamically here -->
                    </div>
                    <div class="input-area">
                        <div style="font-size: 11px; color: var(--vscode-descriptionForeground); text-align: center; margin-bottom: 5px;">
                            💡 <i data-i18n="hint_3">Terminal Error? Highlight it, right-click, and select "Send Error to Virtual TA"</i>
                        </div>
                        <textarea id="chat-input" placeholder="Ask the Virtual TA..." data-i18n-placeholder="chat_ide_placeholder"></textarea>
                        <button id="send-btn" data-i18n="send_btn">Send</button>
                    </div>
                </div>
                <script src="${scriptUri}"></script>
            </body>
            </html>`;
    }
}

function activate(context) {
    console.log('Virtual TA Extension Activated');
    const provider = new VirtualTAWebviewProvider(context.extensionUri);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(VirtualTAWebviewProvider.viewType, provider));

    context.subscriptions.push(vscode.commands.registerCommand('virtual-ta.sendErrorToTA', async () => {
        // Trigger VS Code to physically copy the terminal highlight into memory
        await vscode.commands.executeCommand('workbench.action.terminal.copySelection');
        const errorText = await vscode.env.clipboard.readText();

        if (errorText && provider._view) {
            // Beam the string down into the Javascript Webview namespace
            provider._view.webview.postMessage({
                type: 'terminalError',
                text: errorText.trim()
            });
            // Switch focus automatically to the TA Window!
            vscode.commands.executeCommand('virtual-ta-sidebar.focus');
        }
    }));
}

function deactivate() { }
module.exports = { activate, deactivate };
