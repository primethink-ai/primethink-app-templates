// PrimeThink JavaScript Library
// This library provides utilities for interacting with the PrimeThink API from live canvas pages

(function() {
  'use strict';

  // Initialize the pt object
  window.pt = {
    chatId: null,
    csrfToken: null,
    scopedToken: null,
    basePath: '', // Base path for all API calls (e.g., '/proxy' or 'https://api.example.com')
    _socket: null, // Socket.IO client instance (auto-managed)
    socketEventListeners: [],
    messageReceivedListeners: {}, // Map of task_id -> array of callbacks
    documentChangedListeners: [], // Array of {callback, options, unsubscribe} for document change events
    documentReadyListeners: {}, // Map of document_id -> array of {callback, unsubscribe} for waiting on specific documents
    entityChangedListeners: [], // Array of {callback, options, unsubscribe} for entity change events

    /**
     * Initialize the library with chat UUID, CSRF token, and scoped token
     * @param {string} chatId - The chat UUID
     * @param {string} csrfToken - The CSRF token
     * @param {string} scopedToken - The scoped authentication token
     */
    init: function(chatId, csrfToken, scopedToken) {
      this.chatId = chatId;
      this.csrfToken = csrfToken;
      this.scopedToken = scopedToken;
      console.log('PrimeThink library initialized:', {
        chatId: chatId,
        hasCsrfToken: !!csrfToken,
        hasScopedToken: !!scopedToken,
        csrfTokenLength: csrfToken?.length,
        scopedTokenLength: scopedToken?.length
      });

      // Auto-connect to Socket.IO if the client library is available
      // (i.e. when running as a standalone live page, not inside Flutter)
      this._connectSocket();
    },

    /**
     * Connect to Socket.IO using the scoped token for authentication.
     * Called automatically by init() when the Socket.IO client library (io) is available.
     * When running inside the Flutter wrapper, the wrapper manages the connection
     * and forwards events via receiveSocketEvent() instead.
     * @private
     */
    _connectSocket: function() {
      if (typeof io === 'undefined') {
        console.log('PrimeThink: Socket.IO client not available, waiting for Flutter wrapper events');
        return;
      }
      // When running inside Flutter's about:srcdoc iframe, the page origin is
      // "about:" which causes io() to resolve to http://about/socket.io/ (mixed
      // content error). The Flutter wrapper manages its own Socket.IO connection
      // and forwards events via receiveSocketEvent(), so skip auto-connect.
      if (window.location.protocol === 'about:') {
        console.log('PrimeThink: Running inside iframe (about:srcdoc), skipping Socket.IO auto-connect');
        return;
      }
      if (this._socket) {
        return; // already connected
      }

      var self = this;
      var socketEvents = [
        'message', 'stream_partial_token', 'stream_reasoning_token',
        'stream_completed', 'stream_cancelled', 'stream_error',
        'chat', 'chat_field_changed', 'chat_canvas_changed',
        'subchats', 'notification', 'unread_messages',
        'document_change', 'chat_db_updated', 'collection_db_updated', 'reaction'
      ];

      var socketOpts = {
        auth: { token: this.scopedToken }
      };
      // When basePath is set (e.g. '/proxy'), use it as Socket.IO path prefix
      // so socket traffic routes through the same proxy as REST calls
      if (this.basePath) {
        var base = this.basePath.replace(/\/+$/, '');
        socketOpts.path = base + '/socket.io';
      }
      this._socket = io(socketOpts);

      this._socket.on('connect', function() {
        console.log('PrimeThink: Socket.IO connected');
        self._socket.emit('join', { chatUuid: self.chatId });
      });

      this._socket.on('disconnect', function(reason) {
        console.log('PrimeThink: Socket.IO disconnected:', reason);
      });

      this._socket.on('connect_error', function(err) {
        console.error('PrimeThink: Socket.IO connection error:', err.message);
      });

      // Forward all server events through receiveSocketEvent
      socketEvents.forEach(function(eventName) {
        self._socket.on(eventName, function(data) {
          self.receiveSocketEvent(eventName, data);
        });
      });
    },

    /**
     * Set the base path for all API calls.
     * This shouldn't be normally used.
     * Use this for debug or when the API is hosted on a different domain or behind a proxy.
     * @param {string} path - The base path (e.g., '/proxy', 'https://api.example.com', or '')
     *
     * @example
     * // Use a proxy path
     * pt.setBasePath('/proxy');
     * // API calls will go to /proxy/api/v1/live/...
     *
     * @example
     * // Use a different domain
     * pt.setBasePath('https://api.primethink.com');
     * // API calls will go to https://api.primethink.com/api/v1/live/...
     *
     * @example
     * // Reset to default (same origin)
     * pt.setBasePath('');
     */
    setBasePath: function(path) {
      // Remove trailing slash if present
      this.basePath = path ? path.replace(/\/$/, '') : '';
      console.log('PrimeThink base path set to:', this.basePath || '(default)');
    },

    /**
     * Get the full URL for an API endpoint
     * @private
     * @param {string} endpoint - The API endpoint path (e.g., '/api/v1/live/123/action')
     * @returns {string} The full URL with base path prepended
     */
    _getUrl: function(endpoint) {
      return this.basePath + endpoint;
    },

    // ============================================================================
    // SOCKET.IO EVENT HANDLING
    // ============================================================================

    /**
     * Receive a socket event from the Flutter wrapper
     *
     * This method is called BY the Flutter wrapper to inject socket.io events
     * into the live app. The Flutter wrapper handles authentication and forwards
     * events through this method.
     *
     * @param {string} event - The socket event name
     * @param {any} data - The event data
     *
     * @example
     * // Called by Flutter wrapper
     * window.pt.receiveSocketEvent('notification', { title: 'New message', text: 'Hello!' });
     * window.pt.receiveSocketEvent('entity_updated', { id: 123, entity_name: 'task', data: {...} });
     */
    receiveSocketEvent: function(event, data) {
      console.log('Socket event received:', event, data);

      // Notify all subscribers
      this.socketEventListeners.forEach(function(listener) {
        try {
          listener(event, data);
        } catch (error) {
          console.error('Error in socket event listener:', error);
        }
      });
    },

    /**
     * Subscribe to socket events
     *
     * This method is called BY the live app to subscribe to socket.io events
     * forwarded by the Flutter wrapper. The callback will be invoked whenever
     * a socket event is received.
     *
     * @param {function} callback - Callback function(event, data) to handle events
     * @returns {function} Unsubscribe function to remove the listener
     *
     * @example
     * // Subscribe to all socket events
     * const unsubscribe = pt.onSocketEvent((event, data) => {
     *   console.log('Received event:', event, data);
     *
     *   if (event === 'notification') {
     *     showNotification(data.title, data.text);
     *   }
     *
     *   if (event === 'entity_updated') {
     *     refreshEntity(data.id);
     *   }
     * });
     *
     * @example
     * // Unsubscribe when done
     * const unsubscribe = pt.onSocketEvent((event, data) => {
     *   // handle events...
     * });
     *
     * // Later...
     * unsubscribe();
     */
    onSocketEvent: function(callback) {
      if (typeof callback !== 'function') {
        throw new Error('Callback must be a function');
      }

      this.socketEventListeners.push(callback);

      // Return unsubscribe function
      var self = this;
      return function unsubscribe() {
        var index = self.socketEventListeners.indexOf(callback);
        if (index > -1) {
          self.socketEventListeners.splice(index, 1);
        }
      };
    },

    /**
     * Subscribe to receive the AI response message for a specific task
     *
     * This method listens for socket events and calls the callback when the AI
     * response message for the specified task_id has finished streaming. It
     * automatically handles truncated messages by fetching the full text.
     *
     * The callback is called once when the `stream_completed` event is received
     * for the task, followed by the final `message` event with the complete
     * AI response.
     *
     * @param {string} taskId - The task_id returned from addMessage() when await_response is false
     * @param {function} callback - Callback function(message) called with the complete AI message
     * @returns {function} Unsubscribe function to remove the listener
     *
     * Message object structure:
     * - id: Message ID (number)
     * - message: Full message text (automatically fetched if truncated)
     * - message_is_truncated: Boolean indicating if original was truncated (always false after fetch)
     * - user_type: 'assistant' for AI responses
     * - type: Message type (e.g., 'message')
     * - created_at: ISO timestamp
     * - chat_uuid: UUID of the chat
     * - reasoning_steps: Array of reasoning steps (if available)
     * - attachments: Array of attached documents
     * - And other message metadata...
     *
     * @example
     * // Send message and wait for AI response via socket
     * const result = await pt.addMessage('What is the weather today?');
     * const taskId = result.task_id;
     *
     * const unsubscribe = pt.onMessageReceived(taskId, (message) => {
     *   console.log('AI Response:', message.message);
     *   console.log('Message ID:', message.id);
     *   unsubscribe(); // Clean up after receiving
     * });
     *
     * @example
     * // Handle long responses that might be truncated
     * const result = await pt.addMessage('Write a detailed essay about AI');
     *
     * pt.onMessageReceived(result.task_id, (message) => {
     *   // message.message is guaranteed to be the full text
     *   // even if it was truncated during streaming
     *   document.getElementById('response').textContent = message.message;
     * });
     *
     * @example
     * // Multiple messages with tracking
     * const pendingResponses = new Map();
     *
     * async function sendAndTrack(text) {
     *   const result = await pt.addMessage(text);
     *   const taskId = result.task_id;
     *
     *   return new Promise((resolve) => {
     *     const unsubscribe = pt.onMessageReceived(taskId, (message) => {
     *       pendingResponses.delete(taskId);
     *       unsubscribe();
     *       resolve(message);
     *     });
     *     pendingResponses.set(taskId, unsubscribe);
     *   });
     * }
     *
     * // Usage
     * const response = await sendAndTrack('Hello!');
     * console.log('Got response:', response.message);
     *
     * @example
     * // Cancel waiting for response
     * const result = await pt.addMessage('Long running query...');
     * const unsubscribe = pt.onMessageReceived(result.task_id, (message) => {
     *   console.log('Response:', message.message);
     * });
     *
     * // User clicks cancel
     * document.getElementById('cancelBtn').onclick = () => {
     *   unsubscribe();
     *   console.log('Stopped waiting for response');
     * };
     */
    onMessageReceived: function(taskId, callback) {
      if (!taskId || typeof taskId !== 'string') {
        throw new Error('taskId must be a non-empty string');
      }
      if (typeof callback !== 'function') {
        throw new Error('callback must be a function');
      }

      var self = this;

      // Track completed streams and pending messages for this task
      var state = {
        streamCompleted: false,
        aiMessageId: null,
        pendingMessage: null
      };

      // Internal handler for socket events
      var socketHandler = function(event, data) {
        // Handle stream_completed event - marks that streaming is done
        if (event === 'stream_completed') {
          // task_id format from server: "original_task_id:ai_message_id"
          var taskIdFromEvent = data.task_id;
          if (taskIdFromEvent && taskIdFromEvent.startsWith(taskId + ':')) {
            state.streamCompleted = true;
            state.aiMessageId = data.ai_message_id;

            // If we already have a pending message, process it now
            if (state.pendingMessage) {
              self._processReceivedMessage(state.pendingMessage, callback);
              cleanup();
            }
          }
        }

        // Handle message event - the actual message data
        if (event === 'message') {
          try {
            var payload = typeof data.payload === 'string' ? JSON.parse(data.payload) : data.payload;

            // Check if this message is for our task (AI response)
            if (payload && payload.user_type === 'assistant') {
              // Match by ai_message_id if we have it from stream_completed
              if (state.aiMessageId && payload.id === state.aiMessageId) {
                if (state.streamCompleted) {
                  self._processReceivedMessage(payload, callback);
                  cleanup();
                } else {
                  state.pendingMessage = payload;
                }
              }
            }
          } catch (e) {
            console.error('Error parsing message payload:', e);
          }
        }
      };

      // Register the socket handler
      var unsubscribeSocket = this.onSocketEvent(socketHandler);

      // Cleanup function
      var cleanup = function() {
        unsubscribeSocket();
        // Remove from messageReceivedListeners if tracked
        if (self.messageReceivedListeners[taskId]) {
          var idx = self.messageReceivedListeners[taskId].indexOf(cleanup);
          if (idx > -1) {
            self.messageReceivedListeners[taskId].splice(idx, 1);
          }
          if (self.messageReceivedListeners[taskId].length === 0) {
            delete self.messageReceivedListeners[taskId];
          }
        }
      };

      // Track this listener
      if (!this.messageReceivedListeners[taskId]) {
        this.messageReceivedListeners[taskId] = [];
      }
      this.messageReceivedListeners[taskId].push(cleanup);

      // Return unsubscribe function
      return cleanup;
    },

    /**
     * Internal method to process a received message and handle truncation
     * @private
     */
    _processReceivedMessage: async function(message, callback) {
      try {
        // Check if message is truncated and fetch full text if needed
        if (message.message_is_truncated === true && message.id) {
          try {
            var fullText = await this.getMessageText(message.id);
            message.message = fullText;
            message.message_is_truncated = false;
          } catch (fetchError) {
            console.error('Failed to fetch full message text:', fetchError);
            // Continue with truncated message rather than failing completely
          }
        }

        // Call the user's callback with the processed message
        callback(message);
      } catch (error) {
        console.error('Error processing received message:', error);
      }
    },

    /**
     * Wait for the AI response message for a specific task
     *
     * Returns a Promise that resolves when the AI has finished generating its response.
     * This is a convenience wrapper around onMessageReceived for async/await usage.
     * Automatically handles truncated messages by fetching the full text.
     *
     * @param {string} taskId - The task_id returned from addMessage()
     * @param {object} options - Optional configuration
     * @param {number} options.timeout - Timeout in milliseconds (default: 120000 = 2 minutes)
     * @returns {Promise<object>} Resolves with the complete AI message object
     *
     * Message object structure:
     * - id: Message ID (number)
     * - message: Full message text (automatically fetched if truncated)
     * - message_is_truncated: Boolean (always false after processing)
     * - user_type: 'assistant' for AI responses
     * - type: Message type (e.g., 'message')
     * - created_at: ISO timestamp
     * - chat_uuid: UUID of the chat
     * - reasoning_steps: Array of reasoning steps (if available)
     * - attachments: Array of attached documents
     *
     * @example
     * // Simple usage - send and wait for response
     * const result = await pt.addMessage('What is 2 + 2?');
     * const response = await pt.waitForMessageReceived(result.task_id);
     * console.log('AI says:', response.message);
     *
     * @example
     * // One-liner pattern
     * const { task_id } = await pt.addMessage('Explain quantum computing');
     * const { message } = await pt.waitForMessageReceived(task_id);
     * document.getElementById('answer').textContent = message;
     *
     * @example
     * // With custom timeout for long responses
     * const result = await pt.addMessage('Write a 5000 word essay');
     * const response = await pt.waitForMessageReceived(result.task_id, {
     *   timeout: 300000  // 5 minutes
     * });
     *
     * @example
     * // Error handling
     * try {
     *   const result = await pt.addMessage('Complex analysis request');
     *   const response = await pt.waitForMessageReceived(result.task_id);
     *   displayResponse(response.message);
     * } catch (error) {
     *   if (error.message.includes('Timeout')) {
     *     showError('Response is taking too long. Please try again.');
     *   } else {
     *     showError(error.message);
     *   }
     * }
     *
     * @example
     * // Process multiple questions in parallel
     * const questions = ['What is AI?', 'What is ML?', 'What is DL?'];
     * const results = await Promise.all(
     *   questions.map(q => pt.addMessage(q))
     * );
     * const responses = await Promise.all(
     *   results.map(r => pt.waitForMessageReceived(r.task_id))
     * );
     * responses.forEach((r, i) => {
     *   console.log(`Q: ${questions[i]}`);
     *   console.log(`A: ${r.message}\n`);
     * });
     *
     * @example
     * // Helper function for common pattern
     * async function ask(question, options = {}) {
     *   const result = await pt.addMessage(question, options);
     *   return pt.waitForMessageReceived(result.task_id);
     * }
     *
     * // Usage
     * const response = await ask('Summarize this document');
     * console.log(response.message);
     */
    waitForMessageReceived: function(taskId, options = {}) {
      if (!taskId || typeof taskId !== 'string') {
        throw new Error('taskId must be a non-empty string');
      }

      var self = this;
      var timeout = options.timeout || 120000; // Default 2 minutes

      return new Promise(function(resolve, reject) {
        var timeoutId = null;
        var unsubscribe = null;

        // Cleanup function
        var cleanup = function() {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
        };

        // Set timeout
        timeoutId = setTimeout(function() {
          cleanup();
          reject(new Error('Timeout waiting for AI response (task: ' + taskId + ')'));
        }, timeout);

        // Subscribe to message received
        unsubscribe = self.onMessageReceived(taskId, function(message) {
          cleanup();
          resolve(message);
        });
      });
    },

    /**
     * Wait for multiple AI responses to complete
     *
     * Waits for all specified tasks to receive their AI responses. Useful when
     * sending multiple messages in parallel and waiting for all responses.
     * Each task is tracked independently, so responses can arrive in any order.
     *
     * @param {string[]} taskIds - Array of task_ids returned from addMessage()
     * @param {object} options - Optional configuration
     * @param {number} options.timeout - Timeout in milliseconds for ALL responses (default: 120000 = 2 minutes)
     * @param {boolean} options.failFast - If true, reject immediately on first timeout (default: true)
     * @param {function} options.onProgress - Callback(completed, total, message) called as each response arrives
     * @returns {Promise<object[]>} Resolves with array of message objects in same order as taskIds
     *
     * @example
     * // Send multiple questions and wait for all answers
     * const questions = ['What is AI?', 'What is ML?', 'What is DL?'];
     * const results = await Promise.all(questions.map(q => pt.addMessage(q)));
     * const taskIds = results.map(r => r.task_id);
     *
     * const responses = await pt.waitForAllMessagesReceived(taskIds);
     * responses.forEach((r, i) => {
     *   console.log(`Q: ${questions[i]}`);
     *   console.log(`A: ${r.message}`);
     * });
     *
     * @example
     * // With progress tracking
     * const responses = await pt.waitForAllMessagesReceived(taskIds, {
     *   timeout: 180000,
     *   onProgress: (completed, total, message) => {
     *     updateProgressBar(completed / total * 100);
     *     console.log(`${completed}/${total} responses received`);
     *   }
     * });
     *
     * @example
     * // Continue even if some timeout (failFast: false)
     * const responses = await pt.waitForAllMessagesReceived(taskIds, {
     *   failFast: false,
     *   timeout: 60000
     * });
     * // responses may contain null for timed-out tasks
     * const successful = responses.filter(r => r !== null);
     *
     * @example
     * // Batch question helper
     * async function askAll(questions, options = {}) {
     *   const results = await Promise.all(questions.map(q => pt.addMessage(q)));
     *   return pt.waitForAllMessagesReceived(
     *     results.map(r => r.task_id),
     *     options
     *   );
     * }
     *
     * const answers = await askAll(['Q1?', 'Q2?', 'Q3?']);
     */
    waitForAllMessagesReceived: function(taskIds, options = {}) {
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        throw new Error('taskIds must be a non-empty array');
      }

      var self = this;
      var timeout = options.timeout || 120000;
      var failFast = options.failFast !== false; // Default true
      var onProgress = options.onProgress;

      return new Promise(function(resolve, reject) {
        var results = new Array(taskIds.length).fill(null);
        var completed = 0;
        var unsubscribes = [];
        var timeoutId = null;
        var resolved = false;

        // Cleanup function
        var cleanup = function() {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          unsubscribes.forEach(function(unsub) {
            if (unsub) unsub();
          });
          unsubscribes = [];
        };

        // Check if all done
        var checkComplete = function() {
          if (resolved) return;
          if (completed === taskIds.length) {
            resolved = true;
            cleanup();
            resolve(results);
          }
        };

        // Set global timeout
        timeoutId = setTimeout(function() {
          if (resolved) return;
          
          if (failFast) {
            resolved = true;
            cleanup();
            var pending = taskIds.length - completed;
            reject(new Error('Timeout waiting for ' + pending + ' AI response(s)'));
          } else {
            // Return what we have (nulls for incomplete)
            resolved = true;
            cleanup();
            resolve(results);
          }
        }, timeout);

        // Subscribe to each task
        taskIds.forEach(function(taskId, index) {
          var unsub = self.onMessageReceived(taskId, function(message) {
            if (resolved) return;
            
            results[index] = message;
            completed++;
            
            if (onProgress) {
              try {
                onProgress(completed, taskIds.length, message);
              } catch (e) {
                console.error('Error in onProgress callback:', e);
              }
            }
            
            checkComplete();
          });
          unsubscribes.push(unsub);
        });
      });
    },

    // ============================================================================
    // DOCUMENT CHANGE EVENT HANDLING
    // ============================================================================

    /**
     * Subscribe to document change events
     *
     * This method listens for `document_change` socket events and calls the callback
     * whenever a document's status, extracted text, or indexing state changes.
     * Useful for tracking document processing progress after uploads.
     *
     * @param {function} callback - Callback function(document) called with document change data
     * @param {object} options - Optional filtering options
     * @param {number} options.documentId - Only receive events for this specific document ID
     * @param {number[]} options.documentIds - Only receive events for these document IDs
     * @param {string} options.status - Only receive events when document reaches this status ('Added', 'Ready', 'Error')
     * @param {string[]} options.statuses - Only receive events for these statuses
     * @returns {function} Unsubscribe function to remove the listener
     *
     * Document change object structure:
     * - id: Document ID (number)
     * - uuid: Document UUID (string)
     * - name: Document filename (string)
     * - mimetype: MIME type (string, e.g., 'image/png', 'application/pdf')
     * - status: Document status ('Added', 'Ready', 'Error')
     * - extracted_text_size: Size of extracted text in characters (number or null)
     * - indexed: Whether document is indexed for RAG search ('True' or 'False')
     * - path: Document path in folder structure (string)
     * - chat_uuid: UUID of the chat containing the document (string)
     * - document_in_chat_status: Role of the document in the chat ('archived', 'search', 'attached', 'context')
     * - download_url: URL to download the document (string)
     *
     * Document status lifecycle (DocumentStatus):
     * - 'Added':     File uploaded; original file present, no text extracted yet
     * - 'Loaded':    Text has been extracted from the file
     * - 'Processed': Chunks have been created (for documents that need indexing)
     * - 'Ready':     Chunks indexed; document is ready for semantic search / RAG
     * - 'Error':     Error during extraction or indexing
     *
     * @example
     * // Subscribe to all document changes
     * const unsubscribe = pt.onDocumentChanged((doc) => {
     *   console.log(`Document ${doc.name} changed:`);
     *   console.log(`  Status: ${doc.status}`);
     *   console.log(`  Indexed: ${doc.indexed}`);
     *   console.log(`  Text size: ${doc.extracted_text_size}`);
     * });
     *
     * @example
     * // Track a specific document after upload
     * const result = await pt.uploadFiles(form);
     * const docId = result.documents[0].id;
     *
     * const unsubscribe = pt.onDocumentChanged((doc) => {
     *   console.log(`Document ${doc.name}: ${doc.status}`);
     *   if (doc.status === 'Ready') {
     *     console.log('Document ready! Text size:', doc.extracted_text_size);
     *     unsubscribe();
     *   }
     * }, { documentId: docId });
     *
     * @example
     * // Only listen for 'Ready' status
     * pt.onDocumentChanged((doc) => {
     *   console.log(`${doc.name} is now ready for RAG search`);
     *   const text = await pt.getDocumentText(doc.id);
     *   processDocument(text);
     * }, { status: 'Ready' });
     *
     * @example
     * // Track multiple documents from batch upload
     * const result = await pt.uploadFiles(form);
     * const docIds = result.documents.map(d => d.id);
     * const readyDocs = new Set();
     *
     * const unsubscribe = pt.onDocumentChanged((doc) => {
     *   if (doc.status === 'Ready') {
     *     readyDocs.add(doc.id);
     *     updateProgress(readyDocs.size, docIds.length);
     *
     *     if (readyDocs.size === docIds.length) {
     *       console.log('All documents ready!');
     *       unsubscribe();
     *       processAllDocuments();
     *     }
     *   }
     * }, { documentIds: docIds });
     *
     * @example
     * // Handle errors
     * pt.onDocumentChanged((doc) => {
     *   if (doc.status === 'Error') {
     *     showError(`Failed to process ${doc.name}`);
     *   } else if (doc.status === 'Ready') {
     *     showSuccess(`${doc.name} processed successfully`);
     *   }
     * }, { statuses: ['Ready', 'Error'] });
     */
    onDocumentChanged: function(callback, options = {}) {
      if (typeof callback !== 'function') {
        throw new Error('callback must be a function');
      }

      var self = this;

      // Normalize options for easier matching
      var filterDocIds = null;
      if (options.documentId) {
        filterDocIds = [options.documentId];
      } else if (options.documentIds && Array.isArray(options.documentIds)) {
        filterDocIds = options.documentIds;
      }

      var filterStatuses = null;
      if (options.status) {
        filterStatuses = [options.status];
      } else if (options.statuses && Array.isArray(options.statuses)) {
        filterStatuses = options.statuses;
      }

      // Internal handler for socket events
      var socketHandler = function(event, data) {
        if (event !== 'document_change') {
          return;
        }

        try {
          var payload = data.payload || data;

          // Apply document ID filter
          if (filterDocIds && !filterDocIds.includes(payload.id)) {
            return;
          }

          // Apply status filter
          if (filterStatuses && !filterStatuses.includes(payload.status)) {
            return;
          }

          // Call the user's callback
          callback(payload);
        } catch (error) {
          console.error('Error in document change handler:', error);
        }
      };

      // Register the socket handler
      var unsubscribeSocket = this.onSocketEvent(socketHandler);

      // Create listener entry
      var listenerEntry = {
        callback: callback,
        options: options,
        unsubscribe: null
      };

      // Cleanup function
      var cleanup = function() {
        unsubscribeSocket();
        var idx = self.documentChangedListeners.indexOf(listenerEntry);
        if (idx > -1) {
          self.documentChangedListeners.splice(idx, 1);
        }
      };

      listenerEntry.unsubscribe = cleanup;

      // Track this listener
      this.documentChangedListeners.push(listenerEntry);

      // Return unsubscribe function
      return cleanup;
    },

    /**
     * Wait for a document to reach 'Ready' status
     *
     * Returns a Promise that resolves when the document is fully processed,
     * text extracted, and indexed for RAG search. Useful after uploading files
     * when you need to wait before accessing the extracted text.
     *
     * @param {number} documentId - The document ID to wait for
     * @param {object} options - Optional configuration
     * @param {number} options.timeout - Timeout in milliseconds (default: 60000 = 60 seconds)
     * @param {boolean} options.rejectOnError - If true, reject promise on 'Error' status (default: true)
     * @returns {Promise<object>} Resolves with the document object when ready
     *
     * @example
     * // Upload and wait for document to be ready
     * const result = await pt.uploadFiles(form);
     * const docId = result.documents[0].id;
     *
     * try {
     *   const doc = await pt.waitForDocumentReady(docId);
     *   console.log('Document ready! Text size:', doc.extracted_text_size);
     *
     *   // Now safe to get the extracted text
     *   const text = await pt.getDocumentText(docId);
     *   console.log('Extracted text:', text);
     * } catch (error) {
     *   console.error('Document processing failed:', error.message);
     * }
     *
     * @example
     * // With custom timeout
     * const doc = await pt.waitForDocumentReady(docId, { timeout: 120000 }); // 2 minutes
     *
     * @example
     * // Upload multiple files and wait for all
     * const result = await pt.uploadFiles(form);
     * const docIds = result.documents.map(d => d.id);
     *
     * const readyDocs = await Promise.all(
     *   docIds.map(id => pt.waitForDocumentReady(id))
     * );
     * console.log('All documents ready:', readyDocs.map(d => d.name));
     *
     * @example
     * // Handle timeout gracefully
     * try {
     *   const doc = await pt.waitForDocumentReady(docId, { timeout: 30000 });
     *   processDocument(doc);
     * } catch (error) {
     *   if (error.message.includes('timeout')) {
     *     showMessage('Document is taking longer than expected...');
     *     // Could retry or show manual refresh option
     *   } else {
     *     showError(error.message);
     *   }
     * }
     *
     * @example
     * // Don't reject on error, handle manually
     * const doc = await pt.waitForDocumentReady(docId, { rejectOnError: false });
     * if (doc.status === 'Error') {
     *   console.log('Document failed, but we can handle it');
     * } else {
     *   console.log('Document ready');
     * }
     */
    waitForDocumentReady: function(documentId, options = {}) {
      if (!documentId || typeof documentId !== 'number') {
        throw new Error('documentId must be a valid number');
      }

      var self = this;
      var timeout = options.timeout || 60000; // Default 60 seconds
      var rejectOnError = options.rejectOnError !== false; // Default true

      return new Promise(function(resolve, reject) {
        var timeoutId = null;
        var unsubscribe = null;

        // Cleanup function
        var cleanup = function() {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
        };

        // Set timeout
        timeoutId = setTimeout(function() {
          cleanup();
          reject(new Error('Timeout waiting for document ' + documentId + ' to be ready'));
        }, timeout);

        // Subscribe to document changes
        unsubscribe = self.onDocumentChanged(function(doc) {
          if (doc.status === 'Ready') {
            cleanup();
            resolve(doc);
          } else if (doc.status === 'Error') {
            cleanup();
            if (rejectOnError) {
              reject(new Error('Document ' + documentId + ' processing failed'));
            } else {
              resolve(doc);
            }
          }
          // Continue waiting for 'Added' or other intermediate statuses
        }, { documentId: documentId });

        // Also check current status immediately (document might already be ready)
        self.getDocumentStatus(documentId).then(function(status) {
          if (status.document_status === 'Ready') {
            cleanup();
            resolve({
              id: documentId,
              status: 'Ready',
              // Note: This is a minimal object; full data comes from socket event
              _fromInitialCheck: true
            });
          } else if (status.document_status === 'Error' || status.document_status === 'failed') {
            cleanup();
            if (rejectOnError) {
              reject(new Error('Document ' + documentId + ' processing failed'));
            } else {
              resolve({
                id: documentId,
                status: 'Error',
                _fromInitialCheck: true
              });
            }
          }
          // Otherwise, wait for socket events
        }).catch(function(error) {
          // If we can't check status, just wait for socket events
          console.warn('Could not check initial document status:', error);
        });
      });
    },

    /**
     * Wait for multiple documents to be ready
     *
     * Waits for all specified documents to reach 'Ready' status. Useful after
     * uploading multiple files when you need all of them processed before continuing.
     * Each document is tracked independently via socket events.
     *
     * @param {number[]} documentIds - Array of document IDs to wait for
     * @param {object} options - Optional configuration
     * @param {number} options.timeout - Timeout in milliseconds for ALL documents (default: 120000 = 2 minutes)
     * @param {boolean} options.failFast - If true, reject immediately on first Error (default: true)
     * @param {boolean} options.rejectOnError - If true, reject on document processing errors (default: true)
     * @param {function} options.onProgress - Callback(completed, total, document) called as each document becomes ready
     * @returns {Promise<object[]>} Resolves with array of document objects in same order as documentIds
     *
     * @example
     * // Upload multiple files and wait for all to be ready
     * const result = await pt.uploadFiles(form);
     * const docIds = result.documents.map(d => d.id);
     *
     * const readyDocs = await pt.waitForAllDocumentsReady(docIds);
     * console.log('All documents ready:', readyDocs.map(d => d.name));
     *
     * @example
     * // With progress tracking
     * const readyDocs = await pt.waitForAllDocumentsReady(docIds, {
     *   timeout: 180000,
     *   onProgress: (completed, total, doc) => {
     *     updateProgressBar(completed / total * 100);
     *     console.log(`${doc.name} ready (${completed}/${total})`);
     *   }
     * });
     *
     * @example
     * // Continue even if some fail (failFast: false)
     * const docs = await pt.waitForAllDocumentsReady(docIds, {
     *   failFast: false,
     *   rejectOnError: false
     * });
     * const successful = docs.filter(d => d && d.status === 'Ready');
     * const failed = docs.filter(d => d && d.status === 'Error');
     * console.log(`${successful.length} ready, ${failed.length} failed`);
     *
     * @example
     * // Upload and wait helper
     * async function uploadAndWait(formData, folder) {
     *   const result = await pt.uploadFiles(formData, folder);
     *   const docIds = result.documents.map(d => d.id);
     *   return pt.waitForAllDocumentsReady(docIds);
     * }
     *
     * const docs = await uploadAndWait(form, 'reports');
     */
    waitForAllDocumentsReady: function(documentIds, options = {}) {
      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        throw new Error('documentIds must be a non-empty array');
      }

      var self = this;
      var timeout = options.timeout || 120000; // Default 2 minutes for batch
      var failFast = options.failFast !== false; // Default true
      var rejectOnError = options.rejectOnError !== false; // Default true
      var onProgress = options.onProgress;

      return new Promise(function(resolve, reject) {
        var results = new Array(documentIds.length).fill(null);
        var completed = 0;
        var unsubscribe = null;
        var timeoutId = null;
        var resolved = false;
        var pendingIds = new Set(documentIds);

        // Cleanup function
        var cleanup = function() {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
          }
        };

        // Mark document as complete
        var markComplete = function(docId, doc) {
          if (resolved) return;
          if (!pendingIds.has(docId)) return; // Already processed
          
          pendingIds.delete(docId);
          var index = documentIds.indexOf(docId);
          if (index !== -1) {
            results[index] = doc;
            completed++;
            
            if (onProgress) {
              try {
                onProgress(completed, documentIds.length, doc);
              } catch (e) {
                console.error('Error in onProgress callback:', e);
              }
            }
          }
          
          // Check if all done
          if (pendingIds.size === 0) {
            resolved = true;
            cleanup();
            resolve(results);
          }
        };

        // Handle error
        var handleError = function(docId, doc) {
          if (resolved) return;
          
          if (failFast && rejectOnError) {
            resolved = true;
            cleanup();
            reject(new Error('Document ' + docId + ' processing failed'));
          } else {
            // Mark as complete with error status
            markComplete(docId, doc);
          }
        };

        // Set global timeout
        timeoutId = setTimeout(function() {
          if (resolved) return;
          
          if (failFast) {
            resolved = true;
            cleanup();
            reject(new Error('Timeout waiting for ' + pendingIds.size + ' document(s) to be ready'));
          } else {
            // Return what we have (nulls for incomplete)
            resolved = true;
            cleanup();
            resolve(results);
          }
        }, timeout);

        // Subscribe to document changes for all documents
        unsubscribe = self.onDocumentChanged(function(doc) {
          if (resolved) return;
          if (!pendingIds.has(doc.id)) return;
          
          if (doc.status === 'Ready') {
            markComplete(doc.id, doc);
          } else if (doc.status === 'Error') {
            handleError(doc.id, doc);
          }
          // Ignore 'Added' and other intermediate statuses
        }, { documentIds: documentIds });

        // Check initial status for all documents (some might already be ready)
        documentIds.forEach(function(docId) {
          self.getDocumentStatus(docId).then(function(status) {
            if (resolved) return;
            
            if (status.document_status === 'Ready') {
              markComplete(docId, {
                id: docId,
                status: 'Ready',
                _fromInitialCheck: true
              });
            } else if (status.document_status === 'Error' || status.document_status === 'failed') {
              handleError(docId, {
                id: docId,
                status: 'Error',
                _fromInitialCheck: true
              });
            }
          }).catch(function(error) {
            console.warn('Could not check initial status for document ' + docId + ':', error);
          });
        });
      });
    },

    // ============================================================================
    // ENTITY CHANGE EVENT HANDLING
    // ============================================================================

    /**
     * Subscribe to entity change events
     *
     * This method listens for `chat_db_updated` socket events and calls the callback
     * whenever an entity is inserted, updated, or deleted. Useful for multi-user apps
     * where you need to refresh the UI when another user modifies data.
     *
     * @param {function} callback - Callback function(event) called with entity change data
     * @param {object} options - Optional filtering options
     * @param {string} options.action - Only receive events for this action ('inserted', 'updated', 'deleted')
     * @param {string[]} options.actions - Only receive events for these actions
     * @param {number} options.entityId - Only receive events for this specific entity ID
     * @param {number[]} options.entityIds - Only receive events for these entity IDs
     * @param {string} options.entityName - Only receive events for this entity type (available for 'inserted' action)
     * @returns {function} Unsubscribe function to remove the listener
     *
     * Event object structure (varies by action):
     *
     * For 'inserted' (single):
     * - action: 'inserted'
     * - chat_id: Chat ID (number)
     * - chat_uuid: Chat UUID (string)
     * - entity_id: The inserted entity ID (number)
     * - entity_name: Entity type name (string, e.g., 'product', 'order')
     * - creator_user_id: User who created the entity (number or null)
     * - created_at: Creation timestamp (string)
     * - updated_at: Update timestamp (string)
     *
     * For 'inserted' (batch):
     * - action: 'inserted'
     * - chat_id: Chat ID (number)
     * - chat_uuid: Chat UUID (string)
     * - entity_name: Entity type name (string)
     * - inserted_entity_ids: Array of inserted entity IDs (number[])
     *
     * For 'updated' (single):
     * - action: 'updated'
     * - chat_id: Chat ID (number)
     * - chat_uuid: Chat UUID (string)
     * - entity_id: The updated entity ID (number)
     * - updated_at: Update timestamp (string)
     *
     * For 'updated' (batch):
     * - action: 'updated'
     * - chat_id: Chat ID (number)
     * - chat_uuid: Chat UUID (string)
     * - updated_entity_ids: Array of updated entity IDs (number[])
     *
     * For 'deleted' (single):
     * - action: 'deleted'
     * - chat_id: Chat ID (number)
     * - chat_uuid: Chat UUID (string)
     * - entity_id: The deleted entity ID (number)
     *
     * For 'deleted' (batch):
     * - action: 'deleted'
     * - chat_id: Chat ID (number)
     * - chat_uuid: Chat UUID (string)
     * - deleted_entity_ids: Array of deleted entity IDs (number[])
     *
     * @example
     * // Subscribe to all entity changes
     * const unsubscribe = pt.onEntityChanged((event) => {
     *   console.log(`Entity ${event.action}:`, event);
     *   refreshUI();
     * });
     *
     * @example
     * // Only listen for updates
     * pt.onEntityChanged((event) => {
     *   const ids = event.updated_entity_ids || [event.entity_id];
     *   console.log('Entities updated:', ids);
     *   ids.forEach(id => refreshEntity(id));
     * }, { action: 'updated' });
     *
     * @example
     * // Track specific entities
     * const productIds = [101, 102, 103];
     * pt.onEntityChanged((event) => {
     *   console.log('Tracked product changed:', event);
     *   reloadProducts();
     * }, { entityIds: productIds, actions: ['updated', 'deleted'] });
     *
     * @example
     * // Handle deletions to remove from UI
     * pt.onEntityChanged((event) => {
     *   const ids = event.deleted_entity_ids || [event.entity_id];
     *   ids.forEach(id => removeFromUI(id));
     * }, { action: 'deleted' });
     *
     * @example
     * // Filter by entity type (only for inserts)
     * pt.onEntityChanged((event) => {
     *   console.log('New order created:', event.entity_id);
     *   showNotification('New order received!');
     * }, { action: 'inserted', entityName: 'order' });
     */
    onEntityChanged: function(callback, options) {
      if (typeof callback !== 'function') {
        throw new Error('callback must be a function');
      }

      options = options || {};
      var self = this;

      // Normalize options for easier matching
      var filterActions = null;
      if (options.action) {
        filterActions = [options.action];
      } else if (options.actions && Array.isArray(options.actions)) {
        filterActions = options.actions;
      }

      var filterEntityIds = null;
      if (options.entityId) {
        filterEntityIds = [options.entityId];
      } else if (options.entityIds && Array.isArray(options.entityIds)) {
        filterEntityIds = options.entityIds;
      }

      var filterEntityName = options.entityName || null;

      // Internal handler for socket events
      var socketHandler = function(event, data) {
        if (event !== 'chat_db_updated' && event !== 'collection_db_updated') {
          return;
        }

        try {
          var payload = data.payload || data;

          // Apply action filter
          if (filterActions && !filterActions.includes(payload.action)) {
            return;
          }

          // Apply entity name filter (only available for 'inserted' events)
          if (filterEntityName && payload.entity_name !== filterEntityName) {
            return;
          }

          // Apply entity ID filter
          if (filterEntityIds) {
            var eventEntityIds = [];

            // Collect all entity IDs from the event
            if (payload.entity_id) {
              eventEntityIds.push(payload.entity_id);
            }
            if (payload.inserted_entity_ids) {
              eventEntityIds = eventEntityIds.concat(payload.inserted_entity_ids);
            }
            if (payload.updated_entity_ids) {
              eventEntityIds = eventEntityIds.concat(payload.updated_entity_ids);
            }
            if (payload.deleted_entity_ids) {
              eventEntityIds = eventEntityIds.concat(payload.deleted_entity_ids);
            }

            // Check if any of the event's entity IDs match our filter
            var hasMatch = eventEntityIds.some(function(id) {
              return filterEntityIds.includes(id);
            });

            if (!hasMatch) {
              return;
            }
          }

          // Call the user's callback
          callback(payload);
        } catch (error) {
          console.error('Error in entity change handler:', error);
        }
      };

      // Register the socket handler
      var unsubscribeSocket = this.onSocketEvent(socketHandler);

      // Create listener entry
      var listenerEntry = {
        callback: callback,
        options: options,
        unsubscribe: null
      };

      // Cleanup function
      var cleanup = function() {
        unsubscribeSocket();
        var idx = self.entityChangedListeners.indexOf(listenerEntry);
        if (idx > -1) {
          self.entityChangedListeners.splice(idx, 1);
        }
      };

      listenerEntry.unsubscribe = cleanup;

      // Track this listener
      this.entityChangedListeners.push(listenerEntry);

      // Return unsubscribe function
      return cleanup;
    },

    /**
     * Execute an action on the server
     * @param {string} actionName - The name of the action to execute
     * @param {object} actionParams - Parameters to pass to the action
     * @returns {Promise<object>} The response from the server
     */
    action: async function(actionName, actionParams = {}) {
      if (!this.chatId || !this.csrfToken || !this.scopedToken) {
        console.error('pt.action validation failed:', {
          hasChatId: !!this.chatId,
          hasCsrfToken: !!this.csrfToken,
          hasScopedToken: !!this.scopedToken
        });
        throw new Error('PrimeThink library not initialized. Call pt.init() first.');
      }

      console.log('pt.action called:', { action: actionName, params: actionParams });

      try {
        // Always use FormData to match API expectations
        const formData = new FormData();
        formData.append('action_data', JSON.stringify({
          action: actionName,
          params: actionParams
        }));

        const headers = {
          'X-CSRF-Token': this.csrfToken,
          'X-Scoped-Token': this.scopedToken
          // Don't set Content-Type - browser will set it automatically with boundary for multipart/form-data
        };
        console.log('Request headers:', headers);

        const response = await fetch(this._getUrl(`/api/v1/live/${this.chatId}/action`), {
          method: 'POST',
          headers: headers,
          body: formData
        });

        const result = await response.json();

        if (!response.ok) {
          // Server returned an error response
          const errorMsg = result.error || result.detail || 'Action failed';
          console.error('pt.action error response:', result);
          throw new Error(errorMsg);
        }

        if (!result.success) {
          // Action failed with error details
          console.error('pt.action failed:', result);
          throw new Error(result.error || 'Action failed');
        }

        return result;
      } catch (error) {
        console.error('pt.action error:', error);
        throw error;
      }
    },

    /**
     * Reload the current page
     */
    reload: function() {
      window.location.reload();
    },

    /**
     * Navigate to a different live page
     * @param {string} chatId - The chat ID to navigate to
     */
    navigate: function(chatId) {
      window.location.href = `/api/v1/live/${chatId}`;
    },

    // ============================================================================
    // DIRECT TOOL CALL
    // ============================================================================

    /**
     * Call an agent tool directly, bypassing the LLM
     *
     * This method allows you to invoke a specific tool on the agent without
     * going through the normal LLM processing. The tool is called directly
     * with the provided arguments and returns the raw tool output.
     *
     * @param {string} toolName - The name of the tool to call (e.g., 'notify_user', 'manage_list_organizations')
     * @param {object} toolArgs - The arguments to pass to the tool (optional, defaults to {})
     * @param {object} options - Additional options
     * @param {boolean} options.awaitResponse - If true (default), wait for the tool result; if false, return immediately with task_id
     * @returns {Promise<object>} The tool result or task info
     *
     * Response structure (when awaitResponse=true):
     * - tool_name: The name of the tool called
     * - tool_args: The arguments passed to the tool
     * - result: The parsed tool output (object if JSON, string otherwise)
     *
     * Response structure (when awaitResponse=false):
     * - tool_name: The name of the tool called
     * - tool_args: The arguments passed to the tool
     * - task_id: The task ID for tracking the async response
     * - message: Status message
     *
     * @example
     * // Simple tool call with no arguments
     * const result = await pt.callToolDirect('manage_list_organizations');
     * console.log(result.result.organizations);
     *
     * @example
     * // Tool call with arguments
     * const result = await pt.callToolDirect('notify_user', { text: 'Hello from the live app!' });
     * console.log(result.result); // "User notified"
     *
     * @example
     * // Search for matters
     * const result = await pt.callToolDirect('manage_search_matters_by_text', {
     *   search_query: 'trademark',
     *   limit: 10
     * });
     * console.log(result.result.matters);
     *
     * @example
     * // Async call (don't wait for response)
     * const result = await pt.callToolDirect('long_running_tool', { data: 'test' }, { awaitResponse: false });
     * console.log('Task started:', result.task_id);
     * // Use pt.onMessageReceived(result.task_id, callback) to get the response later
     *
     * @example
     * // Error handling
     * try {
     *   const result = await pt.callToolDirect('unknown_tool');
     * } catch (error) {
     *   console.error('Tool call failed:', error.message);
     * }
     */
    callToolDirect: async function(toolName, toolArgs = {}, options = {}) {
      if (!toolName || typeof toolName !== 'string') {
        throw new Error('toolName must be a non-empty string');
      }

      const awaitResponse = options.awaitResponse !== false; // Default true

      const response = await this.action('call_tool_direct', {
        tool_name: toolName,
        tool_args: toolArgs,
        await_response: awaitResponse
      });

      return response.result;
    },

    // ============================================================================
    // DATABASE CRUD OPERATIONS
    // ============================================================================

    /**
     * Initialize the database for the current chat's group
     * @returns {Promise<object>} Initialization result with schema and table_created status
     * @example
     * const result = await pt.initDb();
     * // { message: "Database initialized for group 123", schema: "group_123", table_created: true }
     */
    initDb: async function() {
      const response = await this.action('init_db', {});
      return response.result;
    },

    /**
     * List entities with optional filtering
     * @param {object} options - Filter options
     * @param {string[]} options.entityNames - Array of entity names to filter (e.g., ['user', 'product'])
     * @param {object} options.filters - JSON field filters with operator support
     * @param {number} options.limit - Maximum number of results (offset-based pagination)
     * @param {number} options.offset - Number of results to skip (offset-based pagination)
     * @param {number} options.page - Page number for page-based pagination (1-indexed)
     * @param {number} options.pageSize - Items per page for page-based pagination
     * @param {boolean} options.returnMetadata - If true, returns {entities, count, pagination} instead of just entities array
     * @returns {Promise<object[]|object>} Array of entities, or object with metadata if returnMetadata=true
     *
     * Filter operators:
     * - Exact match: {status: 'active'}
     * - Contains (case-insensitive): {text: {$contains: 'search'}}
     * - Like patterns: {text: {$ilike: '%search%'}} or {text: {$like: '%search%'}}
     * - In array (multi-select): {status: {$in: ['active', 'pending']}}
     * - Greater than: {age: {$gt: 25}}
     * - Greater than or equal: {age: {$gte: 25}}
     * - Less than: {age: {$lt: 50}}
     * - Less than or equal: {age: {$lte: 50}}
     * - Not equal: {status: {$ne: 'deleted'}}
     * - OR logic: {$or: [{status: 'active'}, {priority: 'high'}]}
     * - Creator filter: {creator_user_id: 123} or {creator_user_id: {$in: [123, 456]}}
     *
     * @example
     * // Exact match
     * const activeUsers = await pt.list({
     *   entityNames: ['user'],
     *   filters: { status: 'active' },
     *   limit: 10
     * });
     *
     * @example
     * // Partial text search (case-insensitive)
     * const searchResults = await pt.list({
     *   entityNames: ['task'],
     *   filters: { text: { $contains: 'grocery' } }
     * });
     *
     * @example
     * // Numeric comparison
     * const adults = await pt.list({
     *   entityNames: ['user'],
     *   filters: { age: { $gte: 18 } }
     * });
     *
     * @example
     * // Multi-select (IN operator)
     * const filteredTasks = await pt.list({
     *   entityNames: ['task'],
     *   filters: { status: { $in: ['active', 'pending', 'in_progress'] } }
     * });
     *
     * @example
     * // OR logic - find tasks that are either active OR high priority
     * const urgentTasks = await pt.list({
     *   entityNames: ['task'],
     *   filters: {
     *     $or: [
     *       { status: 'active' },
     *       { priority: 'high' }
     *     ]
     *   }
     * });
     *
     * @example
     * // Complex: OR logic with additional AND filters
     * const complexQuery = await pt.list({
     *   entityNames: ['task'],
     *   filters: {
     *     completed: false,  // AND condition
     *     $or: [              // OR conditions
     *       { status: 'urgent' },
     *       { assignee: 'john' }
     *     ]
     *   }
     * });
     *
     * @example
     * // Filter by creator (get entities created by specific user)
     * const myEntities = await pt.list({
     *   entityNames: ['task'],
     *   filters: { creator_user_id: 123 }
     * });
     *
     * @example
     * // Filter by multiple creators
     * const teamEntities = await pt.list({
     *   entityNames: ['task'],
     *   filters: { creator_user_id: { $in: [123, 456, 789] } }
     * });
     *
     * @example
     * // Offset-based pagination
     * const page1 = await pt.list({
     *   entityNames: ['task'],
     *   limit: 20,
     *   offset: 0
     * });
     *
     * @example
     * // Page-based pagination with metadata
     * const result = await pt.list({
     *   entityNames: ['task'],
     *   page: 1,
     *   pageSize: 20,
     *   returnMetadata: true
     * });
     * console.log(result.entities);  // Array of tasks
     * console.log(result.count);     // Number of tasks returned
     * console.log(result.pagination.has_more);  // true if more pages available
     */
    list: async function(options = {}) {
      const response = await this.action('list', {
        entity_names: options.entityNames,
        filters: options.filters,
        limit: options.limit,
        offset: options.offset,
        page: options.page,
        page_size: options.pageSize
      });

      const result = response.result;

      // For backward compatibility: if returnMetadata is not set, return just entities array
      if (options.returnMetadata === true) {
        return {
          entities: result.entities,
          count: result.count,
          pagination: result.pagination
        };
      }

      // Default: return just the entities array (backward compatible)
      return result.entities;
    },

    /**
     * List entities with page-based pagination (convenience method)
     * @param {object} options - Pagination options
     * @param {string[]} options.entityNames - Array of entity names to filter
     * @param {object} options.filters - JSON field filters with operator support
     * @param {number} options.page - Page number (1-indexed)
     * @param {number} options.pageSize - Number of items per page
     * @returns {Promise<{entities: object[], count: number, pagination: object}>} Paginated results
     * @example
     * // Get page 2 with 10 items per page
     * const result = await pt.paginate({
     *   entityNames: ['task'],
     *   page: 2,
     *   pageSize: 10
     * });
     * console.log(result.entities);  // Array of entities
     * console.log(result.pagination.has_more);  // true if more pages exist
     */
    paginate: async function(options = {}) {
      if (!options.page || !options.pageSize) {
        throw new Error('page and pageSize are required for paginate()');
      }
      return await this.list(options);
    },

    /**
     * Get a single entity by ID
     * @param {number} entityId - The entity ID
     * @returns {Promise<object>} The entity object
     * @example
     * const task = await pt.get(123);
     * console.log(task.data.text);
     */
    get: async function(entityId) {
      if (!entityId) {
        throw new Error('entityId is required');
      }
      const response = await this.action('get', {
        entity_id: entityId
      });
      return response.result;
    },

    /**
     * Add a new entity
     * @param {string} entityName - The entity type (e.g., 'user', 'product')
     * @param {object} data - The entity data as a plain object
     * @returns {Promise<object>} The created entity with id, entity_name, data, timestamps
     * @example
     * const user = await pt.add('user', {
     *   name: 'John Doe',
     *   email: 'john@example.com',
     *   age: 30
     * });
     */
    add: async function(entityName, data) {
      if (!entityName || !data) {
        throw new Error('entityName and data are required');
      }
      const response = await this.action('add', {
        entity_name: entityName,
        data: data
      });
      return response.result;
    },

    /**
     * Edit an existing entity
     * @param {number} entityId - The entity ID to edit
     * @param {object} data - The new entity data
     * @param {boolean} merge - If true, merge with existing data; if false, replace entirely (default: false)
     * @param {string} ifUnchangedSince - Optional ISO timestamp for optimistic locking. Update only succeeds if entity hasn't been modified since this timestamp
     * @returns {Promise<object>} The updated entity, or {conflict: true, currentEntity: {...}} if optimistic lock fails
     * @example
     * // Replace all data (default behavior)
     * const updated = await pt.edit(123, {
     *   name: 'Jane Doe',
     *   email: 'jane@example.com',
     *   age: 31
     * });
     *
     * @example
     * // Merge with existing data (preserves fields not in update)
     * const updated = await pt.edit(123, {
     *   age: 32  // Only update age, keep other fields
     * }, true);
     *
     * @example
     * // Optimistic locking - prevent overwriting concurrent changes
     * const task = await pt.get(123);
     * const result = await pt.edit(123, { status: 'done' }, true, task.updated_at);
     * if (result.conflict) {
     *   console.log('Conflict! Current version:', result.currentEntity);
     * }
     */
    edit: async function(entityId, data, merge = false, ifUnchangedSince = null) {
      if (!entityId || !data) {
        throw new Error('entityId and data are required');
      }
      const params = {
        entity_id: entityId,
        data: data,
        merge: merge
      };
      if (ifUnchangedSince) {
        params.if_unchanged_since = ifUnchangedSince;
      }
      const response = await this.action('edit', params);
      return response.result;
    },

    /**
     * Delete an entity
     * @param {number} entityId - The entity ID to delete
     * @returns {Promise<object>} Success message
     * @example
     * await pt.delete(123);
     */
    delete: async function(entityId) {
      if (!entityId) {
        throw new Error('entityId is required');
      }
      const response = await this.action('delete', {
        entity_id: entityId
      });
      return response.result;
    },

    /**
     * Create multiple entities in a single transaction
     * @param {string} entityName - The entity type for all entities
     * @param {object[]} dataArray - Array of data objects to create
     * @returns {Promise<object[]>} Array of result objects with success status and entity or error
     *
     * Each result object contains:
     * - success: boolean
     * - entity: the created entity (if success)
     * - error: error details (if failed)
     * - index: position in input array
     *
     * @example
     * const results = await pt.batchAdd('task', [
     *   { text: 'Task 1', completed: false },
     *   { text: 'Task 2', completed: false },
     *   { text: 'Task 3', completed: false }
     * ]);
     *
     * const successful = results.filter(r => r.success);
     * const failed = results.filter(r => !r.success);
     * console.log(`Created ${successful.length} tasks`);
     */
    batchAdd: async function(entityName, dataArray) {
      if (!entityName || typeof entityName !== 'string') {
        throw new Error('entityName must be a non-empty string');
      }
      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error('dataArray must be a non-empty array');
      }
      const response = await this.action('batch_add', {
        entity_name: entityName,
        items: dataArray
      });
      return response.result;
    },

    /**
     * Update multiple entities in a single request
     * @param {object[]} items - Array of edit item objects
     * @returns {Promise<object[]>} Array of result objects with success/conflict status
     *
     * Each item should have:
     * - id: entity ID (required)
     * - data: new data (required)
     * - merge: boolean (optional, default false)
     * - if_unchanged_since: ISO timestamp for optimistic locking (optional)
     *
     * Each result contains:
     * - success: boolean
     * - entity: updated entity (if success)
     * - conflict: boolean (if optimistic lock failed)
     * - currentEntity: current state (if conflict)
     *
     * @example
     * // Bulk status update with merge mode
     * const results = await pt.batchEdit([
     *   { id: 1, data: { completed: true }, merge: true },
     *   { id: 2, data: { completed: true }, merge: true },
     *   { id: 3, data: { completed: true }, merge: true }
     * ]);
     *
     * @example
     * // With optimistic locking
     * const tasks = await pt.list({ entityNames: ['task'] });
     * const results = await pt.batchEdit(
     *   tasks.map(t => ({
     *     id: t.id,
     *     data: { status: 'archived' },
     *     merge: true,
     *     if_unchanged_since: t.updated_at
     *   }))
     * );
     */
    batchEdit: async function(items) {
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('items must be a non-empty array');
      }
      for (const item of items) {
        if (!item.id || !item.data) {
          throw new Error('Each item must have id and data properties');
        }
      }
      const response = await this.action('batch_edit', { items: items });
      return response.result;
    },

    /**
     * Delete multiple entities in a single request
     * @param {number[]} ids - Array of entity IDs to delete
     * @returns {Promise<object[]>} Array of result objects with success status
     *
     * Each result contains:
     * - id: entity ID
     * - success: boolean
     * - error: error message (if failed)
     *
     * @example
     * const results = await pt.batchDelete([1, 2, 3, 4, 5]);
     *
     * const deleted = results.filter(r => r.success);
     * const failed = results.filter(r => !r.success);
     * console.log(`Deleted ${deleted.length} entities`);
     *
     * @example
     * // Delete completed tasks
     * const completed = await pt.list({
     *   entityNames: ['task'],
     *   filters: { completed: true }
     * });
     * const ids = completed.map(t => t.id);
     * await pt.batchDelete(ids);
     */
    batchDelete: async function(ids) {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new Error('ids must be a non-empty array');
      }
      const response = await this.action('batch_delete', { ids: ids });
      return response.result;
    },

    // ============================================================================
    // CHAT/COLLABORATION METHODS
    // ============================================================================

    /**
     * Get all members of the current chat (users and AI agents)
     * @returns {Promise<object[]>} Array of chat members
     *
     * Each member has:
     * - id: Member ID (user_id or agent_id)
     * - type: "user" or "agent"
     * - name: Display name (full name or agent name)
     * - first_name, last_name: Name parts (users only)
     * - email: Email address (users only)
     * - is_chat_owner: true if member created the chat
     * - is_logged_user: true if member is the current logged-in user
     *
     * @example
     * // Display all members
     * const members = await pt.getChatMembers();
     * members.forEach(member => {
     *   console.log(`${member.name} (${member.type})`);
     * });
     *
     * @example
     * // Filter by type
     * const members = await pt.getChatMembers();
     * const users = members.filter(m => m.type === 'user');
     * const agents = members.filter(m => m.type === 'agent');
     *
     * @example
     * // Task assignment dropdown (users only)
     * const members = await pt.getChatMembers();
     * const dropdown = members
     *   .filter(m => m.type === 'user')
     *   .map(m => `<option value="${m.id}">${m.name}</option>`)
     *   .join('');
     */
    getChatMembers: async function() {
      const response = await this.action('get_chat_members', {});
      return response.result.members;
    },

    /**
     * Get the role and permissions of the currently logged-in user
     * Returns null if the user is not authenticated or has no role assigned.
     *
     * @returns {Promise<object|null>} Role and permissions object, or null if not logged in
     *
     * Response structure (when logged in):
     * - role: Object with role details
     *   - id: Role UUID (string)
     *   - name: Role display name (e.g. "Admin", "Editor")
     *   - description: Role description
     *   - is_system_role: true if this is a built-in platform role
     * - permissions: Array of permission ID strings (e.g. ["view_documents", "manage_users"])
     *
     * @example
     * // Check if user has a specific permission
     * const userRole = await pt.getUserRole();
     * if (userRole && userRole.permissions.includes('manage_users')) {
     *   document.getElementById('adminPanel').style.display = 'block';
     * }
     *
     * @example
     * // Display the user's role name
     * const userRole = await pt.getUserRole();
     * if (userRole) {
     *   document.getElementById('roleLabel').textContent = userRole.role.name;
     * } else {
     *   document.getElementById('roleLabel').textContent = 'Guest';
     * }
     *
     * @example
     * // Gate UI sections based on role
     * const userRole = await pt.getUserRole();
     * const isAdmin = userRole?.role.name === 'Admin';
     * const canEdit = userRole?.permissions.includes('edit_content') ?? false;
     * document.querySelectorAll('.admin-only').forEach(el => {
     *   el.style.display = isAdmin ? '' : 'none';
     * });
     */
    getUserRole: async function() {
      const response = await this.action('get_user_role', {});
      return response.result;
    },

    /**
     * Get all mentionable entities available in the chat
     * Returns users, virtual assistants, other chats, and tasks that can be mentioned.
     * Results are filtered based on the current user's permissions.
     *
     * @returns {Promise<object>} Object containing arrays of mentionable entities
     *
     * Response structure:
     * - users_mentions: Users that can be mentioned
     * - virtual_assistants_mentions: AI assistants that can be mentioned
     * - chats_mentions: Other chats that can be referenced
     * - tasks_mentions: Tasks that can be mentioned
     *
     * @example
     * const mentions = await pt.getAvailableMentions();
     *
     * // Build a mention picker
     * mentions.users_mentions.forEach(user => {
     *   console.log(`${user.mention_name} - ${user.display_name}`);
     * });
     *
     * @example
     * // Check what entities can be mentioned
     * const mentions = await pt.getAvailableMentions();
     * const canMentionUsers = mentions.users_mentions.length > 0;
     * const canMentionTasks = mentions.tasks_mentions.length > 0;
     */
    getAvailableMentions: async function() {
      const response = await this.action('available_mentions', {});
      return response.result;
    },

    /**
     * Add a message to the chat with optional files
     *
     * Supports two modes:
     * 1. Text-only: addMessage(message, options)
     * 2. With files: addMessage(formOrFormData, message, options)
     *
     * @param {string|HTMLFormElement|FormData} messageOrFormData - Message text (string) or form/FormData with files
     * @param {object|string} optionsOrMessage - Options object (for text-only) or message text (for files)
     * @param {object} options - Options object (only when using files mode)
     * @param {boolean} options.hidden - If true, hide the message from chat UI (default: false)
     * @param {boolean} options.awaitResponse - If true, wait for AI response (default: false)
     * @param {number} options.awaitResponseTimeout - Timeout in milliseconds when awaitResponse=true (default: 120000 = 2 minutes)
     * @param {string} options.folder - Target folder path for message attachments (e.g., 'reports/2024')
     * @returns {Promise<object>} The created message object
     *
     * @example
     * // Text-only message (backward compatible)
     * const result = await pt.addMessage('Hello, world!');
     * console.log('Message ID:', result.user_message.id);
     *
     * @example
     * // Text-only with options (backward compatible)
     * await pt.addMessage('Processing...', { hidden: true, awaitResponse: true });
     *
     * @example
     * // Message with files
     * const form = document.getElementById('uploadForm');
     * await pt.addMessage(form, 'Check out these files!');
     *
     * @example
     * // Files with message and options
     * const formData = new FormData();
     * formData.append('files', file1);
     * const result = await pt.addMessage(formData, 'Analyze this', { awaitResponse: true });
     * console.log('AI response:', result.ai_responses[0].message);
     *
     * @example
     * // Files only, no message text
     * await pt.addMessage(form, '');
     *
     * @example
     * // Message with files saved to a specific folder
     * await pt.addMessage(form, 'Monthly report', { folder: 'reports/january' });
     */
    addMessage: async function(messageOrFormData, optionsOrMessage = {}, options = {}) {
      if (!this.chatId || !this.csrfToken || !this.scopedToken) {
        throw new Error('PrimeThink library not initialized. Call pt.init() first.');
      }

      let message, formData, finalOptions;

      // Detect usage mode based on first parameter type
      if (typeof messageOrFormData === 'string') {
        // Mode 1: Text-only message (backward compatible)
        // addMessage('Hello', { hidden: true })
        message = messageOrFormData;
        finalOptions = optionsOrMessage;
        formData = null;

        if (!message) {
          throw new Error('message must be a non-empty string');
        }

        // Use JSON API for text-only messages
        const params = {
          message: message,
          hidden: finalOptions.hidden || false,
          await_response: finalOptions.awaitResponse || false
        };
        if (finalOptions.awaitResponse && finalOptions.awaitResponseTimeout) {
          params.await_response_timeout = finalOptions.awaitResponseTimeout;
        }
        if (finalOptions.folder) {
          params.folder = finalOptions.folder;
        }
        const response = await this.action('add_message', params);
        return response.result;

      } else if (messageOrFormData instanceof FormData || messageOrFormData instanceof HTMLFormElement) {
        // Mode 2: Message with files
        // addMessage(form, 'Check this out', { hidden: true })
        formData = messageOrFormData instanceof HTMLFormElement
          ? new FormData(messageOrFormData)
          : messageOrFormData;
        message = typeof optionsOrMessage === 'string' ? optionsOrMessage : '';
        finalOptions = options;

        // Build action data for multipart request
        const actionData = {
          action: 'add_message',
          params: {
            message: message,
            hidden: finalOptions.hidden || false,
            await_response: finalOptions.awaitResponse || false
          }
        };
        if (finalOptions.awaitResponse && finalOptions.awaitResponseTimeout) {
          actionData.params.await_response_timeout = finalOptions.awaitResponseTimeout;
        }
        if (finalOptions.folder) {
          actionData.params.folder = finalOptions.folder;
        }

        formData.append('action_data', JSON.stringify(actionData));

        try {
          const response = await fetch(this._getUrl(`/api/v1/live/${this.chatId}/action`), {
            method: 'POST',
            headers: {
              'X-CSRF-Token': this.csrfToken,
              'X-Scoped-Token': this.scopedToken
            },
            body: formData
          });

          const result = await response.json();

          if (!response.ok) {
            const errorMsg = result.error || result.detail || 'Failed to add message';
            throw new Error(errorMsg);
          }

          if (!result.success) {
            throw new Error(result.error || 'Failed to add message');
          }

          return result.result;
        } catch (error) {
          console.error('pt.addMessage error:', error);
          throw error;
        }

      } else {
        throw new Error('First argument must be a string (message) or HTMLFormElement/FormData (files)');
      }
    },

    /**
     * Upload files directly to chat as documents (without creating a message or triggering AI)
     * @param {HTMLFormElement|FormData} formOrFormData - Form element or FormData object containing files
     * @param {string} folder - Optional folder path to organize files (e.g., 'reports', 'images/2024'). Created automatically if it does not exist.
     * @param {string} documentName - Optional custom name for the uploaded file (useful for single file uploads)
     * @param {string} attachmentMode - Optional document status in the chat relationship. One of: 'archived', 'search', 'attached', 'context'. Defaults to 'archived'.
     * @returns {Promise<object>} Upload result with success status, message, folder, and documents array
     *
     * Use this method when you want to upload files directly to the chat without:
     * - Creating a user message
     * - Triggering AI processing
     * - Notifying other chat members
     *
     * The files are saved as documents and can be accessed through the chat's document system.
     * If documentName is not provided, the original filename is used.
     *
     * attachmentMode controls the document's role in the chat (DocumentInChatStatus):
     * - 'archived'  (default): stored; not actively used by AI, but readable via agent tools
     * - 'search':   indexed in the vector database for semantic search / RAG retrieval
     * - 'attached': attached as media directly to the LLM call
     * - 'context':  entire document text injected into the LLM context on every call
     *
     * @example
     * // Upload files to the default chat folder
     * const form = document.getElementById('uploadForm');
     * const result = await pt.uploadFiles(form);
     * console.log(`Uploaded ${result.documents.length} files`);
     * result.documents.forEach(doc => console.log(doc.name, doc.id));
     *
     * @example
     * // Upload files to a specific folder
     * const fileInput = document.getElementById('fileInput');
     * const formData = new FormData();
     * for (const file of fileInput.files) {
     *   formData.append('files', file);
     * }
     * const result = await pt.uploadFiles(formData, 'reports/monthly');
     * console.log(`Files uploaded to: ${result.folder}`);
     *
     * @example
     * // Upload a single file with a custom name
     * const formData = new FormData();
     * formData.append('files', myFile);
     * const result = await pt.uploadFiles(formData, 'documents', 'my-custom-name.pdf');
     *
     * @example
     * // Upload and get document IDs for later use
     * const result = await pt.uploadFiles(form, 'images/2024');
     * const docIds = result.documents.map(doc => doc.id);
     * await pt.searchDocuments('keyword', 'DOCUMENTS_ONLY', docIds);
     *
     * @example
     * // Upload a file and make it immediately searchable by AI
     * const formData = new FormData();
     * formData.append('files', myFile);
     * const result = await pt.uploadFiles(formData, 'knowledge-base', null, 'search');
     */
    uploadFiles: async function(formOrFormData, folder = null, documentName = null, attachmentMode = null) {
      if (!this.chatId || !this.csrfToken || !this.scopedToken) {
        throw new Error('PrimeThink library not initialized. Call pt.init() first.');
      }

      let formData;
      if (formOrFormData instanceof FormData) {
        formData = formOrFormData;
      } else if (formOrFormData instanceof HTMLFormElement) {
        formData = new FormData(formOrFormData);
      } else {
        throw new Error('First argument must be an HTMLFormElement or FormData object');
      }

      // Build action data
      const actionData = {
        action: 'upload_files',
        params: {}
      };

      // Add folder if provided
      if (folder) {
        actionData.params.folder = folder;
      }

      // Add document_name if provided
      if (documentName) {
        actionData.params.document_name = documentName;
      }

      // Validate and set attachment_mode (default: 'archived')
      const ALLOWED_ATTACHMENT_MODES = ['archived', 'search', 'attached', 'context'];
      const validatedAttachmentMode = ALLOWED_ATTACHMENT_MODES.includes(attachmentMode) ? attachmentMode : 'archived';
      actionData.params.attachment_mode = validatedAttachmentMode;

      // Add action_data as JSON string
      formData.append('action_data', JSON.stringify(actionData));

      try {
        const response = await fetch(this._getUrl(`/api/v1/live/${this.chatId}/action`), {
          method: 'POST',
          headers: {
            'X-CSRF-Token': this.csrfToken,
            'X-Scoped-Token': this.scopedToken
          },
          body: formData
        });

        const result = await response.json();

        if (!response.ok) {
          const errorMsg = result.error || result.detail || 'Upload failed';
          throw new Error(errorMsg);
        }

        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        return result.result;
      } catch (error) {
        console.error('pt.uploadFiles error:', error);
        throw error;
      }
    },

    // ============================================================================
    // NOTIFICATION METHODS
    // ============================================================================

    /**
     * Send a push notification to a specific user in the chat
     * @param {number} userId - The ID of the user to notify
     * @param {string} title - Notification title
     * @param {string} text - Notification message text
     * @param {object} [options] - Optional settings
     * @param {string} [options.emailBody] - Extended content for email delivery (sent async via digest email)
     * @returns {Promise<object>} Result with success status
     *
     * @example
     * // Send notification to a user
     * const members = await pt.getChatMembers();
     * const user = members.find(m => m.email === 'john@example.com');
     * await pt.sendNotification(user.id, 'Task Assigned', 'You have a new task');
     *
     * @example
     * // Notify with extended email content
     * await pt.sendNotification(123, 'Meeting Reminder', 'Team meeting in 15 minutes', {
     *   emailBody: 'Please join the meeting at https://meet.example.com/abc. Agenda: Q1 Review.'
     * });
     */
    sendNotification: async function(userId, title, text, options = {}) {
      if (!userId || typeof userId !== 'number') {
        throw new Error('userId must be a valid number');
      }
      if (!title || typeof title !== 'string') {
        throw new Error('title must be a non-empty string');
      }
      if (!text || typeof text !== 'string') {
        throw new Error('text must be a non-empty string');
      }

      const params = {
        user_id: userId,
        notification_title: title,
        notification_text: text
      };

      if (options.emailBody !== undefined) {
        if (typeof options.emailBody !== 'string') {
          throw new Error('emailBody must be a string');
        }
        params.email_body = options.emailBody;
      }

      const response = await this.action('send_push_notification_to_user', params);
      return response.result;
    },

    /**
     * Send notifications to multiple users in the chat.
     * Can target specific users by ID, or broadcast to all chat members (excluding the caller).
     *
     * @param {string} title - Notification title
     * @param {string} text - Notification message text
     * @param {object} [options] - Optional settings
     * @param {number[]} [options.userIds] - Specific user IDs to notify. If omitted, notifies all chat members except the caller.
     * @param {boolean} [options.sendPush=true] - Whether to send a push notification via FCM
     * @param {string} [options.emailBody] - Extended content for email delivery (sent async via digest email)
     * @returns {Promise<object>} Result with sent_count, target_user_ids, skipped_user_ids, failed_user_ids
     *
     * @example
     * // Broadcast to all users in the chat
     * const result = await pt.sendNotificationToUsers('System Update', 'Maintenance at 10 PM');
     * console.log(`Notified ${result.sent_count} users`);
     *
     * @example
     * // Notify specific users
     * const members = await pt.getChatMembers();
     * const userIds = members.filter(m => m.role === 'admin').map(m => m.id);
     * await pt.sendNotificationToUsers('Admin Alert', 'New report available', { userIds });
     *
     * @example
     * // In-app only (no push notification)
     * await pt.sendNotificationToUsers('FYI', 'Document updated', { sendPush: false });
     *
     * @example
     * // With extended email content
     * await pt.sendNotificationToUsers('Report Ready', 'Your weekly report is available', {
     *   emailBody: 'Click here to view the full report: https://example.com/reports/123'
     * });
     */
    sendNotificationToUsers: async function(title, text, options = {}) {
      if (!title || typeof title !== 'string') {
        throw new Error('title must be a non-empty string');
      }
      if (!text || typeof text !== 'string') {
        throw new Error('text must be a non-empty string');
      }
      if (options.userIds !== undefined && !Array.isArray(options.userIds)) {
        throw new Error('options.userIds must be an array of numbers');
      }

      const params = {
        notification_title: title,
        notification_text: text
      };

      if (options.userIds !== undefined) {
        params.user_ids = options.userIds;
      }
      if (options.sendPush !== undefined) {
        params.send_push = options.sendPush;
      }
      if (options.emailBody !== undefined) {
        if (typeof options.emailBody !== 'string') {
          throw new Error('emailBody must be a string');
        }
        params.email_body = options.emailBody;
      }

      const response = await this.action('send_notification_to_users', params);
      return response.result;
    },

    /**
     * Get the text content of a chat message by its ID
     * Returns the message text as a string.
     *
     * @param {number} messageId - The ID of the chat message
     * @returns {Promise<string>} The message text content (empty string if not found)
     *
     * @example
     * // Get message text
     * const text = await pt.getMessageText(12345);
     * console.log('Message:', text);
     *
     * @example
     * // Display message in UI
     * const messageId = 67890;
     * const content = await pt.getMessageText(messageId);
     * document.getElementById('messageDisplay').textContent = content;
     *
     * @example
     * // Copy message to clipboard
     * const msgText = await pt.getMessageText(111);
     * await navigator.clipboard.writeText(msgText);
     * alert('Message copied to clipboard!');
     */
    getMessageText: async function(messageId) {
      if (!messageId || typeof messageId !== 'number') {
        throw new Error('messageId must be a valid number');
      }

      const response = await this.action('get_message_text', {
        message_id: messageId
      });

      return response.result;
    },

    // ============================================================================
    // DOCUMENT METHODS
    // ============================================================================

    /**
     * Search across documents and collections using semantic RAG search
     * @param {string} query - Natural language search query
     * @param {string} scope - Search scope: 'ALL', 'DOCUMENTS_ONLY', or 'COLLECTIONS_ONLY' (default: 'ALL')
     * @param {number[]} documentIds - Optional array of document IDs to limit the search scope
     * @returns {Promise<object>} Search results with matching content
     *
     * @example
     * // Search everything
     * const results = await pt.searchDocuments('quarterly financial results');
     *
     * @example
     * // Search only documents
     * const docs = await pt.searchDocuments('project requirements', 'DOCUMENTS_ONLY');
     *
     * @example
     * // Search only collections
     * const collections = await pt.searchDocuments('company policies', 'COLLECTIONS_ONLY');
     *
     * @example
     * // Search specific documents only
     * const specific = await pt.searchDocuments('budget analysis', 'DOCUMENTS_ONLY', [156, 157, 158]);
     *
     * @example
     * // Search documents in a folder
     * const folder = await pt.listDirectory('/reports');
     * const docIds = folder.entries.filter(e => e.type === 'file').map(e => e.id);
     * const results = await pt.searchDocuments('revenue', 'DOCUMENTS_ONLY', docIds);
     */
    searchDocuments: async function(query, scope = 'ALL', documentIds = null) {
      if (!query || typeof query !== 'string') {
        throw new Error('query must be a non-empty string');
      }

      const validScopes = ['ALL', 'DOCUMENTS_ONLY', 'COLLECTIONS_ONLY'];
      if (!validScopes.includes(scope)) {
        throw new Error(`scope must be one of: ${validScopes.join(', ')}`);
      }

      const params = {
        search_query: query,
        what_to_search: scope
      };

      if (documentIds && Array.isArray(documentIds)) {
        params.document_ids = documentIds;
      }

      const response = await this.action('rag_search_documents_and_collections', params);

      return response.result;
    },

    /**
     * Retrieve text content from a document
     * @param {number} docId - Document ID
     * @param {object} options - Optional parameters
     * @param {number} options.from - Starting character index (default: 0)
     * @param {number} options.to - Ending character index (default: null for full text)
     * @returns {Promise<object>} Document text and metadata
     *
     * @example
     * // Get full document text
     * const doc = await pt.getDocumentText(123);
     * console.log(doc.text);
     *
     * @example
     * // Get first 1000 characters
     * const preview = await pt.getDocumentText(123, { from: 0, to: 1000 });
     *
     * @example
     * // Get text from character 500 onwards
     * const partial = await pt.getDocumentText(123, { from: 500 });
     */
    getDocumentText: async function(docId, options = {}) {
      if (!docId || typeof docId !== 'number') {
        throw new Error('docId must be a valid number');
      }

      const params = {
        document_id: docId
      };

      if (options.from !== undefined) {
        params.from_character_index = options.from;
      }
      if (options.to !== undefined) {
        params.to_character_index = options.to;
      }

      const response = await this.action('get_document_text', params);
      return response.result;
    },

    /**
     * Save content as a document in the chat
     * @param {string} filename - Filename with extension (e.g., 'report.pdf')
     * @param {string} format - Document format: 'TXT', 'MD', 'HTML', 'DOCX', 'PDF', 'CSV', 'XLSX', 'CUSTOM'
     * @param {string} mimetype - MIME type (e.g., 'text/plain', 'application/pdf')
     * @param {string} content - Document content
     * @param {string} folder - Optional folder path (e.g., 'reports', 'exports/monthly'). Created automatically if it does not exist.
     * @param {string} attachmentMode - Optional document status in the chat relationship. One of: 'archived', 'search', 'attached', 'context'. Defaults to 'archived'.
     * @returns {Promise<object>} Result with success status, filename, and documents array
     *
     * Format guidelines:
     * - TXT: Plain text (no Markdown)
     * - MD: Markdown text
     * - HTML: HTML content (not Markdown)
     * - DOCX: Use Markdown text (will be converted)
     * - PDF: Use Markdown text (will be converted)
     * - CSV: Plain CSV format
     * - XLSX: Plain CSV format (will be converted)
     * - CUSTOM: Any non-binary plain text format
     *
     * attachmentMode controls the document's role in the chat (DocumentInChatStatus):
     * - 'archived'  (default): stored; not actively used by AI, but readable via agent tools
     * - 'search':   indexed in the vector database for semantic search / RAG retrieval
     * - 'attached': attached as media directly to the LLM call
     * - 'context':  entire document text injected into the LLM context on every call
     *
     * @example
     * // Save plain text
     * await pt.saveDocument('notes.txt', 'TXT', 'text/plain', 'Meeting notes here...');
     *
     * @example
     * // Save Markdown
     * await pt.saveDocument('report.md', 'MD', 'text/markdown', '# Report\n\nContent...');
     *
     * @example
     * // Save as PDF (using Markdown)
     * await pt.saveDocument(
     *   'invoice.pdf',
     *   'PDF',
     *   'application/pdf',
     *   '# Invoice #12345\n\n**Total:** $1,250.00'
     * );
     *
     * @example
     * // Save CSV data
     * await pt.saveDocument(
     *   'data.csv',
     *   'CSV',
     *   'text/csv',
     *   'Name,Email,Age\nJohn,john@example.com,30'
     * );
     *
     * @example
     * // Save to a specific folder
     * await pt.saveDocument(
     *   'monthly-report.pdf',
     *   'PDF',
     *   'application/pdf',
     *   '# Report\n\nContent...',
     *   'reports/2025/Q1'
     * );
     *
     * @example
     * // Save a document and make it immediately searchable by AI
     * await pt.saveDocument(
     *   'knowledge.md',
     *   'MD',
     *   'text/markdown',
     *   '# Knowledge Base\n\nImportant context...',
     *   'knowledge',
     *   'search'
     * );
     */
    saveDocument: async function(filename, format, mimetype, content, folder = null, attachmentMode = null) {
      if (!filename || typeof filename !== 'string') {
        throw new Error('filename must be a non-empty string');
      }
      if (!format || typeof format !== 'string') {
        throw new Error('format must be a non-empty string');
      }
      if (!mimetype || typeof mimetype !== 'string') {
        throw new Error('mimetype must be a non-empty string');
      }
      if (!content || typeof content !== 'string') {
        throw new Error('content must be a non-empty string');
      }

      const validFormats = ['TXT', 'MD', 'HTML', 'DOCX', 'PDF', 'CSV', 'XLSX', 'CUSTOM'];
      if (!validFormats.includes(format)) {
        throw new Error(`format must be one of: ${validFormats.join(', ')}`);
      }

      const params = {
        filename: filename,
        format: format,
        mimetype: mimetype,
        content: content
      };

      if (folder) {
        params.folder = folder;
      }

      // Validate and set attachment_mode (default: 'archived')
      const ALLOWED_ATTACHMENT_MODES = ['archived', 'search', 'attached', 'context'];
      params.attachment_mode = ALLOWED_ATTACHMENT_MODES.includes(attachmentMode) ? attachmentMode : 'archived';

      const response = await this.action('save_document', params);

      return response.result;
    },

    /**
     * List contents of a directory path in the chat's document structure
     * Similar to Unix ls command, operates on virtual folder hierarchy of documents.
     *
     * @param {string} path - Path to list (e.g., '/', '/reports', '/reports/2024')
     * @returns {Promise<object>} Directory listing with path and entries
     *
     * Response structure:
     * - path: The requested path
     * - entries: Array of directory and file entries
     *
     * Each entry contains:
     * - type: 'dir' or 'file'
     * - id: Entry ID
     * - name: Display name
     * - custom_name: Custom display name (files only)
     * - status: Chat role of the document (files only — DocumentInChatStatus: 'archived', 'search', 'attached', 'context')
     * - has_children: Boolean indicating if directory has children (dirs only)
     * - path: Full path string
     *
     * @example
     * // List root directory
     * const root = await pt.listDirectory('/');
     * console.log('Folders:', root.entries.filter(e => e.type === 'dir'));
     *
     * @example
     * // List specific folder
     * const reports = await pt.listDirectory('/reports');
     * const files = reports.entries.filter(e => e.type === 'file');
     *
     * @example
     * // Build file browser
     * async function browse(path) {
     *   const contents = await pt.listDirectory(path);
     *   contents.entries.forEach(entry => {
     *     const icon = entry.type === 'dir' ? '📁' : '📄';
     *     console.log(`${icon} ${entry.name}`);
     *   });
     * }
     */
    listDirectory: async function(path) {
      if (!path || typeof path !== 'string') {
        throw new Error('path must be a non-empty string');
      }

      const response = await this.action('list_directory', { path: path });
      return response.result;
    },

    /**
     * Check the processing/availability status of a document
     *
     * @param {number} docId - Document ID to check
     * @returns {Promise<object>} Status object with document_id and document_status
     *
     * Possible status values (DocumentStatus):
     * - 'Added':     File uploaded; original file present, no text extracted yet
     * - 'Loaded':    Text has been extracted from the file
     * - 'Processed': Chunks created (for documents that need vector indexing)
     * - 'Ready':     Chunks indexed; document ready for semantic search / RAG
     * - 'Error':     Error during extraction or indexing
     * - null: Document not found or not accessible
     *
     * @example
     * const status = await pt.getDocumentStatus(156);
     * if (status.document_status === 'Ready') {
     *   const text = await pt.getDocumentText(156);
     * }
     *
     * @example
     * // Poll until document is ready
     * async function waitForDocument(docId) {
     *   while (true) {
     *     const status = await pt.getDocumentStatus(docId);
     *     if (status.document_status === 'Ready') return true;
     *     if (status.document_status === 'Error') throw new Error('Processing failed');
     *     await new Promise(r => setTimeout(r, 2000));
     *   }
     * }
     */
    getDocumentStatus: async function(docId) {
      if (!docId) {
        throw new Error('docId is required');
      }

      const response = await this.action('document_status', { document_id: docId });
      return response.result;
    },

    /**
     * Delete documents from the chat (bulk delete)
     * Only deletes documents owned by the current user.
     *
     * @param {number[]} documentIds - Array of document IDs to delete
     * @returns {Promise<object>} Result with document_ids and deleted status
     *
     * @example
     * // Delete multiple documents
     * await pt.deleteDocuments([156, 157, 158]);
     *
     * @example
     * // Delete with confirmation
     * async function deleteSelected(docIds) {
     *   if (!confirm(`Delete ${docIds.length} documents?`)) return;
     *   await pt.deleteDocuments(docIds);
     *   await refreshList();
     * }
     */
    deleteDocuments: async function(documentIds) {
      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        throw new Error('documentIds must be a non-empty array');
      }

      const response = await this.action('delete_documents', { document_ids: documentIds });
      return response.result;
    },

    /**
     * Download one or more documents
     * Single documents download directly; multiple documents download as ZIP.
     *
     * @param {number[]} documentIds - Array of document IDs to download
     * @param {boolean} asZip - Force ZIP output even for single file (default: false)
     * @returns {Promise<void>} Triggers file download in browser
     *
     * @example
     * // Download single document
     * await pt.downloadDocuments([156]);
     *
     * @example
     * // Download multiple as ZIP
     * await pt.downloadDocuments([156, 157, 158], true);
     *
     * @example
     * // Download selected documents
     * const selected = getSelectedDocumentIds();
     * await pt.downloadDocuments(selected, selected.length > 1);
     */
    downloadDocuments: async function(documentIds, asZip = false) {
      if (!Array.isArray(documentIds) || documentIds.length === 0) {
        throw new Error('documentIds must be a non-empty array');
      }

      if (documentIds.length > 1 && !asZip) {
        asZip = true; // Auto-enable ZIP for multiple files
      }

      // Build URL with query parameters
      const params = new URLSearchParams();
      documentIds.forEach(id => params.append('document_ids', id));
      if (asZip) {
        params.append('as_zip', 'true');
      }

      // Use fetch to get the file with auth headers, then trigger download
      const response = await fetch(this._getUrl(`/api/v1/live/${this.chatId}/action`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': this.csrfToken,
          'X-Scoped-Token': this.scopedToken
        },
        body: JSON.stringify({
          action: 'download_documents',
          params: {
            document_ids: documentIds,
            as_zip: asZip
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.error || 'Download failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'download';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },

    /**
     * Get all collections associated with the chat
     *
     * @returns {Promise<object[]>} Array of collection objects
     *
     * Each collection contains:
     * - id: Collection ID
     * - name: Collection name
     * - description: Collection description
     * - uuid: Collection UUID
     * - created_at: Creation timestamp
     * - last_updated_at: Last update timestamp
     * - tags: Array of tag objects
     * - status: Collection status
     * - public: Whether collection is public
     * - indexed: Whether the collection is indexed for search (boolean)
     * - extra: Optional JSON object with custom metadata (null if not set)
     *
     * @example
     * const collections = await pt.listCollections();
     * collections.forEach(col => {
     *   console.log(`${col.name}: ${col.description}`);
     * });
     *
     * @example
     * // Build collection selector
     * const collections = await pt.listCollections();
     * const options = collections.map(c =>
     *   `<option value="${c.id}">${c.name}</option>`
     * ).join('');
     *
     * @example
     * // Filter to only indexed collections (searchable)
     * const collections = await pt.listCollections();
     * const searchable = collections.filter(c => c.indexed);
     * console.log(`${searchable.length} collections available for search`);
     *
     * @example
     * // Access custom metadata
     * const collections = await pt.listCollections();
     * collections.forEach(col => {
     *   if (col.extra) {
     *     console.log(`${col.name} metadata:`, col.extra);
     *   }
     * });
     */
    listCollections: async function() {
      const response = await this.action('list_collections', {});
      return response.result;
    },

    /**
     * Get documents within specified collections
     * Returns documents grouped by collection ID.
     *
     * @param {number[]} collectionIds - Array of collection IDs
     * @returns {Promise<object>} Object keyed by collection ID (as strings) with document arrays
     *
     * @example
     * const docs = await pt.getDocumentsInCollections([10, 15]);
     *
     * // Access documents by collection
     * const col10Docs = docs['10'];
     * const col15Docs = docs['15'];
     *
     * @example
     * // Flatten all documents
     * const docs = await pt.getDocumentsInCollections([10, 15, 20]);
     * const allDocs = Object.values(docs).flat();
     * console.log(`Total documents: ${allDocs.length}`);
     *
     * @example
     * // Display documents by collection
     * const collections = await pt.listCollections();
     * const docs = await pt.getDocumentsInCollections(collections.map(c => c.id));
     *
     * collections.forEach(col => {
     *   console.log(`\n${col.name}:`);
     *   docs[col.id.toString()].forEach(doc => {
     *     console.log(`  - ${doc.name}`);
     *   });
     * });
     */
    getDocumentsInCollections: async function(collectionIds) {
      if (!Array.isArray(collectionIds) || collectionIds.length === 0) {
        throw new Error('collectionIds must be a non-empty array');
      }

      const response = await this.action('documents_in_collections', {
        collection_ids: collectionIds
      });
      return response.result;
    },

    /**
     * Search for images within a collection using either an image file or a text query.
     *
     * @param {object} options - Search options
     * @param {number} options.collectionId - Collection ID to search in (required)
     * @param {string} options.query - Text query for text-based search (provide either query or imageFile, not both)
     * @param {File} options.imageFile - Image file for image-based search (provide either query or imageFile, not both)
     * @param {string} options.searchType - Search type: "mmr", "similarity", or "similarity_score_threshold" (default: "mmr")
     * @param {number} options.topK - Number of results to return, 1-100 (default: server default)
     * @param {number} options.scoreThreshold - Minimum similarity score 0-1 (default: server default)
     * @returns {Promise<Array>} Array of search result objects with text and metadata
     *
     * @example
     * // Text-based image search
     * const results = await pt.searchImagesInCollection({
     *   collectionId: 10,
     *   query: 'sunset over ocean',
     *   topK: 5
     * });
     * results.forEach(r => console.log(r.metadata));
     *
     * @example
     * // Image-based search (find similar images)
     * const fileInput = document.getElementById('imageInput');
     * const results = await pt.searchImagesInCollection({
     *   collectionId: 10,
     *   imageFile: fileInput.files[0],
     *   topK: 10,
     *   scoreThreshold: 0.7
     * });
     *
     * @example
     * // Display image search results
     * const results = await pt.searchImagesInCollection({
     *   collectionId: 10,
     *   query: 'product photos',
     *   searchType: 'similarity'
     * });
     * results.forEach(r => {
     *   const img = document.createElement('img');
     *   img.src = r.metadata.source_url || r.metadata.download_url;
     *   document.getElementById('gallery').appendChild(img);
     * });
     */
    searchImagesInCollection: async function(options = {}) {
      if (!this.chatId || !this.csrfToken || !this.scopedToken) {
        throw new Error('PrimeThink library not initialized. Call pt.init() first.');
      }

      const { collectionId, query, imageFile, searchType, topK, scoreThreshold } = options;

      if (!collectionId) {
        throw new Error('collectionId is required');
      }
      if (!query && !imageFile) {
        throw new Error('Either query or imageFile is required');
      }
      if (query && imageFile) {
        throw new Error('Provide either query or imageFile, not both');
      }

      const params = {
        collection_id: collectionId
      };
      if (query) params.query = query;
      if (searchType) params.search_type = searchType;
      if (topK !== undefined) params.top_k = topK;
      if (scoreThreshold !== undefined) params.score_threshold = scoreThreshold;

      if (imageFile) {
        // Use FormData for file upload
        const formData = new FormData();
        formData.append('files', imageFile);
        formData.append('action_data', JSON.stringify({
          action: 'search_images_in_collection',
          params: params
        }));

        try {
          const response = await fetch(this._getUrl(`/api/v1/live/${this.chatId}/action`), {
            method: 'POST',
            headers: {
              'X-CSRF-Token': this.csrfToken,
              'X-Scoped-Token': this.scopedToken
            },
            body: formData
          });

          const result = await response.json();

          if (!response.ok) {
            const errorMsg = result.error || result.detail || 'Image search failed';
            throw new Error(errorMsg);
          }

          if (!result.success) {
            throw new Error(result.error || 'Image search failed');
          }

          return result.result;
        } catch (error) {
          console.error('pt.searchImagesInCollection error:', error);
          throw error;
        }
      } else {
        // Text-based search, use standard action
        const response = await this.action('search_images_in_collection', params);
        return response.result;
      }
    },

    /**
     * Get detailed information about a document by its path
     * Returns DocumentInChat object with the full Document object nested inside.
     * This provides complete metadata about both the document-in-chat relationship and the underlying document.
     *
     * @param {string} documentPath - Path to the document (supports @public, @liveapp prefixes, or chat-relative paths)
     * @returns {Promise<object>} DocumentInChat object with nested document
     *
     * Response structure:
     * - id: DocumentInChat ID
     * - chat_id: Associated chat ID
     * - name: Display name in chat
     * - custom_name: Custom display name (if set)
     * - path: ltree path in chat's document hierarchy
     * - document: Full Document object with:
     *   - id: Document ID
     *   - name: Original filename
     *   - size: File size in bytes
     *   - mimetype: MIME type
     *   - status: Processing status ('Added', 'Loaded', 'Processed', 'Ready', 'Error')
     *   - extracted_text: Extracted text content (if available)
     *   - created_at: Creation timestamp
     *   - updated_at: Last update timestamp
     *   - And other document metadata...
     *
     * Path resolution:
     * - "@public/file.pdf" → Public files (no chat membership required)
     * - "@liveapp/data.json" → Live app files (group membership required)
     * - "folder/file.txt" → Chat-specific path (chat membership required)
     * - "file.txt" → Searches in order: @public → @liveapp → chat root
     *
     * @example
     * // Get info about a live app file
     * const docInfo = await pt.getDocumentInfo('@liveapp/config.json');
     * console.log('Document ID:', docInfo.document.id);
     * console.log('File size:', docInfo.document.size);
     * console.log('Status:', docInfo.document.status);
     *
     * @example
     * // Check if document is ready for processing
     * const docInfo = await pt.getDocumentInfo('reports/annual.pdf');
     * if (docInfo.document.status === 'Ready') {
     *   const text = await pt.getDocumentText(docInfo.document.id);
     *   console.log('Document text:', text);
     * }
     *
     * @example
     * // Get document metadata for display
     * const docInfo = await pt.getDocumentInfo('@public/demo.pdf');
     * document.getElementById('fileName').textContent = docInfo.name;
     * document.getElementById('fileSize').textContent = formatBytes(docInfo.document.size);
     * document.getElementById('fileType').textContent = docInfo.document.mimetype;
     */
    getDocumentInfo: async function(documentPath) {
      if (!documentPath || typeof documentPath !== 'string') {
        throw new Error('documentPath must be a non-empty string');
      }

      const response = await this.action('get_document_info', {
        document_path: documentPath
      });
      return response.result;
    },

    /**
     * Get detailed information about a document by its ID.
     * Returns a DocumentInChat object with the full Document object nested inside,
     * providing complete metadata about both the document-in-chat relationship and
     * the underlying document.
     *
     * @param {number} documentId - The document ID
     * @returns {Promise<object>} DocumentInChat object with nested document metadata
     *
     * @example
     * // Get document info by ID
     * const docInfo = await pt.getDocumentInfoById(42);
     * console.log('Name:', docInfo.name);
     * console.log('MIME type:', docInfo.document.mimetype);
     * console.log('Status:', docInfo.document.status);
     *
     * @example
     * // Use with documents from a collection
     * const docs = await pt.getDocumentsInCollections([10]);
     * const firstDoc = docs['10'][0];
     * const fullInfo = await pt.getDocumentInfoById(firstDoc.id);
     * console.log('UUID:', fullInfo.document.uuid);
     *
     * @example
     * // Check if document is ready for processing
     * const docInfo = await pt.getDocumentInfoById(documentId);
     * if (docInfo.document.status === 'Ready') {
     *   const text = await pt.getDocumentText(docInfo.document.id);
     *   console.log('Document text:', text);
     * }
     */
    getDocumentInfoById: async function(documentId) {
      if (!documentId || (typeof documentId !== 'number' && typeof documentId !== 'string')) {
        throw new Error('documentId must be a valid number or numeric string');
      }

      const response = await this.action('get_document_info_by_id', {
        document_id: documentId
      });
      return response.result;
    },

    /**
     * Get information about the current chat
     * Returns basic metadata including chat ID, name, and creation timestamp.
     *
     * @returns {Promise<object>} Chat information object
     *
     * Response structure:
     * - chat_id: The chat ID (integer)
     * - name: Chat name/title
     * - created_at: ISO timestamp of when the chat was created
     *
     * @example
     * // Get current chat details
     * const chatInfo = await pt.getChatInfo();
     * console.log(`Chat: ${chatInfo.name}`);
     * console.log(`Created: ${chatInfo.created_at}`);
     *
     * @example
     * // Display chat header
     * const info = await pt.getChatInfo();
     * document.getElementById('chatName').textContent = info.name;
     * document.getElementById('chatId').textContent = `ID: ${info.chat_id}`;
     *
     * @example
     * // Show chat age
     * const info = await pt.getChatInfo();
     * const created = new Date(info.created_at);
     * const age = Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24));
     * console.log(`Chat is ${age} days old`);
     */
    getChatInfo: async function() {
      const response = await this.action('get_chat_info', {});
      return response.result;
    },

    /**
     * Rename the current chat
     * Updates the chat's display name/title.
     *
     * @param {string} name - The new name for the chat
     * @returns {Promise<object>} Result with success status and updated chat info
     *
     * Response structure:
     * - success: boolean indicating if the operation was successful
     * - chat_id: The chat ID (integer)
     * - name: The new chat name
     *
     * @example
     * // Rename the chat
     * const result = await pt.renameChat('Project Alpha Discussion');
     * console.log(`Chat renamed to: ${result.name}`);
     *
     * @example
     * // Rename with user input
     * const newName = prompt('Enter new chat name:');
     * if (newName) {
     *   await pt.renameChat(newName);
     *   document.getElementById('chatTitle').textContent = newName;
     * }
     *
     * @example
     * // Rename based on content
     * const info = await pt.getChatInfo();
     * const timestamp = new Date().toLocaleDateString();
     * await pt.renameChat(`${info.name} - ${timestamp}`);
     */
    renameChat: async function(name) {
      if (!name || typeof name !== 'string') {
        throw new Error('name must be a non-empty string');
      }

      const response = await this.action('rename_chat', { name: name });
      return response.result;
    },

    /**
     * Get paginated message history from the current chat
     * Returns messages in reverse chronological order with full details including
     * sender info, attachments, reactions, and reply references.
     *
     * @param {object} [options={}] - Pagination options
     * @param {number} [options.size=25] - Number of messages per page
     * @param {number} [options.beforeMessageId] - Load messages older than this ID (backward pagination)
     * @param {number} [options.afterMessageId] - Load messages newer than this ID (forward pagination)
     * @param {number} [options.anchorMessageId] - Jump to a specific message, returning ~25 older and ~25 newer messages around it
     * @returns {Promise<Array>} Array of message objects
     *
     * Message object structure:
     * - id: Message ID (number)
     * - message: Message text content (string)
     * - created_at: ISO timestamp of when the message was sent
     * - user_type: 'user' or 'virtual_assistant'
     * - type: Message type (e.g. 'text', 'system')
     * - from_user: Sender user details (object, if sent by a user)
     * - from_virtual_assistant: VA details (object, if sent by a VA)
     * - message_attachments: Array of attached documents
     * - aggregated_reactions: Reaction counts and details
     * - replying_to_message: The parent message if this is a reply
     *
     * @example
     * // Load the latest messages
     * const messages = await pt.getChatMessages();
     * messages.forEach(msg => console.log(msg.from_user?.name, msg.message));
     *
     * @example
     * // Load older messages for infinite scroll
     * const firstBatch = await pt.getChatMessages();
     * const oldestId = firstBatch[firstBatch.length - 1].id;
     * const olderMessages = await pt.getChatMessages({ beforeMessageId: oldestId });
     *
     * @example
     * // Jump to a specific message
     * const around = await pt.getChatMessages({ anchorMessageId: 5678 });
     */
    getChatMessages: async function(options = {}) {
      const params = {};
      if (options.size != null) params.size = options.size;
      if (options.beforeMessageId != null) params.before_message_id = options.beforeMessageId;
      if (options.afterMessageId != null) params.after_message_id = options.afterMessageId;
      if (options.anchorMessageId != null) params.anchor_message_id = options.anchorMessageId;

      const response = await this.action('get_chat_messages', params);
      return response.result;
    },

    // ============================================================================
    // MEDIA GENERATION METHODS
    // ============================================================================

    /**
     * Generate AI-powered images from text descriptions
     *
     * @param {object} options - Image generation options
     * @param {string} options.prompt - Text description of the image to generate (required)
     * @param {string} options.provider - Provider: 'auto', 'openai', or 'google' (default: user setting or 'auto')
     * @param {string} options.style - Image style (default: 'realistic')
     * @param {string} options.size - Image dimensions (default: '1024x1024')
     * @param {string[]} options.reference_images - Array of reference image URLs
     * @param {number} options.reference_weight - Influence of reference images 0.0-1.0 (default: 0.5)
     * @param {string} options.folder - Destination folder for saving (default: 'images')
     * @param {number} options.count - Number of images to generate 1-4 (default: 1)
     * @param {string} options.negative_prompt - What to avoid in the image
     * @param {string} options.name - Custom filename for the generated image (without extension)
     * @returns {Promise<object>} Result with success, message, and images array containing {id, uuid, name, path} for each generated image
     *
     * Supported sizes:
     * - 'auto' - Automatically determine optimal size
     * - '1024x1024' - Square format
     * - '1536x1024' - Landscape format
     * - '1024x1536' - Portrait format
     * - '256x256' - Small square
     * - '512x512' - Medium square
     * - '1792x1024' - Wide landscape
     * - '1024x1792' - Tall portrait
     *
     * @example
     * // Basic image generation
     * await pt.generateImage({
     *   prompt: "A serene mountain landscape at sunset",
     *   size: "1536x1024"
     * });
     *
     * @example
     * // With style and negative prompt
     * await pt.generateImage({
     *   prompt: "A modern minimalist office interior",
     *   style: "realistic",
     *   size: "1024x1024",
     *   negative_prompt: "people, clutter, dark"
     * });
     *
     * @example
     * // Generate multiple variations
     * await pt.generateImage({
     *   prompt: "Abstract geometric patterns",
     *   size: "1024x1024",
     *   count: 4
     * });
     *
     * @example
     * // Using reference images
     * await pt.generateImage({
     *   prompt: "Product photo of a coffee mug",
     *   reference_images: ["https://example.com/style.jpg"],
     *   reference_weight: 0.7
     * });
     *
     * @example
     * // Organize in folders
     * await pt.generateImage({
     *   prompt: "Company logo design",
     *   folder: "logos/concepts"
     * });
     *
     * @example
     * // With custom filename
     * const result = await pt.generateImage({
     *   prompt: "Product hero image",
     *   name: "hero-banner",
     *   folder: "marketing"
     * });
     * // result.images = [{ id: 123, uuid: "...", name: "hero-banner.png", path: "/marketing" }]
     */
    generateImage: async function(options) {
      if (!options || !options.prompt || typeof options.prompt !== 'string') {
        throw new Error('options.prompt must be a non-empty string');
      }

      const params = {
        prompt: options.prompt
      };

      // Optional parameters
      if (options.provider) {
        params.provider = options.provider;
      }
      if (options.style) {
        params.style = options.style;
      }
      if (options.size) {
        params.size = options.size;
      }
      if (options.reference_images && Array.isArray(options.reference_images)) {
        params.reference_images = options.reference_images;
      }
      if (options.reference_weight !== undefined) {
        params.reference_weight = options.reference_weight;
      }
      if (options.folder) {
        params.folder = options.folder;
      }
      if (options.count) {
        params.count = options.count;
      }
      if (options.negative_prompt) {
        params.negative_prompt = options.negative_prompt;
      }
      if (options.name) {
        params.name = options.name;
      }

      const response = await this.action('generate_image', params);
      return response;
    },

    /**
     * Generate natural-sounding speech from text or dialogue scripts
     *
     * @param {object} options - Voice generation options
     * @param {string} options.text - Text to convert to speech (for single-voice content)
     * @param {object[]} options.dialogue - Array of speaker objects (for multi-voice content)
     * @param {string} options.voice - Voice ID or name
     * @param {string} options.instructions - Voice style and delivery instructions
     * @param {string} options.model - TTS model to use
     * @param {string} options.provider - Provider: 'openai', 'google', or 'elevenlabs'
     * @param {string} options.folder - Destination folder for saving (default: 'audio')
     * @param {boolean} options.streaming - Enable streaming response (default: false)
     * @param {string} options.name - Custom filename for the generated audio (without extension)
     * @returns {Promise<object>} Result with success, message, and voice array containing {id, uuid, name, path} for each generated audio file
     *
     * Either text or dialogue must be provided.
     *
     * Dialogue item structure:
     * - speaker: Speaker name
     * - text: What the speaker says
     * - voice_id: Voice ID for this speaker
     * - description: Optional tone/emotion description
     *
     * OpenAI voices:
     * - 'alloy' - Neutral and balanced
     * - 'echo' - Male, clear and articulate
     * - 'fable' - Warm and expressive
     * - 'onyx' - Deep and authoritative
     * - 'nova' - Energetic and bright
     * - 'shimmer' - Soft and gentle
     *
     * @example
     * // Basic text-to-speech
     * await pt.generateVoice({
     *   text: "Welcome to PrimeThink.",
     *   voice: "alloy",
     *   provider: "openai"
     * });
     *
     * @example
     * // With voice instructions
     * await pt.generateVoice({
     *   text: "This is an important announcement.",
     *   voice: "onyx",
     *   instructions: "Speak with authority and urgency",
     *   provider: "openai"
     * });
     *
     * @example
     * // Multi-speaker dialogue
     * await pt.generateVoice({
     *   provider: "openai",
     *   dialogue: [
     *     {
     *       speaker: "Host",
     *       text: "Welcome to the podcast!",
     *       voice_id: "fable",
     *       description: "enthusiastic"
     *     },
     *     {
     *       speaker: "Guest",
     *       text: "Thanks for having me.",
     *       voice_id: "echo",
     *       description: "professional"
     *     }
     *   ]
     * });
     *
     * @example
     * // Save to specific folder
     * await pt.generateVoice({
     *   text: "Chapter 1: The Beginning...",
     *   voice: "onyx",
     *   instructions: "Storytelling voice with dramatic pauses",
     *   folder: "audiobooks/chapter1"
     * });
     *
     * @example
     * // With custom filename
     * const result = await pt.generateVoice({
     *   text: "Welcome message",
     *   voice: "alloy",
     *   name: "welcome-audio"
     * });
     * // result.voice = [{ id: 123, uuid: "...", name: "welcome-audio.mp3", path: "/audio" }]
     */
    generateVoice: async function(options) {
      if (!options) {
        throw new Error('options object is required');
      }
      if (!options.text && !options.dialogue) {
        throw new Error('Either options.text or options.dialogue must be provided');
      }
      if (options.text && options.dialogue) {
        throw new Error('Provide either options.text or options.dialogue, not both');
      }

      const params = {};

      // Text or dialogue
      if (options.text) {
        if (typeof options.text !== 'string') {
          throw new Error('options.text must be a string');
        }
        params.text = options.text;
      }
      if (options.dialogue) {
        if (!Array.isArray(options.dialogue)) {
          throw new Error('options.dialogue must be an array');
        }
        params.dialogue = options.dialogue;
      }

      // Optional parameters
      if (options.voice) {
        params.voice = options.voice;
      }
      if (options.instructions) {
        params.instructions = options.instructions;
      }
      if (options.model) {
        params.model = options.model;
      }
      if (options.provider) {
        params.provider = options.provider;
      }
      if (options.folder) {
        params.folder = options.folder;
      }
      if (options.streaming !== undefined) {
        params.streaming = options.streaming;
      }
      if (options.name) {
        params.name = options.name;
      }

      const response = await this.action('generate_voice', params);
      return response;
    },

    // ============================================================================
    // AUDIO DIARIZATION METHODS
    // ============================================================================

    /**
     * Transcribe an audio document with speaker diarization
     *
     * Takes an audio document saved in the chat and produces a verbatim transcript
     * with [MM:SS] timestamps and Speaker labels for each turn. The transcript is
     * saved as a markdown document inside the chat.
     *
     * @param {object} options - Diarization options
     * @param {number} options.document_id - The ID of the audio document in the chat to transcribe
     * @param {number} [options.speaker_count] - Number of distinct speakers (1-20). Leave empty to auto-detect.
     * @param {string} [options.extra_instructions] - Extra instructions for the diarization model (language hints, speaker names, etc.)
     * @param {string} [options.folder="transcripts"] - Destination folder for the transcript document
     * @param {string} [options.filename] - Custom filename for the transcript. Defaults to '<audio_name>_transcript.md'.
     * @returns {Promise<object>} Result with success, message, transcript text, and documents array
     *
     * Response structure:
     * - success: boolean
     * - message: Confirmation message (e.g., "Diarized transcript saved to the 'transcripts' folder")
     * - transcript: The full transcript text with timestamps and speaker labels
     * - documents: Array of saved document objects with {id, uuid, name, path}
     *
     * Transcript format:
     * [MM:SS] Speaker 1: <text>
     * [MM:SS] Speaker 2: <text>
     *
     * Supported audio formats: MP3, WAV, M4A, OGG, FLAC, AAC, WEBM, OPUS
     *
     * @example
     * // Basic diarization with auto-detected speakers
     * const result = await pt.diarizeAudio({
     *   document_id: 456
     * });
     * console.log(result.transcript);
     *
     * @example
     * // Specify speaker count
     * await pt.diarizeAudio({
     *   document_id: 456,
     *   speaker_count: 3
     * });
     *
     * @example
     * // With extra instructions for language and speaker names
     * await pt.diarizeAudio({
     *   document_id: 456,
     *   speaker_count: 2,
     *   extra_instructions: "The audio is in Italian. Speakers are Marco and Giulia."
     * });
     *
     * @example
     * // Save to custom folder with custom filename
     * await pt.diarizeAudio({
     *   document_id: 456,
     *   folder: "meetings/2024-03",
     *   filename: "team-standup-march-15"
     * });
     *
     * @example
     * // Full workflow: list documents, find audio, diarize
     * const docs = await pt.list('documents');
     * const audioDoc = docs.find(d => d.name.endsWith('.m4a'));
     * if (audioDoc) {
     *   const result = await pt.diarizeAudio({
     *     document_id: audioDoc.id,
     *     speaker_count: 2,
     *     folder: "transcripts/meetings"
     *   });
     *   console.log('Transcript saved:', result.documents[0].name);
     * }
     */
    diarizeAudio: async function(options) {
      if (!options || !options.document_id) {
        throw new Error('options.document_id is required');
      }
      if (typeof options.document_id !== 'number' || options.document_id <= 0) {
        throw new Error('options.document_id must be a positive integer');
      }
      if (options.speaker_count !== undefined && options.speaker_count !== null) {
        if (typeof options.speaker_count !== 'number' || options.speaker_count < 1 || options.speaker_count > 20) {
          throw new Error('options.speaker_count must be an integer between 1 and 20');
        }
      }

      const params = {
        document_id: options.document_id
      };

      if (options.speaker_count) {
        params.speaker_count = options.speaker_count;
      }
      if (options.extra_instructions) {
        params.extra_instructions = options.extra_instructions;
      }
      if (options.folder) {
        params.folder = options.folder;
      }
      if (options.filename) {
        params.filename = options.filename;
      }

      const response = await this.action('diarize_audio', params);
      return response;
    },

    // ============================================================================
    // SPEECH-TO-TEXT METHODS
    // ============================================================================

    /**
     * Generate a single-use ElevenLabs Scribe token for realtime speech-to-text
     *
     * Returns a short-lived token and WebSocket URL that the client can use to
     * connect directly to the ElevenLabs Scribe v2 WebSocket for streaming
     * transcription. The token expires after 15 minutes.
     *
     * @returns {Promise<object>} Result with token and websocket_url
     *
     * Response structure:
     * - token: Single-use authentication token for the WebSocket connection
     * - websocket_url: The ElevenLabs Scribe WebSocket URL to connect to
     *
     * @example
     * // Get token and connect to WebSocket
     * const { token, websocket_url } = await pt.sttStreamToken();
     * const ws = new WebSocket(websocket_url);
     * // Use token to authenticate the WebSocket connection
     */
    sttStreamToken: async function() {
      const response = await this.action('stt_stream_token');
      return response;
    },

    // ============================================================================
    // STREAMING MESSAGE METHODS
    // ============================================================================

    /**
     * Stop a streaming message that is currently in progress
     *
     * Halts a streaming AI response that is being generated. Use this when the user
     * wants to stop a long-running generation or no longer needs the response.
     *
     * @param {string} streamingTaskId - The unique identifier of the streaming task to stop
     * @returns {Promise<object>} Result with success status and message
     *
     * Response structure:
     * - success: boolean indicating if the operation was successful
     * - message: Confirmation message (e.g., "Streaming task has been stopped.")
     *
     * @example
     * // Stop a streaming message
     * const taskId = 'abc123-task-id';
     * const result = await pt.stopStreamingMessage(taskId);
     * console.log(result.message); // "Streaming task has been stopped."
     *
     * @example
     * // Stop with error handling
     * try {
     *   await pt.stopStreamingMessage(currentTaskId);
     *   console.log('Message generation stopped');
     * } catch (error) {
     *   console.error('Failed to stop:', error.message);
     * }
     *
     * @example
     * // Stop button implementation
     * document.getElementById('stopBtn').addEventListener('click', async () => {
     *   if (activeStreamingTaskId) {
     *     await pt.stopStreamingMessage(activeStreamingTaskId);
     *     activeStreamingTaskId = null;
     *     updateUI('stopped');
     *   }
     * });
     */
    stopStreamingMessage: async function(streamingTaskId) {
      if (!streamingTaskId || typeof streamingTaskId !== 'string') {
        throw new Error('streamingTaskId must be a non-empty string');
      }

      const response = await this.action('delete_streaming_task', {
        streaming_task_id: streamingTaskId
      });

      return response;
    },

    // ============================================================================
    // DB COLLECTIONS
    // ============================================================================

    /**
     * Version identifier for feature detection
     */
    version: '2.0.0',

    /**
     * Cache for attached DB collections list
     * @private
     */
    _dbCollectionsCache: null,

    /**
     * Fetch and cache the list of DB collections attached to this chat.
     * @private
     * @returns {Promise<Array>} Array of {collection_id, name, access_mode, attached_at}
     */
    _fetchDbCollections: async function() {
      if (this._dbCollectionsCache) {
        return this._dbCollectionsCache;
      }
      const response = await this.action('db_list_collections', {});
      this._dbCollectionsCache = response.result;
      return this._dbCollectionsCache;
    },

    /**
     * Invalidate the DB collections cache (e.g., when a collection is attached/detached).
     * @private
     */
    _invalidateDbCollectionsCache: function() {
      this._dbCollectionsCache = null;
    },

    /**
     * Get a scoped DB client for a named DB Collection.
     *
     * Returns synchronously — the collection name is resolved lazily on the first
     * CRUD call. This allows `const db = pt.db('project-db')` at module scope.
     *
     * The returned client exposes the same CRUD methods as `pt` itself:
     * - list(options), get(entityId), add(entityName, data), edit(entityId, data, merge, ifUnchangedSince)
     * - batchAdd(entityName, dataArray), batchEdit(items), delete(entityId), batchDelete(ids)
     *
     * @param {string} collectionName - The name of the DB Collection
     * @returns {DbCollectionClient} A scoped client for the named collection
     *
     * @example
     * const db = pt.db('project-db');
     * const issues = await db.list({ entityNames: ['issue'] });
     * await db.add('issue', { title: 'Bug report', status: 'open' });
     */
    db: function(collectionName) {
      if (!collectionName || typeof collectionName !== 'string') {
        throw new Error('collectionName must be a non-empty string');
      }
      return new DbCollectionClient(collectionName, this);
    }
  };

  /**
   * Client for performing CRUD operations on a specific DB Collection.
   * Created via pt.db('collection-name'). All methods mirror the pt.* CRUD API
   * but target the named collection's entity store.
   *
   * @class
   * @param {string} collectionName - The DB Collection name
   * @param {object} pt - Reference to the pt library instance
   */
  function _isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function DbCollectionClient(collectionName, pt) {
    this.collectionName = collectionName;
    this._pt = pt;
  }

  /**
   * List entities in this DB Collection with optional filtering and pagination.
   * Same options as pt.list().
   *
   * @param {object} options - Query options
   * @param {string[]} [options.entityNames] - Entity types to filter
   * @param {object} [options.filters] - JSON field filters with operator support
   * @param {number} [options.limit] - Max results
   * @param {number} [options.offset] - Skip count
   * @param {number} [options.page] - Page number (1-indexed)
   * @param {number} [options.pageSize] - Items per page
   * @param {boolean} [options.returnMetadata] - If true, return {entities, count, pagination}
   * @returns {Promise<Array|object>} Entities array or metadata object
   */
  DbCollectionClient.prototype.list = async function(options) {
    options = options || {};
    var response = await this._pt.action('db_list', {
      collection_name: this.collectionName,
      entity_names: options.entityNames,
      filters: options.filters,
      limit: options.limit,
      offset: options.offset,
      page: options.page,
      page_size: options.pageSize
    });

    var result = response.result;
    if (options.returnMetadata === true) {
      return {
        entities: result.entities,
        count: result.count,
        pagination: result.pagination
      };
    }
    return result.entities;
  };

  /**
   * Get a single entity by ID from this DB Collection.
   * @param {number} entityId - The entity ID
   * @returns {Promise<object>} The entity object
   */
  DbCollectionClient.prototype.get = async function(entityId) {
    if (!entityId) {
      throw new Error('entityId is required');
    }
    var response = await this._pt.action('db_get', {
      collection_name: this.collectionName,
      entity_id: entityId
    });
    return response.result;
  };

  /**
   * Create a new entity in this DB Collection.
   * @param {string} entityName - The entity type name
   * @param {object} data - The entity data
   * @returns {Promise<object>} The created entity
   */
  DbCollectionClient.prototype.add = async function(entityName, data) {
    if (!entityName || typeof entityName !== 'string') {
      throw new Error('entityName must be a non-empty string');
    }
    if (!_isPlainObject(data)) {
      throw new Error('data must be a plain object');
    }
    var response = await this._pt.action('db_add', {
      collection_name: this.collectionName,
      entity_name: entityName,
      data: data
    });
    return response.result;
  };

  /**
   * Batch create entities in this DB Collection.
   * @param {string} entityName - The entity type name
   * @param {Array<object>} dataArray - Array of entity data objects
   * @returns {Promise<Array>} Array of results with success/error per item
   */
  DbCollectionClient.prototype.batchAdd = async function(entityName, dataArray) {
    if (!entityName || typeof entityName !== 'string') {
      throw new Error('entityName must be a non-empty string');
    }
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new Error('dataArray must be a non-empty array');
    }
    for (var i = 0; i < dataArray.length; i++) {
      if (!_isPlainObject(dataArray[i])) {
        throw new Error('each item in dataArray must be a plain object');
      }
    }
    var response = await this._pt.action('db_batch_add', {
      collection_name: this.collectionName,
      entity_name: entityName,
      items: dataArray
    });
    return response.result;
  };

  /**
   * Update an entity in this DB Collection.
   * @param {number} entityId - The entity ID
   * @param {object} data - The updated data
   * @param {boolean} [merge=false] - If true, merge with existing data
   * @param {string} [ifUnchangedSince] - ISO timestamp for optimistic locking
   * @returns {Promise<object>} The updated entity or conflict info
   */
  DbCollectionClient.prototype.edit = async function(entityId, data, merge, ifUnchangedSince) {
    if (!entityId) {
      throw new Error('entityId is required');
    }
    if (!_isPlainObject(data)) {
      throw new Error('data must be a plain object');
    }
    var params = {
      collection_name: this.collectionName,
      entity_id: entityId,
      data: data,
      merge: merge || false
    };
    if (ifUnchangedSince) {
      params.if_unchanged_since = ifUnchangedSince;
    }
    var response = await this._pt.action('db_edit', params);
    return response.result;
  };

  /**
   * Batch update entities in this DB Collection.
   * @param {Array<object>} items - Array of {id, data, merge?, if_unchanged_since?}
   * @returns {Promise<Array>} Array of results with success/conflict per item
   */
  DbCollectionClient.prototype.batchEdit = async function(items) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('items must be a non-empty array');
    }
    for (var i = 0; i < items.length; i++) {
      if (!_isPlainObject(items[i])) {
        throw new Error('each item must be a plain object');
      }
      if (!items[i].id) {
        throw new Error('each item must have an id property');
      }
      if (!_isPlainObject(items[i].data)) {
        throw new Error('each item must have a data property that is a plain object');
      }
    }
    var response = await this._pt.action('db_batch_edit', {
      collection_name: this.collectionName,
      items: items
    });
    return response.result;
  };

  /**
   * Delete an entity from this DB Collection.
   * @param {number} entityId - The entity ID
   * @returns {Promise<object>} Deletion confirmation
   */
  DbCollectionClient.prototype.delete = async function(entityId) {
    if (!entityId) {
      throw new Error('entityId is required');
    }
    var response = await this._pt.action('db_delete', {
      collection_name: this.collectionName,
      entity_id: entityId
    });
    return response.result;
  };

  /**
   * Batch delete entities from this DB Collection.
   * @param {Array<number>} ids - Array of entity IDs to delete
   * @returns {Promise<Array>} Array of results with success/error per item
   */
  DbCollectionClient.prototype.batchDelete = async function(ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('ids must be a non-empty array');
    }
    var response = await this._pt.action('db_batch_delete', {
      collection_name: this.collectionName,
      ids: ids
    });
    return response.result;
  };

  console.log('PrimeThink library loaded. Use pt.action(actionName, params) to call server actions.');
})();
