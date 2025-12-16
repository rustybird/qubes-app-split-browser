SB_DATA_DIR=${SB_DATA_DIR:-${XDG_DATA_HOME:-~/.local/share}/split-browser}
SB_LOGIN_DIR=${SB_LOGIN_DIR:-$SB_DATA_DIR/logins}
SB_BOOKMARK_FILE=${SB_BOOKMARK_FILE:-$SB_DATA_DIR/bookmarks.tsv}
SB_DISP=${SB_DISP:-@dispvm}

SB_LOGIN_SECURITY_DELAY_SECONDS=1
SB_LOGIN_PASSGEN_LEN=20
SB_LOGIN_PASSGEN_ALPHABET='\041-\176'  # printable ASCII (no space), tr syntax
#SB_LOGIN_PASSGEN_ALPHABET='a-zA-Z0-9'
SB_BOOKMARK_PRETTY_DATE_LEN=19  # with time zone: 25
SB_BOOKMARK_PRETTY_TITLE_LEN=70
SB_ELLIPSIS=$'\u2026'

sb_dmenu() {
    rofi -dmenu \
         -normal-window \
         -window-title "Split Browser - $SB_SCREEN" \
         -theme-str 'window {width: 100%;}' \
         -theme solarized \
         "$@"
}
