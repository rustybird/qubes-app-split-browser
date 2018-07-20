SB_EXT_SOCKET=/run/split-browser/ext
SB_REQ_SOCKET=/run/split-browser/req
SB_TB_DIR=( ~/.tb/tor-browser /var/cache/tb-binary/.tb/tor-browser )

sb_cd_firefox_profile() {
    local r=1
    for d in "${SB_TB_DIR[@]}"; do
        if cd "$d"/Browser/TorBrowser/Data/Browser/profile.default
           r=$?; [[ $r == 0 ]]; then break; fi
    done
    return $r
}

sb_firefox() {
    local r=1
    for d in "${SB_TB_DIR[@]}"; do
        if "$d"/Browser/start-tor-browser --verbose --allow-remote "$@"
           r=$?; [[ $r != 127 ]]; then break; fi
    done
    return $r
}
