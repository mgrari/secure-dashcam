const mongoose = require("mongoose");

const logSchema = new mongoose.Schema({
    log: {
        type: String,
        required: true
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Log', logSchema);