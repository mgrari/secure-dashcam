const mongoose = require("mongoose");


const videoChunkSchema = new mongoose.Schema({
  videoName: {
    type: String, // Relates to the video name in the Video model
    required: true,
  },
  chunk: {
    type: Object, // Encrypted video chunk
    required: true,
  },
  metadata: [
    {
      chunkIndex: { type: Number, required: true },
      timestamp: { type: Date, required: true },
      chunkSize: { type: Number, required: true },
    },
  ],
});

module.exports = mongoose.model("VideoChunk", videoChunkSchema);
