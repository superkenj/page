# backend/seed_users.py
import firebase_admin
from firebase_admin import credentials, firestore

cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

users = [
    {"id": "teacher001", "name": "Ms. dela Cerna", "role": "teacher"},
    {"id": "teacher002", "name": "Mr. Bastasa", "role": "teacher"},
    {"id": "student001", "name": "Arrol Zyl Bastasa", "role": "student"},
    {"id": "student002", "name": "Zia Valdez", "role": "student"},
]

for user in users:
    db.collection("users").document(user["id"]).set(user)

print("Users seeded successfully!")
