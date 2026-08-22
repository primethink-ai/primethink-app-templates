# Implement a Live Chat Widget


## Overview

The Primethink Live Chat Widget is a floating support chat interface that embeds Primethink public chat sessions into any website. It provides a seamless way to offer AI-powered support to your users without leaving your page.

### What It Does

- **Floating Button**: A customizable circular button that floats in the corner of your page
- **Chat Interface**: A draggable, resizable chat window that opens when the button is clicked
- **Session Management**: Automatically creates and persists chat sessions across page refreshes
- **iframe Integration**: Loads Primethink chat sessions in a secure, sandboxed iframe
- **Local Storage**: Maintains session continuity using browser localStorage

### Key Features

- ✅ **Session Persistence** - Chat sessions survive page refreshes and navigation
- ✅ **Draggable Interface** - Users can move the chat window anywhere on screen
- ✅ **Minimize/Maximize** - Collapse the chat to title bar only
- ✅ **Mobile Responsive** - Adapts to mobile screens automatically
- ✅ **No Dependencies** - Pure HTML, CSS, and JavaScript
- ✅ **Easy Configuration** - Just update the chat ID to use your own chat

---

## How It Works

### Flow Diagram

```
User Action              Widget Action                    Backend Action
───────────              ─────────────                    ──────────────

1. Click Button    →     Check localStorage
                         ├─ Has session? → Load saved URL
                         └─ No session?  → Continue to step 2

2. Create Session  →     POST /public-session            → Generate session ID
                                                          → Return session ID

3. Receive Response ←    Get session ID: "abc-123"
                         Build URL: chat?sid=abc-123

4. Load Chat       →     Set iframe.src = URL
                         Save URL to localStorage

5. Chat Ready      →     User interacts with chat

6. Page Refresh    →     Check localStorage
                         Load saved session URL
                         Restore chat window
```

### Technical Flow

1. **Initialization**: Widget loads and checks localStorage for existing session
2. **Button Click**: User clicks the floating button
3. **API Call**: POST request to `https://app.primethink.ai/api/v1/public/chats/{chat-id}/public-session`
4. **Session Creation**: Backend returns a session ID (e.g., `"00136af9-a102-42e1-9ca1-e24ba6c30b4a"`)
5. **URL Construction**: Widget builds URL: `https://app.primethink.ai/public/chats/{chat-id}?sid={session-id}`
6. **Load Chat**: iframe loads the chat with session ID
7. **Persist Session**: URL saved to localStorage
8. **Restore on Refresh**: Next page load/refresh restores the saved session

---

## Minimal Implementation

### Step 1: Basic HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Support Chat Example</title>
    <style>
        /* Styles will go here */
    </style>
</head>
<body>
    <!-- Your page content -->
    <h1>My Website</h1>

    <!-- Floating Chat Button -->
    <button id="chat-button">💬</button>

    <!-- Chat Frame -->
    <div id="chat-frame">
        <div class="title-bar">
            <h3>Support</h3>
            <button id="close-btn">×</button>
        </div>
        <div class="chat-content">
            <iframe id="support-iframe"></iframe>
        </div>
    </div>

    <script>
        /* JavaScript will go here */
    </script>
</body>
</html>
```

### Step 2: Essential Styles

```css
/* Floating Button */
#chat-button {
    position: fixed;
    bottom: 30px;
    right: 30px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
}

#chat-button:hover {
    transform: scale(1.1);
}

#chat-button.hidden {
    display: none;
}

/* Chat Frame */
#chat-frame {
    position: fixed;
    bottom: 100px;
    right: 30px;
    width: 380px;
    height: 600px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    display: none;
    flex-direction: column;
    z-index: 1001;
    overflow: hidden;
}

#chat-frame.open {
    display: flex;
}

/* Title Bar */
.title-bar {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.title-bar button {
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 20px;
}

/* Chat Content */
.chat-content {
    flex: 1;
    position: relative;
}

#support-iframe {
    width: 100%;
    height: 100%;
    border: none;
}
```

### Step 3: Core JavaScript

```javascript
class SupportChat {
    constructor() {
        // DOM elements
        this.chatButton = document.getElementById('chat-button');
        this.chatFrame = document.getElementById('chat-frame');
        this.closeBtn = document.getElementById('close-btn');
        this.iframe = document.getElementById('support-iframe');

        // Configuration - CHANGE THESE VALUES
        this.chatId = 'f6a7b8c9-d0e1-4234-9123-456789012345';
        this.baseUrl = `https://app.primethink.ai/public/chats/${this.chatId}`;
        this.apiUrl = `https://app.primethink.ai/api/v1/public/chats/${this.chatId}/public-session`;

        // Storage keys
        this.STORAGE_KEY = 'support_chat_session_url';

        this.init();
    }

