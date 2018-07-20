"use strict";

function startup() {
  const Cc = Components.classes;
  const Ci = Components.interfaces;
  const Cu = Components.utils;
  const CC = Components.Constructor;

  const { Subprocess }   = Cu.import("resource://gre/modules/Subprocess.jsm",
                                     {});

  const AppStartup       = Cc["@mozilla.org/toolkit/app-startup;1"]
                           .getService(Ci.nsIAppStartup);
  const Environment      = Cc["@mozilla.org/process/environment;1"]
                           .getService(Ci.nsIEnvironment);
  const PrefService      = Cc["@mozilla.org/preferences-service;1"]
                           .getService(Ci.nsIPrefService)
                           .QueryInterface(Ci.nsIPrefBranch);
  const ObserverService  = Cc["@mozilla.org/observer-service;1"]
                           .getService(Ci.nsIObserverService);
  const SocketService    = Cc["@mozilla.org/network/socket-transport-service;1"]
                           .getService(Ci.nsISocketTransportService);
  const WindowMediator   = Cc["@mozilla.org/appshell/window-mediator;1"]
                           .getService(Ci.nsIWindowMediator);
  const WindowWatcher    = Cc["@mozilla.org/embedcomp/window-watcher;1"]
                           .getService(Ci.nsIWindowWatcher);

  const Bool             = CC("@mozilla.org/supports-PRBool;1",
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
  const PersistentVm   = Environment.get("QREXEC_REMOTE_DOMAIN");


  function getMostRecentMainWindow() {
    return WindowMediator.getMostRecentWindow(MainWindowType);
  }

  function isMainWindow(win) {
    return win.document.documentElement.getAttribute("windowtype")
           === MainWindowType;
  }

  function listenForUrlsOnSocket() {
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

        if (line.slice(-1) === RecordSep) {
          const url = line.slice(0, -1);
          const browser = getMostRecentMainWindow().gBrowser;
          browser.selectedTab = browser.addTab(url);
        }
      }
    });
  }

  function sendReq(...fields) {
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

  function sendReqWithPageInfo(...fields) {
    const browser          = getMostRecentMainWindow().gBrowser;
    const titleForUtf8     = browser.contentTitle.replace(BadByte, " ");
    const titleForAscii    = titleForUtf8.normalize("NFKD");
    const uri              = browser.currentURI;
    const uriForAscii      = uri.asciiSpec;
    const uriForUtf8PctEnc = uri.displaySpec || uri.spec;
    let   uriForUtf8;

    if (uriForAscii === "about:blank" || uriForAscii === "about:newtab")
      return;

    try {
      uriForUtf8 = decodeURI(uriForUtf8PctEnc);
      if (uriForUtf8.indexOf("%") !== -1 || uriForUtf8.search(BadByte) !== -1)
        throw URIError();
    } catch ({}) {
      uriForUtf8 = uriForUtf8PctEnc;
    }

    sendReq(...fields, uriForAscii, titleForAscii, uriForUtf8, titleForUtf8);
  }

  function restart() {
    const cancel = new Bool();

    ObserverService.notifyObservers(cancel, "quit-application-requested", null);

    if (!cancel.data) {
      sendReq("restart");
      AppStartup.quit(Ci.nsIAppStartup.eAttemptQuit);
    }
  }

  function moveDownloads() {
    const args    = ["--without-progress", PersistentVm];
    const entries = new File(PrefService
                             .getComplexValue("browser.download.dir",
                                              Ci.nsIPrefLocalizedString)
                             .data).directoryEntries;

    while (entries.hasMoreElements())
      args.push(entries.getNext().QueryInterface(Ci.nsIFile).path);
    if (args.length > 2)
      Subprocess.call({ command: "/usr/bin/qvm-move-to-vm", arguments: args });
  }

  function onKey(e) {
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

  function perWindowHotkeys(win, mode) {
    const modify = win[mode];

    modify("keydown", onKey, true);
    modify("keyup",   onKey, true);
  }

  function windowReady(e) {
    this.removeEventListener(e.type, windowReady, true);
    if (isMainWindow(this))
      perWindowHotkeys(this, "addEventListener");
  }

  function listenForHotkeysOnNewWindows() {
    WindowWatcher.registerNotification({
      observe: (win, topic) => {
        if (topic === "domwindowopened") {
          win.addEventListener("DOMContentLoaded", windowReady, true);
          if (isMainWindow(win)) {
            win.removeEventListener("DOMContentLoaded", windowReady, true);
            perWindowHotkeys(win, "addEventListener");
          }
        }
        else if (topic === "domwindowclosed" && isMainWindow(win))
          perWindowHotkeys(win, "removeEventListener");
      }
    });
  }


  listenForHotkeysOnNewWindows();
  listenForUrlsOnSocket();
}

function  shutdown() {}
function   install() {}
function uninstall() {}
