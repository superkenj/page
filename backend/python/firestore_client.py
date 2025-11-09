# backend/python/firestore_client.py
import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

def get_client():
    # initialize app only once
    if not firebase_admin._apps:
        # 1) prefer SERVICE_ACCOUNT_JSON (raw JSON string)
        sa_json = os.getenv("SERVICE_ACCOUNT_JSON")
        if sa_json:
            try:
                sa_obj = json.loads(sa_json)
                cred = credentials.Certificate(sa_obj)
                firebase_admin.initialize_app(cred)
            except Exception as e:
                raise RuntimeError("Failed to load SERVICE_ACCOUNT_JSON: " + str(e))

        # 2) fallback: GOOGLE_APPLICATION_CREDENTIALS env var that points to a JSON file
        else:
            path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if path and os.path.exists(path):
                cred = credentials.Certificate(path)
                firebase_admin.initialize_app(cred)
            else:
                # 3) last resort: try default app (works on GCP with IAM)
                try:
                    firebase_admin.initialize_app()
                except Exception as e:
                    raise RuntimeError("No valid Firebase credentials found. Set SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS.") from e

    return firestore.client()
