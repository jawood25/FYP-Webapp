//Importing modules
import OpenAI from "openai";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import 'dotenv/config'

//creating 3 instances of OpenAI with individual API keys
const openaiAnswers = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_ANSWERS });
const openaiKeywords = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_KEYWORDS });
const openaiSentiment = new OpenAI({ apiKey: process.env.OPENAI_API_KEY_SENTIMENT });

//create app and define port to run on
const app = express();
const port = 3000;

//for parsing JSON bodies of incoming requests
app.use(bodyParser.json());
//specify directory for serving static files
app.use(express.static('public'));
//enabling CORS
app.use(cors());

//handle POST reqs to the root route
app.post("/", async (req, res) => {
    //define the body of the request as the message sent to the AI
    const { message } = req.body;

    try {
        //Provide the AI with it's role, which is to answer short questions as if writing on an exam, and provide it with the inputted question
        const completionAnswers = await openaiAnswers.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {"role": "system", "content": "You are AnswersGPT. You will receive short questions and I want you to answer them exactly as if you were writing on an exam at school. These short questions require answers of about 100-150 words."},
                {"role": "user", "content": `${message}`}
            ]
        });

        //define answer as the response from openaiAnswers
        const answer = completionAnswers.choices[0].message.content;

        //acquire the average sentence length of the answer
        console.log(answer, "\n");
        const avgSentenceLength = averageWordsInSentence(answer);
        const avgSyllables = averageSyllablesPerWord(answer);
        const readingEase = fleschReadingEase(avgSentenceLength, avgSyllables);
        const gradeLevel = fleschKincaidGradeLevel(avgSentenceLength, avgSyllables);
        const irishGradeLevel = americanGradesToIrish(gradeLevel);
        

        //Provide the 2nd instance of OpenAI with a role of providing the most relevant keywords from a text in a numbered list, and provide it with the answer from the first OpenAI
        const completionKeywords = await openaiKeywords.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {"role": "system", "content": "You are KeywordGPT, when you receive a message just reply with a list of the top 10 keywords in the message in order of prominence. DO NOT PROVIDE ANY OTHER REPLY APART FROM THE NUMBERED LIST."},
                {"role": "user", "content": `${answer}`}
            ]
        });

        const completionSentiment = await openaiSentiment.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {"role": "system", "content": "You are SentimentGPT, you are used for sentiment analysis. When you receive a message, respond with ONLY ONE WORD based on your sentiment analysis: Positive, Netural, or Negative. Determine this word based on the sentiment in the written answer, from the perspective of the one who wrote it, not as a reader."},
                {"role": "user", "content": `${answer}`}
            ]
        })

        //send JSON response containing completion and avg sentence length
        res.json({
            answer: answer,
            keywords: completionKeywords.choices[0].message,
            averageSentenceLength: avgSentenceLength,
            fleschReadingEase: readingEase,
            fleschKincaidGradeLevelIrish: irishGradeLevel,
            sentiment: completionSentiment.choices[0].message
        })
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

//handle GET requests to the root route
app.get('/', (req, res) => {
    ///send index.html
    res.sendFile('index.html', {
      root: './'
    })
 })

//handle GET requests to the info page route
app.get('/infopage', (req, res) => {
    ///send index.html
    res.sendFile('infopage.html', {
      root: './'
    })
 })

//start server and listen on port 3000
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
});



//return the average sentence length from a paragraph
function averageWordsInSentence(gptAnswer) {
    //split answer into sentences
    var sentences = gptAnswer.split(/(?<!\d)\.|\?|!+/);
    sentences = sentences.filter(sentence => sentence.trim() !== '');
    //get the total number of words in the paragraph
    const numOfWords = sentences.reduce((sum, sentence) => {
        const wordsInSentence = sentence.trim().split(/\s+/).length;
        return sum + wordsInSentence;
    }, 0);

    //divide number of words by number of sentences and round the answer
    var averageSentenceLength = numOfWords/sentences.length;
    averageSentenceLength = Math.round(averageSentenceLength); //For 2 decimal places: (Math.round(averageSentenceLength*100)/100).toFixed(2);
    //log and return the answer
    console.log(`Average sentence length is: ${averageSentenceLength}\n`);
    return averageSentenceLength;
}

