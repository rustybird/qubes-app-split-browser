default:

install-disp:
	mkdir -p $(DESTDIR)/
	cp -pR disp/*/ $(DESTDIR)/

install-persist:
	mkdir -p $(DESTDIR)/
	cp -pR persist/*/ $(DESTDIR)/
	/usr/lib/qubes/qubes-trigger-sync-appmenus.sh

install: install-disp install-persist
