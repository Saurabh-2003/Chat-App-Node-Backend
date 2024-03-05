const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required:[true, "Please Enter a Username "],
        maxLength:[30, "Username cannot exceed 30 characters "],
    },
    isGroup : {
      type:Boolean,
      required:false,
      default:false
    },
    email: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple documents to have a null value for the field
      validate: [validator.isEmail, "Please Enter a valid Email"]
  },
  
    admin: {
      type: String,
      required: () => {
        return this.isGroup;
      }
    },
    password: {
        type:String,
        required: () => {return this.isGroup},
        minLength:[9, "Please should be greater than 8 Characters"],
        maxLength:[30, "Password should be greater than 30 characters"],
        select:false,
      },
      public_id : {
        type:String,
        required:false
      },
      image:{
        type:String,
        required: false
      },
      friends: [
        {
            type:mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
      ],
      requestsRecieved: [
        {
          type:mongoose.Schema.Types.ObjectId,
          ref: 'User',
          unique:true,
          populate: { select: '_id name' }
        }
      ],
      requestsSent:[
        {
          type:mongoose.Schema.Types.ObjectId,
          ref: 'User',
          unique:true
        }
      ],

});

// Before Saving the password Encrpt it :
userSchema.pre('save', async function(next) {
    if(!this.isModified('password') || this.isGroup){
        next();
    }
    this.password = await bcrypt.hash(this.password, 10);
});

// During login comapre the password :
userSchema.methods.comparePassword = async function(enteredPassword){
    return await bcrypt.compare(enteredPassword, this.password);
}


module.exports = mongoose.model("User", userSchema);



