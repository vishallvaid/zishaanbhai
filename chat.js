const ChatAssistant = {
    isOpen: false,
    webhookUrl: "https://n8n.srv1319269.hstgr.cloud/webhook/a874426b-9da3-4512-9599-4c15db47eba1",
    localMode: false,

    init: function () {
        this.injectHTML();
        this.addEventListeners();
        this.addQuickSuggestions();
    },

    injectHTML: function () {
        const chatHTML = `
            <div class="chat-window" id="chat-window">
                <div class="chat-header">
                    <div class="header-info">
                        <div class="status-dot"></div>
                        <h4>Zishaan Expert Bot</h4>
                    </div>
                    <i class="fas fa-times" style="cursor: pointer;" onclick="ChatAssistant.toggle()"></i>
                </div>
                <div class="chat-messages" id="chat-messages">
                    <div class="msg msg-ai">
                        Namaste! 🙏 Welcome to Zishaan Luxury Lighting. 
                        I'm your expert consultant. Aapko aaj kya dikhaun? 
                        <br><br>
                        I can help with prices, product designs, or placing an order.
                    </div>
                </div>
                <div id="quick-suggestions" class="quick-suggestions"></div>
                <div class="chat-input">
                    <input type="text" id="user-input" placeholder="Aapka sawal likhein...">
                    <button onclick="ChatAssistant.sendMessage()"><i class="fas fa-paper-plane"></i></button>
                </div>
            </div>
        `;

        const widget = document.getElementById('chat-widget');
        if (widget) {
            // Check if chat window already exists to avoid duplicates
            if (!document.getElementById('chat-window')) {
                widget.insertAdjacentHTML('beforeend', chatHTML);
            }
        }
    },

    addQuickSuggestions: function () {
        const suggestions = [
            "Best Sellers",
            "Price Range",
            "Latest Jhumars",
            "Contact Support"
        ];
        const container = document.getElementById('quick-suggestions');
        if (container) {
            container.innerHTML = suggestions.map(s => `<span class="suggestion-chip" onclick="ChatAssistant.handleSuggestion('${s}')">${s}</span>`).join('');
        }
    },

    handleSuggestion: function (text) {
        document.getElementById('user-input').value = text;
        this.sendMessage();
    },

    toggle: function () {
        const window = document.getElementById('chat-window');
        this.isOpen = !this.isOpen;
        window.style.display = this.isOpen ? 'flex' : 'none';
        if (this.isOpen) {
            document.getElementById('user-input').focus();
        }
    },

    sendMessage: async function () {
        const input = document.getElementById('user-input');
        const text = input.value.trim();

        if (text) {
            this.addMessage(text, 'user');
            input.value = '';

            const typingId = 'typing-' + Date.now();
            this.addMessage('<i class="fas fa-ellipsis-h fa-beat"></i>', 'ai', typingId);

            try {
                // Set a 30-second timeout for n8n (relying solely on n8n now)
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000);

                const response = await fetch(this.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        customerMessage: text,
                        message: text,
                        chatInput: text,
                        sessionId: this.getSessionId()
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) throw new Error(`HTTP_${response.status}`);

                const data = await response.json();
                console.log("n8n raw data:", data);
                this.removeTypingIndicator(typingId);

                // --- Ultra-Resilient Response Parsing ---
                let aiResponse = "";

                // 1. Try known keys first
                const keys = ['output', 'response', 'message', 'text', 'data'];
                const obj = Array.isArray(data) ? data[0] : data;

                if (obj) {
                    for (let key of keys) {
                        if (obj[key]) {
                            aiResponse = obj[key];
                            break;
                        }
                    }

                    // 2. Fallback: Search for ANY string if still empty
                    if (!aiResponse) {
                        const firstString = Object.values(obj).find(v => typeof v === 'string' && v.length > 5);
                        if (firstString) aiResponse = firstString;
                    }
                }

                // 3. Final Fallback for raw strings
                if (!aiResponse && typeof data === 'string') aiResponse = data;

                if (!aiResponse) {
                    console.error("Could not find text in n8n response. Keys found:", Object.keys(obj || {}));
                    throw new Error("empty_response");
                }

                this.addMessage(aiResponse, 'ai');

            } catch (error) {
                this.removeTypingIndicator(typingId);
                console.error("Webhook Error Details:", error);

                let userFriendlyError = "Sorry, n8n server se connection nahi ho paa raha hai. (Please enable CORS in n8n settings)";
                if (error.name === 'AbortError') {
                    userFriendlyError = "n8n server response nahi de raha (Timeout). Please check if n8n is active.";
                }

                this.addMessage(userFriendlyError, 'ai');
            }
        }
    },

    removeTypingIndicator: function (id) {
        const typingMsg = document.getElementById(id);
        if (typingMsg) typingMsg.remove();
    },

    addMessage: function (text, sender, id = null) {
        const messagesDiv = document.getElementById('chat-messages');
        const msg = document.createElement('div');
        msg.classList.add('msg');
        msg.classList.add(sender === 'user' ? 'msg-user' : 'msg-ai');
        if (id) msg.id = id;

        // --- Improved Image & Markdown Parsing ---
        let processedText = text;

        // 1. Handle Markdown Images: ![alt](url)
        processedText = processedText.replace(/!\[.*?\]\((.*?)\)/g, '<img src="$1" class="chat-img">');

        // 2. Handle Absolute URLs: http://...img.jpg
        const absUrlPattern = /(https?:\/\/[\w\-\._~:/?#[\]@!$&'()*+,;=%]+\.(?:png|jpg|jpeg|gif|webp|svg))/gi;
        processedText = processedText.replace(absUrlPattern, function (match) {
            if (processedText.includes('src="' + match + '"')) return match;
            return `<img src="${match}" class="chat-img" onload="ChatAssistant.scrollToBottom()">`;
        });

        // 3. Handle Local/Relative Paths: assets/images/...img.jpg
        const relativePattern = /(assets\/images\/[\w\-\.]+\.(?:png|jpg|jpeg|gif|webp|svg))/gi;
        processedText = processedText.replace(relativePattern, function (match) {
            if (processedText.includes('src="' + match + '"')) return match;
            return `<img src="${match}" class="chat-img" onload="ChatAssistant.scrollToBottom()">`;
        });

        // 4. Bold parsing **text**
        processedText = processedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // 5. Cleanup: If a message is ONLY an image tag, add a small delay for visual pop
        msg.innerHTML = processedText;
        messagesDiv.appendChild(msg);
        this.scrollToBottom();
    },

    scrollToBottom: function () {
        const messagesDiv = document.getElementById('chat-messages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    },

    getSessionId: function () {
        let sid = localStorage.getItem('chat_session_id');
        if (!sid) {
            sid = 'sid_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chat_session_id', sid);
        }
        return sid;
    },

    addEventListeners: function () {
        const input = document.getElementById('user-input');
        if (input) {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ChatAssistant.init();
});

