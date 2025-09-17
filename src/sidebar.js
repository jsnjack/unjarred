const nameFilter = document.getElementById("name-filter");
const domainFilter = document.getElementById("domain-filter");
const causeFiltersDiv = document.getElementById("cause-filters");

let allCauses = new Set();
let activeCauseFilters = new Set();
let displayedEvents = [];
let allCookieEvents = [];

function updateCauseFilters(newCauses) {
    let changed = false;
    for (const cause of newCauses) {
        if (!allCauses.has(cause)) {
            allCauses.add(cause);
            activeCauseFilters.add(cause); // Active by default
            changed = true;
        }
    }

    if (changed) {
        causeFiltersDiv.innerHTML = ""; // Clear existing filters
        for (const cause of allCauses) {
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.id = `cause-filter-${cause}`;
            checkbox.value = cause;
            checkbox.checked = activeCauseFilters.has(cause);

            const label = document.createElement("label");
            label.htmlFor = `cause-filter-${cause}`;
            label.textContent = cause;

            const container = document.createElement("div");
            container.className = "cause-filter-item";
            container.appendChild(checkbox);
            container.appendChild(label);
            causeFiltersDiv.appendChild(container);

            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    activeCauseFilters.add(cause);
                } else {
                    activeCauseFilters.delete(cause);
                }
                updateSidebar(); // Re-render the list
            });
        }
    }
}

function createEventElement(event) {
    const div = document.createElement("div");
    div.className = "event-item";
    div.dataset.timestamp = event.timestamp; // For sorting/identification

    div.addEventListener('click', () => {
        div.classList.toggle('highlighted');
    });

    const cause = document.createElement("div");
    cause.className = `cause cause-${event.cause_human}`;
    cause.textContent = event.cause_human;
    div.appendChild(cause);

    const timestamp = document.createElement("div");
    timestamp.className = "timestamp";
    timestamp.textContent = new Date(event.timestamp).toLocaleTimeString();
    div.appendChild(timestamp);

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = event.cookie.name;
    div.appendChild(name);

    const domain = document.createElement("div");
    domain.className = "domain";
    domain.textContent = event.cookie.domain;
    div.appendChild(domain);

    if (event.cookie.partitionKey && event.cookie.partitionKey.topLevelSite) {
        const partitionKey = document.createElement("div");
        partitionKey.className = "partition-key";
        partitionKey.textContent = `Partition Key: ${event.cookie.partitionKey.topLevelSite}`;
        div.appendChild(partitionKey);
    }

    if (event.domainCookieCount) {
        const domainCount = document.createElement("div");
        domainCount.className = "domain-cookie-count";
        domainCount.textContent = `Cookies on this domain: ${event.domainCookieCount}`;
        div.appendChild(domainCount);
    }

    if (event.cookieSize) {
        const cookieSize = document.createElement("div");
        cookieSize.className = "cookie-size";
        cookieSize.textContent = `Approx. size: ${event.cookieSize} bytes`;
        div.appendChild(cookieSize);
    }

    const detailsTrigger = document.createElement("div");
    detailsTrigger.className = "details-trigger";
    detailsTrigger.textContent = "🛈";
    const detailsText = JSON.stringify(event, null, 2);
    detailsTrigger.title = detailsText;
    detailsTrigger.addEventListener("click", (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(detailsText).then(() => {
            const originalText = detailsTrigger.textContent;
            detailsTrigger.textContent = "Copied!";
            setTimeout(() => {
                detailsTrigger.textContent = originalText;
            }, 1000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    });
    div.appendChild(detailsTrigger);

    return div;
}

function updateStats(events) {
    const statsDiv = document.getElementById("stats");
    if (!events || events.length === 0) {
        statsDiv.innerHTML = "No cookie events yet.";
        return;
    }

    const causes = {};
    for (const event of events) {
        causes[event.cause_human] = (causes[event.cause_human] || 0) + 1;
    }
    updateCauseFilters(Object.keys(causes));

    const total = events.length;
    let statsHTML = `<span class="stat-total">Total: ${total}</span>`;
    for (const cause in causes) {
        statsHTML += `<span class="stat-item">${cause}: ${causes[cause]}</span>`;
    }
    statsDiv.innerHTML = statsHTML;
}


function applyFiltersAndRender() {
    const eventList = document.getElementById("event-list");
    eventList.innerHTML = "";

    const nameFilterValue = nameFilter.value.toLowerCase();
    const domainFilterValue = domainFilter.value.toLowerCase();

    const filteredEvents = allCookieEvents.filter(event => {
        const nameMatch = !nameFilterValue || event.cookie.name.toLowerCase().includes(nameFilterValue);
        const domainMatch = !domainFilterValue || event.cookie.domain.toLowerCase().includes(domainFilterValue);
        const causeMatch = activeCauseFilters.has(event.cause_human);
        return nameMatch && domainMatch && causeMatch;
    });

    const fragment = document.createDocumentFragment();
    for (const event of filteredEvents) {
        fragment.appendChild(createEventElement(event));
    }
    eventList.appendChild(fragment);
    displayedEvents = filteredEvents;
}


function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function updateSidebar() {
    chrome.storage.local.get("cookieEvents", (data) => {
        allCookieEvents = (data.cookieEvents || []).sort((a, b) => b.timestamp - a.timestamp);
        updateStats(allCookieEvents);
        applyFiltersAndRender();
    });
}

function handleStorageChange(changes, area) {
    if (area !== 'local' || !changes.cookieEvents) {
        return;
    }

    const { newValue, oldValue } = changes.cookieEvents;
    const newEvents = (newValue || []).sort((a, b) => b.timestamp - a.timestamp);
    allCookieEvents = newEvents;
    updateStats(allCookieEvents);

    // Full reset or initial load
    if (!oldValue || oldValue.length === 0 || newValue.length === 0) {
        applyFiltersAndRender();
        return;
    }

    // Incremental update
    const oldTimestamps = new Set(oldValue.map(e => e.timestamp));
    const addedEvents = newEvents.filter(e => !oldTimestamps.has(e.timestamp));

    if (addedEvents.length > 0) {
        const fragment = document.createDocumentFragment();
        for (const event of addedEvents) {
            // Only add if it matches current filters
            const nameFilterValue = nameFilter.value.toLowerCase();
            const domainFilterValue = domainFilter.value.toLowerCase();
            const nameMatch = !nameFilterValue || event.cookie.name.toLowerCase().includes(nameFilterValue);
            const domainMatch = !domainFilterValue || event.cookie.domain.toLowerCase().includes(domainFilterValue);
            const causeMatch = activeCauseFilters.has(event.cause_human);

            if (nameMatch && domainMatch && causeMatch) {
                fragment.appendChild(createEventElement(event));
            }
        }
        const eventList = document.getElementById("event-list");
        eventList.insertBefore(fragment, eventList.firstChild);
    }
}


chrome.storage.onChanged.addListener(handleStorageChange);
updateSidebar();

document.getElementById("reset-button").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "reset" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
        } else {
            console.log(response.status);
            // The onChanged listener will handle the UI update
        }
    });
});

const debouncedFilterAndRender = debounce(applyFiltersAndRender, 300);
nameFilter.addEventListener("input", debouncedFilterAndRender);
domainFilter.addEventListener("input", debouncedFilterAndRender);
