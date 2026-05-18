// Minimal Engine.IO v4 + Socket.IO v4 client (WebSocket transport only).
// Supports: connect, disconnect, reconnect, emit(event, data), on(event, handler).
//
// Engine.IO v4 packet types (first character of WebSocket frame):
//   0 = open        – server sends JSON with sid, pingInterval, pingTimeout
//   1 = close       – graceful shutdown
//   2 = ping        – server → client heartbeat
//   3 = pong        – client → server heartbeat reply
//   4 = message     – wraps a Socket.IO packet
//
// Socket.IO v4 packet types (after the leading "4"):
//   0 = CONNECT     – "40" or "40{...}"
//   2 = EVENT       – "42[event, data]"

(function (global) {
  "use strict";

  function Sio4Lite(opts) {
    this.opts = opts || {};
    this.handlers = Object.create(null);
    this.ws = null;
    this.connected = false;
    this._closing = false;
    this._reconnectTimer = null;
    this._reconnectDelay = 600;
    this._reconnectDelayMax = 5000;
    // Heartbeat tracking (set from server's open packet)
    this._pingInterval = 25000;
    this._pingTimeout = 20000;
    this._heartbeatTimer = null;
  }

  /* ── Event registration ────────────────────────────────── */

  Sio4Lite.prototype.on = function (event, fn) {
    if (!this.handlers[event]) this.handlers[event] = [];
    this.handlers[event].push(fn);
  };

  Sio4Lite.prototype._emitLocal = function (event, arg) {
    var hs = this.handlers[event] || [];
    for (var i = 0; i < hs.length; i++) {
      try {
        hs[i](arg);
      } catch (_) {
        // swallow handler errors to avoid breaking the IO loop
      }
    }
  };

  /* ── URL helper ────────────────────────────────────────── */

  Sio4Lite.prototype._wsUrl = function () {
    var proto = location.protocol === "https:" ? "wss:" : "ws:";
    var base = proto + "//" + location.host;
    return base + "/socket.io/?EIO=4&transport=websocket";
  };

  /* ── Connection lifecycle ──────────────────────────────── */

  Sio4Lite.prototype.connect = function () {
    this._closing = false;
    this._connectOnce();
  };

  Sio4Lite.prototype._connectOnce = function () {
    var self = this;
    var url = this._wsUrl();

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      this._emitLocal("connect_error", err);
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = function () {
      // WebSocket transport is open. Wait for Engine.IO "open" (type 0).
    };

    this.ws.onmessage = function (ev) {
      var data = typeof ev.data === "string" ? ev.data : "";
      if (!data) return;

      var eioType = data.charAt(0);

      // ── Engine.IO: open ──
      if (eioType === "0") {
        // Parse the open payload for heartbeat intervals
        try {
          var openPayload = JSON.parse(data.slice(1));
          if (openPayload.pingInterval) self._pingInterval = openPayload.pingInterval;
          if (openPayload.pingTimeout) self._pingTimeout = openPayload.pingTimeout;
        } catch (_) {}
        // Send Socket.IO CONNECT packet: Engine.IO message + SIO connect = "40"
        self.ws.send("40");
        self._resetHeartbeat();
        return;
      }

      // ── Engine.IO: ping → respond with pong ──
      if (eioType === "2") {
        self.ws.send("3");
        self._resetHeartbeat();
        return;
      }

      // ── Engine.IO: pong (unlikely from server, but handle gracefully) ──
      if (eioType === "3") {
        self._resetHeartbeat();
        return;
      }

      // ── Engine.IO: close ──
      if (eioType === "1") {
        self._closeInternal();
        return;
      }

      // ── Engine.IO: message (type 4) → contains Socket.IO packet ──
      if (eioType !== "4") return;

      // Strip the leading "4" to get the Socket.IO packet
      var sioPacket = data.slice(1);

      // Socket.IO CONNECT acknowledgement: "0" or "0{...}"
      if (sioPacket.charAt(0) === "0") {
        self.connected = true;
        self._reconnectDelay = 600;
        self._emitLocal("connect");
        return;
      }

      // Socket.IO EVENT: "2[event, data]"
      if (sioPacket.charAt(0) === "2") {
        var arr = null;
        try {
          arr = JSON.parse(sioPacket.slice(1));
        } catch (_) {
          return;
        }
        if (!Array.isArray(arr) || arr.length < 1) return;
        var event = arr[0];
        var arg = arr.length > 1 ? arr[1] : undefined;
        self._emitLocal(event, arg);
      }
    };

    this.ws.onerror = function (ev) {
      self._emitLocal("connect_error", ev);
    };

    this.ws.onclose = function () {
      self._closeInternal();
    };
  };

  /* ── Heartbeat management ──────────────────────────────── */

  Sio4Lite.prototype._resetHeartbeat = function () {
    var self = this;
    this._clearHeartbeat();
    // If no ping arrives within (pingInterval + pingTimeout), consider dead.
    this._heartbeatTimer = setTimeout(function () {
      if (self.ws) {
        try { self.ws.close(); } catch (_) {}
      }
    }, self._pingInterval + self._pingTimeout);
  };

  Sio4Lite.prototype._clearHeartbeat = function () {
    if (this._heartbeatTimer) {
      clearTimeout(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  };

  /* ── Internal close & reconnect ────────────────────────── */

  Sio4Lite.prototype._closeInternal = function () {
    var wasConnected = this.connected;
    this.connected = false;
    this._clearHeartbeat();
    this.ws = null;
    if (wasConnected) {
      this._emitLocal("disconnect");
    }
    if (!this._closing) {
      this._emitLocal("reconnect_attempt");
      this._scheduleReconnect();
    }
  };

  Sio4Lite.prototype._scheduleReconnect = function () {
    var self = this;
    if (this._reconnectTimer) return;
    var delay = Math.min(this._reconnectDelay, this._reconnectDelayMax);
    this._reconnectDelay = Math.min(this._reconnectDelay * 1.6, this._reconnectDelayMax);
    this._reconnectTimer = setTimeout(function () {
      self._reconnectTimer = null;
      self._connectOnce();
    }, delay);
  };

  /* ── Send event to server ──────────────────────────────── */

  Sio4Lite.prototype.emit = function (event, data) {
    if (!this.ws || !this.connected) return;
    // Correct packet format:
    //   Engine.IO message prefix: "4"
    //   Socket.IO EVENT type:     "2"
    //   JSON payload:             '["event", data]'
    // → Full frame: '42["event", data]'
    var frame = "42" + JSON.stringify([event, data]);
    this.ws.send(frame);
  };

  /* ── Graceful disconnect ───────────────────────────────── */

  Sio4Lite.prototype.disconnect = function () {
    this._closing = true;
    this._clearHeartbeat();
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (_) {}
    }
    this.connected = false;
  };

  global.Sio4Lite = Sio4Lite;
})(window);
