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
	umask 022
	mkdir -p -- '$(DESTDIR)$(PREFIX)/' '$(DESTDIR)$(etc)/'
	cp -R -- qubes-split-browser/usr/* '$(DESTDIR)$(PREFIX)/'
	cp -R -- qubes-split-browser/etc/* '$(DESTDIR)$(etc)/'
ifeq ($(DESTDIR),)
	systemd-tmpfiles --create split-browser.conf
	if type update-desktop-database >/dev/null; then update-desktop-database; fi
	/usr/lib/qubes/qubes-trigger-sync-appmenus.sh
endif

install-disp:
	umask 022
	mkdir -p -- '$(DESTDIR)$(PREFIX)/' '$(DESTDIR)$(etc)/'
	cp -R -- qubes-split-browser-disp/usr/* '$(DESTDIR)$(PREFIX)/'
	cp -R -- qubes-split-browser-disp/etc/* '$(DESTDIR)$(etc)/'
