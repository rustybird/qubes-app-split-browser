# Split Browser for Qubes

Everyone loves the [Whonix approach](https://www.whonix.org/wiki/Qubes) of running Tor Browser and the tor daemon in two separate [Qubes](https://www.qubes-os.org/) VMs, e.g. anon-whonix and sys-whonix.

Let's take it a step further and **run Tor Browser in a [DisposableVM](https://www.qubes-os.org/doc/dispvm/) connecting through the tor VM, while storing bookmarks and logins in a persistent VM** - with carefully restricted data flow.

In this setup, the DisposableVM's browser can send various requests to the persistent VM:

- Bookmark the current page
- Let the user choose a bookmark to load
- Let the user authorize logging into the current page

**But if the browser gets exploited, it won't be able to read all your bookmarks or login credentials and send them to the attacker.** And you can restart the browser DisposableVM frequently (which should take less than a minute) to "shake off" such an attack.


## Keyboard shortcuts

The bold ones override standard Tor Browser shortcuts:

Combination      | Function
-----------------|--------------------------------------------------------------
**Alt-b**        | Open bookmarks
**Ctrl-d**       | Bookmark current page
Ctrl-Shift-Enter | Log into current page
Ctrl-Shift-s     | Move downloads to a VM of your choice. _NOTE: Don't choose the persistent VM unless you have updated to qubes-core-dom0-linux >= 4.0.25, or the [DisposableVM will crash](https://github.com/QubesOS/qubes-issues/issues/3318)!_
**Ctrl-Shift-u** | `New Identity` on steroids: Quit and restart the browser in a new DisposableVM, with fresh Tor circuits.


## Implementation

~ 500 nonempty lines total, in a couple of Bash scripts, Awk, Python, and [JavaScript on the browser side](vm/qubes-split-browser-disp/usr/share/split-browser-disp/firefox/sb.js) (deployed as a [Mozilla AutoConfig](https://support.mozilla.org/en-US/kb/customizing-firefox-using-autoconfig) file). The bookmark and login managers use [dmenu](https://tools.suckless.org/dmenu/).


## Bookmarks

Bookmarks are stored in a text file, `~/.local/share/split-browser/bookmarks.tsv`. Each line consists of a timestamp, URL, and title, separated by tabs.

To reduce attack surface, only printable ASCII characters are allowed by default. This can be broadened to UTF-8 by symlinking `/etc/split-browser/20-utf-8.bash.EXAMPLE` without the `.EXAMPLE` suffix, either into the same directory (which will apply to _all_ persistent VMs based on the TemplateVM), or into `/usr/local/etc/split-browser/` on a _specific_ persistent VM.


## Logins

Login credentials are stored in an arbitrarily deep and freely organizable directory tree, `~/.local/share/split-browser/logins/`, where each directory contains a `urls.txt` file with patterns, one per line. A pattern's first letter decides how it is interpreted:

First letter | Type           | Scope
:-----------:|----------------|-------------------------------------------------
`=`          | Literal string | Must match whole URL.
`~`          | Regex          | Must match whole URL.
`^`          | Literal string | Must match beginning of URL. The rest of the URL is considered to match if it starts with (or if the pattern ends with) `/`, `?`, or `#`.

If any of the lines match and the user subsequently chooses this login option, the `login` executable in that directory is called - if missing, it defaults to `split-browser-login-fields` in `$PATH`:

`split-browser-login-fields` goes through each filename in the `fields/` child directory, in lexical order. If it ends in `.txt` and isn't executable, the file's _content_ is sent to the browser as fake key presses. If it doesn't end in `.txt` and is executable, its _output_ is sent instead. A Tab key press is sent to advance to the webpage's next input field and the next file in `fields/` is processed until all are done, at which point an Enter key press is sent.

**To get started, just try the login keyboard shortcut (Ctrl-Shift-Enter) on any login page.** This will create a skeleton directory for the page and pop up a terminal window there so you can have a look around, save your username, and possibly change the generated password or trim junk off the URL. Then ensure that the browser's focus is on the username field and press the keyboard shortcut again.

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

_TODO: set up an automounted encrypted filesystem?_

_TODO: build some sort of KeePassXC bridge?_


## Notes

- **Automatic extension updates are disabled [by default](vm/qubes-split-browser/etc/split-browser/prefs/11-no-updates.js#L2).** Merely opening the browser should cause as little outgoing traffic as possible.

- Multiple Split Browser instances (e.g. one with Tor Browser's Security Level set to Standard and another set to Safest) can be run in parallel, even from the same persistent VM. This won't corrupt the bookmark and login collections.

- If you're starting Split Browser through its application launcher shortcuts, any diagnostic messages go into the syslog of the persistent VM:

        journalctl -t qubes.StartApp+split-browser-dom0 \
                   -t qubes.StartApp+split-browser-safest-dom0


## Installation

1. Create a new persistent VM or take an existing one, and configure it to launch torified DisposableVMs and (optionally, for safety against user error) to have no network access itself:

        qvm-create --label=purple surfer
        qvm-prefs surfer default_dispvm whonix-ws-xx-dvm
        qvm-prefs surfer netvm ''

   The DisposableVMs will know which persistent VM launched them, so don't name it "rumplestiltskin" if an exploited browser mustn't find out.

2. Copy `vm/` into your persistent VM or its TemplateVM (e.g. fedora-xx) and run `sudo make install-persist`. Then install the `dmenu pwgen oathtool` packages in the TemplateVM.

3. Copy `vm/` into your persistent VM's "template for DisposableVMs" (e.g. whonix-ws-xx-dvm) or the latter's TemplateVM (e.g. whonix-ws-xx) and run `sudo make install-disp`. Then install the `xdotool` package in the TemplateVM, and ensure that an extracted Tor Browser is available in `~/.tb/tor-browser/` (e.g. by running the Tor Browser Downloader `update-torbrowser` in whonix-ws-xx).

4. You can enable the Split Browser application launcher shortcuts for your persistent VM as usual through the Applications tab in Qube Settings, or alternatively run `split-browser` in a terminal (with `-h` to see the help message).

_TODO: document qubes-builder packaging_

_TODO: consider recommending `systemctl disable onion-grater` in whonix-gw-xx, because Split Browser doesn't need to access the tor control port at all_
