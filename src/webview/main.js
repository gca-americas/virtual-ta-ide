const vscode = acquireVsCodeApi();
let userName = '';
let userWorkshop = '';
let currentLanguage = 'English';

const translations = {
    "English": {
        "title": "Welcome to Virtual TA", "subtitle": "Please enter your name and select your course:", "name_placeholder": "Your Name", "select_course": "Select a course...", "start_btn": "Start Chatting", "chat_title": "Chat", "clear_chat": "Clear Chat", "switch_course": "Switch Course", "hint_3": "Terminal Error? Highlight it, right-click, and select \"Send Error to Virtual TA\"", "chat_ide_placeholder": "Ask the Virtual TA...", "send_btn": "Send", "init": "*(Initializing Course Context...)*", "clear": "*(Clearing Memory...)*"
    },
    "Spanish": {
        "title": "Bienvenido a Virtual TA", "subtitle": "Ingrese su nombre y seleccione su curso:", "name_placeholder": "Su nombre", "select_course": "Seleccione un curso...", "start_btn": "Comenzar chat", "chat_title": "Chat", "clear_chat": "Borrar chat", "switch_course": "Cambiar curso", "hint_3": "¿Error de terminal? Resáltelo, haga clic derecho y seleccione \"Enviar error a Virtual TA\"", "chat_ide_placeholder": "Pregúntale al Virtual TA...", "send_btn": "Enviar", "init": "*(Inicializando contexto del curso...)*", "clear": "*(Borrando memoria...)*"
    },
    "Portuguese": {
        "title": "Bem-vindo ao Virtual TA", "subtitle": "Por favor, digite seu nome e selecione seu curso:", "name_placeholder": "Seu Nome", "select_course": "Selecione um curso...", "start_btn": "Começar a conversar", "chat_title": "Bate-papo", "clear_chat": "Limpar Bate-papo", "switch_course": "Trocar de Curso", "hint_3": "Erro no terminal? Destaque-o, clique com o botão direito e selecione \"Enviar erro para o Virtual TA\"", "chat_ide_placeholder": "Pergunte ao Virtual TA...", "send_btn": "Enviar", "init": "*(Inicializando contexto do curso...)*", "clear": "*(Limpando memória...)*"
    },
    "Chinese (Simplified)": {
        "title": "欢迎来到虚拟助教", "subtitle": "请输入您的名字并选择您的课程：", "name_placeholder": "您的名字", "select_course": "选择课程...", "start_btn": "开始聊天", "chat_title": "聊天", "clear_chat": "清除聊天", "switch_course": "切换课程", "hint_3": "终端错误？高亮显示它，右键单击并选择“将错误发送给虚拟助教”", "chat_ide_placeholder": "询问虚拟助教...", "send_btn": "发送", "init": "*(正在初始化课程上下文...)*", "clear": "*(正在清除内存...)*"
    },
    "Chinese (Traditional)": {
        "title": "歡迎來到虛擬助教", "subtitle": "請輸入您的名字並選擇您的課程：", "name_placeholder": "您的名字", "select_course": "選擇課程...", "start_btn": "開始聊天", "chat_title": "聊天", "clear_chat": "清除聊天", "switch_course": "切換課程", "hint_3": "終端錯誤？高亮顯示它，右鍵單擊並選擇「將錯誤發送給虛擬助教」", "chat_ide_placeholder": "詢問虛擬助教...", "send_btn": "發送", "init": "*(正在初始化課程上下文...)*", "clear": "*(正在清除內存...)*"
    },
    "Japanese": {
        "title": "仮想TAへようこそ", "subtitle": "名前を入力し、コースを選択してください。", "name_placeholder": "あなたの名前", "select_course": "コースを選択...", "start_btn": "チャット開始", "chat_title": "チャット", "clear_chat": "チャットをクリア", "switch_course": "コースを切り替える", "hint_3": "ターミナルエラーが発生しましたか？ハイライトして右クリックし、「Virtual TAにエラーを送信」を選択してください。", "chat_ide_placeholder": "仮想TAに質問する...", "send_btn": "送信", "init": "*(コースコンテキストを初期化中...)*", "clear": "*(メモリをクリア中...)*"
    }
};

function changeLanguage(lang) {
    currentLanguage = lang;
    const dict = translations[lang] || translations["English"];
    
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (dict[key]) { el.innerHTML = dict[key]; }
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (dict[key]) { el.placeholder = dict[key]; }
    });
}
document.getElementById('language-select')?.addEventListener('change', (e) => {
    changeLanguage(e.target.value);
});

