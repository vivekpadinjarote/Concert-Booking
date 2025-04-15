const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const concertSchema = new mongoose.Schema({
    concertName:{
        type: String,
        required: [true,'Concert Name is required'],
    },
    eventId:{
        type: String,
        required:[true,'A unique id is required'],
        unique:true,
    },
    location:{
        type: String,
        required: [true,'Venue field is required'],
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
    ticketsAvailable:{
        type: Number,
        required: [true,'Tickets field is required'],
        min: [0,'tickets available cannot be negative'],
    },
    coverPic:{
        type: String,
        required: [true,'Upload Picture']
    }
})

concertSchema.plugin(mongoosePaginate)

const Concert = new mongoose.model('Concert',concertSchema)

module.exports=Concert