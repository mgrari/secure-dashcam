require('dotenv').config(); // Load .env variables
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const TrustedUser = require("../models/trusteduser");
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const Videos = require("../models/videos");
const logger = require("../logging/logger");

//@desc Register a user
//@route POST /api/user/register
//@access public
const registerUser = async (req, res) => {
    const userAvailable = await User.findOne({ username: req.body.username})
    const trusteduserAvailable = await TrustedUser.findOne({ username: req.body.username})
    if (userAvailable || trusteduserAvailable) {
        logger.info("400: User already registered")
        return res.status(400).send({message: "User already registered!"})
    }

    let user;
    if(req.body.organization && req.body.country && req.body.fullname) {
        user = new TrustedUser({
            username: req.body.username,
            hmac_username: req.body.hmac_username,
            email: req.body.email,
            hmac_email: req.body.hmac_email,
            fullname: req.body.fullname,
            hmac_fullname: req.body.hmac_fullname,
            organization: req.body.organization,
            hmac_organization: req.body.hmac_organization,
            country: req.body.country,
            hmac_country: req.body.hmac_country,
            encrypted_symmetric_key: req.body.encrypted_symmetric_key,
            signature_symmetric_key: req.body.signature_symmetric_key,
            encrypted_symmetric_key_videos: req.body.encrypted_symmetric_key_videos,
            signature_symmetric_key_videos: req.body.signature_symmetric_key_videos,
            encrypted_hmac_key: req.body.encrypted_hmac_key,
            signature_hmac_key: req.body.signature_hmac_key,
            encrypted_hmac_key_videos: req.body.encrypted_hmac_key_videos,
            signature_hmac_key_videos: req.body.signature_hmac_key_videos,
            public_key: req.body.public_key
        })
    }
    else if(!(req.body.organization || req.body.country || req.body.fullname)) {
        user = new User({
            username: req.body.username,
            hmac_username: req.body.hmac_username,
            email: req.body.email,
            hmac_email: req.body.hmac_email,
            encrypted_symmetric_key: req.body.encrypted_symmetric_key,
            signature_symmetric_key: req.body.signature_symmetric_key,
            encrypted_symmetric_key_videos: req.body.encrypted_symmetric_key_videos,
            signature_symmetric_key_videos: req.body.signature_symmetric_key_videos,
            encrypted_hmac_key: req.body.encrypted_hmac_key,
            signature_hmac_key: req.body.signature_hmac_key,
            encrypted_hmac_key_videos: req.body.encrypted_hmac_key_videos,
            signature_hmac_key_videos: req.body.signature_hmac_key_videos,
            public_key: req.body.public_key
        })
    } else {
        logger.info("400: The user is not valid")
        return res.status(400).json({ success: false, message: 'The user is not valid!' });
    }
    // Generate a TOTP secret for the user
    const secret = speakeasy.generateSecret({ name: `DashSecure (${req.body.username})`, length: 20 })

    // Store the user's secret in the database
    user['secret'] = secret.hex

    let qrcode_image;
    // Generate a QR code for Google Authenticator
    await qrcode.toDataURL(secret.otpauth_url, (err, image_data) => {
        qrcode_image = image_data;
    });
    const result = await user.save()

    // Overwrite or initialize the entry in the Videos collection
    const userVideos = await Videos.findOneAndUpdate(
        { username: req.body.username }, // Query to find the existing document
        { username: req.body.username, videos: [] }, // Data to overwrite/reinitialize
        { new: true, upsert: true } // Create a new document if none exists
    );

    const {username, email, hmac_email, ...data} = await result.toJSON()
    return res.status(200).send({username, email, hmac_email, secret: secret.base32, qrcode_image})
}

//@desc Login user
//@route POST /api/user/login
//@access public
const loginUser = async(req, res) => {
    const { username, code } = req.body;
    let user = await User.findOne({username: username})

    if(!user) {
        user = await TrustedUser.findOne({username: username})

        if (!user) {
            logger.info("401: Username is not valid")
            return res.status(401).send({messsage: "username is not valid"})
        }
    }

    const verified = speakeasy.totp.verify({
        secret: user.secret,
        encoding: 'hex',
        token: code,
        window: 1, // Accept a 1-step (30-second) margin of error
    })

    if (!verified) {
        logger.info("400: Invalid OTP")
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    
    const accessToken = jwt.sign(
        {
          user: {
            public_key: user.public_key,
            username: user.username,
            id: user._id,
          },
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "30m" }
    );
    const {public_key, private_key, ...data} = user
    return res.status(200).send({ accessToken , public_key})
}

//@desc Current user info
//@route GET /api/user/current
//@access private
const currentUser = async (req, res) => {
    try {
        let user = await User.findOne({username: req.user.username})
        let isTrustedUser = false;
        if (!user) {
            isTrustedUser = true;
            user = await TrustedUser.findOne({username: req.user.username})
        }

        const {public_key, ...data} = await user.toJSON()
        

        res.status(200).send({isTrustedUser, ...data})
    } catch (e) {
        logger.info("400: Unauthorized")
        res.status(400).send({message: "Unauthorized"})
    }
}



module.exports = { registerUser, loginUser, currentUser };