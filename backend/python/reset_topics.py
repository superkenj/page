# reset_topics.py
from firestore_client import get_client

db = get_client()

def clear_topics():
    topics_ref = db.collection("topics")
    docs = topics_ref.stream()
    for doc in docs:
        doc.reference.delete()
    print("✅ All topics deleted from Firestore.")

if __name__ == "__main__":
    clear_topics()
