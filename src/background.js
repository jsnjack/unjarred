let cookieEvents = [];

function cookieChangedHandler(details) {
    console.debug("Cookie changed:", details);

    let cause_human = details.cause;
    if (details.cause === 'explicit') {
        cause_human = details.removed ? 'removed' : 'new';
    } else if (details.cause === 'overwrite' && details.removed) {
        cause_human = 'removed';
    }

    const event = {
        ...details,
        cause_human: cause_human,
        timestamp: Date.now()
    };
    cookieEvents.push(event);
    chrome.storage.local.set({ cookieEvents: cookieEvents });
    chrome.action.setBadgeText({ text: cookieEvents.length.toString() });
}

chrome.cookies.onChanged.addListener(cookieChangedHandler);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "reset") {
        cookieEvents = [];
        chrome.action.setBadgeText({ text: "" });
        chrome.storage.local.set({ cookieEvents: [] }, () => {
            sendResponse({ status: "reset complete" });
        });
        return true; // Indicates that the response is sent asynchronously
    }
});

chrome.action.onClicked.addListener(() => {
    chrome.sidebarAction.open();
});
