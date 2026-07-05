require('dotenv').config(); // Load .env variables
const express = require('express')
const mongoosse = require('mongoose')
const cors = require('cors')
const cookie_parser = require('cookie-parser')
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const decryptJWT = require('./middleware/decryptJWT');
const validateTokenRegularUser = require('./middleware/validateTokenRegularUser');
const validateTokenTrustedUser = require('./middleware/validateTokenTrustedUser');
const { decode } = require('punycode');
const app = express()
const User = require('./models/user')
const PORT = 8080;
const Video = require('./models/videos'); // Adjust the path
const logger = require("./logging/logger");
const TrustedUser = require('./models/trusteduser')
const SharedKeys = require('./models/sharedkeys')
const VideoChunk = require("./models/VideoChunk");
const user = require('./models/user');
const sharedkeys = require('./models/sharedkeys');


mongoosse.connect(process.env.DB_URL, {})
.then((res) => {
  console.log('connected to the database')
  logger.info(`connected to the database on ${process.env.DB_URL}`)
})
.catch((error) => {
  console.log(error)
  logger.error(`Error connecting to the database`, error)
})

app.use(cookie_parser())

app.use(cors({
  credentials: true,
  origin:['http://localhost:3000', 'https://localhost:3000','http://localhost:8080', 'https://localhost:8080']
}))



app.use(express.json())

app.use('/api/user', require('./routes/userRoutes'))

// Multer configuration for handling video chunks
const upload = multer({ storage: multer.memoryStorage() });


// const videoDir = path.join(__dirname, "videos");

// // Ensure folder exists
// if (!fs.existsSync(videoDir)) {
//   fs.mkdirSync(videoDir);
// }

app.get("/", (req, res) => {
  try {
    res.status(200).send("You are on the frontend page! To reach the backend one, connect to localhost:3000");
  } catch (error) {
    console.error("Error saving frame:", error);
    logger.error("500: Internal Server Error");
    res.status(500).send("Internal Server Error");
  }
});

// Introduction for anomalies detection
let lastChunkIndex = 0; 
let totalChunksReceived = 0;

// Structure to follow each video's state
const videoState = {}; 
const CLEANUP_DELAY = 60000; // 60 seconds

// Task to clean inactive video states
setInterval(() => {
  const now = Date.now();
  for (const videoId in videoState) {
    console.log(`Check of inactivity performed`);
    logger.info(`Check of inactivity performed`);
      if (now - videoState[videoId].lastActivity > CLEANUP_DELAY) {
          console.log(`Cleaning up state for video ${videoId} due to inactivity.`);
          logger.info(`Cleaning up state for video ${videoId} due to inactivity.`);
          delete videoState[videoId];
      }
  }
}, 10000); 

