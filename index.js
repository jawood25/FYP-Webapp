import OpenAI from "openai";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

const openai = new OpenAI({
    //organization: "org-tA5XmR7tAvDKk8BKuRsZIQhL",
    apiKey: "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",
});

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('FYP-Webapp'));
app.use(cors());

app.post("/", async (req, res) => {

    const { message } = req.body;

    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {role: "user", content: `${message}`},
        ]
    })

    res.json({
        completion: completion.choices[0].message
    })
});

app.get('/', (req, res) => {
    res.sendFile('index.html', {
      root: './'
    })
 })

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
});