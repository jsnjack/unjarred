# unjarred

> See what's inside. Monitor cookies in real-time.

**unjarred** is a browser extension that provides real-time monitoring of
cookie events in your browser. It displays detailed information about cookie
creation, modification, removal, expiration, and eviction events in an
easy-to-use sidebar interface.

## Features

- **Real-time Cookie Monitoring** - Track all cookie events as they happen
- **Event Analytics** - View counts for different types of cookie events
  (new, modified, removed, expired, evicted)
- **Smart Filtering** - Filter events by cookie name, domain, or event type
- **Event Details** - View comprehensive information about each cookie and
  event
- **Cross-browser Support** - Works on both Firefox and Chrome
- **Cookie Jar Insights** - See which cookie jar events belong to and their
  total size
- **Copy to Clipboard** - Easy copying of complete event data for
  debugging

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm
- [monova](https://github.com/jsnjack/monova) (optional, for version
  management)

### Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development mode with hot reload:
   ```bash
   npm run dev
   ```

3. For Firefox development with live reloading:
   ```bash
   npm run open
   ```

### Building

```bash
make build
```

## How It Works

unjarred uses the browser's `cookies` API to monitor cookie events in
real-time. The extension:

1. **Background Script** (`background.js`) - Listens to cookie change events and processes them
2. **Sidebar Interface** (`Sidebar.vue`) - Displays the cookie events in a user-friendly interface
