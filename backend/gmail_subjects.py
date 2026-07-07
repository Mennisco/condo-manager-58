import asyncio, os
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient
from google.oauth2.credentials import Credentials as GoogleCredentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build as gbuild
from collections import Counter
GS=["https://www.googleapis.com/auth/gmail.readonly","openid","https://www.googleapis.com/auth/userinfo.email"]
async def main():
    c=AsyncIOMotorClient(os.environ["MONGO_URL"]); db=c[os.environ["DB_NAME"]]
    doc=await db.gmail_tokens.find_one({"key":"primary"})
    creds=GoogleCredentials(token=doc.get("access_token"),refresh_token=doc.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],scopes=GS)
    if not creds.valid and creds.refresh_token: creds.refresh(GoogleRequest())
    svc=gbuild("gmail","v1",credentials=creds)
    # all hbtbank emails, tally subjects by year-month
    r=svc.users().messages().list(userId="me",q='from:no-reply@hbtbank.com',maxResults=300).execute()
    subs=Counter()
    for m in r.get("messages",[])[:250]:
        msg=svc.users().messages().get(userId="me",id=m["id"],format="metadata",metadataHeaders=["Subject","Date"]).execute()
        h={x["name"]:x["value"] for x in msg.get("payload",{}).get("headers",[])}
        subs[h.get("Subject","?")[:50]]+=1
    print("Total hbtbank emails sampled:", sum(subs.values()))
    for s,ct in subs.most_common():
        print(f"  {ct:>3}  {s}")
asyncio.run(main())
