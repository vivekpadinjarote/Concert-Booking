const express = require("express");
const router = express.Router();
const User = require("../model/userSchema");
const { check, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const Concert = require('../model/concertSchema')
const Booking = require('../model/bookingSchema')
var QRcode = require('qrcode')
var fs = require('fs').promises
var ejs = require('ejs')
var pdf = require('html-pdf-node')
const path = require('path')
var nodemailer = require('nodemailer')
var moment = require("moment");
var multer = require("multer");
var crypto = require('crypto')
var jwt = require('jsonwebtoken');
const { decode } = require("punycode");

function generateSecretKey(){
  return crypto.randomBytes(32).toString('hex');
}

const verifyToken = (req,res,next)=>{
  const token = req.headers.authorization?.split(' ')[1]
  console.log(token)
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - Missing token' });
  }

  jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
    if (err) {
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }

    req.userId = decoded.userId;
    req.userEmail = decoded.userEmail
    req.userName = decoded.userName
    req.role = decoded.role

    next();
  })

}

function verifyAdmin(req,res,next){

  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized - Missing token' });
  }

  jwt.verify(token,process.env.JWT_SECRET,(err,decoded)=>{
    if (err) {
      return res.status(401).json({ message: 'Unauthorized - Invalid token' });
    }
    const { userId, userEmail, userName, role } = decoded;

    if (role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden - Admin access required' });
    }

    req.userId = userId;
    req.userEmail = userEmail;
    req.userName = userName;
    req.role = role;

    next();
  })
}

const QRcodeGenerator = (qrData)=>{
  return new Promise((resolve,reject)=>{
      QRcode.toDataURL(qrData,(err,qrCodeUrl)=>{
          if(err){
             return reject(err)
          }else{
              return resolve(qrCodeUrl)
          }
     })
  })
}

const pdfGenerator = async (eventId)=>{
  const bookedEvent = await Booking.findById(eventId)

  const template = await fs.readFile('./views/pdf_template.ejs',{encoding:'utf-8'})
  const html = ejs.render(template,{bookingData:bookedEvent,qrCode:null})

  const options = {format:'A4'}

  const pdfBuffer = await pdf.generatePdf({content:html},options)

  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-') 

  const safeEmail = bookedEvent.email.replace(/[@.]/g, '_');
  const concertName = bookedEvent.concertName.replace(/\s+/g, '_');
  
  const fileName = `${safeEmail}_${concertName}_${timestamp}.pdf`;
  const filePath = path.join(__dirname, '..', 'public', 'pdfs', fileName);
  await fs.writeFile(filePath, pdfBuffer);

  const pdfUrl = `/pdfs/${fileName}`;
  return pdfUrl
}

const emailSender = async (eventId,qrcode)=>{
  try{
      const bookedEvent = await Booking.findById(eventId)

      var transport = nodemailer.createTransport({
          host: "sandbox.smtp.mailtrap.io",
          port: 2525,
          auth: {
            user: "c24e9f0b88ac85",
            pass: "b8cb53bb44264d"
          }
      });

      const template = await fs.readFile('./views/pdf_template.ejs',{encoding:'utf-8'})
      const mailOptions = {
          from:'vivekpadinjarote@gmail.com',
          to:'gokulth@gmail.com',
          subject:'Ticket Booked Successfully',
          html:ejs.render(template,{bookingData:bookedEvent,qrCode:qrcode})
      }
      const mail=await transport.sendMail(mailOptions)
      console.log('Email Sent: ',mail.response)

      transport.close()
  }catch(err){
      console.error(err)
  }
}