    init() {
        // Event listeners
        this.chatButton.addEventListener('click', () => this.openChat());
        this.closeBtn.addEventListener('click', () => this.closeChat());

        // Restore saved session
        this.restoreSession();
    }

    async openChat() {
        // Show chat
        this.chatFrame.classList.add('open');
        this.chatButton.classList.add('hidden');

        // Check for saved session
        const savedUrl = localStorage.getItem(this.STORAGE_KEY);
        if (savedUrl) {
            this.iframe.src = savedUrl;
            return;
        }

        // Create new session
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                throw new Error(`Too many requests. Try again in ${retryAfter ?? 'a few'} seconds.`);
            }
            if (!response.ok) {
                throw new Error(`Session creation failed with status ${response.status}`);
            }

            const sessionId = await response.json();
            const sessionUrl = `${this.baseUrl}?sid=${sessionId}`;

            this.iframe.src = sessionUrl;
            localStorage.setItem(this.STORAGE_KEY, sessionUrl);
        } catch (error) {
            console.error('Error creating session:', error);
            this.iframe.srcdoc = '<p role="alert">Chat is temporarily unavailable. Please wait and try again.</p>';
        }
    }

    closeChat() {
        this.chatFrame.classList.remove('open');
        this.chatButton.classList.remove('hidden');
        this.iframe.src = '';
        localStorage.removeItem(this.STORAGE_KEY);
    }

    restoreSession() {
        const savedUrl = localStorage.getItem(this.STORAGE_KEY);
        if (savedUrl) {
            this.chatFrame.classList.add('open');
            this.chatButton.classList.add('hidden');
            this.iframe.src = savedUrl;
        }
    }
}

// Initialize
new SupportChat();
```

---

## Configuration

### Required Values

To use your own Primethink chat, you need:

1. **Chat ID**: Your public chat UUID
2. **Base URL**: The public chat page URL
3. **API URL**: The endpoint to create sessions

```javascript
// Example for chat ID: abc-123-def-456
this.chatId = 'abc-123-def-456';
this.baseUrl = `https://app.primethink.ai/public/chats/${this.chatId}`;
this.apiUrl = `https://app.primethink.ai/api/v1/public/chats/${this.chatId}/public-session`;
```

### Finding Your Chat ID

Your Primethink public chat URL looks like:
```
https://app.primethink.ai/public/chats/f6a7b8c9-d0e1-4234-9123-456789012345
                                        └─────────────┬─────────────┘
                                                  This is your Chat ID
```

### Enabling File Uploads

By default, public chats do not allow file uploads. To enable file upload functionality, you need to:

1. **Enable Documents & Collections** in the chat settings (required for any file upload to work)
2. Add the following Extra setting to either the **Task** or the **Chat** (the values `true`, `"true"`, and `"1"` are all accepted):

```
PUBLIC_CHAT_UPLOAD_FILES = true
```

**Where to set this:**

1. **On the Task**: Go to the task settings and add this to the Extra field — chats created from the task inherit it
2. **On the Chat**: Go to the chat settings and add this to the Extra field

When enabled, users in the public chat will see a file upload button and can attach files to their messages.

---

## UI Customization Parameters

You can customize the appearance of an embedded public chat by appending query parameters to the chat URL. These parameters override the default UI for that session.

### URL Format

```
https://app.primethink.ai/public/chats/{chat-id}?sid={session-id}&ui_chat_title=My+Bot&ui_theme=dark
```

### Available Parameters

| Parameter | Description | Accepted Values | Example |
|---|---|---|---|
| `ui_chat_title` | Overrides the chat name shown in the top bar | Any string | `ui_chat_title=Sales+Assistant` |
| `ui_chat_footer_msg` | Displays a message below the chat input (e.g. a disclaimer) | Any string | `ui_chat_footer_msg=AI+may+make+mistakes` |
| `ui_theme` | Forces light or dark mode for the chat UI | `light`, `dark` | `ui_theme=dark` |
| `ui_bg_color` | Sets the chat background color | Hex code or color name | `ui_bg_color=%23f5f5f5` |
| `ui_agent_msg_color` | Sets the color accent for agent (bot) messages | Hex code or color name | `ui_agent_msg_color=teal` |
| `ui_guest_msg_color` | Sets the color accent for guest (user) messages | Hex code or color name | `ui_guest_msg_color=%23667eea` |

All parameters are optional. When omitted, the chat falls back to its default appearance.

### Color Values

Color parameters (`ui_bg_color`, `ui_agent_msg_color`, `ui_guest_msg_color`) accept:

- **Hex codes**: `#rgb`, `#rgba`, `#rrggbb`, `#aarrggbb` (with or without the `#` prefix)
- **Named colors**: `red`, `blue`, `green`, `teal`, `purple`, `indigo`, `cyan`, `orange`, `amber`, `pink`, `lime`, `yellow`, `brown`, `grey` / `gray`, `white`, `black`, `transparent`, `deeppurple`, `deeporange`, `lightblue`, `lightgreen`, `bluegrey` / `bluegray`

