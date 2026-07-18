# Vercel Deployment Guide

This guide details how to deploy the Next.js frontend to **Vercel** and the FastAPI backend to a service like **Render** or **Heroku**.

---

## 1. Deploying the Frontend (Next.js) to Vercel

Since this repository is a monorepo (with the frontend inside the `/frontend` directory), follow these steps when importing the project in Vercel:

1. **Import Project**: 
   - Connect your GitHub account to Vercel.
   - Import this repository.
2. **Configure Settings**:
   - **Framework Preset**: Select `Next.js` (usually auto-detected).
   - **Root Directory**: Click "Edit" and choose `frontend`. (This tells Vercel to build and serve from the `/frontend` subfolder rather than the root).
3. **Environment Variables**:
   - Add the following environment variable under the **Environment Variables** section:
     - **Key**: `NEXT_PUBLIC_API_URL`
     - **Value**: The URL of your deployed backend (e.g., `https://my-airbnb-backend.onrender.com`).
     *(Note: Do not add a trailing slash `/` at the end of the URL)*
4. **Deploy**:
   - Click **Deploy**. Vercel will build the frontend and serve it globally.

---

## 2. Deploying the Backend (FastAPI) to Render / Heroku

The FastAPI backend runs on Python. You can deploy it to **Render** or **Heroku** using the configurations already present in this repo:

1. **Service Type**: Create a **Web Service** on Render or Heroku.
2. **Environment**: Select **Python**.
3. **Start Command**:
   - On Render or Heroku, the deployment command is already defined in the `Procfile` at the root:
     ```bash
     web: uvicorn backend.bootstrap:api_service --host 0.0.0.0 --port $PORT
     ```
4. **Environment Variables**:
   - If you want to use Cloudinary for uploads, add these environment variables in your backend hosting service settings:
     - `CLOUDINARY_CLOUD_NAME` = `djkrmb6d5`
     - `CLOUDINARY_UPLOAD_PRESET` = `airbnb`
