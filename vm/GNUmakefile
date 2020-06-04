ifeq ($(PREFIX),)
    ifeq ($(shell qubesdb-read /qubes-vm-persistence),full)
        PREFIX = /usr
    else
        PREFIX = /usr/local
    endif
else
    # strip a trailing slash, e.g. from tab completion
    override PREFIX := $(PREFIX:/=)
endif

ifeq ($(PREFIX),/usr)
    etc = /etc
else
ifeq ($(PREFIX),/usr/local)
    etc = $(PREFIX)/etc
else
    $(error PREFIX must be /usr or /usr/local)
endif
endif

.ONESHELL:
.SHELLFLAGS += -e -x
.SILENT:

default:

install-persist:
ifeq ($(DESTDIR),)
	if test -d '$(etc)/split-browser/persist/'; then \
	    mv     '$(etc)/split-browser/persist/'* \
	           '$(etc)/split-browser/'; \
	    rmdir  '$(etc)/split-browser/persist/'; \
	fi
	rm -f '$(PREFIX)/lib/tmpfiles.d/split-browser-persist.conf' \
	      '$(PREFIX)/share/applications/split-browser-high.desktop' \
	      '$(etc)/split-browser/prefs/20-whonix-gateway.js'
endif
	umask 022
	mkdir -p -- '$(DESTDIR)$(PREFIX)/' '$(DESTDIR)$(etc)/'
	cp -R -- qubes-split-browser/usr/* '$(DESTDIR)$(PREFIX)/'
	cp -R -- qubes-split-browser/etc/* '$(DESTDIR)$(etc)/'
ifeq ($(DESTDIR),)
	systemd-tmpfiles --create split-browser.conf
	/usr/lib/qubes/qubes-trigger-sync-appmenus.sh
endif

install-disp:
ifeq ($(DESTDIR),)
	if test -d '$(etc)/split-browser/disp/'; then \
	    mv -T  '$(etc)/split-browser/disp/' \
	           '$(etc)/split-browser-disp/'; \
	    rmdir --ignore-fail-on-non-empty '$(etc)/split-browser/'; \
	fi
	rm -rf '$(PREFIX)/share/split-browser/' \
	       '$(etc)/qubes-rpc/splitBrowser' \
	       '$(etc)/split-browser-disp/10-defaults.bash' \
	       '$(etc)/split-browser-disp/20-whonix-workstation.bash'
endif
	umask 022
	mkdir -p -- '$(DESTDIR)$(PREFIX)/' '$(DESTDIR)$(etc)/'
	cp -R -- qubes-split-browser-disp/usr/* '$(DESTDIR)$(PREFIX)/'
	cp -R -- qubes-split-browser-disp/etc/* '$(DESTDIR)$(etc)/'
