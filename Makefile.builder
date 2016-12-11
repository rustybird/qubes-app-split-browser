ifeq ($(PACKAGE_SET),vm)
    RPM_SPEC_FILES    := fedora/qubes-split-browser.spec
    DEBIAN_BUILD_DIRS := debian
    ARCH_BUILD_DIRS   := arch
endif
