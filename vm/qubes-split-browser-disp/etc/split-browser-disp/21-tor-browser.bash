SB_FIREFOX_DIR=~/.tb/tor-browser/Browser
SB_FIREFOX=( ./start-tor-browser )

unset TOR_DEFAULT_HOMEPAGE
unset TOR_SOCKS_IPC_PATH
export TOR_SOCKS_HOST=10.152.152.10
export TOR_SKIP_LAUNCH=1
