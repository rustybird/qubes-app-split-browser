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
	umask 022
	mkdir -p -- $(DESTDIR)$(PREFIX)/ $(DESTDIR)$(etc)/
	cp -R -- disp/usr/* $(DESTDIR)$(PREFIX)/
	cp -R -- disp/etc/* $(DESTDIR)$(etc)/

install-persist:
	rm -f -- $(DESTDIR)$(PREFIX)/share/applications/split-browser-high.desktop
	umask 022
	mkdir -p -- $(DESTDIR)$(PREFIX)/ $(DESTDIR)$(etc)/
	cp -R -- persist/usr/* $(DESTDIR)$(PREFIX)/
	cp -R -- persist/etc/* $(DESTDIR)$(etc)/
	systemd-tmpfiles --create split-browser-persist.conf
	/usr/lib/qubes/qubes-trigger-sync-appmenus.sh

install: install-disp install-persist
