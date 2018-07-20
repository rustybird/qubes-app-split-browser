# Split Browser for Qubes

Everyone loves the [Whonix approach](https://www.whonix.org/wiki/Qubes) of running Tor Browser and the tor daemon in two separate [Qubes](https://www.qubes-os.org/) VMs, e.g. anon-whonix and sys-whonix.

Let's take it a step further and **run Tor Browser (or some other Firefox versions) in a [DisposableVM](https://www.qubes-os.org/doc/dispvm/) connecting through the tor VM (or through any other network-providing VM), while storing bookmarks and logins in a persistent VM** - with carefully restricted data flow.

In this setup, the DisposableVM's browser can send various requests to the persistent VM:

- Bookmark the current page
- Let the user choose a bookmark to load
- Let the user authorize logging into the current page

**But if the browser gets exploited, it won't be able to read all your bookmarks or login credentials and send them to the attacker.** And you can restart the browser DisposableVM frequently (which should take less than a minute) to "shake off" such an attack.


## Keyboard shortcuts

The bold ones override standard Firefox/Torbutton shortcuts:

Combination      | Function
-----------------|--------------------------------------------------------------
**Alt-b**        | Open bookmarks
**Ctrl-d**       | Bookmark current page
Ctrl-Shift-Enter | Log into current page
Ctrl-Shift-s     | Move downloads to a VM of your choice (on Qubes R3.2: to the persistent VM)
**Ctrl-Shift-u** | `New Identity` on steroids: Quit and restart in a new DisposableVM, which will get a different local IP address and thereby fresh Tor circuits. (Keep an eye on the list of running VMs to ensure that the old DisposableVM is really gone...)


## Implementation

~ 500 nonempty lines total, in a couple of Bash scripts, [JavaScript for the Firefox extension](vm/disp/usr/share/split-browser/firefox-extensions/split-browser-for-qubes@jetpack/index.js), Awk, and Python. The bookmark and login managers use [dmenu](https://tools.suckless.org/dmenu/).


## Bookmarks

Bookmarks are stored in a text file, `~/.local/share/split-browser/bookmarks.tsv`. Each line consists of a timestamp, URL, and title, separated by tabs.

Only printable ASCII characters are allowed by default. This can be broadened to UTF-8 by symlinking `/etc/split-browser/persist/20-utf-8.bash.EXAMPLE` without the `.EXAMPLE` suffix, either into the same directory (which will apply to _all_ persistent VMs based on the template), or into `/usr/local/etc/split-browser/persist/` on a _specific_ persistent VM.


## Logins

(TODO: build some sort of KeePassX bridge?)

Login credentials are stored in an arbitrarily deep directory tree, `~/.local/share/split-browser/logins/` (TODO: set up an automounted encrypted filesystem?), where each directory has a `urls.txt` file containing patterns, one per line. A pattern's first letter decides how it is interpreted:

First letter | Type           | Scope
:-----------:|----------------|-------------------------------------------------
`=`          | Literal string | Must match whole URL.
`~`          | Regex          | Must match whole URL.
`^`          | Literal string | Must match beginning of URL. The rest of the URL is considered to match if it starts with (or if the pattern ends with) `/`, `?`, or `#`.

If any of the lines match and the user subsequently chooses this login option, the `login` executable in that directory (or if missing, `split-browser-login-fields` in `$PATH`) is called:

`split-browser-login-fields` goes through each filename in the `fields/` child directory, in lexical order. If it ends in `.txt`, the file's *content* is sent to the browser as fake key presses. If it is executable, its *output* is sent instead. (It is an error for a file in `fields/` to fall into both or none of the two categories.) Split Browser advances to the webpage's next input field by sending a Tab key press and continues with the next file in `fields/` until all are done, at which point it sends an Enter key press.

**To get started, just try the login keyboard shortcut (Ctrl-Shift-Enter) on any login page.** This will create a skeleton directory and pop up a terminal window there so you can have a look around, save your username, and change the generated password if necessary. Then ensure that the browser's focus is on the username field and press the keyboard shortcut again.

Here's an example of how a login directory structure could be organized:

    ~/.local/share/split-browser/logins/
        rusty/
            github/
                factor1/
                    urls.txt: ^https://github.com/login
                    fields/01-user.txt: rustybird
                    fields/02-pass.txt: correct horse battery staple
                factor2/
                    urls.txt: =https://github.com/sessions/two-factor
                    fields/01-totp: #!/bin/sh
                                    oathtool --totp --base32 foobarba7qux
            ...


## Tor Browser updates

[By default](vm/disp/etc/split-browser/disp/10-defaults.bash#L3), the directory `/var/cache/tb-binary/.tb/tor-browser/` (containing `Browser/` and `start-tor-browser.desktop`) is where Split Browser expects to find an extracted Tor Browser. Whonix Workstation's `update-torbrowser` command will save it there when called in a TemplateVM.

**Automatic updates and update notifications are disabled** for Firefox and its extensions. Merely opening the browser should not cause any outgoing connections (though other things in the DisposableVM might, such as time synchronization). It is assumed that you are watching [The Tor Blog](https://blog.torproject.org/), [tor-announce](https://lists.torproject.org/cgi-bin/mailman/listinfo/tor-announce), or even [RecommendedTBBVersions](https://www.torproject.org/projects/torbrowser/RecommendedTBBVersions).


## Notes

- Multiple Split Browser instances (e.g. one with the Security Slider set to Standard and another set to Safest) can be run in parallel from the same persistent VM, this won't corrupt the bookmark and login collections. But you're going to have a hard time distinguishing the browser windows. It's safer to run parallel instances from _different_ persistent VMs so you can get different window border colors.

- Keep in mind that DisposableVMs know the name of the VM which spawned them. That's a potential privacy and GUI spoofing issue.

- Split Browser also works with non Tor Browser versions (< 57) of Firefox, if they allow unsigned extensions (Firefox ESR, Developer Edition, or unbranded): Enable [20-other-firefox.bash](vm/disp/etc/split-browser/disp/20-other-firefox.bash.EXAMPLE) and disable [20-whonix-gateway.js](vm/persist/etc/split-browser/persist/prefs.js.d/20-whonix-gateway.js).

- The debug log can be read using `sudo journalctl SYSLOG_IDENTIFIER=split-browser` in both the persistent VM and the DisposableVM.


## Installation

TODO: document included `fedora/`, `debian/`, and `arch/` packaging

1. Create a persistent VM, and configure it to have no network access itself, but to launch torified DisposableVMs:

        qvm-create --template fedora-28-clone-1 --label purple browser-1
        
        # on Qubes R4.0:
        qvm-prefs --set browser-1 netvm ''
        qvm-prefs --set browser-1 default_dispvm whonix-ws-dvm
        
        # on Qubes R3.2:
        qvm-prefs --set browser-1 netvm none
        qvm-prefs --set browser-1 dispvm_netvm sys-whonix

2. Copy `vm/` into the TemplateVM of your persistent VM. Run `sudo make install-persist` there and also install the `socat oathtool pwgen dmenu` packages, then shut down the TemplateVM.

3. Copy `vm/` into the TemplateVM of your "template for DisposableVMs". It is assumed to be [whonix-ws](https://www.whonix.org/wiki/Qubes/Disposable_VM) - fingerprinting may be a concern with other (especially non-Debian-based) distributions. Run `sudo make install-disp` there and also install the `socat xdotool` packages, then shut down the TemplateVM.

4. You can enable the Split Browser application launcher shortcuts for `browser-1` as usual through the Applications tab in VM Settings, or alternatively run `split-browser -h` in a terminal to see the help message.

TODO: document `systemctl disable control-port-filter-python` for whonix-gw, Split Browser doesn't need to access the tor control port at all
