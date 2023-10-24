import express from 'express';
import path from 'path';
import shortid from 'shortid';
import mongoose from 'mongoose';

mongoose.connect("mongodb://0.0.0.0:27017/short-url").then(() => {
    console.log("Mongodb Connected");
})

const urlSchema = new mongoose.Schema(
    {
        shortId: {
            type: String,
            required: true,
            unique: true,
        },
        redirectURL: {
            type: String,
            required: true,
        },
        visitHistory: [{ timestamp: { type: Number } }],
    },
    { timestamps: true }
);
const URL = mongoose.model("url", urlSchema);

const app = express();
const __dirname = path.resolve();

app.use(express.urlencoded({ extended: true }));
// Configure the EJS view engine
app.set('view engine', 'ejs');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
    // Assuming the 'index.ejs' file is in the 'views' directory
    const data = { url: `http://www.example.com/`,entry:`0` };
    res.render(__dirname + '/index.ejs', { data });
});

app.post("/url", async (req, res) => {
    const body = req.body;
    if (!body.url) return res.status(400).json({ error: "url is required" });

    // Check if the provided URL already exists in the database
    const existingEntry = await URL.findOne({ redirectURL: body.url });

    if (existingEntry) {
        const data = {
            url: `http://localhost:3000/${existingEntry.shortId}`,
            visitHistory: existingEntry.visitHistory, // Include the visit history
        };
        return res.render(__dirname + '/index.ejs', { data });
    }

    // If the URL is not found, create a new short URL
    const shortID = shortid();

    await URL.create({
        shortId: shortID,
        redirectURL: body.url,
        visitHistory: [],
    });

    const data = { url: `http://localhost:3000/${shortID}`, visitHistory: [] };
    res.render(__dirname + '/index.ejs', { data });
});



app.get("/:shortId", async (req, res) => {
    const shortId = req.params.shortId;
    const entry = await URL.findOneAndUpdate(
        {
            shortId,
        },
        {
            $push: {
                visitHistory: {
                    timestamp: Date.now(),
                },
            },
        }
    );
    if (!entry) {
        // Handle the case where the short URL doesn't exist
        return res.status(404).send("Short URL not found");
    }
    res.redirect(entry.redirectURL);
});

async function handleGetAnalytics(req, res) {
    const shortId = req.params.shortId;
    const result = await URL.findOneAndUpdate({ shortId });
    return res.json({
        totalClicks: result.visitHistory.length,
        analytics: result.visitHistory,
    });
}
app.get("/analytics/:shortId", handleGetAnalytics);

app.listen(3000, () => {
    console.log('Server Started');
});
