# Page Pulse

An instant, elegant SEO & Web Page Audit tool that evaluates any public URL. This project scans target pages to retrieve response times, HTTP statuses, headers, image alt attributes, header hierarchies, word counts, and metadata tags, displaying them in a high-fidelity glassmorphic dashboard.

Built for the **Digital Heroes Training Task** (linked to [digitalheroesco.com](https://digitalheroesco.com)).

---

## 📂 Project Structure

The project has been separated into two independent folders for frontend and backend:

```text
├── frontend/
│   ├── index.html   # Main layout structure & forms
│   ├── style.css    # Dark glassmorphic styling & keyframe animations
│   └── app.js       # Client request handler & dynamic metric DOM mappings
├── backend/
│   ├── src/
│   │   ├── parser.js       # SEO extraction rules & fetch timeouts
│   │   ├── parser.test.js  # Jest unit tests for parsing logic
│   │   └── server.js       # Express router hosting /api/audit and serving frontend
│   ├── package.json        # Dependencies & test runners
│   └── .gitignore          # Node dependency ignore list
├── README.md               # Setup & documentation (this file)
└── .gitignore              # Root git configuration
```

---

## 🚀 Getting Started

### 1. Setup Backend

1. Navigate to the `backend/` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the Express server:
   ```bash
   npm start
   ```
   The backend server runs at [http://localhost:3000](http://localhost:3000) and will automatically serve the static files from the `frontend/` directory.

### 2. Setup Frontend

- **Option A (Served together - Recommended)**: Simply open [http://localhost:3000](http://localhost:3000) in your web browser. The backend server automatically routes and serves the static files inside the `frontend/` folder.
- **Option B (Decoupled Dev Server)**: You can serve the files in `frontend/` using any static server (like VS Code's Live Server on port 5500). The frontend is built to dynamically detect if it's running locally outside the default port and redirect the API request automatically to `http://localhost:3000/api/audit`.

### 3. Running Backend Tests

1. Open a terminal in the `backend/` folder:
   ```bash
   cd backend
   ```
2. Run Jest tests:
   ```bash
   npm test
   ```

---

## 🔌 API Contract

### Audit Endpoint

- **Endpoint**: `/api/audit`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "url": "https://example.com"
  }
  ```

### Successful Response Example (`200 OK`)

```json
{
  "success": true,
  "statusCode": 200,
  "responseTimeMs": 145,
  "title": "Example Domain",
  "metaDescription": "This domain is for use in illustrative examples in documents.",
  "h1Count": 1,
  "wordCount": 35,
  "images": {
    "total": 2,
    "missingAlt": 1,
    "missingAltSources": [
      "https://example.com/assets/banner.png"
    ]
  }
}
```

---

## 🎨 Design Decisions

### 1. Choice of HTML Parser: Cheerio vs. JSDOM / Headless Browsers
We chose **Cheerio** for extracting metadata and counting tags over alternatives like JSDOM or Puppeteer. 
- **Reasoning**: Cheerio parses markup and provides an API identical to jQuery without running a full browser engine or standard Javascript VM context. This makes execution times under 50ms, consumes minimal memory, and scales exceptionally well under multi-user loads. We trade client-side Javascript execution execution for server efficiency, which is the correct choice for an audit tool analyzing baseline HTML markup.

### 2. Separation of Network Retrieval and HTML Parsing (Pure Function Pattern)
The core parser logic is divided into two distinct functions in `parser.js`: `auditUrl` (handles async HTTP fetching, header validation, and timeout rules) and `parseHtml` (takes raw HTML text, status, and response time, returning the structured metrics).
- **Reasoning**: This separation enables pure, fast unit testing. In `parser.test.js`, we can verify a multitude of HTML structure edges (happy paths, missing tags, space-only alts, empty files) without spinning up dummy HTTP servers or using heavy mock interceptors. It yields reliable, isolated tests that execute in seconds.

### 3. Progressive Warning UX & Design System
We designed the dashboard using a premium, custom dark theme with glassmorphic elements and high HSL gradients instead of standard framework themes (like Tailwind defaults). Rather than just displaying raw data, the cards evaluate metrics against real-world SEO guidelines:
- **Title**: Warnings are triggered if characters fall below 30 or exceed 60.
- **Description**: Warns if below 110 or above 160 characters.
- **H1 Header**: Warns if the header count is zero or multiple.
- **Images**: Flags images missing `alt` attributes with active recommendations.
- **Reasoning**: A tool's primary purpose is actionable auditing. Translating raw numbers into color-coded state badges (Emerald `Healthy`, Amber `Warning`, Rose `Action Required`) transforms a simple JSON display into an interactive, high-value visual dashboard.

---

## 🛠️ Roadmap / Self-Critique (If given another day)

If we had more time to expand the application, we would focus on these critical enhancements:

1. **Client-Side Rendering Hydration (Puppeteer/Playwright Support)**
   - *Problem*: Cheerio cannot execute client-side Javascript. Sites built with Single Page Application frameworks (like React or Angular) that do not use Server-Side Rendering (SSR) return an empty root div.
   - *Solution*: Introduce a hybrid crawler that starts with a fast Cheerio request. If it detects a thin initial body but a large client bundle, it spins up a headless browser (Puppeteer) to wait for hydration, executing audits on the finalized DOM tree.

2. **Asynchronous Audit Job Queue (Redis + BullMQ)**
   - *Problem*: Synchronous HTTP audit routes block server event loops during long-lived requests or timeout scenarios.
   - *Solution*: Move from a request-response block to an async job processor. When a user audits a site, the server returns a Job ID immediately. The work is offloaded to background workers, and the frontend polls (or uses WebSockets/SSE) to render metrics once complete, shielding the backend from crash loops under heavy traffic.
