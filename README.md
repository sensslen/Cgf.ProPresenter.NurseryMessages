# ProPresenter Nursery Messages

This application provides a simple and effective way to display nursery messages in ProPresenter. It connects to the ProPresenter API to fetch and trigger messages, making it easy for volunteers and staff to manage nursery alerts without needing to access the main ProPresenter interface.

## Features

* **Connect to ProPresenter Remotely**: Enter the network address of your ProPresenter instance to connect to it.
* **View Available Messages**: The application will list all available messages from your ProPresenter setup.
* **Fill in Message Tokens**: If a message contains tokens (e.g., for a child's name or number), you can easily fill them in before displaying the message.
* **Real-time Updates via WebSocket**: The application automatically attempts to connect using WebSocket for instant, real-time message updates with minimal latency.
* **Automatic Fallback to Polling**: If WebSocket connection is unavailable or fails, the application seamlessly falls back to polling mode, refreshing the message list every second.
* **Localized Interface**: The user interface is available in multiple languages including English, German, Mandarin Chinese, Hindi, Spanish, French, Arabic, and Bengali. The application automatically detects your browser's language.

## How to Use

This section is for end-users who will be operating the application.

1.  **Open the application** in your web browser.
2.  **Enter the network address** for your ProPresenter instance in the input field (e.g., `http://localhost:1025`).
3.  The application will automatically **attempt to connect via WebSocket** for real-time updates. If the WebSocket connection fails, it will automatically **fall back to polling mode**.
4.  The application will **fetch and display a list of available messages**.
5.  For any message, **fill in the required token values** in the provided input fields.
6.  Click the **"Show"** button to trigger the message in ProPresenter.

## How to Run and Deploy for Developers

This section is for developers who want to run the application locally or deploy it to a web server.

### Running in a Development Environment

To run this application locally for development, you will need to have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed.

1.  **Clone the repository** to your local machine.
2.  **Install the dependencies** by running the following command in the project's root directory:
    ```bash
    npm install
    ```
3.  **Start the development server** with the following command:
    ```bash
    npm run dev
    ```
4.  Open your web browser and navigate to the local address provided by Vite (usually `http://localhost:5173`).

### Deploying to a Static Web Server

To deploy this application, you first need to build the static assets.

1.  **Build the application** by running the following command in the project's root directory:
    ```bash
    npm run build
    ```
    This command will create a `dist` directory containing the optimized static files for your application (HTML, CSS, and JavaScript).

2.  **Host the `dist` directory** with any static web server. A simple option is the `static-web-server` tool.
    * You can find instructions on how to set up `static-web-server` in their official documentation: [Static Web Server - Quick Start](https://static-web-server.net/getting-started/quick-start/)

Once you have your web server set up, configure it to serve the files from the `dist` directory.

## Technical Details

### Connection Modes

The application uses two connection modes to ensure reliable communication with ProPresenter:

1. **WebSocket Mode (Primary)**: 
   - Provides real-time, bi-directional communication with ProPresenter
   - Low latency updates when messages change
   - Automatically reconnects on disconnection (up to 3 attempts)
   - More efficient than polling, reducing network overhead

2. **Polling Mode (Fallback)**: 
   - Used when WebSocket connection is unavailable or fails
   - Fetches message list every second via HTTP GET requests
   - Ensures the application remains functional even if WebSocket is not supported

The application automatically detects the best connection method and switches between them as needed, ensuring a seamless user experience.

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