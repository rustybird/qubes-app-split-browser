SPLIT_BROWSER_CMD_DIR=/run/split-browser/cmd
SPLIT_BROWSER_DATA_DIR=${XDG_DATA_HOME:-~/.local/share}/split-browser
SPLIT_BROWSER_LOGIN_DIR=${SPLIT_BROWSER_LOGIN_DIR:-$SPLIT_BROWSER_DATA_DIR/logins}
SPLIT_BROWSER_BOOKMARK_FILE=${SPLIT_BROWSER_BOOKMARK_FILE:-$SPLIT_BROWSER_DATA_DIR/bookmarks.tsv}

SPLIT_BROWSER_BOOKMARK_PRETTY_DATE_LEN=19  # with time zone: 25
SPLIT_BROWSER_BOOKMARK_PRETTY_TITLE_LEN=70
SPLIT_BROWSER_STAR=*
SPLIT_BROWSER_ELLIPSIS=...

sb_dmenu() { x11-unoverride-redirect stdbuf -oL dmenu "$@"; }
sb_pwgen() { pwgen -s 64 "$@"; }
sb_terminal() { gnome-terminal -x "$@" || xterm -e "$@"; }
