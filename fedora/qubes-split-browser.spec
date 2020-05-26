%{!?version: %define version %(cat version)}

Name:           qubes-split-browser
Version:        %{version}
Release:        1%{?dist}
Summary:        Split Browser for Qubes

License:        ISC
URL:            https://github.com/rustybird/qubes-split-browser

Requires:       python3 python3-xcffib dmenu xdotool pwgen oathtool socat systemd

%description
Run Tor Browser in a Qubes DisposableVM connecting through the tor VM,
while storing bookmarks and logins in a persistent VM.

%define _builddir %(pwd)

%install
cp -pR vm/*/*/ %{buildroot}

%files
%doc README.md
/etc/qubes-rpc/*
/etc/split-browser/
/usr/bin/*
/usr/lib/tmpfiles.d/*
/usr/share/applications/*
/usr/share/split-browser/
