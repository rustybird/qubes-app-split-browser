ifeq ($(PACKAGE_SET),vm)
    RPM_SPEC_FILES = rpm_spec/qubes-split-browser.spec

    ifneq ($(DIST),jessie)
        DEBIAN_BUILD_DIRS = debian
    endif

    ARCH_BUILD_DIRS = archlinux
endif
