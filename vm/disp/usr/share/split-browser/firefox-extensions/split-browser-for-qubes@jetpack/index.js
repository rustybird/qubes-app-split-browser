(function() {

  "use strict";

  const { Cc, Ci, Cu } = require("chrome");
  const { viewFor }    = require("sdk/view/core");
  const { Hotkey }     = require("sdk/hotkeys");
  const { env }        = require("sdk/system/environment");
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

  const CmdSocket = FileUtils.File(env.SB_CMD_SOCKET);
  const ReqSocket = FileUtils.File(env.SB_REQ_SOCKET);
  const FieldSep  = "\t";
  const RecordSep = "\n";
  const BadByte   = new RegExp([FieldSep, RecordSep, "\0"].join("|"), "g");


  function asyncListenForCmds() {
    const socket = Cc["@mozilla.org/network/server-socket;1"]
                   .createInstance(Ci.nsIServerSocket);

    socket.initWithFilename(CmdSocket, FileUtils.PERMS_FILE, -1);

    socket.asyncListen({
      onSocketAccepted: function(_socket, transport) {
        const inRaw = transport
                      .openInputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
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
        } catch (_e) {
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
                   .openOutputStream(Ci.nsITransport.OPEN_BLOCKING, 0, 0);
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
    } catch (_e) {
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
    const args = [env.QREXEC_REMOTE_DOMAIN];

    const dir = Cc["@mozilla.org/file/local;1"].createInstance(Ci.nsILocalFile);
    dir.initWithPath(prefs.get("browser.download.dir"));

    const entries = dir.directoryEntries;
    while (entries.hasMoreElements())
      args.push(entries.getNext().QueryInterface(Ci.nsIFile).path);

    if (args.length > 1)
      subprocess.call({ command: "qvm-move-to-vm", arguments: args });
  }

  function setHotkeys() {
    Hotkey({
      combo: "alt-b",  // Firefox: "Bookmarks" menu
      onPress: function() { sendReq("bookmark", "get"); }
    });

    Hotkey({
      combo: "control-d",  // Firefox: "Bookmark This Page"
      onPress: function() { sendReqWithPage("bookmark", "add"); }
    });

    Hotkey({
      combo: "control-shift-return",
      onPress: function() { sendReqWithPage("login", "get"); }
    });

    Hotkey({
      combo: "control-shift-s",
      onPress: moveDownloads
    });

    Hotkey({
      combo: "control-shift-u",  // Torbutton: "New Identity"
      onPress: restart
    });
  }


  asyncListenForCmds();
  setHotkeys();

})();