//get the average syllables per word in a provided paragraph
function averageSyllablesPerWord(gptAnswer) {
    //split the paragraph into sentences
    var sentences = gptAnswer.split(/[.!?]+/);
    sentences = sentences.filter(sentence => sentence.trim() !== '');
    //get the total number of words in the paragraph
    const numOfWords = sentences.reduce((sum, sentence) => {
        const wordsInSentence = sentence.trim().split(/\s+/).length;
        return sum + wordsInSentence;
    }, 0);
    //get the total number of syllables in the paragraph
    const numOfSyllables = sentences.reduce((sum, sentence) => {
        const words = sentence.trim().split(/\s+/);
        var syllablesInSentence = 0;
        for(var i = 0; i<words.length; i++) {
            syllablesInSentence += words[i].match(/[aeiouy]{1,2}(?![aeiouy])/gi)?.length || 0;
        }
        return sum+syllablesInSentence;
    }, 0);

    //get the average of syllables per word and return it
    var syllablesPerWord = numOfSyllables/numOfWords;
    console.log(`Average amount of syllables per word is: ${syllablesPerWord}\n`);
    return syllablesPerWord;
}

//calculate the flesch reading ease score of a paragraph, based on the calculated words per sentence and syllables per word
function fleschReadingEase(wordsPerSentence, syllablesPerWord) {
    var result = 206.835 - (1.015*wordsPerSentence) - (84.6*syllablesPerWord);
    console.log(`The Flesch Reading Ease of this answer is: ${result}\n`);
    return Math.round(result);
}

//calculate the flesch-kincaid grade level of a paragraph, based on the calculated words per sentence and syllables per word
function fleschKincaidGradeLevel(wordsPerSentence, syllablesPerWord) {
    var result = Math.round((0.39*wordsPerSentence) + (11.8*syllablesPerWord) - 15.59);
    console.log(`The Flesch-Kincaid Grade Level of this answer is: ${result}\n`);
    return result;
}

//translate the grade score from american school system to irish school system
function americanGradesToIrish(gradeLevel) {
    var irishSchoolYear;

    //below grade 1 is junior or senior infants
    if(gradeLevel < 1) {
        irishSchoolYear = `Junior Infants-Senior Infants`;
    }
    //above grade 12 is post-secondary
    else if (gradeLevel > 12) {
        irishSchoolYear = `College`;
    }
    //corresponding numbers 1-12 to the irish school year
    else {
        switch(gradeLevel) {
            case gradeLevel = 1:
                irishSchoolYear = `1st Class`;
                break;
            case gradeLevel = 2:
                irishSchoolYear = `2nd Class`;
                break;
            case gradeLevel = 3:
                irishSchoolYear = `3rd Class`;
                break;
            case gradeLevel = 4:
                irishSchoolYear = `4th Class`;
                break;
            case gradeLevel = 5:
                irishSchoolYear = `5th Class`;
                break;
            case gradeLevel = 6:
                irishSchoolYear = `6th Class`;
                break;
            case gradeLevel = 7:
                irishSchoolYear = `1st Year`;
                break;
            case gradeLevel = 8:
                irishSchoolYear = `2nd Year`;
                break;
            case gradeLevel = 9:
                irishSchoolYear = `3rd Year`;
                break;
            case gradeLevel = 10:
                irishSchoolYear = `Transition Year`;
                break;
            case gradeLevel = 11:
                irishSchoolYear = `5th Year`;
                break;
            case gradeLevel = 12:
                irishSchoolYear = `6th year`;
                break;
        }
    }
    console.log(`The Flesch-Kincaid Grade Level converted to Irish school years is: ${irishSchoolYear}\n`);
    return irishSchoolYear;
}