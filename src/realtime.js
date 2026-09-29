// Нақты уақыттық синхрондау жүйесі (Realtime Cloud Sync via ntfy WebSocket + Local BroadcastChannel)
// Барлық құрылғылар (Смартфондар <-> Ноутбук/Проектор) арасында интернет арқылы байланыс орнатады

export class RealtimeChannel {
  constructor(roomCode = 'KAZAKH-QUIZ-2026') {
    this.roomCode = roomCode;
    this.topic = `kazakh_culture_quiz_${this.roomCode.toLowerCase()}`;
    this.listeners = new Map();
    this.ws = null;
    this.isConnected = false;
    this.reconnectTimer = null;
    this._senderId = 'user_' + Math.random().toString(36).substring(2, 9);
    this._recentKeys = new Set();

    // 1. Local BroadcastChannel for same-device tabs
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.bc = new BroadcastChannel(`kazakh_quiz_${this.roomCode}`);
        this.bc.onmessage = (event) => {
          this.handleIncoming(event.data, false);
        };
      } catch (e) {}
    }

    // 2. Global Cloud WebSocket for Cross-Device (Mobile Phone <-> Laptop/Projector)
    this.connectCloudWebSocket();
  }

  connectCloudWebSocket() {
    if (typeof WebSocket === 'undefined') return;

    try {
      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
      }

      this.ws = new WebSocket(`wss://ntfy.sh/${this.topic}/ws`);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log('[Realtime] Cloud WebSocket connected to room:', this.topic);
        this.dispatchStatus(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);
          if (res.event === 'message' && res.message) {
            const payload = JSON.parse(res.message);
            this.handleIncoming(payload, false);
          }
        } catch (err) {}
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.dispatchStatus(false);
        // Auto-reconnect after 2 seconds
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connectCloudWebSocket(), 2000);
      };

      this.ws.onerror = () => {
        try { this.ws.close(); } catch (e) {}
      };
    } catch (err) {
      console.warn('[Realtime] WebSocket connect error:', err);
    }
  }

  dispatchStatus(connected) {
    const callbacks = this.listeners.get('CONNECTION_STATUS');
    if (callbacks) {
      callbacks.forEach(cb => {
        try { cb({ connected }); } catch (e) {}
      });
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  emit(eventType, data = {}) {
    const payload = {
      room: this.roomCode,
      type: eventType,
      data,
      timestamp: Date.now(),
      senderId: this._senderId
    };

    // 1. Send to Cloud Relay (all phones and laptops across the internet)
    try {
      fetch(`https://ntfy.sh/${this.topic}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (e) {}

    // 2. Send via Local BroadcastChannel (same-machine tabs)
    if (this.bc) {
      try { this.bc.postMessage(payload); } catch (e) {}
    }

    // 3. LocalStorage fallback
    try {
      localStorage.setItem('kazakh_quiz_msg', JSON.stringify({ ...payload, _rnd: Math.random() }));
    } catch (e) {}

    // 4. Handle locally on current page
    this.handleIncoming(payload, true);
  }

  handleIncoming(payload, isLocal = false) {
    if (!payload || !payload.type) return;

    // Deduplication check: prevent processing exact same message twice
    const msgKey = `${payload.type}_${payload.timestamp}_${payload.senderId}`;
    if (this._recentKeys.has(msgKey) && !isLocal) return;
    this._recentKeys.add(msgKey);
    if (this._recentKeys.size > 200) {
      const arr = Array.from(this._recentKeys);
      this._recentKeys = new Set(arr.slice(100));
    }

    const callbacks = this.listeners.get(payload.type);
    if (callbacks) {
      callbacks.forEach(cb => {
        try { cb(payload.data, payload.timestamp, isLocal); } catch (e) { console.error(e); }
      });
    }
  }

  initStorageListener() {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (e) => {
      if (e.key === 'kazakh_quiz_msg' && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          this.handleIncoming(payload, false);
        } catch (err) {}
      }
    });
  }
}

export const realtime = new RealtimeChannel();
realtime.initStorageListener();
