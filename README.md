# ProPresenter Nursery Messages

This application provides a simple and effective way to display nursery messages in ProPresenter. It connects to the ProPresenter API to fetch and trigger messages, making it easy for volunteers and staff to manage nursery alerts without needing to access the main ProPresenter interface.

## Features

* **Connect to ProPresenter Remotely**: Enter the network address of your ProPresenter instance to connect to it.
* **View Available Messages**: The application will list all available messages from your ProPresenter setup.
* **Fill in Message Tokens**: If a message contains tokens (e.g., for a child's name or number), you can easily fill them in before displaying the message.
* **Real-time Updates**: Messages update through ProPresenter's chunked stream. Lost connections reconnect automatically with backoff; the connection status warns when displayed messages may be stale.
* **Localized Interface**: The user interface is available in multiple languages including English, German, Spanish, French, Portuguese, Korean, Norwegian, Czech, Simplified Chinese, Russian, Hindi, Arabic, and Bengali. The application automatically detects your browser's language.

## How to Use

This section is for end-users who will be operating the application.

1.  **Open the application** in your web browser.
2.  **Enter the network address** for your ProPresenter instance in the input field (e.g., `http://localhost:1025`).
3.  Click **"Connect"** to fetch and display available messages, or retry a failed connection. Editing the address does not change the active connection until you submit it. Use **"Disconnect"** to stop the connection. Back and Forward restore earlier connections, with one history entry per address change.
4.  For any message, **fill in text token values** in the provided input fields. Timer and clock tokens retain their configuration from ProPresenter.
5.  Click the **"Show"** button to trigger the message in ProPresenter.
6.  Click **"Hide"** to clear an active message. You can bookmark or share the connected page's URL to restore the connection later. Older connection links remain supported.

The browser must be able to reach ProPresenter's network API. `localhost` refers to the device running the browser, not a different presentation computer. For another computer, use its LAN address and configured API port.

HTTP and HTTPS server addresses are supported, including a reverse-proxy path prefix. Do not include credentials, query parameters, or a fragment. The connection address is encoded in the page URL for bookmarking, not encrypted.

The web host and ProPresenter API can be different origins. ProPresenter or a local reverse proxy must allow the web page's origin through CORS. An HTTPS page connecting to an HTTP LAN endpoint may be blocked by browser mixed-content or local-network access policies. Use a compatible local hosting arrangement or an HTTPS reverse proxy when needed; do not disable browser security protections. Only expose the API to trusted operators on a trusted network.

## How to Run and Deploy for Developers

This section is for developers who want to run the application locally or deploy it to a web server.

### Running in a Development Environment

Use [Node.js](https://nodejs.org/) 24.15 or later in the Node 24 release line, or Node 26+, with npm. CI uses Node 26 from `.node-version`.

1.  **Clone the repository** to your local machine.
2.  **Install the dependencies** by running the following command in the project's root directory:
    ```bash
    npm ci
    ```
3.  **Start the development server** with the following command:
    ```bash
    npm run dev
    ```
4.  Open your web browser and navigate to the local address provided by Vite (usually `http://localhost:5173`).

### Development checks and architecture

Run `npm run lint`, `npm test`, and `npm run build` before submitting changes. Pull requests and releases run these checks automatically.

The browser connects directly to ProPresenter; no application backend or global state store is required. The API module validates responses and yields messages from an abortable async stream. `useMessages` owns connection lifetime, reconnection, and server state. Message editors own text drafts and keep them across stream updates; switching connections resets them. Show/hide requests have a 15-second timeout and are cancelled when their connection is removed.

Malformed payloads stop the connection and produce a visible error instead of silently preserving stale data. Each JSON message or message list is limited to 1,048,576 decoded characters. Transient transport failures retry with jitter up to a 30-second delay. Click Connect again after correcting a terminal server or protocol error.

Token validation checks names and editable text. Timer, clock, and other ProPresenter-owned configuration passes through unchanged, including fields not described by the [published API schema](https://openapi.propresenter.com/). This avoids rejecting new token layouts or dropping metadata.

Tests use mocked streams and requests, including fragmented UTF-8/JSON, cancellation, retries, message actions, and connection navigation. A live ProPresenter instance is still needed to verify server compatibility and browser network permissions.

TypeScript stays on the latest 6.0 patch while `typescript-eslint` requires TypeScript below 6.1. Upgrade both together when its peer range supports TypeScript 7.

### Deploying to a Static Web Server

To deploy this application, you first need to build the static assets.

1.  **Build the application** by running the following command in the project's root directory:
    ```bash
    npm run build
    ```
    This command will create a `dist` directory containing the optimized static files for your application (HTML, CSS, and JavaScript).

2.  **Host the `dist` directory** with any static web server. A simple option is the `static-web-server` tool.
    * You can find instructions on how to set up `static-web-server` in their official documentation: [Static Web Server - Getting Started](https://static-web-server.net/getting-started/)

Once you have your web server set up, configure it to serve the files from the `dist` directory.

## Releases

This project uses automated releases via GitHub Actions. When a new version tag is pushed to the repository, the build pipeline automatically:

1. Builds the application
2. Creates a release archive containing all static files
3. Creates a GitHub Release with the version number
4. Uploads the build artifacts to the release

### Creating a New Release

To create a new release, maintainers should:

1. Update the version number in `package.json` if needed
2. Create and push a version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. The GitHub Actions workflow will automatically build and create the release

### Downloading Releases

Users can download pre-built releases from the [Releases page](https://github.com/sensslen/Cgf.ProPresenter.NurseryMessages/releases). Each release includes a ZIP file with all necessary files to deploy the application.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
