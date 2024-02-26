const express = require('express');
const {createMessage, getAllMessages} = require('../controllers/messageController.js');

const router = express.Router();
router.route('/sendmessage' ).post(createMessage);
router.route('/allmessages').post(getAllMessages);

module.exports = router