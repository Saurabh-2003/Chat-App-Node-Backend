const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    isGroup: {
        type: Boolean,
        required: false,
        default: false
    },
    name: {
        type: String,
        required: [true, "Please Enter a Username "],
        maxLength: [30, "Username cannot exceed 30 characters "],
        validate: {
            validator: async function (name) {
                if (!this.isGroup) {
                    return true; // If it's not a group, uniqueness check is not required
                }
                const existingUser = await mongoose.model('User').findOne({ name, isGroup: true });
                return !existingUser; // Return true if no existing group with the same name
            },
            message: 'Group name must be unique'
        }
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        validate: [validator.isEmail, "Please Enter a valid Email"]
    },

    admin: {
        type: String,
        required: () => {
            return this.isGroup;
        }
    },
    password: {
        type: String,
        required: () => { return this.isGroup },
        minLength: [9, "Password should be greater than 8 Characters"],
        maxLength: [30, "Password should be greater than 30 characters"],
        select: false,
    },
    public_id: {
        type: String,
        required: false
    },
    image: {
        type: String,
        required: false
    },
    friends: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    requestsRecieved: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            unique: true,
        }
    ],
    requestsSent: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            unique: true
        }
    ],

});

// Before Saving the password Encrpt it :
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || this.isGroup) {
        next();
    }
    this.password = await bcrypt.hash(this.password, 10);
});

// During login compare the password :
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
}

// Generate authentication token method
userSchema.methods.generateAuthToken = function () {
    const token = jwt.sign({ _id: this._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN // Set expiration time for the token
    });
    return token;
};
module.exports = mongoose.model("User", userSchema);