router.post(
  "/signup",
  [
    check("username").isAlpha().withMessage("Invalid user name"),
    check("email").isEmail().withMessage("Invalid Email Address"),
    check("password")
      .isLength({ min: 8 })
      .withMessage("Password must contain at least 8 characters"),
  ],
  async (req, res) => {
    const { email, password, username, confirmpassword } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg);
      return res.status(400).json({ errors: errorMessages });
    }

    if (password !== confirmpassword) {
      return res.status(400).json({ message: "Confirm Password is incorrect" });
    }

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, email, password: hashedPassword, role: "user" });
      await user.save();

      res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
      console.error("Error:", err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

router.post(
  "/login",
  [
    check("email").isEmail().withMessage("Invalid Email Address"),
    check("password")
      .isLength({ min: 8 })
      .withMessage("Password must contain at least 8 characters"),
  ],
  async (req, res) => {
    const { email, password } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err=> err.msg)
      return res.status(400).json({ errors: errorMessages });
    }

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(user.email)
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({userId:user._id,userEmail:user.email,userName:user.username,role:user.role},process.env.JWT_SECRET = generateSecretKey(),{expiresIn:'1h'})

      res.status(200).json({ message: "Login successful", user: { username: user.username, email: user.email, role:user.role },token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
);

router.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logout successful" });
  });
});