> **Note**: When using hex codes in a URL, encode the `#` character as `%23`. For example: `ui_bg_color=%23f0f0f0`

### Example: Fully Customized Embed

```javascript
const chatId = 'abc-123-def-456';
const sessionId = 'session-id-here';

const params = new URLSearchParams({
    sid: sessionId,
    ui_chat_title: 'Acme Support',
    ui_chat_footer_msg: 'AI-generated responses may not always be accurate.',
    ui_theme: 'light',
    ui_bg_color: '#f8f9fa',
    ui_agent_msg_color: 'indigo',
    ui_guest_msg_color: '#28a745',
});

const chatUrl = `https://app.primethink.ai/public/chats/${chatId}?${params}`;
iframe.src = chatUrl;
```

### Behavior Notes

- Parameters are preserved across redirects (e.g. when a session is created and the URL changes).
- `ui_chat_title` overrides the chat name everywhere it appears (top bar and browser tab title).
- `ui_chat_footer_msg` takes precedence over the server-configured `UI_CHAT_FOOTER_MSG` setting when provided. (`UI_CHAT_FOOTER_MSG` is one of the platform's server-side [UI Settings](/UI-Settings/), configured by administrators — not a chat Extra field.)
- `ui_theme` overrides the user's system theme preference for the chat window only.

---

## API Details

### Create Session Endpoint

**URL**: `POST https://app.primethink.ai/api/v1/public/chats/{chat-id}/public-session`

**Headers**:
```
Content-Type: application/json
Accept: */*
```

**Request Body**:
```json
{}
```

**Response**: Plain JSON string containing session ID
```json
"00136af9-a102-42e1-9ca1-e24ba6c30b4a"
```

**Usage**: Append to URL as `?sid=` parameter
```
https://app.primethink.ai/public/chats/{chat-id}?sid={session-id}
```

### Example with cURL

```bash
curl -X POST "https://app.primethink.ai/api/v1/public/chats/<chat_share_id>/public-session" \
     -H "Content-Type: application/json" \
     -H "Accept: */*" \
     -d '{}'
```

**Response**:
```json
"00ba58bb-220e-40b8-8959-19294265b17a"
```

### Public Chat Rate Limits

Every public-chat API request consumes two independent request budgets:

- A per-visitor budget for each public chat, identified by the share ID and client IP. The default is **20 requests per 60 seconds**.
- A per-chat budget shared by all visitors to that public chat. The default is **200 requests per 60 seconds**.

These defaults can be changed by the PrimeThink deployment. The limits apply to public session creation, chat details, messages, message editing, socket-token creation, and streaming requests.

When either budget is exhausted, the API returns HTTP `429 Too Many Requests`:

```json
{
  "detail": "Rate limit exceeded"
}
```

Use the response headers rather than parsing the message text:

- `Retry-After` — seconds until the fixed window resets.
- `X-RateLimit-Limit` — the ceiling for the budget that was exhausted.
- `X-RateLimit-Remaining` — `0` for the rejected request.

Wait for the indicated `Retry-After` interval before allowing another attempt; do not immediately retry or hard-code the default 60-second window.

---

## LocalStorage Structure

