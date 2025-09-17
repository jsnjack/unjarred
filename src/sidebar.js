const nameFilter = document.getElementById("name-filter");
const domainFilter = document.getElementById("domain-filter");
const causeFiltersDiv = document.getElementById("cause-filters");

let allCauses = new Set();
let activeCauseFilters = new Set();

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


function updateSidebar() {
    chrome.storage.local.get("cookieEvents", (data) => {
        const statsDiv = document.getElementById("stats");
        const eventList = document.getElementById("event-list");
        statsDiv.innerHTML = "";
        eventList.innerHTML = "";

        if (data.cookieEvents && data.cookieEvents.length > 0) {
            const causes = {};
            for (const event of data.cookieEvents) {
                causes[event.cause_human] = (causes[event.cause_human] || 0) + 1;
            }
            updateCauseFilters(Object.keys(causes));

            const nameFilterValue = nameFilter.value.toLowerCase();
            const domainFilterValue = domainFilter.value.toLowerCase();

            const filteredEvents = data.cookieEvents.filter(event => {
                const nameMatch = !nameFilterValue || event.cookie.name.toLowerCase().includes(nameFilterValue);
                const domainMatch = !domainFilterValue || event.cookie.domain.toLowerCase().includes(domainFilterValue);
                const causeMatch = activeCauseFilters.has(event.cause_human);
                return nameMatch && domainMatch && causeMatch;
            });

            const total = filteredEvents.length;
            let statsHTML = `<span class="stat-total">Total: ${total}</span>`;
            for (const cause in causes) {
                statsHTML += `<span class="stat-item">${cause}: ${causes[cause]}</span>`;
            }
            statsDiv.innerHTML = statsHTML;

            for (const event of filteredEvents) {
                const div = document.createElement("div");
                div.className = "event-item";

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

                eventList.appendChild(div);
            }
        } else {
            statsDiv.innerHTML = "No cookie events yet.";
        }
    });
}

chrome.storage.onChanged.addListener(updateSidebar);
updateSidebar();

document.getElementById("reset-button").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "reset" }, (response) => {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
        } else {
            console.log(response.status);
            updateSidebar();
        }
    });
});

nameFilter.addEventListener("input", updateSidebar);
domainFilter.addEventListener("input", updateSidebar);
