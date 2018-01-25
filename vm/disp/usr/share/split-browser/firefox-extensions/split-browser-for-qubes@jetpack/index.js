(function() {

  "use strict";

  const { Cc, Ci, Cu } = require("chrome");
  const { viewFor }    = require("sdk/view/core");
  const { env }        = require("sdk/system/environment");
  const { observer }   = require("sdk/keyboard/observer");
  const keyboardUtils  = require("sdk/keyboard/utils");
  const prefs          = require("sdk/preferences/service");
  const subprocess     = require("sdk/system/child_process/subprocess");
  const tabs           = require("sdk/tabs");
  const tabUtils       = require("sdk/tabs/utils");

  Cu.import("resource://gre/modules/FileUtils.jsm");

  const StartupService   = Cc["@mozilla.org/toolkit/app-startup;1"]
                           .getService(Ci.nsIAppStartup);
  const ObserverService  = Cc["@mozilla.org/observer-service;1"]
                           .getService(Ci.nsIObserverService);
  const TransportService = Cc["@mozilla.org/network/socket-transport-service;1"]
                           .getService(Ci.nsISocketTransportService);

  const ExtSocket = FileUtils.File(env.SB_EXT_SOCKET);
  const ReqSocket = FileUtils.File(env.SB_REQ_SOCKET);
  const FieldSep  = "\t";
  const RecordSep = "\n";
  const BadByte   = new RegExp([FieldSep, RecordSep, "\0"].join("|"), "g");


  function asyncListenForCmds() {
    const socket = Cc["@mozilla.org/network/server-socket;1"]
                   .createInstance(Ci.nsIServerSocket);

    socket.initWithFilename(ExtSocket, FileUtils.PERMS_FILE, -1);

    socket.asyncListen({
      onSocketAccepted: function({}, transport) {
        const inRaw = transport
                      .openInputStream(Ci.nsITransport.OPEN_BLOCKING |
                                       Ci.nsITransport.OPEN_UNBUFFERED, 0, 0);
        const inUni = Cc["@mozilla.org/intl/converter-input-stream;1"]
                      .createInstance(Ci.nsIConverterInputStream);
        let   cmd   = "";

        try {
          inUni.init(inRaw, "UTF-8", 0,
                     Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);

          const buf = {};
          while (true) {
            inRaw.available();
            inUni.readString(-1, buf);
            cmd += buf.value;
          }
        } catch ({}) {
          inUni.close();
          inRaw.close();
        }

        if (cmd.slice(-1) === RecordSep)
          tabs.open(cmd.slice(0, -1));
      }
    });
  }

  function toUtf8(str) {
    return unescape(encodeURIComponent(str));
  }

  function sendReq(...fields) {
    const req    = toUtf8(fields.join(FieldSep) + RecordSep);
    const outRaw = TransportService.createUnixDomainTransport(ReqSocket)
                   .openOutputStream(Ci.nsITransport.OPEN_BLOCKING |
                                     Ci.nsITransport.OPEN_UNBUFFERED, 0, 0);
    const outBin = Cc["@mozilla.org/binaryoutputstream;1"]
                   .createInstance(Ci.nsIBinaryOutputStream);

    try {
      outBin.setOutputStream(outRaw);
      outBin.writeBytes(req, req.length);
    } finally {
      outBin.close();
      outRaw.close();
    }
  }

  function sendReqWithPage(...fields) {
    const lowLevelTab   = viewFor(tabs.activeTab);
    const browserFrame  = tabUtils.getBrowserForTab(lowLevelTab);
    const titleForUtf8  = (browserFrame.contentTitle || lowLevelTab.label || "")
                          .replace(BadByte, " ");
    const titleForAscii = titleForUtf8.normalize("NFKD");
    const uri           = browserFrame.currentURI;
    const uriForAscii   = uri.asciiSpec;
    let   uriForUtf8;

    if (uriForAscii === "about:blank" || uriForAscii === "about:newtab")
      return;

    try {
      uriForUtf8 = decodeURI(uri.spec);
      if (uriForUtf8.search(BadByte) != -1)
        throw URIError();
    } catch ({}) {
      uriForUtf8 = uri.spec;
    }

    sendReq(...fields, uriForAscii, titleForAscii, uriForUtf8, titleForUtf8);
  }

  function restart() {
    const cancel = Cc["@mozilla.org/supports-PRBool;1"]
                   .createInstance(Ci.nsISupportsPRBool);

    ObserverService.notifyObservers(cancel, "quit-application-requested", null);

    if (!cancel.data) {
      sendReq("restart");
      StartupService.quit(Ci.nsIAppStartup.eAttemptQuit);
    }
  }

  function moveDownloads() {
    const args = ["--without-progress", env.QREXEC_REMOTE_DOMAIN];

    const dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    dir.initWithPath(prefs.get("browser.download.dir"));

    const entries = dir.directoryEntries;
    while (entries.hasMoreElements())
      args.push(entries.getNext().QueryInterface(Ci.nsIFile).path);

    if (args.length > 2)
      subprocess.call({ command: "qvm-move-to-vm", arguments: args });
  }

  function setHotkeys(table) {
    for (const type of ["keydown", "keyup"]) {
      observer.on(type, function(event, {}) {
        const key       = keyboardUtils.getKeyForCode(event.keyCode);
        const modifiers = [];

        if (event.altKey)   modifiers.push("alt");
        if (event.ctrlKey)  modifiers.push("control");
        if (event.metaKey)  modifiers.push("meta");
        if (event.shiftKey) modifiers.push("shift");

        if (!key
            || key in keyboardUtils.MODIFIERS
            || (modifiers.length == 0 && !keyboardUtils.isFunctionKey(key)))
          return;

        const fun = table[keyboardUtils.normalize({ key, modifiers })];

        if (fun)
          try {
            if (event.type === "keydown")
              fun();
          } finally {
            event.preventDefault();
          }
      });
    }
  }


  asyncListenForCmds();

  setHotkeys({  // key combinations must be in keyboardUtils.normalize()d form
    "alt-b":                function() { sendReq("bookmark", "get"); },
    "control-d":            function() { sendReqWithPage("bookmark", "add"); },
    "control-shift-return": function() { sendReqWithPage("login", "get"); },
    "control-shift-s":      moveDownloads,
    "control-shift-u":      restart,
  });

})();
