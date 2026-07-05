const logger = require("../logging/logger")
const router = require('express').Router()
const jwt = require('jsonwebtoken')
const {
    registerUser,
    currentUser,
    loginUser,
  } = require("../controllers/userController");
const User = require('../models/user')
const validateToken = require("../middleware/validateTokenHandler")

router.post('/register', registerUser)

router.post('/login', loginUser)

router.get('/current', validateToken, currentUser)

router.get('/logout', validateToken, (req, res) => {
    try {
        res.cookie('jwt', '', {maxAge:0})

        res.status(200).send({
            message: 'success'
        })
    } catch(error) {
        logger.info("500: Server Error")
        res.status(500).send({message: "Server error"})
    }
})

module.exports = router;