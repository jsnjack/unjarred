import psl from 'psl';

function getEffectiveDomain(domain) {
    // Remove leading dot if present
    if (domain.startsWith('.')) {
        domain = domain.slice(1);
    }
    return psl.get(domain);
}

function calculateApproxCookieSize(cookie) {
    const parts = [];
    if (cookie.name || cookie.value) {
        parts.push(`${cookie.name || ''}=${cookie.value || ''}`);
    }
    if (cookie.domain) {
        parts.push(`domain=${cookie.domain}`);
    }
    if (cookie.path) {
        parts.push(`path=${cookie.path}`);
    }
    if (cookie.expirationDate) {
        parts.push(`expires=${new Date(cookie.expirationDate * 1000).toUTCString()}`);
    }
    if (cookie.secure) {
        parts.push('Secure');
    }
    if (cookie.httpOnly) {
        parts.push('HttpOnly');
    }
    if (cookie.sameSite && cookie.sameSite !== 'no_restriction') {
        parts.push(`SameSite=${cookie.sameSite}`);
    }

    return parts.join('; ').length;
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
        const numberOfCookiesInJar = cookies.length;
        const sizeOfAllCookiesInJar = cookies.reduce((acc, cookie) => acc + calculateApproxCookieSize(cookie), 0);
        const cookieSize = calculateApproxCookieSize(details.cookie);

        const event = {
            ...details,
            effectiveDomain: effectiveDomain,
            cookiejarName: effectiveDomain + (details.cookie.partitionKey ? ` + ${details.cookie.partitionKey.topLevelSite}` : ''),
            cause_human: cause_human,
            timestamp: Date.now(),
            numberOfCookiesInJar: numberOfCookiesInJar,
            sizeOfAllCookiesInJar: sizeOfAllCookiesInJar,
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