// On Load, fetch workshops
(async function loadWorkshops() {
    const select = document.getElementById('course-select');
    const statusLight = document.querySelector('.status-light');
    const statusText = document.getElementById('status-text');

    try {
        const res = await fetch('http://127.0.0.1:8080/api/workshops');
        if (!res.ok) throw new Error('Endpoint offline');
        
        const workshops = await res.json();
        
        // Mark Service Online
        statusLight.className = 'status-light online';
        statusText.innerText = 'Service Online';
        
        select.innerHTML = '<option value="" disabled selected>Select a course...</option>';
        workshops.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w.id;
            opt.innerText = w.name;
            select.appendChild(opt);
        });
    } catch (e) {
        statusLight.className = 'status-light offline';
        statusText.innerText = 'Service Unreachable';
        select.innerHTML = '<option value="" disabled selected>Service Offline</option>';
    }
})();

document.getElementById('login-btn').addEventListener('click', async () => {
    const nameInput = document.getElementById('name-input');
    const select = document.getElementById('course-select');
    const name = nameInput.value.trim();
    const workshop = select.value.trim();

    if (name) {
        userName = name;
        userWorkshop = workshop;
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';
        document.getElementById('current-course-display').innerText = select.options[select.selectedIndex].text;
        
        // Show a loading indicator natively
        const dict = translations[currentLanguage] || translations["English"];
        addMessage('TA', dict["init"], 'system-message');
        
        try {
            // Hit the central API to trigger the LLM explicit Greeting
            const res = await fetch('http://127.0.0.1:8080/api/greet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ name: userName, workshop: userWorkshop, language: currentLanguage })
            });
            const result = await res.json();
            
            // Remove the loading text and dynamically print the generated greeting
            document.getElementById('messages').innerHTML = '';
            addMessage('TA', result.greeting, 'system-message');
        } catch (e) {
            document.getElementById('messages').innerHTML = '';
            addMessage('TA', '**Error**: Could not fetch custom greeting from the backend.', 'system-message');
        }
    }
});

// Allow hitting Enter on login
document.getElementById('name-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('login-btn').click();
    }
});

document.getElementById('send-btn').addEventListener('click', () => {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();

    if (text) {
        addMessage(userName, text, 'user-message');
        input.value = '';
        
        vscode.postMessage({
            type: 'sendMessage',
            text: text,
            name: userName,
            workshop: userWorkshop || 'adk-crash-course-b-to-e',
            language: currentLanguage
        });
    }
});

document.getElementById('reset-btn').addEventListener('click', async () => {
    const oldName = userName;
    const oldWorkshop = userWorkshop;
    
    // Visually toggle back to login screen organically
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
    document.getElementById('messages').innerHTML = '';
    
    try {
        // Destroy the backend context memory securely
        await fetch('http://127.0.0.1:8080/api/clear-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ name: oldName, workshop: oldWorkshop, language: currentLanguage })
        });
    } catch(e) {}
});

document.getElementById('clear-btn').addEventListener('click', async () => {
    const dict = translations[currentLanguage] || translations["English"];
    addMessage('TA', dict["clear"], 'system-message');
    
    try {
        const res = await fetch('http://127.0.0.1:8080/api/clear-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ name: userName, workshop: userWorkshop, language: currentLanguage })
        });
        const result = await res.json();
        
        // Remove loading state and print the refreshed greeting securely
        document.getElementById('messages').innerHTML = '';
        addMessage('TA', result.greeting, 'system-message');
    } catch(e) {
        document.getElementById('messages').innerHTML = '';
        addMessage('TA', '**Error**: Could not clear the session connection from the backend.', 'system-message');
    }
});

// Allow hitting Enter to send natively
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('send-btn').click();
    }
});

window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
        case 'proxyResponse':
            addMessage('TA', message.text, 'system-message');
            break;
        case 'terminalError':
            const chatBox = document.getElementById('chat-input');
            chatBox.value = `"I got this error in my terminal:"\n\n${message.text}`;
            chatBox.focus();
            break;
    }
});

function addMessage(sender, text, className) {
    const messagesDiv = document.getElementById('messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${className}`;
    
    // Quick sanitization mapping formatting natively
    const lines = text.split('\n');
    let formattedText = lines.map(line => `<p>${escapeHtml(line)}</p>`).join('');

    msgDiv.innerHTML = `<strong>${sender}:</strong> ${formattedText}`;
    messagesDiv.appendChild(msgDiv);
    
    // Auto-scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