### Keys Used

The key names are up to your implementation — what matters is persisting the session URL (with its `sid` parameter) so the session survives page reloads. The two examples in this guide use:

```javascript
// Minimal single-chat widget
'support_chat_session_url' = 'https://app.primethink.ai/public/chats/abc-123?sid=def-456'

// Multi-chat widget
'chat_session_url'   = 'https://app.primethink.ai/public/chats/abc-123?sid=def-456'
'chat_selected_city' = 'london'
'chat_is_open'       = 'true' | 'false'
```

### Session Lifecycle

1. **Create**: When user opens chat for first time
   ```javascript
   localStorage.setItem('support_chat_session_url', 'chat-url?sid=session-id');
   ```

2. **Restore**: On page load/refresh
   ```javascript
   const savedUrl = localStorage.getItem('support_chat_session_url');
   if (savedUrl) {
       iframe.src = savedUrl;
   }
   ```

3. **Clear**: When user closes chat
   ```javascript
   localStorage.removeItem('support_chat_session_url');
   ```

---

## Advanced Features

### 1. Loading Indicator

Add a loading spinner while the chat loads:

```html
<div class="chat-content">
    <div class="loading-spinner" id="spinner">Loading...</div>
    <iframe id="support-iframe"></iframe>
</div>
```

```javascript
iframe.addEventListener('load', () => {
    document.getElementById('spinner').style.display = 'none';
});
```

### 2. Minimize Feature

Allow users to minimize the chat:

```javascript
toggleMinimize() {
    this.chatFrame.classList.toggle('minimized');
}
```

```css
#chat-frame.minimized {
    height: 60px;
}
#chat-frame.minimized .chat-content {
    display: none;
}
```

### 3. Draggable Window

Make the chat draggable:

```javascript
dragStart(e) {
    this.isDragging = true;
    const rect = this.chatFrame.getBoundingClientRect();
    this.offsetX = e.clientX - rect.left;
    this.offsetY = e.clientY - rect.top;
}

drag(e) {
    if (!this.isDragging) return;
    this.chatFrame.style.left = (e.clientX - this.offsetX) + 'px';
    this.chatFrame.style.top = (e.clientY - this.offsetY) + 'px';
}
```

### 4. Mobile Responsive

Adjust for mobile devices:

```css
@media (max-width: 768px) {
    #chat-frame {
        width: calc(100vw - 40px);
        height: calc(100vh - 120px);
        right: 20px;
        bottom: 90px;
    }
}
```

---

## Multiple Chats Example

### Use Case: City-Specific Support

If you want to offer different chat sessions based on user selection (e.g., London vs Sydney support):

#### HTML Structure

```html
<!-- Floating Button -->
<button id="chat-button">💬</button>

<!-- Chat Frame -->
<div id="chat-frame">
    <div class="title-bar">
        <h3>Support</h3>
        <button id="close-btn">×</button>
    </div>

    <!-- Welcome Screen - Choose Location -->
    <div id="welcome-screen" class="chat-content">
        <h2>Select Your Location</h2>
        <button class="city-btn" data-city="london">🇬🇧 London</button>
        <button class="city-btn" data-city="sydney">🇦🇺 Sydney</button>
    </div>

    <!-- Chat Screen - After Selection -->
    <div id="chat-screen" class="chat-content" style="display: none;">
        <div class="chat-header">
            <span id="city-badge"></span>
            <button id="back-btn">← Back</button>
        </div>
        <iframe id="support-iframe"></iframe>
    </div>
</div>
```

#### JavaScript Implementation

