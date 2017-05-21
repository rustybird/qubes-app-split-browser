(function() {

  const { Cc, Ci, Cu } = require("chrome");
  const { viewFor }    = require("sdk/view/core");
  const { Hotkey }     = require("sdk/hotkeys");
  const { env }        = require("sdk/system/environment");
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

  const ReqSocket = FileUtils.File(env.SPLIT_BROWSER_REQ_SOCKET);
  const FieldSep  = "\t";
  const RecordSep = "\n";
  const BadByte   = new RegExp([FieldSep, RecordSep, "\0"].join("|"), "g");


  function toUtf8(str) {
    return unescape(encodeURIComponent(str));
  }

  function sendReq(req) {
    var str = toUtf8(req.join(FieldSep) + RecordSep);
    var out = TransportService.createUnixDomainTransport(ReqSocket)
              .openOutputStream(Ci.nsITransport.OPEN_BLOCKING |
                                Ci.nsITransport.OPEN_UNBUFFERED, 0, 0);
    try {
      out.write(str, str.length);
    } finally {
      out.close();
    }
  }

  function sendReqWithPage(req) {
    var lowLevelTab = viewFor(tabs.activeTab);
    var browserFrame = tabUtils.getBrowserForTab(lowLevelTab);
    var uri = browserFrame.currentURI;
    if (uri.spec === "about:blank" || uri.spec === "about:newtab")
      return;

    var uriForAscii = uri.asciiSpec;
    var uriForUtf8;
    try {
      uriForUtf8 = decodeURI(uri.spec);
      if (uriForUtf8.search(BadByte) != -1)
        throw URIError();
    } catch (e) {
      uriForUtf8 = uri.spec;
    }
    var titleForUtf8 = (browserFrame.contentTitle || lowLevelTab.label || "")
                       .replace(BadByte, " ");
    var titleForAscii = titleForUtf8.normalize("NFKD");

    sendReq(req.concat([uriForAscii, titleForAscii, uriForUtf8, titleForUtf8]));
  }

  function restart() {
    var cancel = Cc["@mozilla.org/supports-PRBool;1"]
                 .createInstance(Ci.nsISupportsPRBool);
    ObserverService.notifyObservers(cancel, "quit-application-requested", null);

    if (!cancel.data) {
      sendReq(["restart"]);
      StartupService.quit(Ci.nsIAppStartup.eAttemptQuit);
    }
  }

  function moveDownloads() {
    subprocess.call({
      environment: ["QREXEC_REMOTE_DOMAIN=" + env.QREXEC_REMOTE_DOMAIN],
      command: "/bin/sh",
      arguments: [
        "-c",
        'qvm-move-to-vm "$QREXEC_REMOTE_DOMAIN" ~user/Downloads/*'
      ]
    });
  }

  function setHotkeys() {
    Hotkey({
      combo: "alt-b",  // Firefox: "Bookmarks" menu
      onPress: function() { sendReq(["bookmark", "get"]); }
    });

    Hotkey({
      combo: "control-d",  // Firefox: "Bookmark This Page"
      onPress: function() { sendReqWithPage(["bookmark", "add"]); }
    });

    Hotkey({
      combo: "control-shift-return",
      onPress: function() { sendReqWithPage(["login", "get"]); }
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


  setHotkeys();

})();
