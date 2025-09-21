VERSION=0.0.0
NAME:="unjarred"
MONOVA:=$(shell which monova dot 2> /dev/null)

version:
ifdef MONOVA
override VERSION="$(shell monova || echo "0.0.0")"
else
	$(info "Install monova (https://github.com/jsnjack/monova) to calculate version")
endif

render_manifest_chrome: version
	VERSION=${VERSION} envsubst < manifest.template.chrome > src/manifest.json

render_manifest_firefox: version
	VERSION=${VERSION} envsubst < manifest.template.firefox > src/manifest.json

build_firefox: render_manifest_firefox
	mkdir -p build
	rm -f build/${NAME}-$(VERSION)_firefox.zip
	cd src && zip -r ../build/${NAME}-$(VERSION)_firefox.zip *

build_chrome: render_manifest_chrome
	mkdir -p build
	rm -f build/${NAME}-$(VERSION)_chrome.zip
	cd src && zip -r ../build/${NAME}-$(VERSION)_chrome.zip *

build: build_firefox build_chrome

release: build
	grm release jsnjack/${NAME} -f ./build/${NAME}-$(VERSION)_chrome.zip -f ./build/${NAME}-$(VERSION)_firefox.zip -t "v`monova`"

run: render_manifest_firefox
	./node_modules/.bin/web-ext run -s src