```javascript
class MultiChatSupport {
    constructor() {
        this.chatButton = document.getElementById('chat-button');
        this.chatFrame = document.getElementById('chat-frame');
        this.closeBtn = document.getElementById('close-btn');
        this.welcomeScreen = document.getElementById('welcome-screen');
        this.chatScreen = document.getElementById('chat-screen');
        this.iframe = document.getElementById('support-iframe');
        this.cityBadge = document.getElementById('city-badge');
        this.backBtn = document.getElementById('back-btn');

        // Configuration - Multiple Chats
        this.chats = {
            london: {
                chatId: 'f6a7b8c9-d0e1-4234-9123-456789012345',
                name: 'London Support'
            },
            sydney: {
                chatId: 'a7b8c9d0-e1f2-4345-8234-567890123456',
                name: 'Sydney Support'
            }
        };

        this.STORAGE_KEYS = {
            SESSION_URL: 'chat_session_url',
            SELECTED_CITY: 'chat_selected_city',
            IS_OPEN: 'chat_is_open'
        };

        this.init();
    }

    init() {
        // Button event listeners
        this.chatButton.addEventListener('click', () => this.openChat());
        this.closeBtn.addEventListener('click', () => this.closeChat());
        this.backBtn.addEventListener('click', () => this.showWelcome());

        // City selection buttons
        document.querySelectorAll('.city-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const city = e.target.dataset.city;
                this.selectCity(city);
            });
        });

        // Restore session
        this.restoreSession();
    }

    openChat() {
        this.chatFrame.classList.add('open');
        this.chatButton.classList.add('hidden');
        localStorage.setItem(this.STORAGE_KEYS.IS_OPEN, 'true');
    }

    closeChat() {
        this.chatFrame.classList.remove('open');
        this.chatButton.classList.remove('hidden');
        this.iframe.src = '';

        // Clear session
        localStorage.removeItem(this.STORAGE_KEYS.SESSION_URL);
        localStorage.removeItem(this.STORAGE_KEYS.SELECTED_CITY);
        localStorage.setItem(this.STORAGE_KEYS.IS_OPEN, 'false');

        // Show welcome screen
        this.showWelcome();
    }

    showWelcome() {
        this.welcomeScreen.style.display = 'flex';
        this.chatScreen.style.display = 'none';
    }

    async selectCity(city) {
        const chatConfig = this.chats[city];
        if (!chatConfig) return;

        // Update UI
        this.cityBadge.textContent = chatConfig.name;
        this.welcomeScreen.style.display = 'none';
        this.chatScreen.style.display = 'flex';

        // Create session
        try {
            const apiUrl = `https://app.primethink.ai/api/v1/public/chats/${chatConfig.chatId}/public-session`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });

            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                throw new Error(`Too many requests. Try again in ${retryAfter ?? 'a few'} seconds.`);
            }
            if (!response.ok) {
                throw new Error(`Session creation failed with status ${response.status}`);
            }

            const sessionId = await response.json();
            const sessionUrl = `https://app.primethink.ai/public/chats/${chatConfig.chatId}?sid=${sessionId}`;

            // Load chat
            this.iframe.src = sessionUrl;

            // Save session
            localStorage.setItem(this.STORAGE_KEYS.SESSION_URL, sessionUrl);
            localStorage.setItem(this.STORAGE_KEYS.SELECTED_CITY, city);

        } catch (error) {
            console.error('Error creating session:', error);
            this.iframe.srcdoc = '<p role="alert">Chat is temporarily unavailable. Please wait and try again.</p>';
        }
    }

    restoreSession() {
        const savedUrl = localStorage.getItem(this.STORAGE_KEYS.SESSION_URL);
        const selectedCity = localStorage.getItem(this.STORAGE_KEYS.SELECTED_CITY);
        const wasOpen = localStorage.getItem(this.STORAGE_KEYS.IS_OPEN) === 'true';

        if (savedUrl && selectedCity && wasOpen) {
            const chatConfig = this.chats[selectedCity];

            // Restore chat state
            this.chatFrame.classList.add('open');
            this.chatButton.classList.add('hidden');
            this.welcomeScreen.style.display = 'none';
            this.chatScreen.style.display = 'flex';

            // Restore content
            this.cityBadge.textContent = chatConfig.name;
            this.iframe.src = savedUrl;
        }
    }
}

// Initialize
new MultiChatSupport();
```

#### CSS for Multiple Chats

```css
/* Welcome Screen */
#welcome-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
}

#welcome-screen h2 {
    font-size: 18px;
    margin-bottom: 30px;
    text-align: center;
    color: #333;
}

.city-btn {
    width: 100%;
    max-width: 250px;
    padding: 16px 24px;
    margin: 8px 0;
    border: 2px solid #667eea;
    background: white;
    color: #667eea;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.city-btn:hover {
    background: #667eea;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* Chat Screen */
#chat-screen {
    flex-direction: column;
}

.chat-header {
    padding: 16px 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

#city-badge {
    background: #667eea;
    color: white;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

#back-btn {
    padding: 6px 16px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    color: #666;
    cursor: pointer;
    font-size: 13px;
}

