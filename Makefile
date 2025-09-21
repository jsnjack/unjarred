VERSION=0.0.0
NAME:="unjarred"
MONOVA:=$(shell which monova dot 2> /dev/null)

version:
ifdef MONOVA
override VERSION="$(shell monova || echo "0.0.0")"
else
	$(info "Install monova (https://github.com/jsnjack/monova) to calculate version")
endif

build_firefox: version
	mkdir -p build
	rm -f build/${NAME}-$(VERSION)_firefox.zip
	BROWSER=firefox npm run build
	cd dist && zip -r ../build/${NAME}-$(VERSION)_firefox.zip *

build_chrome: version
	mkdir -p build
	rm -f build/${NAME}-$(VERSION)_chrome.zip
	BROWSER=chrome npm run build
	cd dist && zip -r ../build/${NAME}-$(VERSION)_chrome.zip *

build: build_firefox build_chrome

release: build
	grm release jsnjack/${NAME} -f ./build/${NAME}-$(VERSION)_chrome.zip -f ./build/${NAME}-$(VERSION)_firefox.zip -t "v`monova`"

run:
	BROWSER=firefox npm run build
	./node_modules/.bin/web-ext run -s dist
