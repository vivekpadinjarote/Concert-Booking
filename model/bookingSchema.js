const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const bookingSchema=new mongoose.Schema({
    concertName:{
        type: String,
        required: [true,'Concert Name is required'],
    },
    location:{
        type: String,
        required: [true,'Venue field is required'],
    },
    email:{
        type: String,
        required:[true,'Email is required']
    },
    username:{
        type: String,
        required:[true,'user name is required']
    },
    date:{
        type: String,
        required: [true,'Date of the program is required'],
    },
    eventTime:{
        type:String,
        required:[true,'Time is required'],
    },
    price:{
        type: Number,
        required:[true,'Price is required'],
        min: [0,'price cannot be negative'],
    },
    ticketsBooked:{
        type: Number,
        required:[true,'Number of tickets is required'],
        min:[1,'Booked tickets cannot be less than 1']
    },
    totalAmount:{
        type: Number,
        required:[true,'Total amount is required']
    },
    coverPic:{
        type: String,
        required: [true,'Upload Picture']
    }
},{
    timestamps:true,
})

bookingSchema.plugin(mongoosePaginate)

const Booking = new mongoose.model('BookingDetails',bookingSchema)

module.exports=Booking