ifeq ($(PACKAGE_SET),vm)
    RPM_SPEC_FILES    = rpm_spec/qubes-split-browser.spec
    DEBIAN_BUILD_DIRS = debian
    ARCH_BUILD_DIRS   = archlinux
endif
