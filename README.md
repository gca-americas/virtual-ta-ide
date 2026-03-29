# Virtual TA - IDE Extension

The Virtual Technical Assistant (VTA) Extension seamlessly bridges the gap between your physical VS Code editor and the central AI `workshop-ta` intelligence server. 

Instead of forcing users to meticulously copy and paste code, files, or terminal tracebacks into a web browser, this lightweight extension **mechanically extracts your active workspace context** and invisibly injects it into every LLM request.

## Overall Architecture

This extension operates exclusively natively within the IDE `Extension Host` namespace and does not contain its own heavy LLM processing logic.

1. **`package.json`**: Anchors the extension to the far-left VS Code Activity Bar (`viewsContainers`).
2. **`src/extension.js` (The Orchestrator)**: The core Node.js engine. It registers the Webview, binds listeners to the active text editor, and mathematically extracts the **File Name, Raw Code Buffer, and Active Syntax Error Diagnostics (`vscode.languages.getDiagnostics`)**.
3. **`src/webview/main.js`**: The visual javascript rendering logic that directly interfaces with the user's interaction stream (Login Box, Dropdown Loading, Async Fetch relays).
4. **The Backend Fetch Proxy**: When the user hits "Send", `extension.js` packages the IDE Context alongside the message text and blasts an `application/x-www-form-urlencoded` HTTP POST directly to `http://127.0.0.1:8080/api/chat`.

### Payload Example
When a student asks *"Why is this code failing?"*, the extension intercepts their active editor and constructs the following data layer sent sequentially to the FastAPI backend:

```http
POST /api/chat HTTP/1.1
Content-Type: application/x-www-form-urlencoded

name=John Doe
&workshop=adk-crash-course-b-to-e
&interface=ide
&message=[Source: IDE]
IDE CONTEXT:
Active File: /path/to/script.py
Code Contents:
def hello():
    print("world"
Diagnostics: Line 2: SyntaxError: unexpected EOF while parsing

USER QUESTION:
Why is this code failing?
```

## How to Test Locally

Because this runs inside the VS Code namespace, development is incredibly fast:

1. Open this `virtual-ta-ide` folder absolutely cleanly within your physical VS Code window footprint.
2. (Optional) Run `npm install` inside a terminal if you pulled fresh from a repo to install DevDependencies.
3. Make sure the `workshop-ta` FastAPI backend server is physically running on `127.0.0.1:8080` in a background terminal.
4. Press the **`F5` Key** (or navigate to **Run -> Start Debugging**).

VS Code will spin up a separate sandbox window called the **[Extension Development Host]**. 
Click the Virtual TA icon on the sidebar, select your course, log in, and send a message. Any edits made to `extension.js` or `main.js` simply require closing out the sandbox and pressing `F5` again to recompile.

## How to Package It

To distribute this extension globally inside your workshops without publishing it to the public Microsoft Marketplace, you will compile it into a slim `.vsix` binary.

1. Open your terminal natively to this exact folder (`/virtual-ta-ide`).
2. Run the `vsce` executable to compile the artifacts:
   ```bash
   npx vsce package --allow-missing-repository
   ```
3. A `.vsix` bundled object containing the entire `src/` hierarchy will be violently exported directly onto the folder root!

### Distribution & Installation
Share the generated `virtual-ta-ide-X.Y.Z.vsix` file securely with participants (e.g. via Cloud Storage or Google Drive). They can organically install it using:

```bash
code --install-extension /path/to/virtual-ta-ide-0.1.0.vsix
```
Or by selecting **Install from VSIX...** in the three-dot menu on the left Extensions Panel!

## How to Uninstall

When the workshop concludes, students can permanently rip the Extension back out of their IDE sandbox natively.

1. **The UI Way**: Have them click the **Extensions Panel** (the blocks icon) on the far left. Search for `Virtual TA` under the Installed list. Click the small **Gear Icon** next to it, and select **Uninstall**.
2. **The Terminal Way**: Exactly mimicking the install process, they can just run this secure CLI command:
   ```bash
   code --uninstall-extension Google-ADK.virtual-ta-ide
   ```
