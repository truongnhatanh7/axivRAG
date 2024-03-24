import express from "express";
import { takeNotes } from "index.js";

function main() {
  const app = express();
  const port = process.env.PORT || 8000;

  app.get("/", (_req, res) => {
    // health check
    res.status(200).send("ok");
  });

  app.post("/take_notes", async (req, res) => {
    const { paperUrl, name, pagesToDelete } = req.body;
    const notes = await takeNotes({ paperUrl, name, pagesToDelete });
    res.status(200).send(notes);
    return;
  });

  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
  });
}

main();