#back-btn:hover {
    border-color: #667eea;
    color: #667eea;
}

#chat-screen iframe {
    flex: 1;
    width: 100%;
    border: none;
}
```

### Multiple Chats Flow

```
1. User clicks button → Welcome screen shows

2. User selects "London" →
   - POST /chats/london-id/public-session
   - Get session ID
   - Load London chat with ?sid=session-id
   - Save "london" + session URL to localStorage

3. User refreshes page →
   - Check localStorage
   - Find "london" + saved URL
   - Restore London chat automatically

4. User clicks "Back" →
   - Return to welcome screen
   - Keep session in localStorage (optional)

5. User closes chat →
   - Clear all localStorage
   - Reset to initial state
```

---

## Best Practices

### 1. Error Handling

Always provide fallbacks:

```javascript
try {
    const response = await fetch(apiUrl, requestOptions);

    if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        showTemporaryError(`Too many requests. Try again in ${retryAfter ?? 'a few'} seconds.`);
        return; // Wait for user action; do not retry immediately.
    }
    if (!response.ok) {
        throw new Error(`Session creation failed with status ${response.status}`);
    }

    const sessionId = await response.json();
    iframe.src = `${baseUrl}?sid=${sessionId}`;
} catch (error) {
    console.error('Session creation failed:', error);
    showTemporaryError('Chat is temporarily unavailable. Please try again later.');
}
```

### 2. CORS Considerations

Ensure your domain is allowed to make requests to Primethink API. If you encounter CORS errors, the Primethink backend needs to allow your domain.

### 3. Security

- Use the `sandbox` attribute on the iframe for security
- Don't store sensitive data in localStorage
- Clear session on logout if needed

Grant the narrowest set of `sandbox` permissions the widget actually needs. Note that combining `allow-same-origin` with `allow-scripts` lets sandboxed content reach back into its own origin and can effectively remove the sandbox's protection — only include `allow-same-origin` if the embedded page genuinely requires same-origin access, and prefer serving the widget from a separate origin so you can drop it:

```html
<!-- Minimal: scripts + forms, cross-origin (no allow-same-origin) -->
<iframe sandbox="allow-scripts allow-forms allow-popups"></iframe>
```

### 4. Performance

- Load chat only when user clicks button (lazy loading)
- Clear iframe when chat closes to free memory
- Limit localStorage size by removing old sessions

### 5. Accessibility

- Add ARIA labels for screen readers
- Ensure keyboard navigation works
- Provide clear visual indicators

```html
<button id="chat-button" aria-label="Open support chat">💬</button>
```

---

## Troubleshooting

### Chat doesn't load

**Problem**: iframe remains blank after clicking button

**Solutions**:
- Check browser console for errors
- Verify chat ID is correct
- Ensure API endpoint is accessible
- Check CORS configuration
- Verify network connectivity

### Session not persisting

**Problem**: Chat resets after page refresh

**Solutions**:
- Check localStorage is enabled in browser
- Verify storage key is correct
- Ensure session URL is being saved
- Check browser privacy settings

### API returns 404

**Problem**: POST request fails with 404

**Solutions**:
- Verify chat ID is correct
- Ensure chat is set to public in Primethink
- Check API URL format
- Test with cURL first

### API returns 429

**Problem**: A public-chat request fails with `429 Too Many Requests`

**Solutions**:
- Read the `Retry-After` response header and wait that many seconds before another attempt
- Do not automatically retry in a tight loop
- Reuse stored public sessions instead of creating a new session for every interaction or page load
- If the problem affects many visitors, the public chat may have reached its shared per-chat budget

### Multiple instances conflict

**Problem**: Multiple chat widgets on same page interfere

**Solutions**:
- Use unique storage keys per widget
- Namespace your class/variables
- Consider using data attributes for configuration

---

## Examples

The two complete implementations in this guide cover both patterns:
- The minimal widget — single chat implementation
- The multi-chat widget — multiple chats with city selection

Both examples include:
- Full HTML, CSS, and JavaScript
- Session persistence
- Drag and drop
- Minimize/maximize
- Mobile responsive
- Loading indicators

---

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API responses with cURL
3. Review localStorage in DevTools
4. Test with minimal example first

## License

This implementation guide is provided for developers integrating Primethink chat into their applications.
