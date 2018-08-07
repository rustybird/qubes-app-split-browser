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
	cp -pR disp/usr/* $(DESTDIR)$(PREFIX)/
	cp -pR disp/etc/* $(DESTDIR)$(etc)/

install-persist:
	mkdir -p $(DESTDIR)$(PREFIX)/ $(DESTDIR)$(etc)/
	cp -pR persist/usr/* $(DESTDIR)$(PREFIX)/
	cp -pR persist/etc/* $(DESTDIR)$(etc)/
	/usr/lib/qubes/qubes-trigger-sync-appmenus.sh
	systemd-tmpfiles --create split-browser-persist.conf

install: install-disp install-persist
