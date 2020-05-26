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

install-disp:
ifeq ($(DESTDIR),)
	if test -d '$(etc)/split-browser/disp/'; then
	    mv -T '$(etc)/split-browser/disp/' '$(etc)/split-browser-disp/'
	    rmdir --ignore-fail-on-non-empty '$(etc)/split-browser/'
	fi
	rm -rf '$(PREFIX)/share/split-browser/' '$(etc)/qubes-rpc/splitBrowser'
endif
	umask 022
	mkdir -p -- '$(DESTDIR)$(PREFIX)/' '$(DESTDIR)$(etc)/'
	cp -R -- disp/usr/* '$(DESTDIR)$(PREFIX)/'
	cp -R -- disp/etc/* '$(DESTDIR)$(etc)/'

install-persist:
ifeq ($(DESTDIR),)
	if test -d '$(etc)/split-browser/persist/'; then
	    mv '$(etc)/split-browser/persist/'* '$(etc)/split-browser/'
	    rmdir '$(etc)/split-browser/persist/'
	fi
	rm -f '$(PREFIX)/lib/tmpfiles.d/split-browser-persist.conf' \
	      '$(PREFIX)/share/applications/split-browser-high.desktop'
endif
	umask 022
	mkdir -p -- '$(DESTDIR)$(PREFIX)/' '$(DESTDIR)$(etc)/'
	cp -R -- persist/usr/* '$(DESTDIR)$(PREFIX)/'
	cp -R -- persist/etc/* '$(DESTDIR)$(etc)/'
ifeq ($(DESTDIR),)
	systemd-tmpfiles --create split-browser.conf
	/usr/lib/qubes/qubes-trigger-sync-appmenus.sh
endif

install: install-disp install-persist
