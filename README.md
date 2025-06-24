# WasteVision: Food Waste Estimation with Vision-Language Models

**WasteVision** is a multimodal platform that allows users to estimate food waste from images of plates using advanced Vision-Language Models (VLMs) such as OpenAI’s GPT-4  Vision, Google Gemini, and open-source models via Ollama.

---

## 🧠 Project Goals

- Estimate food waste from plate images using a consistent formula.
- Allow users to configure and switch between different VLM providers.
- Provide both web and mobile-compatible interfaces.
- Enable batch evaluation of model responses via Jupyter notebooks.

---

## 🏗️ Architecture Overview

- **Frontend**: ReactJS (responsive design for web and mobile).
- **Backend**: FastAPI with a unified interface for multiple model types.
- **Models Supported**:
  - **Ollama** (e.g., LLaVA v1.6)
  - **OpenAI GPT-4 Vision**
  - **Google Gemini**

![Architecture](architettura.svg)

---

## 📦 Folder Structure
```
WasteVision-and-Evaluation/
├── WasteVision/
│ ├── frontend/ # React application (web & mobile UI)
│ ├── backend/ # FastAPI backend service
│ └── docker-compose.yml # Optional orchestration setup
│
├── notebooks/
│ ├── OpenAI_eval.ipynb # Evaluate predictions using OpenAI API
│ ├── Google_eval.ipynb # Evaluate predictions using Google GenAI
│ └── Ollama_eval.ipynb # Evaluate predictions using local Ollama
│
└── README.md
```
---

## ⚙️ Configuration

Each model provider can be configured with:

- `host`: one of `openai`, `google`, `ollama`
- `model`: model name (e.g., `gpt-4o`, `gemini-1.5`)
- `api_key`: for OpenAI and Google
- `prompt`: default or customized prompt for waste prediction

Configurations are stored persistently and can be reused or reset.

---


## 🧪 Evaluation Notebooks

Each Jupyter notebook loads a dataset of plate images, sends them to the selected model, and validates whether the returned result is a numeric prediction (between 0 and 100). Invalid responses are logged and counted.

Notebooks available:

- `OpenAI_eval.ipynb`
- `Google_eval.ipynb`
- `Ollama_eval.ipynb`

Each notebook can be adapted to test different prompts or models.

---

## 🖥️ Web & Mobile Interface

- **Web version**: dual-pane interface (left: image upload, right: configuration).
- **Mobile version**: single-column layout, same functionality, responsive design.

Both versions use the same ReactJS codebase and allow users to:
- Upload images
- Configure models and prompts
- Load/save previous configurations
- View prediction results in real time

---

## 🧑‍💻 Author

**Raffaele Calì**  
📧 [raffalo8888@gmail.com](mailto:raffalo8888@gmail.com)

---

