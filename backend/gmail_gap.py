import asyncio, os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient
from google.oauth2.credentials import Credentials as GoogleCredentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build as gbuild
GS=["https://www.googleapis.com/auth/gmail.readonly","openid","https://www.googleapis.com/auth/userinfo.email"]
async def main():
    c=AsyncIOMotorClient(os.environ["MONGO_URL"]); db=c[os.environ["DB_NAME"]]
    doc=await db.gmail_tokens.find_one({"key":"primary"})
    creds=GoogleCredentials(token=doc.get("access_token"),refresh_token=doc.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],scopes=GS)
    if not creds.valid and creds.refresh_token: creds.refresh(GoogleRequest())
    svc=gbuild("gmail","v1",credentials=creds)
    for q in ['from:no-reply@hbtbank.com subject:"Transaction Alert"',
              'from:no-reply@hbtbank.com subject:"Transaction Alert" newer_than:2y',
              'from:no-reply@hbtbank.com subject:"Transaction Alert" after:2025/07/01 before:2026/06/30',
              'from:no-reply@hbtbank.com after:2025/07/01 before:2026/06/30']:
        r=svc.users().messages().list(userId="me",q=q,maxResults=200).execute()
        print(f"{r.get('resultSizeEstimate')}\t{len(r.get('messages',[]))}\t{q}")
asyncio.run(main())
