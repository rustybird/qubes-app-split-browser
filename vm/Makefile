PREFIX = /usr

ifeq ($(PREFIX:/=),/usr)
    etc = /etc
else
ifeq ($(PREFIX:/=),/usr/local)
    etc = $(PREFIX)/etc
else
    $(error PREFIX must be /usr or /usr/local)
endif
endif


default:

install-disp:
	mkdir -p $(DESTDIR)$(PREFIX)/ $(DESTDIR)$(etc)/
	rm -rf $(DESTDIR)$(PREFIX)/share/split-browser/firefox-extensions/split-browser-for-qubes@jetpack
	cp -pR disp/usr/* $(DESTDIR)$(PREFIX)/
	cp -pR disp/etc/* $(DESTDIR)$(etc)/

install-persist:
	mkdir -p $(DESTDIR)$(PREFIX)/ $(DESTDIR)$(etc)/
	cp -pR persist/usr/* $(DESTDIR)$(PREFIX)/
	cp -pR persist/etc/* $(DESTDIR)$(etc)/
	systemd-tmpfiles --create split-browser-persist.conf
	/usr/lib/qubes/qubes-trigger-sync-appmenus.sh

install: install-disp install-persist
