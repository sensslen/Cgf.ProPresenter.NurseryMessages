# ProPresenter Nursery Messages

This application provides a simple and effective way to display nursery messages in ProPresenter. It connects to the ProPresenter API to fetch and trigger messages, making it easy for volunteers and staff to manage nursery alerts without needing to access the main ProPresenter interface.

## Features

* **Connect to ProPresenter Remotely**: Enter the network address of your ProPresenter instance to connect to it.
* **View Available Messages**: The application will list all available messages from your ProPresenter setup.
* **Fill in Message Tokens**: If a message contains tokens (e.g., for a child's name or number), you can easily fill them in before displaying the message.
* **Real-time Updates**: The message list automatically refreshes every second, so you always have the most up-to-date information.
* **Localized Interface**: The user interface is available in both English and German.

## How to Use

This section is for end-users who will be operating the application.

1.  **Open the application** in your web browser.
2.  **Enter the network address** for your ProPresenter instance in the input field (e.g., `http://localhost:1025`).
3.  The application will automatically **fetch and display a list of available messages**.
4.  For any message, **fill in the required token values** in the provided input fields.
5.  Click the **"Show"** button to trigger the message in ProPresenter.

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

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.