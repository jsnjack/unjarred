import psl from 'psl';

const overwriteCache = new Map();
const OVERWRITE_CACHE_TTL = 10; // milliseconds

function getEffectiveDomain(domain) {
    // Remove leading dot if present
    if (domain.startsWith('.')) {
        domain = domain.slice(1);
    }
    return psl.get(domain);
}

function calculateApproxCookieSize(cookie) {
    return `${cookie.name || ''}${cookie.value || ''}`.length;
}

function cookieToString(cookie) {
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
    return parts.join('; ');
}


function cookieChangedHandler(details) {
    console.debug("[background.js] Cookie changed:", details);

    let cause_human = details.cause;
    if (details.cause === 'explicit' && details.removed) {
        cause_human = 'removed';
    }

    // We need to differentiate between new and modified. The 'explicit' cause
    // with removed=false is used for both new and modified cookies. To distinguish
    // between them, we can cache overwrite events with removed=true for a short
    // time and check if a new explicit event arrives shortly after.
    if (details.cause === 'overwrite' && details.removed) {
        // Cache the overwrite event
        const cacheKey = cookieToString(details.cookie);
        overwriteCache.set(cacheKey, Date.now());
        // Schedule cache cleanup
        setTimeout(() => {
            overwriteCache.delete(cacheKey);
        }, OVERWRITE_CACHE_TTL);
        console.debug("[background.js] Cached overwrite event:", cacheKey);
        return; // We don't send overwrite events to the UI
    }

    if (details.cause === 'explicit' && !details.removed) {
        const cacheKey = cookieToString(details.cookie);
        if (overwriteCache.has(cacheKey)) {
            cause_human = 'modified';
            overwriteCache.delete(cacheKey);
            console.debug("[background.js] Detected modified event from cache:", cacheKey);
        } else {
            console.debug("[background.js] Detected new event:", cacheKey);
            cause_human = 'new';
        }
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
