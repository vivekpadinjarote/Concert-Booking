const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username:{
        type: String,
        required:[true,'Username is required']
    },
    email:{
        type: String,
        required: [true,'Email field is required'],
    },
    password:{
        type: String,
        required: [true,'Password field is required'],
        minlength: [8,'Password must contain atleast 8 characters']
    },
    role:{
        type: String,
    },
})

const User = new mongoose.model('User',userSchema)

module.exports=User