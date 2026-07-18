import os
from dotenv import load_dotenv

load_dotenv(override=True)

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from backend.storage import OrmBase, DB_SessionFactory, db_engine, update_db_schema
from backend.populator import fill_sample_records
from backend.endpoints.session import session_router
from backend.endpoints.reservations import reservation_router
from backend.endpoints.bookmarks import bookmark_router
from backend.endpoints.providers import provider_router
from backend.endpoints.properties import property_router
from backend.endpoints.chats import chat_router
from backend.endpoints.feedback import feedback_router

OrmBase.metadata.create_all(bind=db_engine)
update_db_schema()

api_service = FastAPI(title="Airbnb Clone API", version="1.0.0")

allowed_origins = [o.strip() for o in os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
).split(",") if o.strip()]

api_service.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_service.include_router(session_router)
api_service.include_router(property_router)
api_service.include_router(reservation_router)
api_service.include_router(provider_router)
api_service.include_router(feedback_router)
api_service.include_router(bookmark_router)
api_service.include_router(chat_router)


@api_service.on_event("startup")
def handle_startup_tasks():
    startup_db_session = DB_SessionFactory()
    try:
        fill_sample_records(startup_db_session)
    finally:
        startup_db_session.close()


@api_service.get("/")
def redirect_to_docs():
    return RedirectResponse(url="/docs")


@api_service.get("/health")
def get_health_status():
    return {"status": "ok"}


@api_service.post("/upload")
def upload_file_to_cloudinary(file: UploadFile = File(...)):
    import requests
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", "demo")
    upload_preset = os.getenv("CLOUDINARY_UPLOAD_PRESET", "ml_default")
    try:
        file_bytes = file.file.read()
        res = requests.post(
            f"https://api.cloudinary.com/v1_1/{cloud_name}/image/upload",
            files={"file": (file.filename, file_bytes, file.content_type)},
            data={"upload_preset": upload_preset}
        )
        if res.status_code != 200:
            error_msg = res.text
            try:
                err_data = res.json()
                error_msg = err_data.get("error", {}).get("message", error_msg)
            except:
                pass
            
            help_hint = ""
            if "preset" in error_msg.lower() or cloud_name == "demo":
                help_hint = " (Please configure your unique CLOUDINARY_CLOUD_NAME and an active unsigned CLOUDINARY_UPLOAD_PRESET in the root .env file, then restart the server)"
            
            raise HTTPException(status_code=400, detail=f"Cloudinary upload failed: {error_msg}{help_hint}")
        response_data = res.json()
        return {"url": response_data.get("secure_url")}
    except HTTPException as http_err:
        raise http_err
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(error)}")
