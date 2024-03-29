const express = require('express');
const { declineRequest, getAllRequests, updateProfile, loginUser, registerUser, logOut, getFriends, addFriend, findFriend, sendRequest, removeFriend, getMyInfo, createGroup, deleteGroup, addParticipantsToGroup,removeParticipant} = require('../controllers/userController');


const router = express.Router();

router.route('/login').post(loginUser);
router.route('/signup').post(registerUser);
router.route('/logout').post(logOut);
router.route('/addfriend').post(addFriend);
router.route('/friends').post(getFriends);
router.route('/findfriend').post(findFriend);
router.route('/sendrequest').post(sendRequest);
router.route('/getrequestsall/:id').get(getAllRequests);
router.route('/declinerequest').put(declineRequest);
router.route('/removefriend').delete(removeFriend);
router.route('/updateprofile').put(updateProfile)
router.route('/getmyinfo/:id').get(getMyInfo);
router.route('/create-group').post(createGroup);
router.route('/delete-group').delete(deleteGroup);
router.route('/update-group').put(addParticipantsToGroup);
router.route('/remove-group-participant').delete(removeParticipant); 

module.exports = router;
