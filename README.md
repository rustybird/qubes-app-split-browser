# Split Browser for Qubes OS

Everyone loves the [Whonix approach](https://www.whonix.org/wiki/Qubes) of running Tor Browser and the tor daemon in two separate [Qubes OS](https://www.qubes-os.org/) qubes, e.g. anon-whonix and sys-whonix.

Let's take it a step further and **run Tor Browser (or Firefox) in a [disposable](https://www.qubes-os.org/doc/how-to-use-disposables/) connecting through the tor qube (or another network-providing qube), while storing bookmarks and logins in a persistent qube** - with carefully restricted data flow.

In this setup, the disposable's browser can send various requests to the persistent qube:

- Bookmark the current page
- Let the user choose a bookmark to load
- Let the user authorize logging into the current page

**But if the browser gets exploited, it won't be able to read all your bookmarks or login credentials and send them to the attacker.** And you can restart the disposable frequently (which should only take a few seconds) to "shake off" such an attack.


## Keyboard shortcuts

The bold ones override standard browser shortcuts:

Combination      | Function
-----------------|--------------------------------------------------------------
**Alt-b**        | Open bookmarks
**Ctrl-d**       | Bookmark current page
Ctrl-Shift-Enter | Log into current page
Ctrl-Shift-s     | Move downloads to a qube of your choice
**Ctrl-Shift-u** | `New Identity` on steroids: Quit and restart the browser in a new disposable, with fresh Tor circuits.


## Implementation

~ 600 nonempty lines total, in a couple of Bash scripts, Awk, Python, and [JavaScript on the browser side](vm/qubes-split-browser-disp/usr/share/split-browser-disp/firefox/sb.js) (deployed as a [Mozilla AutoConfig](https://support.mozilla.org/en-US/kb/customizing-firefox-using-autoconfig) file). The bookmark and login managers use [dmenu](https://tools.suckless.org/dmenu/).


## Bookmarks

Bookmarks are stored in a text file, `~/.local/share/split-browser/bookmarks.tsv`. Each line consists of a timestamp, URL, and title, separated by tabs.

The bookmark manager can instantly search through tens of thousands of bookmarks.

To reduce attack surface, only printable ASCII characters are allowed by default. This can be broadened to UTF-8: Symlink `[/usr/local]/etc/split-browser/20-utf-8.bash.EXAMPLE` without the `.EXAMPLE` suffix.


## Logins

Login credentials are stored in a freely organizable, arbitrarily nested directory tree `~/.local/share/split-browser/logins/`, where each database entry (e.g. `rusty/github/factor1/`) is a directory containing a `urls.txt` file with patterns, one per line. A pattern's first letter decides how it is interpreted:

First letter | Type           | Scope
:-----------:|----------------|-------------------------------------------------
`=`          | Literal string | Must match whole URL.
`~`          | Regex          | Must match whole URL.
`^`          | Literal string | Must match beginning of URL. The rest of the URL is considered to match if it starts with (or if the pattern ends with) `/`, `?`, or `#`.

If any of the lines match and the user subsequently chooses this database entry, the `login` executable in the directory is called - if missing, it defaults to `split-browser-login-fields` in `$PATH`:

`split-browser-login-fields` goes through each filename in the `fields/` child directory, in lexical order. If it ends in `.txt` (and isn't executable), the file's _content_ is collected. If it is executable (and doesn't end in `.txt`), its _output_ is collected instead. All these collected fields are finally "auto-typed" into the browser using fake key presses, with Tab between fields and Enter after the last.

**To get started, just try the login keyboard shortcut (Ctrl-Shift-Enter) on any login page.** This will prompt you to create a skeleton directory that will become the database entry for the page, and pop up a terminal window there so you can have a look around, save your username, and possibly change the generated password or trim junk off the URL. Then ensure that the browser's focus is on the username field and press the keyboard shortcut again.

Here's an example of how a login directory structure could be organized:

    ~/.local/share/split-browser/logins/
        rusty/
            github/
                factor1/
                    urls.txt: ^https://github.com/login
                    fields/
                        01-user.txt: rustybird
                        02-pass.txt: correct horse battery staple
                factor2/
                    urls.txt: =https://github.com/sessions/two-factor/app
                    fields/
                        01-totp: #!/bin/sh
                                 oathtool --totp --base32 foobarba7qux
            ...

_TODO: set up an automounted encrypted filesystem?_

_TODO: build some sort of KeePassXC bridge?_


## Notes

- Multiple Split Browser instances (e.g. one with Tor Browser's Security Level set to Standard and another set to Safest) can run in parallel, even from the same persistent qube. This won't corrupt the bookmark and login collections.

- If you're starting Split Browser through its application launcher shortcuts, any diagnostic messages go into the syslog of the persistent qube:

        journalctl -t qubes.StartApp+split-browser-dom0 \
                   -t qubes.StartApp+split-browser-safest-dom0

- Non-"Tor Browser" versions of Firefox should also work: Symlink `[/usr/local]/etc/split-browser-disp/22-firefox.bash.EXAMPLE` (or copy it, if you need to adjust the Firefox location) without the `.EXAMPLE` suffix.


## Installation

1. Create a new persistent qube or take an existing one, and configure it to launch the right disposables and (optionally, for safety against user error) to have no network access itself:

        qvm-create --label=purple surfer
        qvm-prefs surfer default_dispvm whonix-ws-XX-dvm
        qvm-prefs surfer netvm ''

   The disposables will know which persistent qube launched them, so don't name it "rumplestiltskin" if an exploited browser mustn't find out.

2. Install the `qubes-split-browser` package from [qubes-repo-contrib](https://www.qubes-os.org/doc/installing-contributed-packages/) in your persistent qube's TemplateVM (e.g. fedora-XX).

   _Or install manually:_ Copy `vm/` into your persistent qube or its TemplateVM (e.g. fedora-XX) and run `sudo make install-persist`; then install the `dmenu oathtool` packages in the TemplateVM.

3. Install the `qubes-split-browser-disp` package from qubes-repo-contrib in your persistent qube's default disposable template's TemplateVM (e.g. whonix-ws-XX).

   _Or install manually:_ Copy `vm/` into your persistent qube's default disposable template (e.g. whonix-ws-XX-dvm) or the latter's TemplateVM (e.g. whonix-ws-XX) and run `sudo make install-disp`; then install the `xdotool` package in the TemplateVM.

   Either way, also ensure that an extracted Tor Browser will be available in `~/.tb/tor-browser/` (e.g. by running the Tor Browser Downloader `update-torbrowser` in whonix-ws-XX).

4. You can enable the Split Browser application launcher shortcuts for your persistent qube as usual through the Applications tab in Qube Settings, or alternatively run `split-browser` in a terminal (with `-h` to see the help message).

_TODO: consider recommending `systemctl disable onion-grater` in whonix-gw-XX, because Split Browser doesn't need to access the tor control port at all_
