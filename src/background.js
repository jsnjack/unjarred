let cookieEvents = [];
let sidebarPorts = [];

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === "sidebar") {
        sidebarPorts.push(port);
        port.onDisconnect.addListener(() => {
            sidebarPorts = sidebarPorts.filter(p => p !== port);
            if (sidebarPorts.length === 0) {
                cookieEvents = [];
                chrome.storage.local.set({ cookieEvents: [] });
                chrome.action.setBadgeText({ text: "" });
            }
        });
    }
});

function calculateCookieSize(cookie) {
    let size = 0;
    if (cookie.name) size += cookie.name.length;
    if (cookie.value) size += cookie.value.length;

    // Approximate size of attributes in Set-Cookie header
    let attributes = '';
    if (cookie.domain) attributes += `domain=${cookie.domain}; `;
    if (cookie.path) attributes += `path=${cookie.path}; `;
    if (cookie.expirationDate) attributes += `expires=${new Date(cookie.expirationDate * 1000).toUTCString()}; `;
    if (cookie.secure) attributes += 'Secure; ';
    if (cookie.httpOnly) attributes += 'HttpOnly; ';
    if (cookie.sameSite) attributes += `SameSite=${cookie.sameSite}; `;

    size += new TextEncoder().encode(attributes).length;
    return size;
}

function getEffectiveDomain(domain) {
    // This is a simplified implementation and does not cover all PSL rules.
    // For a full implementation, a library would be needed.
    const parts = domain.split('.');
    if (parts.length <= 2) {
        return domain;
    }

    const twoPartTlds = new Set(['co.uk', 'com.au', 'com.br', 'co.jp', 'co.za', 'co.in']);
    const lastTwo = parts.slice(-2).join('.');
    if (twoPartTlds.has(lastTwo) && parts.length > 2) {
        return parts.slice(-3).join('.');
    }

    return lastTwo;
}

function cookieChangedHandler(details) {
    if (sidebarPorts.length === 0) {
        return;
    }

    console.debug("Cookie changed:", details);

    let cause_human = details.cause;
    if (details.cause === 'explicit') {
        cause_human = details.removed ? 'removed' : 'new';
    } else if (details.cause === 'overwrite' && details.removed) {
        cause_human = 'removed';
    }

    const effectiveDomain = getEffectiveDomain(details.cookie.domain.replace(/^\./, ''));
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
        cookieEvents.push(event);
        if (cookieEvents.length > 1000) {
            cookieEvents = cookieEvents.slice(cookieEvents.length - 1000);
        }
        chrome.storage.local.set({ cookieEvents: cookieEvents });
    });
}

chrome.cookies.onChanged.addListener(cookieChangedHandler);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "reset") {
        cookieEvents = [];
        chrome.storage.local.set({ cookieEvents: [] }, () => {
            sendResponse({ status: "reset complete" });
        });
        return true; // Indicates that the response is sent asynchronously
    }
});

chrome.action.onClicked.addListener(() => {
    chrome.sidebarAction.open();
});
