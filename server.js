// server.js
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const openai = new OpenAI();

app.use(cors());
app.use(express.json());

app.post("/api/generate-script", async (req, res) => {
  const { idea, genre, length } = req.body;

  if (!idea || !genre || !length) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional screenwriter."
        },
        {
          role: "user",
          content: `Write a ${length} ${genre} script about: ${idea}`
        }
      ],
      temperature: 0.7,
    });

    res.json({ result: completion.choices[0].message.content });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(3001, () => {
  console.log("API running on http://localhost:3001");
});
