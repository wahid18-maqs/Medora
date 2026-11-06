from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGODB_URI"), tlsAllowInvalidCertificates=True)
db = client["blood_analyzer"]
reports_collection = db["reports"]
profiles_collection = db["profiles"]
users_collection = db["users"]
support_requests_collection = db["support_requests"]
chat_messages_collection = db["chat_messages"]




