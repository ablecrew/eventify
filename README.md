# Eventify

![Eventify App Screenshot](./public/assets/eventify-screenshot.png)

## Description

Eventify is a dynamic web application designed to simplify event creation, discovery, and management. Users can seamlessly create new events, browse a variety of categories, and manage their personal wishlists. The platform offers features for both single-day and recurring events, ticket sales (including free events), and discount code management.

## Getting Started

Follow these instructions to get your local copy of Eventify up and running.

### Prerequisites

* Node.js (LTS version recommended)
* npm (comes with Node.js) or Yarn

### Installation

1.  **Fork the repository:** Start by forking this repository to your own GitHub account.
2.  **Clone your forked repository:**
    ```bash
    git clone https://github.com/JosephKinyuru/eventify.git
    cd eventify
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
    This command will install all the necessary project dependencies as listed in `package.json` and ensure consistency with `package-lock.json`.
4.  **Create `.env` file:**
    Create a file named `.env` in the root of your project. This file will store your environment variables.
    ```bash
    touch .env
    ```
5.  **Configure Environment Variables:**
    Open the newly created `.env` file and populate it with the necessary environment variables, following the structure provided in the `.env.example` file. This typically includes sensitive information like API keys, database connection strings, etc.


### Available Commands

Once the dependencies are installed, you can use the following commands:

* **`npm run build`**:
    This command compiles the TypeScript/ESM source code into a runnable JavaScript format, typically placed in a `dist` folder. **This command must be run before `npm start`** to ensure the server has the necessary compiled files.
    ```bash
    npm run build
    ```

* **`npm start`**:
    This command starts the backend Express server, which serves static HTML pages and provides the API endpoints for the application. This is typically used for local development where you need a full server environment.
    ```bash
    npm start
    ```

* **`npm run preview`**:
    This command utilizes a browser-based bundler to serve the static pages, allowing you to preview the frontend without a direct backend server connection. This is useful for front-end development and quick previews.
    ```bash
    npm run preview
    ```

## Credits

This project was developed as a school project.

**Developed by:**

* Joseph Kinyuru
* Laureen Aiko Angeline
* Richie Mwangi
* Jean Njoroge
* Ivy Lynnn
* Ernest Kangethe
