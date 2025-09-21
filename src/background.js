import psl from 'psl';

function getEffectiveDomain(domain) {
    return psl.get(domain);
}

function calculateCookieSize(cookie) {
    return (cookie.name || '').length + (cookie.value || '').length;
}


function cookieChangedHandler(details) {
    console.debug("[background.js] Cookie changed:", details);

    let cause_human = details.cause;
    if (details.cause === 'explicit') {
        cause_human = details.removed ? 'removed' : 'new';
    } else if (details.cause === 'overwrite' && details.removed) {
        cause_human = 'removed';
    }

    const effectiveDomain = getEffectiveDomain(details.cookie.domain);
    const query = { domain: effectiveDomain };

    if (details.cookie.partitionKey) {
        query.partitionKey = details.cookie.partitionKey;
    }

    chrome.cookies.getAll(query, (cookies) => {
        const domainCookieCount = cookies.length;
        const cookieSize = calculateCookieSize(details.cookie);

        const event = {
            ...details,
            cause_human: cause_human,
            timestamp: Date.now(),
            domainCookieCount: domainCookieCount,
            cookieSize: cookieSize
        };
        console.debug("[background.js] Sending cookie event:", event);
        browser.runtime.sendMessage({ command: 'cookie-event', data: event });
    });
}

chrome.cookies.onChanged.addListener(cookieChangedHandler);

chrome.action.onClicked.addListener(() => {
    chrome.sidebarAction.open();
});
