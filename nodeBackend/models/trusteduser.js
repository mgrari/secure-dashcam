const mongoose = require("mongoose")

const trustedUserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    hmac_username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    hmac_email: {
        type: String,
        required: true
    },
    fullname: {
        type: String,
        required: true
    },
    hmac_fullname: {
        type: String,
        required: true
    },
    organization: {
        type: String,
        required: true
    },
    hmac_organization: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    hmac_country: {
        type: String,
    },
    encrypted_symmetric_key: {
        type: String,
        required: true
    },
    signature_symmetric_key: {
        type: String,
        required: true
    },
    encrypted_hmac_key: {
        type: String,
        required: true
    },
    signature_hmac_key: {
        type: String,
        required: true
    },
    public_key: {
        type: String,
        required: true
    },
    secret: {
        type: String,
        required: true
    }
})

module.exports = mongoose.model("TrustedUser", trustedUserSchema)