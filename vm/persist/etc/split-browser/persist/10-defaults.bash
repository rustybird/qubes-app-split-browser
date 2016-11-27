SPLIT_BROWSER_CMD_DIR=/run/split-browser/cmd
SPLIT_BROWSER_DATA_DIR=${XDG_DATA_HOME:-~/.local/share}/split-browser
SPLIT_BROWSER_LOGIN_DIR=${SPLIT_BROWSER_LOGIN_DIR:-$SPLIT_BROWSER_DATA_DIR/logins}
SPLIT_BROWSER_BOOKMARK_FILE=${SPLIT_BROWSER_BOOKMARK_FILE:-$SPLIT_BROWSER_DATA_DIR/bookmarks.tsv}

SPLIT_BROWSER_BOOKMARK_PRETTY_DATE_LEN=19  # with time zone: 25
SPLIT_BROWSER_BOOKMARK_PRETTY_TITLE_LEN=70
SPLIT_BROWSER_STAR=*
SPLIT_BROWSER_ELLIPSIS=...

split_browser_dmenu() { x11-unoverride-redirect stdbuf -o0 dmenu "$@"; }
split_browser_pwgen() { pwgen -s 64 "$@"; }
split_browser_terminal() { xterm "$@"; }