const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/events", verifyAdmin ,async (req, res) => {
  try {
    const { page = 1, limit = 4 } = req.query;
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    };
    const events = await Concert.paginate({}, options);
    res.status(200).json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/register_event", verifyAdmin ,upload.single("coverPic"), async (req, res) => {
  try {
    const {
      concertName,
      eventId,
      location,
      price,
      date,
      eventTime,
      ticketsAvailable,
    } = req.body;

    const coverPic = req.file?.buffer.toString("base64") || "";
    const formatedDate = moment(date, "YYYY-MM-DD").format("DD-MM-YYYY");

    const newEvent = new Concert({
      concertName,
      eventId,
      location,
      price,
      date: formatedDate,
      eventTime,
      ticketsAvailable,
      coverPic,
    });

    await newEvent.save();
    res.status(201).json({ message: "Event created successfully", event: newEvent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.get("/events/:id",verifyAdmin, async (req, res) => {
  try {
    const event = await Concert.findById(req.params.id);
    console.log(event)
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.status(200).json({concert:event});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.put("/events/:id",verifyAdmin,upload.single("coverPic"), async (req, res) => {
  try {
    const {
      concertName,
      eventId,
      location,
      price,
      date,
      eventTime,
      ticketsAvailable,
    } = req.body;

    console.log(date)
    const coverPic = req.file?.buffer.toString("base64") || "";
const formatedDate = moment(date, "YYYY-MM-DD").format("DD-MM-YYYY");

    const updatedEvent = await Concert.findByIdAndUpdate(
      req.params.id,
      {
        concertName,
        eventId,
        location,
        price,
        date: formatedDate,
        eventTime,
        ticketsAvailable,
        coverPic
      },
      { new: true }
    );

    if (!updatedEvent) return res.status(404).json({ message: "Event not found" });
    res.status(200).json({ message: "Event updated successfully", event: updatedEvent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete("/events/:id",verifyAdmin, async (req, res) => {
  try {
    const deletedEvent = await Concert.findByIdAndDelete(req.params.id);
    if (!deletedEvent) return res.status(404).json({ message: "Event not found" });
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});






router.get("/home", async (req, res) => {
  try {
    const events = await Concert.find()
      .sort({ date: 1 })
      .limit(3);

    res.status(200).json({
      success: true,
      message: "Top 3 upcoming events",
      eventData: events,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

router.get("/allevents",verifyToken, async (req, res) => {
  const { page = 1, limit = 3 } = req.query;

  try {
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { date: 1 },
    };

    const result = await Concert.paginate({}, options);

    res.status(200).json({
      success: true,
      message: "Paginated list of events",
      concerts: result.docs,
      pagination: {
        totalDocs: result.totalDocs,
        totalPages: result.totalPages,
        currentPage: result.page,
        hasPrevPage: result.hasPrevPage,
        hasNextPage: result.hasNextPage,
        prevPage: result.prevPage,
        nextPage: result.nextPage,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});








router.get('/details/:id',verifyToken,async (req,res)=>{
try {
  
    const event_Id = req.params.id;
    const event = await Concert.findById(event_Id);

    if (!event) {
      return res.status(404).json({ success: false, message: "No Event Found" });
    }

    res.status(200).json({ success: true, concert: event ,username:req.userName,email:req.userEmail});
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post('/booknow/:id',async(req,res)=>{
  try{
      const {userName,userEmail,location,totalAmount,ticketsBooked} = req.body
      const concert = await Concert.findById(req.params.id)

      if(!concert){
          return res.status(404).json({message:'Data not found'})
      }
      concert.ticketsAvailable= concert.ticketsAvailable - Number(ticketsBooked)
      await concert.save()
      
      const concertLocation = location
      const concertName = concert.concertName
      const concertPrice = concert.price
      const concertTime = concert.eventTime
      const concertdate = concert.date
      const concertCoverPic = concert.coverPic

      const newBooking = new Booking({
        concertName,
        email:userEmail,
        username:userName,
        ticketsBooked,totalAmount,
        location:concertLocation,
        date:concertdate,
        eventTime:concertTime,
        price:concertPrice,
        coverPic:concertCoverPic
      })

      await newBooking.save()
      
      res.status(200).json({success:true, message:"Booking Successfull", bookingId: newBooking._id})
  }catch(err){
      console.error(err);
      res.status(500).json({message:'Internal Server Error'})  
  }
})

router.get('/confirmedBooking/:id',async(req,res)=>{
  try{
      const bookedEvent = await Booking.findById(req.params.id)
      if(!bookedEvent){
          return res.status(404).json({message:'Booked Event Not Found'})
      }

      console.log(bookedEvent)
      const pdfUrl = await pdfGenerator(req.params.id)
      const qrCodeUrl = await QRcodeGenerator(pdfUrl)
      await emailSender(req.params.id,qrCodeUrl)

      res.status(200).json({success:true,bookingData:bookedEvent,QRCode:qrCodeUrl,userName: req.session.userName || "",role: req.session.role || ""})
      // res.render('confirmedBooking',{title:`Tickets for ${bookedEvent.concertName}`,bookingData:bookedEvent,QRCode:qrCodeUrl,userName: req.session.userName || "",role: req.session.role || "",})
  }catch(err){
      console.error(err)
      res.status(500).json({message:"Internal Server Error"})
  }
})

router.get('/mybookings',verifyToken,async(req,res)=>{
  try{
      const perPage = 6;
      const page = parseInt(req.query.page);

      const totalBookings = await Booking.countDocuments({ email: req.userEmail });
      const events = await Booking.find({ email: req.userEmail })
          .sort({createdAt:-1})
          .skip((page - 1) * perPage)
          .limit(perPage);

      if(!events){
          res.status(404).json({message:"No events booked"})
      }
      console.log(events)
      const bookingsWithQR = await Promise.all(events.map(async (event)=>{
        console.log(event) 
        const data={
              concertName: event.concertName,
              email_id: event.email,
              userName: event.username,
              ticketsBooked: event.ticketsBooked,
              totalAmount: event.totalAmount,
              location: event.location
          }

          const qrCodeData = JSON.stringify(data);
          const qrCodeUrl = await QRcodeGenerator(qrCodeData)

          return {...event._doc,qrCodeUrl}
      }))
      const pagination = {
          page,
          perPage,
          totalPages: Math.ceil(totalBookings / perPage),
          hasPrevPage: page > 1,
          hasNextPage: page < Math.ceil(totalBookings / perPage),
          prevPage: page - 1,
          nextPage: page + 1
      };

      res.status(200).json({title:'My Bookings',events:bookingsWithQR,userName: req.session.userName || "",role: req.session.role || "",pagination})
  }catch(err){
      console.error(err)
      res.status(500).json({message:"Internal Server Error asdad"})
  }
})







module.exports = router;
