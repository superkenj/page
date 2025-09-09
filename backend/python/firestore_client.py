import os
from google.cloud import firestore
from dotenv import load_dotenv

load_dotenv()

SERVICE_KEY = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")

def get_client():
    if os.getenv("FIRESTORE_EMULATOR_HOST"):
        return firestore.Client(project=os.getenv("FIRESTORE_PROJECT_ID"))
    if SERVICE_KEY:
        return firestore.Client.from_service_account_json(SERVICE_KEY)
    return firestore.Client()
