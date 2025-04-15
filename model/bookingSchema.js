const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const bookingSchema=new mongoose.Schema({
    concert_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'Concert',
        required:[true,'Concert Id is required']
    },
    email:{
        type: String,
        required:[true,'Email is required']
    },
    username:{
        type: String,
        required:[true,'user name is required']
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
},{
    timestamps:true,
})

bookingSchema.plugin(mongoosePaginate)

const Booking = new mongoose.model('BookingDetails',bookingSchema)

module.exports=Booking