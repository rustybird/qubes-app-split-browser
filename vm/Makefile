default:

extension-boilerplate:
	cd disp/usr/share/split-browser/firefox-extensions/split-browser-for-qubes@jetpack && \
	rm -f install.rdf bootstrap.js && \
	jpm xpi && \
	unzip -n -- *.xpi && \
	rm -- *.xpi

install-disp:
	mkdir -p $(DESTDIR)/
	cp -pR disp/*/ $(DESTDIR)/

install-persist:
	mkdir -p $(DESTDIR)/
	cp -pR persist/*/ $(DESTDIR)/
	/usr/lib/qubes/qubes-trigger-sync-appmenus.sh

install: install-disp install-persist
