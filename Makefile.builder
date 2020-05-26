ifeq ($(PACKAGE_SET),vm)
    ifneq ($(DIST),centos7)
        RPM_SPEC_FILES = rpm_spec/qubes-split-browser.spec
    endif

    ifneq ($(DIST),jessie)
        DEBIAN_BUILD_DIRS = debian
    endif

    ARCH_BUILD_DIRS = archlinux
endif
