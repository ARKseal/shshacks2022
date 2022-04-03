from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn

import spacy
from spacytextblob.spacytextblob import SpacyTextBlob

nlp = spacy.load("en_core_web_sm")
nlp.add_pipe('spacytextblob')
app = FastAPI()


class Data(BaseModel):
    text: str


@app.post("/text/")
def extract_entities(data: Data):
    doc = nlp(data.text)
    polarity = doc._.blob.polarity
    subjectivity = doc._.blob.subjectivity
    return {"message": data.text, "polarity": polarity, "subjectivity": subjectivity}

if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=5050)
