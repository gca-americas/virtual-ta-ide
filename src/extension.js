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
                                workshop: data.workshop || 'adk-crash-course-b-to-e',
                                message: combinedMessage
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
                    <h2>Welcome to Virtual TA</h2>
                    <p style="margin-top: 0; font-size: 13px;">Please enter your name and select your course:</p>

                    <div id="service-status" class="status-indicator">
                        <div class="status-light pending"></div>
                        <span id="status-text">Checking Service Connection...</span>
                    </div>

                    <input type="text" id="name-input" placeholder="Your Name" />
                    <select id="course-select">
                        <option value="">Loading courses...</option>
                    </select>
                    <button id="login-btn">Start Chatting</button>

                    <div style="margin-top: 15px; text-align: center; font-size: 13px;">
                        <a href="http://127.0.0.1:8080" style="color: var(--vscode-textLink-foreground); text-decoration: none;">🌐 Open Virtual TA Web Interface</a>
                    </div>

                    <div class="warning-box">
                        <strong>⚠️ Ephemeral Service Limit</strong><br>
                        This backend AI service is only available for the next <strong>5 hours</strong>.<br><br>
                        When the workshop concludes, please uninstall this extension visually from your <strong>Extensions Panel (Blocks Icon) -> Virtual TA -> Gear Icon -> Uninstall</strong>.<br><br>
                        OR by pasting this command directly into your terminal:<br>
                        <code style="display: block; background: rgba(0,0,0,0.3); padding: 4px; margin-top: 5px; user-select: all; border-radius: 4px;">code --uninstall-extension Google-ADK.virtual-ta-ide</code>
                    </div>
                </div>

                <div id="chat-container" class="chat-container" style="display: none;">
                    <div class="chat-header">
                        <span id="current-course-display">Chat</span>
                        <div>
                            <button id="clear-btn" style="margin-right: 5px;">Clear Chat</button>
                            <button id="reset-btn">Switch Course</button>
                        </div>
                    </div>
                    <div id="messages" class="messages-area">
                        <!-- Messages will render dynamically here -->
                    </div>
                    <div class="input-area">
                        <textarea id="chat-input" placeholder="Ask the Virtual TA..."></textarea>
                        <button id="send-btn">Send</button>
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
}

function deactivate() {}
module.exports = { activate, deactivate };
