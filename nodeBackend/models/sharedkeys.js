const mongoose = require("mongoose")

const sharedkey = new mongoose.Schema({
    username: {  //trusted username
        type: String,
        required: true
    },
    encrypted_symmetric_key: {
        type: String,
        required: true
    },
    encrypted_hmac_key: {
        type: String,
        required: false
    },
    regular_username: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("Sharedkey", sharedkey)