// Endpoint to handle video chunk upload
// Endpoint to handle video chunk upload
app.post("/stream", upload.none(), async (req, res) => {
  try {
    const { encryptedChunk, metadata } = req.body;

    // Validate inputs
    if (!encryptedChunk || !metadata) {
      logger.info("400: Missing required metadata or video chunk");
      return res.status(400).send("Missing encrypted chunk or metadata");
    }

    // Parse metadata and encryptedChunk
    const parsedMetadata = JSON.parse(metadata);
    const parsedEncryptedChunk = JSON.parse(encryptedChunk);
    const { chunkIndex, timestamp, chunkSize, videoId } = parsedMetadata;
    // console.log(parsedMetadata);
    const videoName = videoId;
    console.log("Received videoName:", videoName);

    if (!videoName || typeof videoName !== "string") {
      logger.info("400: Invalid or missing videoName in metadata");
      return res.status(400).send("Invalid or missing videoName in metadata");
    }

    // Decode and validate token
    const authHeader = req.headers.Authorization || req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      logger.info("401: User not authorized or token missing");
      return res.status(401).send({ message: "User not authorized or token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = decryptJWT(token);

    if (!decoded || !decoded.user || !decoded.user.username) {
      logger.info("401: Invalid token payload");
      return res.status(401).send({ message: "Invalid token payload" });
    }

    const username = decoded.user.username;

    // Ensure the user exists
    let videoRecord = await Video.findOne({ username });
    if (!videoRecord) {
      videoRecord = new Video({ username, videos: [] });
      await videoRecord.save();
    }

    // Check if the video name is already associated with the user
    if (!videoRecord.videos.some((video) => video.videoName === videoName)) {
      videoRecord.videos.push({ videoName });
      await videoRecord.save(); // Save the updated record
    }

    // Save the chunk and metadata in the VideoChunk collection
    const videoChunk = new VideoChunk({
      videoName,
      chunk: parsedEncryptedChunk, // Store the encrypted chunk
      metadata: [
        {
          chunkIndex,
          timestamp,
          chunkSize,
        },
      ],
    });

    await videoChunk.save();

    console.log(
      `Chunk ${chunkIndex} for video "${videoName}" saved. Timestamp: ${timestamp}, Size: ${chunkSize} bytes`
    );

    logger.info(
      `Chunk ${chunkIndex} for video "${videoName}" saved. Timestamp: ${timestamp}, Size: ${chunkSize} bytes`
    );

    res.status(200).send("Chunk and metadata received and processed");
  } catch (error) {
    console.error("Error processing video chunk:", error);
    logger.error(`500: Internal Server Error`);
    res.status(500).send("Internal Server Error");
  }
});


app.get("/getSymetric", async (req, res) => {
  try {
    let token;
      let authHeader = req.headers.Authorization || req.headers.authorization;
    
      if (!authHeader || !authHeader.startsWith("Bearer")) {
        logger.info("401: User not authorized or token missing")
        res.status(401).send({message: "User not authorized or token missing"});
      }
    
      token = authHeader.split(" ")[1]; 
      decoded = decryptJWT(token);

      if (!decoded || !decoded.user || !decoded.user.username) {
        logger.info("401: Invalid token payload")
        return res.status(401).send({ message: "Invalid token payload" });
      }
      const username = decoded.user.username;
      // Search for the user in the database
      const user = await User.findOne({ username: username });
      if (!user) {
        logger.info("404: User not found")
        return res.status(404).send({ message: "User not found" });
      }
      // Respond with the user's encrypted symmetric key
      res.status(200).send({
      message: "User found",
      encryptedSymmetricKey: user.encrypted_symmetric_key_videos,
      username: user.username,
    });
  } catch (error) {
    console.error("Error in /getSymetric route:", error.message);
    logger.error("Error in /getSymetric route:", error.message);
    res.status(500).send({ message: "Internal Server Error" });
  }

});

app.get('/api/users/list', validateTokenRegularUser, async (req, res) => {
  try {
    const users = await TrustedUser.find({}, { username: 1, public_key: 1, _id: 1 });
    const sharedkeysUsers = await SharedKeys.find({ regular_username: req.user.username});
    const rightsUsers = users.filter((user)=>{
      const keys = sharedkeysUsers.filter(key => key.username == user.username)
      return keys.length == 0;
    })
    res.json(rightsUsers);
  } catch (error) {
    console.error("Error fetching user:", error.message);
    logger.error("Error fetching user:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.post('/api/users/share', validateTokenRegularUser, async (req, res) => {
  try {
    const sharedkey = new SharedKeys({
      username: req.body.trusted_user,
      regular_username: req.user.username,
      encrypted_symmetric_key: req.body.encrypted_symmetric_key
    })
    
    await sharedkey.save()

    return res.status(200).json({message: "The videos have been sucessful shared with user: "+ sharedkey.username});
  } catch (error) {
    console.error("Error fetching user:", error.message);
    logger.error("Error fetching user:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
});


app.get('/api/video/trustedList', async (req, res) => {
  try {
    // Get and validate the token from the Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      logger.info("401: User not authorized or token missing");
      return res.status(401).send({ message: "User not authorized or token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = decryptJWT(token);

    if (!decoded || !decoded.user || !decoded.user.username) {
      logger.info("401: Invalid token payload");
      return res.status(401).send({ message: "Invalid token payload" });
    }

    const username = decoded.user.username;

    // Find the shared keys for the logged-in user
    const sharedKeysUsers = await SharedKeys.find({ username });

    const videosList = [];

    // Loop through each shared key and fetch the associated videos
    for (const key of sharedKeysUsers) {
      const ownerUsername = key.regular_username;
      const userVideos = await Video.findOne({ username: ownerUsername });

      if (!userVideos || userVideos.videos.length === 0) {
        logger.info(`No videos found for user: ${ownerUsername}`);
        continue;
      }

      const videoList = userVideos.videos.map((video) => ({
        name: video.videoName,
        sharedBy: ownerUsername, // Include the owner of the shared video
      }));

      videosList.push({
        username: ownerUsername,
        videos: videoList,
        encrypted_symmetric_key: key.encrypted_symmetric_key,
      });
    }

    res.status(200).json(videosList);
  } catch (error) {
    console.error("Error fetching trusted user videos:", error.message);
    logger.error("Error fetching trusted user videos:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
});

app.get('/api/video/list', async (req, res) => {
  try {
    // Get and validate the token from the Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      logger.info("401: User not authorized or token missing");
      return res.status(401).send({ message: "User not authorized or token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = decryptJWT(token);

    if (!decoded || !decoded.user || !decoded.user.username) {
      logger.info("401: Invalid token payload");
      return res.status(401).send({ message: "Invalid token payload" });
    }

    const username = decoded.user.username;

    // Fetch user's video list from the database
    const userVideos = await Video.findOne({ username });

    if (!userVideos || userVideos.videos.length === 0) {
      logger.info(`404: No videos found for user: ${username}`);
      return res.status(201).json({ error: "No videos found for the user." });
    }

    // Return the video names
    res.status(200).json({
      username: userVideos.username,
      videos: userVideos.videos.map((video) => ({ name: video.videoName })),
    });
  } catch (error) {
    console.error("Error fetching user videos:", error);
    logger.error("Error fetching user videos:", error.message);
    res.status(500).json({ error: "Internal server error." });
  }
});



app.delete('/api/video/:name', async (req, res) => {
  try {
    // Validate the token from the Authorization header
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).send({ message: "User not authorized or token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = decryptJWT(token);

    if (!decoded || !decoded.user || !decoded.user.username) {
      return res.status(401).send({ message: "Invalid token payload" });
    }

    const username = decoded.user.username; // Extract username
    const videoName = req.params.name; // Get video name from the request

    // Find the user's video record
    const userVideos = await Video.findOne({ username });

    if (!userVideos || userVideos.videos.length === 0) {
      return res.status(404).json({ error: "No videos found for the user." });
    }

    // Check if the video exists in the user's video list
    const videoIndex = userVideos.videos.findIndex((video) => video.videoName === videoName);

    if (videoIndex === -1) {
      return res.status(401).send({ message: "You cannot delete this video." }); // Unauthorized
    }

    // Remove the video from the user's video list
    userVideos.videos.splice(videoIndex, 1);
    await userVideos.save(); // Save the updated record

    // Remove all chunks associated with the video
    await VideoChunk.deleteMany({ videoName });

    logger.info(`Video "${videoName}" deleted successfully for user: ${username}`);
    res.status(200).send({ message: "Video deleted successfully!" });
  } catch (error) {
    console.error("Error deleting video:", error.message);
    logger.error("Error deleting video:", error.message);
    res.status(500).send({ error: "Internal server error." });
  }
});



app.get("/api/video/:name/:username/chunks", async (req, res) => {
  try {
    const username = req.params.username;
    const videoName = req.params.name;

    // Check if the user has access to the video
    const userVideos = await Video.findOne({ username });
    if (!userVideos || !userVideos.videos.some((video) => video.videoName === videoName)) {
      return res.status(404).send({ message: "Video not found or not authorized." });
    }

    // Fetch chunks for the video
    const chunks = await VideoChunk.find({ videoName }).sort({ "metadata.chunkIndex": 1 });

    if (chunks.length === 0) {
      return res.status(404).send({ message: "No chunks found for this video." });
    }

    // Send the chunks (encrypted)
    res.status(200).json(chunks.map((chunk) => ({
      chunk: chunk.chunk, // Encrypted chunk
      metadata: chunk.metadata, // Metadata for chunk
    })));
  } catch (error) {
    console.error("Error fetching video chunks:", error.message);
    res.status(500).send({ error: "Internal server error." });
  }
});




// HTTPS certificate and private key
const sslOptions = {
  key: fs.readFileSync('./certificates/Backend_server/backend_server.key'),
  cert: fs.readFileSync('./certificates/Backend_server/backend_server_chain.crt'), // Full chain cert
};

// Create the HTTPS server
const https = require('https');
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`Secure server is running at https://localhost:${PORT}`);
});


