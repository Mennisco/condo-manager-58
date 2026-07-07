import asyncio, os, re, base64
from dotenv import load_dotenv
load_dotenv()
from motor.motor_asyncio import AsyncIOMotorClient
from google.oauth2.credentials import Credentials as GoogleCredentials
from google.auth.transport.requests import Request as GoogleRequest
from googleapiclient.discovery import build as gbuild
GS=["https://www.googleapis.com/auth/gmail.readonly","openid","https://www.googleapis.com/auth/userinfo.email"]
def decode(d): return base64.urlsafe_b64decode(d.encode()).decode("utf-8","ignore")
def extract(p):
    t="";h=""
    def w(x):
        nonlocal t,h
        m=x.get("mimeType","");d=x.get("body",{}).get("data")
        if m=="text/plain" and d:t+=decode(d)
        elif m=="text/html" and d:h+=decode(d)
        for ch in x.get("parts",[]) or []:w(ch)
    w(p)
    if t.strip():return t
    from html import unescape
    return unescape(re.sub(r"\s+"," ",re.sub(r"<[^>]+>"," ",h)))
async def sample(svc, subj):
    r=svc.users().messages().list(userId="me",q=f'from:no-reply@hbtbank.com subject:"{subj}"',maxResults=1).execute()
    for m in r.get("messages",[])[:1]:
        msg=svc.users().messages().get(userId="me",id=m["id"],format="full").execute()
        h={x["name"].lower():x["value"] for x in msg.get("payload",{}).get("headers",[])}
        print("="*70); print("SUBJ:",h.get("subject")); print("DATE:",h.get("date"))
        b=extract(msg.get("payload",{}))
        # trim boilerplate css
        b=re.sub(r"/\*.*?\*/"," ",b)
        print(b[:1400])
async def main():
    c=AsyncIOMotorClient(os.environ["MONGO_URL"]); db=c[os.environ["DB_NAME"]]
    doc=await db.gmail_tokens.find_one({"key":"primary"})
    creds=GoogleCredentials(token=doc.get("access_token"),refresh_token=doc.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],scopes=GS)
    if not creds.valid and creds.refresh_token: creds.refresh(GoogleRequest())
    svc=gbuild("gmail","v1",credentials=creds)
    for s in ["New Remote Deposit Alert","Automatic Deposit Alert","Automatic Withdrawal Alert"]:
        await sample(svc,s)
asyncio.run(main())
