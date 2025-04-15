const mongoose = require('mongoose')

mongoose.connect('mongodb://localhost:27017/Concert_DB')

const db = mongoose.connection;

db.on('error',console.error.bind(console,'MongoDb Connection Error'))
db.once('open',()=>{
    console.log('Connected to MongoDB')
})

module.exports = db