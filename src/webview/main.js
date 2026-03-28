const vscode = acquireVsCodeApi();
let userName = '';
let userWorkshop = '';

// Dynamically fetch actual workshops from the centralized backend
async function fetchWorkshops() {
    try {
        const response = await fetch('http://127.0.0.1:8080/api/workshops');
        const workshops = await response.json();
        const select = document.getElementById('course-select');
        select.innerHTML = '<option value="">Select a Course...</option>';
        
        workshops.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.text = course.name;
            select.appendChild(option);
        });
    } catch (e) {
        document.getElementById('course-select').innerHTML = '<option value="">(Backend Offline - Defaulting)</option>';
    }
}
fetchWorkshops();

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
        addMessage('TA', '*(Initializing Course Context...)*', 'system-message');
        
        try {
            // Hit the central API to trigger the LLM explicit Greeting
            const res = await fetch('http://127.0.0.1:8080/api/greet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ name: userName, workshop: userWorkshop })
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
            workshop: userWorkshop || 'adk-crash-course-b-to-e'
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
            body: new URLSearchParams({ name: oldName, workshop: oldWorkshop })
        });
    } catch(e) {}
});

document.getElementById('clear-btn').addEventListener('click', async () => {
    document.getElementById('messages').innerHTML = '';
    addMessage('TA', '*(Clearing Memory...)*', 'system-message');
    
    try {
        const res = await fetch('http://127.0.0.1:8080/api/clear-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ name: userName, workshop: userWorkshop })
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
