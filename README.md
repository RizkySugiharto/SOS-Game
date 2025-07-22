
# SOS Game

[![License: CC BY‑NC‑ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-nd/4.0/)

SOS Game is an interactive game built using Python. The game is designed with a simple interface and can be run as a web application. It features dynamic gameplay, and it utilizes the `Flask` framework for the backend.

## Features

- **Interactive Gameplay**: Engage in a dynamic game where you can interact with different elements.
- **Web Interface**: Play directly from your browser through a Flask-powered web application.
- **Customization**: Easily configurable with environment variables and templates.
- **Cross-platform Support**: Works across different platforms as long as Python is installed.

## Installation

Follow the steps below to set up the project locally:

### 1. Clone the Repository

First, clone the repository to your local machine:

```bash
git clone https://github.com/your-username/SOS-Game.git
cd SOS-Game
```

### 2. Set up the Virtual Environment

Create a virtual environment to manage the dependencies:

```bash
python3 -m venv venv
```

Activate the virtual environment:

- On **Windows**:

    ```bash
    .\venv\Scripts\activate
    ```

- On **macOS/Linux**:

    ```bash
    source venv/bin/activate
    ```

### 3. Install Dependencies

Install the required dependencies from `requirements.txt`:

```bash
pip install -r requirements.txt
```

### 4. Set up Environment Variables

Create a `.env` file by copying the contents from the `.env.template` file and adjusting the necessary values:

```bash
cp .env.template .env
```

Make sure to configure the `.env` file with your desired settings.

### 5. Run the Application

Start the Flask application:

```bash
flask run
```

Visit `http://127.0.0.1:5000` in your browser to play the game.

## Folder Structure

Here's an overview of the project structure:

```bash
SOS-Game/
├── .env.template         # Template for environment variables
├── .gitignore            # Git ignore file
├── Scripts/              # Contains game-related scripts
├── app.py                # Main application file
├── pyvenv.cfg            # Virtual environment configuration
├── requirements.txt      # Required Python packages
├── src/                  # Source code files for the game
└── vercel.json           # Vercel deployment configuration
```

## Requirements

- Python 3.13.x or newer
- Flask
- Any other dependencies listed in `requirements.txt`

## Usage

1. After installation, run the game using:

    ```bash
    flask run
    ```

2. Open your browser and navigate to `http://127.0.0.1:5000` to start playing.

## Acknowledgements

- Thanks to [Flask](https://flask.palletsprojects.com/) for the web framework.

## License

© 2025 RizkySugiharto

This work is licensed under a [Creative Commons Attribution‑NonCommercial‑NoDerivatives 4.0 International License](https://creativecommons.org/licenses/by-nc-nd/4.0/).

🔒 You’re free to share this code (non-commercially), but you **cannot modify**, **distribute**, or **use it for business** without permission.
