;
(() => {
  "use strict";

  const CC = Components.Constructor;

  const { ReaderMode } = Cu.import("resource://gre/modules/ReaderMode.jsm", {});
  const { Subprocess } = Cu.import("resource://gre/modules/Subprocess.jsm", {});

  const AppStartup      = Cc["@mozilla.org/toolkit/app-startup;1"]
                          .getService(Ci.nsIAppStartup);
  const Environment     = Cc["@mozilla.org/process/environment;1"]
                          .getService(Ci.nsIEnvironment);
  const IoService       = Cc["@mozilla.org/network/io-service;1"]
                          .getService(Ci.nsIIOService);
  const ObserverService = Cc["@mozilla.org/observer-service;1"]
                          .getService(Ci.nsIObserverService);
  const PrefBranch      = Cc["@mozilla.org/preferences-service;1"]
                          .getService(Ci.nsIPrefBranch);
  const ScriptSecurity  = Cc["@mozilla.org/scriptsecuritymanager;1"]
                          .getService(Ci.nsIScriptSecurityManager);
  const SocketService   = Cc["@mozilla.org/network/socket-transport-service;1"]
                          .getService(Ci.nsISocketTransportService);
  const WindowMediator  = Cc["@mozilla.org/appshell/window-mediator;1"]
                          .getService(Ci.nsIWindowMediator);
  const WindowWatcher   = Cc["@mozilla.org/embedcomp/window-watcher;1"]
                          .getService(Ci.nsIWindowWatcher);

  const PrBool           = CC("@mozilla.org/supports-PRBool;1",
                              Ci.nsISupportsPRBool);
  const ConvInputStream  = CC("@mozilla.org/intl/converter-input-stream;1",
                              Ci.nsIConverterInputStream, "init");
  const ConvOutputStream = CC("@mozilla.org/intl/converter-output-stream;1",
                              Ci.nsIConverterOutputStream, "init");
  const File             = CC("@mozilla.org/file/local;1",
                              Ci.nsIFile, "initWithPath");
  const UnixServerSocket = CC("@mozilla.org/network/server-socket;1",
                              Ci.nsIServerSocket, "initWithFilename");

  const MainWindowType = "navigator:browser";
  const FieldSep       = "\t";
  const RecordSep      = "\n";
  const BadByte        = new RegExp([FieldSep, RecordSep, "\0"].join("|"), "g");
  const ExtSocket      = new File(Environment.get("SB_EXT_SOCKET"));
  const ReqSocket      = new File(Environment.get("SB_REQ_SOCKET"));


  const getMostRecentMainWindow = () =>
    WindowMediator.getMostRecentWindow(MainWindowType);

  const isMainWindow = win =>
    win.document.documentElement.getAttribute("windowtype") === MainWindowType;

  const sendReq = (...fields) => {
    const outRaw = SocketService
                   .createUnixDomainTransport(ReqSocket)
                   .openOutputStream(Ci.nsITransport.OPEN_BLOCKING |
                                     Ci.nsITransport.OPEN_UNBUFFERED, 0, 0);
    const outUni = new ConvOutputStream(outRaw, "UTF-8", 0, 0);

    try {
      outUni.writeString(fields.join(FieldSep) + RecordSep);
    } finally {
      outUni.close();
      outRaw.close();
    }
  }

  const newTab = url => {
    const browser = getMostRecentMainWindow().gBrowser;

    browser.selectedTab = browser.addTab(url, {
      triggeringPrincipal: ScriptSecurity.getSystemPrincipal(),
      fromExternal: true
    });
  }

  const sendReqWithPageInfo = (...fields) => {
    const browser       = getMostRecentMainWindow().gBrowser;
    const titleForUtf8  = browser.contentTitle.replace(BadByte, " ");
    const titleForAscii = titleForUtf8.normalize("NFKD");
    let   uri           = browser.currentURI;

    if (["about:blank", "about:newtab"].includes(uri.asciiSpec))
      return;

    const originalUrl = ReaderMode.getOriginalUrl(uri.asciiSpec);
    if (originalUrl)
      uri = IoService.newURI(originalUrl);

    let urlForUtf8;
    try {
      urlForUtf8 = decodeURI(uri.displaySpec);
      if (urlForUtf8.indexOf("%") !== -1 || urlForUtf8.search(BadByte) !== -1)
        throw URIError();
    } catch ({}) {
      urlForUtf8 = uri.displaySpec;
    }

    sendReq(...fields, uri.asciiSpec, titleForAscii, urlForUtf8, titleForUtf8);
  }

  const restart = () => {
    const cancel = new PrBool();

    ObserverService.notifyObservers(cancel, "quit-application-requested", null);

    if (!cancel.data) {
      sendReq("restart");
      AppStartup.quit(Ci.nsIAppStartup.eAttemptQuit);
    }
  }

  const moveDownloads = () =>
    Subprocess.call({
      command: "/bin/bash",
      arguments: ["-lc",
                  "exec /usr/lib/qubes/qvm-move-to-vm.kde * &>/dev/null"],
      environment: {},
      workdir: PrefBranch.getComplexValue("browser.download.dir",
                                          Ci.nsIPrefLocalizedString).data
    });

  const onKey = e => {
    const k = e.key.toLowerCase();
    let f;

    if (!e.altKey && e.shiftKey && e.ctrlKey && !e.metaKey && k === "enter")
      f = () => sendReqWithPageInfo("login", "get");
    else if (!e.altKey && !e.shiftKey && e.ctrlKey && !e.metaKey && k === "d")
      f = () => sendReqWithPageInfo("bookmark", "add");
    else if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey && k === "b")
      f = () => sendReq("bookmark", "get");
    else if (!e.altKey && e.shiftKey && e.ctrlKey && !e.metaKey && k === "s")
      f = moveDownloads;
    else if (!e.altKey && e.shiftKey && e.ctrlKey && !e.metaKey && k === "u")
      f = restart;
    else
      return;

    e.preventDefault();
    if (e.type === "keydown")
      f();
  }

  const perWindowHotkeys = modifyEventListener => {
    modifyEventListener("keydown", onKey, true);
    modifyEventListener("keyup",   onKey, true);
  }

  const windowReady = e => {
    const win = e.currentTarget;

    win.removeEventListener(e.type, windowReady, true);
    if (isMainWindow(win))
      perWindowHotkeys(win.addEventListener);
  }


  // attach hotkey listener to any new main window
  WindowWatcher.registerNotification({
    observe: (win, topic) => {
      if (topic === "domwindowopened") {
        /* In this block, the DOM in DOMContentLoaded is that of the
         * Firefox GUI, not of any website. Before the GUI has loaded,
         * isMainWindow() can return false negatives.
         */
        win.addEventListener("DOMContentLoaded", windowReady, true);
        if (isMainWindow(win)) {
          win.removeEventListener("DOMContentLoaded", windowReady, true);
          perWindowHotkeys(win.addEventListener);
        }
      } else if (topic === "domwindowclosed" && isMainWindow(win))
        perWindowHotkeys(win.removeEventListener);
    }
  });

  // listen for URL load commands from the persistent VM
  new UnixServerSocket(ExtSocket, 0o644, -1).asyncListen({
    onSocketAccepted: ({}, transport) => {
      const inRaw = transport
                    .openInputStream(Ci.nsITransport.OPEN_BLOCKING |
                                     Ci.nsITransport.OPEN_UNBUFFERED, 0, 0);
      const inUni = new ConvInputStream(inRaw, "UTF-8", 0, 0);
      const buf   = {};
      let   line  = "";

      try {
        while (inUni.readString(-1, buf) !== 0)
          line += buf.value;
      } finally {
        inUni.close();
        inRaw.close();
      }

      if (line.slice(-1) === RecordSep)
        newTab(line.slice(0, -1));
    }
  });
})();
