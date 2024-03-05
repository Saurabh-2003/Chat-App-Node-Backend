const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true,
        maxLength: [200, "Message Cannot Be  Greater Than 200 Characters!!"]
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { toJSON: { virtuals: true } });

// Define a virtual field for 'fromName'
messageSchema.virtual('fromName', {
    ref: 'User',
    localField: 'from',
    foreignField: '_id',
    justOne: true,
    autopopulate: true,
    options: { select: 'name' }
});

// Define a virtual field for 'fromImage'
messageSchema.virtual('fromImage', {
    ref: 'User',
    localField: 'from',
    foreignField: '_id',
    justOne: true,
    autopopulate: true,
    options: { select: 'image' }
});

messageSchema.plugin(require('mongoose-autopopulate'));

module.exports = mongoose.model('Message', messageSchema);
