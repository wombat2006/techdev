# GEMINI.md

## Project Overview

This project, **TechSapo**, is an advanced IT support platform designed to assist with infrastructure and operational issues. It leverages a "Wall-Bounce" analysis system, which orchestrates multiple Large Language Models (LLMs) through a Model Context Protocol (MCP) to provide high-quality analysis and solutions.

The core of the project is a **Multi-LLM Orchestrator** that intelligently routes requests to different tiers of LLMs, including models from Google (Gemini), Anthropic (Claude), OpenAI (GPT-5), and OpenRouter. This allows for a flexible and cost-effective approach to problem-solving, using the most appropriate model for each task.

TechSapo is built as a **Node.js application using TypeScript**. It exposes a RESTful API for interacting with its services and is designed for high availability and security, with features like environment variable encryption, comprehensive monitoring, and robust testing strategies.

### Key Technologies

*   **Backend:** Node.js, Express.js, TypeScript
*   **LLM Integration:** Google Gemini, Anthropic Claude, OpenAI GPT-5, OpenRouter
*   **Databases:** Redis (for caching and session management), MySQL (optional)
*   **Deployment:** Docker, Nginx, PM2
*   **Monitoring:** Prometheus, Grafana
*   **Testing:** Jest

## Building and Running

### Prerequisites

*   Node.js >= 18.0.0
*   Docker and Docker Compose
*   API keys for the various LLM services

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/wombat2006/techsapo.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd techsapo
    ```
3.  Install the dependencies:
    ```bash
    npm install
    ```

### Running the Application

*   **Development Mode:**
    To run the application in development mode with automatic reloading, use the following command:
    ```bash
    npm run dev
    ```

*   **Production Mode:**
    To build and run the application in production mode, use the following commands:
    ```bash
    npm run build
    npm start
    ```

*   **With Docker:**
    The project includes Docker configurations for running the application and its monitoring stack.

    *   To start the full monitoring stack (Prometheus, Grafana, etc.):
        ```bash
        ./scripts/start-monitoring.sh
        ```
    *   To deploy the application in a production environment using Docker:
        ```bash
        docker-compose -f docker/production/docker-compose.prod.yml up -d
        ```

### Testing the Application

The project has a comprehensive test suite.

*   To run all tests:
    ```bash
    npm test
    ```
*   To run tests with code coverage:
    ```bash
    npm run test:coverage
    ```
*   To run unit tests specifically:
    ```bash
    npm run test:unit
    ```
*   To run integration tests:
    ```bash
    npm run test:integration
    ```

## Development Conventions

*   **Coding Style:** The project uses ESLint to enforce a consistent coding style. You can run the linter with `npm run lint`.
*   **Branching:** The `README.md` suggests a feature-branching workflow (`feature/amazing-feature`).
*   **Commits:** While not explicitly stated, the level of detail in the documentation suggests that clear and descriptive commit messages are expected.
*   **Testing:** The project has a strong emphasis on testing, with unit, integration, and property-based tests. New features should include corresponding tests.
*   **Documentation:** The project is well-documented. New features and changes should be reflected in the documentation.
