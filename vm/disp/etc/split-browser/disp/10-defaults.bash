SB_CMD_SOCKET=/run/split-browser/cmd
SB_REQ_SOCKET=/run/split-browser/req
SB_TB_DIR=/var/cache/tb-binary/.tb/tor-browser

sb_cd_firefox_profile() { cd "$SB_TB_DIR"/Browser/TorBrowser/Data/Browser/profile.default; }
sb_firefox() { "$SB_TB_DIR"/Browser/start-tor-browser --verbose --allow-remote "$@"; }
