(function () {
  "use strict";

  var socket = new Sio4Lite();

  var textInput = document.getElementById("textInput");
  var modeSelect = document.getElementById("modeSelect");
  var langSelect = document.getElementById("langSelect");
  var sendBtn = document.getElementById("sendBtn");
  var grabBtn = document.getElementById("grabBtn");
  var statusDot = document.getElementById("statusDot");
  var statusText = document.getElementById("statusText");
  var hostName = document.getElementById("hostName");
  var reconnectMsg = document.getElementById("reconnectMsg");

  // Phase 2 Elements
  var contextArea = document.getElementById("contextArea");
  var appName = document.getElementById("appName");
  var textBefore = document.getElementById("textBefore");
  var textAfter = document.getElementById("textAfter");
  var refreshContext = document.getElementById("refreshContext");

  var isComposing = false;

  /* ── i18n Logic ────────────────────────────────────────── */

  var translations = {
    en: {
      statusConnected: "Connected",
      statusDisconnected: "Disconnected",
      statusReconnecting: "Reconnecting...",
      statusReplaced: "Replaced by a new client",
      statusError: "Injection error",
      title: "GhostWriter",
      subtitle: "Type on phone, inject at your PC cursor instantly.",
      labelMode: "Mode",
      modeStream: "Real-time Stream",
      modeBatch: "Batch (Commit)",
      modeReplace: "Replace Selection",
      labelInput: "Input",
      btnSend: "Send to PC",
      btnReplace: "Replace Selection",
      btnGrab: "Grab Selection",
      reconnecting: "Reconnecting...",
      waitingConn: "Waiting for connection...",
      helpTitle: "How to use",
      help1: "Select <b>Stream</b> for instant typing (like a remote keyboard).",
      help2: "Select <b>Batch</b> to write a full sentence first, then send.",
      help3: "Select <b>Replace</b> to grab PC text, edit it, and send it back.",
      placeholder: "Type, write, or use voice input...",
      unsupported: "This app doesn't support text sync"
    },
    zh: {
      statusConnected: "已連線",
      statusDisconnected: "連線中斷",
      statusReconnecting: "重新連線中...",
      statusReplaced: "已被新用戶取代",
      statusError: "注入錯誤",
      title: "GhostWriter",
      subtitle: "手機輸入文字，即時在電腦游標處注入。",
      labelMode: "運作模式",
      modeStream: "即時序列 (打字機模式)",
      modeBatch: "整段發送 (批次模式)",
      modeReplace: "替換選取內容 (修改模式)",
      labelInput: "輸入區域",
      btnSend: "發送到電腦",
      btnReplace: "取代電腦選取文字",
      btnGrab: "抓取電腦選取文字",
      reconnecting: "正在重新連線...",
      waitingConn: "等待連線中...",
      helpTitle: "使用說明",
      help1: "選取 <b>即時序列</b>：手機打字會像虛擬鍵盤一樣同步到電腦。",
      help2: "選取 <b>整段發送</b>：先在手機寫完，按下「發送」後才會傳到電腦。",
      help3: "選取 <b>修改模式</b>：點擊「抓取」取得電腦選取的文字，在手機修改後點擊「取代」。",
      placeholder: "輸入文字、語音輸入，或是修改內容...",
      unsupported: "此程式暫不支援文字同步"
    }
  };

  function updateTranslation() {
    var lang = langSelect.value;
    var t = translations[lang];

    document.querySelectorAll("[data-t]").forEach(function (el) {
      var key = el.getAttribute("data-t");
      if (t[key]) {
        el.innerHTML = t[key];
      }
    });

    textInput.placeholder = t.placeholder;
    updateUiForMode();

    // Update active status text
    if (socket.connected) {
      statusText.textContent = t.statusConnected;
    } else {
      statusText.textContent = t.statusDisconnected;
    }
  }

  langSelect.addEventListener("change", updateTranslation);
  // Initial detection
  if (navigator.language && navigator.language.startsWith("zh")) {
    langSelect.value = "zh";
  }
  updateTranslation();

  /* ── Mode management ───────────────────────────────────── */

  function updateUiForMode() {
    var mode = modeSelect.value;
    var lang = langSelect.value;
    var t = translations[lang];

    if (mode === "stream") {
      sendBtn.classList.add("hidden");
      grabBtn.classList.add("hidden");
    } else if (mode === "batch") {
      sendBtn.classList.remove("hidden");
      grabBtn.classList.add("hidden");
      sendBtn.textContent = t.btnSend;
    } else if (mode === "replace") {
      sendBtn.classList.remove("hidden");
      grabBtn.classList.remove("hidden");
      sendBtn.textContent = t.btnReplace;
    }
  }

  modeSelect.addEventListener("change", updateUiForMode);

  /* ── Connection status helpers ─────────────────────────── */

  function setConnected(connected, messageKey) {
    var t = translations[langSelect.value];
    statusDot.classList.remove("connected", "disconnected");
    statusDot.classList.add(connected ? "connected" : "disconnected");
    statusText.textContent = t[messageKey] || messageKey;
    statusText.setAttribute("data-t", messageKey);
    sendBtn.disabled = !connected;
    grabBtn.disabled = !connected;
  }

  /* ── Socket event handlers ─────────────────────────────── */

  socket.on("connect", function () {
    setConnected(true, "statusConnected");
    reconnectMsg.classList.add("hidden");
    // Small delay to ensure the connection is stable before heavy COM requests
    setTimeout(function () {
      socket.emit("request_context");
    }, 500);
  });

  socket.on("disconnect", function () {
    setConnected(false, "statusDisconnected");
    reconnectMsg.classList.remove("hidden");
  });

  socket.on("reconnect_attempt", function () {
    setConnected(false, "statusReconnecting");
    reconnectMsg.classList.remove("hidden");
  });

  socket.on("connect_error", function (err) {
    setConnected(false, "statusDisconnected");
    var t = translations[langSelect.value];
    reconnectMsg.textContent = t.reconnecting + (err && err.message ? " (" + err.message + ")" : "");
    reconnectMsg.classList.remove("hidden");
  });

  socket.on("status_update", function (payload) {
    if (!payload || typeof payload !== "object") return;
    if (payload.status === "connected") {
      setConnected(true, "statusConnected");
    } else if (payload.status === "replaced") {
      setConnected(false, "statusReplaced");
    }
    hostName.textContent = payload.hostname || "-";
  });

  socket.on("context_update", function (payload) {
    var t = translations[langSelect.value];
    if (!payload || typeof payload !== "object") return;

    if (payload.supported) {
      contextArea.classList.remove("unsupported");
      appName.textContent = payload.app_name || "Unknown App";
      textBefore.textContent = payload.before || "";
      textAfter.textContent = payload.after || "";
    } else {
      contextArea.classList.add("unsupported");
      appName.textContent = payload.app_name || "Unsupported";
      textBefore.textContent = payload.reason || t.unsupported;
      textAfter.textContent = "";
    }

    if (modeSelect.value === "replace" && payload.selected) {
      textInput.value = payload.selected;
      textInput.focus();
    }
  });

  socket.on("error", function (payload) {
    setConnected(false, "statusError");
    setTimeout(function () {
      if (socket.connected) {
        setConnected(true, "statusConnected");
      }
    }, 2000);
  });

  /* ── Input handling ────────────────────────────────────── */

  function flushInput() {
    var text = textInput.value;
    if (!text || !socket.connected) return;

    socket.emit("text_input", {
      text: text,
      mode: modeSelect.value || "stream",
    });

    if (modeSelect.value === "stream") {
      textInput.value = "";
      // Auto-update context after typing in stream mode
      setTimeout(function () {
        socket.emit("request_context");
      }, 50);
    }
  }

  sendBtn.addEventListener("click", function () {
    flushInput();
    if (modeSelect.value !== "stream") {
      textInput.value = "";
    }
  });

  grabBtn.addEventListener("click", function () {
    socket.emit("request_context");
  });

  textInput.addEventListener("compositionstart", function () {
    isComposing = true;
  });

  textInput.addEventListener("compositionend", function () {
    isComposing = false;
    if (modeSelect.value === "stream") {
      flushInput();
    }
  });

  // Debounce helper
  var syncTimeout;

  textInput.addEventListener("keydown", function (e) {
    if (modeSelect.value !== "stream") return;

    if (e.key === "Backspace" || e.keyCode === 8) {
      if (textInput.value.length === 0) {
        e.preventDefault();
        socket.emit("key_command", { key: "backspace" });

        // Optimistic update: Remove last char from "Before" text locally
        var currentBefore = textBefore.textContent;
        if (currentBefore.length > 0) {
          textBefore.textContent = currentBefore.slice(0, -1);
        }

        // Schedule sync smoothly
        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(function () {
          socket.emit("request_context");
        }, 600);
      }
    }
  });

  textInput.addEventListener("input", function (e) {
    // During CJK composition, skip — wait for compositionend.
    if (isComposing) return;

    // For stream mode, flush immediately
    if (modeSelect.value === "stream") {
      var char = e.data; // Capture typed char if available

      // Special check for mobile delete without keydown
      if (e.inputType === "deleteContentBackward" && textInput.value.length === 0) {
        socket.emit("key_command", { key: "backspace" });
        // Optimistic delete
        var b = textBefore.textContent;
        if (b.length > 0) textBefore.textContent = b.slice(0, -1);

        clearTimeout(syncTimeout);
        syncTimeout = setTimeout(function () { socket.emit("request_context"); }, 600);
        return;
      }

      // Optimistic append: Add typed char to "Before" text locally
      // Note: flushing clears textInput, so we grab the char from event or value before flush
      var val = textInput.value;
      if (val) {
        textBefore.textContent += val;
      }

      flushInput();

      // Debounced sync: wait until user stops typing for 600ms
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(function () {
        socket.emit("request_context");
      }, 600);
    }
  });

  /* ── Refresh Button Logic ────────────────────────────── */

  var pressTimer;
  var isLongPress = false; // Flag to prevent click after long press

  // Standard click
  refreshContext.addEventListener("click", function (e) {
    if (!isLongPress) {
      // Normal refresh (gentle)
      socket.emit("request_context", { force: false });
    }
    isLongPress = false; // Reset
  });

  refreshContext.addEventListener("touchstart", startPress, { passive: true });
  refreshContext.addEventListener("mousedown", startPress);
  refreshContext.addEventListener("touchend", cancelPress);
  refreshContext.addEventListener("mouseup", cancelPress);
  refreshContext.addEventListener("mouseleave", cancelPress);

  function startPress(e) {
    isLongPress = false;
    pressTimer = setTimeout(function () {
      // Long press detected!
      isLongPress = true;
      if (navigator.vibrate) navigator.vibrate(50);

      // Force refresh (Brute Force)
      socket.emit("request_context", { force: true });

      // Visual feedback
      var originalText = refreshContext.innerHTML;
      refreshContext.textContent = "⚡";
      setTimeout(function () { refreshContext.innerHTML = originalText; }, 1000);

    }, 800); // 800ms threshold
  }

  function cancelPress(e) {
    clearTimeout(pressTimer);
  }

  /* ── Cursor navigation ────────────────────────────────── */

  function handlePreviewClick(e, isBefore) {
    var range;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(e.clientX, e.clientY);
    } else if (e.rangeParent) {
      // Firefox
      range = document.createRange();
      range.setStart(e.rangeParent, e.rangeOffset);
    }

    if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
      var offset = range.startOffset;
      var text = range.startContainer.textContent;

      if (isBefore) {
        // Clicked in "Before" text: move left
        // Distance = (total length of before) - (clicked position)
        var steps = text.length - offset;
        if (steps > 0) {
          socket.emit("move_cursor", { direction: "left", steps: steps });
        }
      } else {
        // Clicked in "After" text: move right
        // Distance = (clicked position)
        var steps = offset;
        if (steps >= 0) {
          socket.emit("move_cursor", { direction: "right", steps: steps });
        }
      }

      // Sync context immediately after moving
      setTimeout(function () {
        socket.emit("request_context");
      }, 150);
    }
  }

  textBefore.addEventListener("click", function (e) { handlePreviewClick(e, true); });
  textAfter.addEventListener("click", function (e) { handlePreviewClick(e, false); });

  /* ── Auto-sync timer ───────────────────────────────────── */

  setInterval(function () {
    if (socket.connected && modeSelect.value === "stream" && !isComposing && document.activeElement !== textInput) {
      // Only auto-sync if we are NOT typing to avoid jumping
      socket.emit("request_context");
    }
  }, 3000);

  /* ── Auto-focus & connect ──────────────────────────────── */

  textInput.focus();

  socket.connect();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (reg) {
        reg.unregister();
      });
    });
  }
})();
