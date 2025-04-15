var express = require('express')
var router = express.Router()
var Booking = require('../model/bookingSchema')
var Concert = require('../model/concertSchema')
var QRcode = require('qrcode')
var fs = require('fs').promises
var ejs = require('ejs')
var pdf = require('html-pdf-node')
const path = require('path')
var nodemailer = require('nodemailer')

function authentication(req, res, next) {
    if (req.session.userId) {
        return next()
    } else {
        res.redirect('/users/login')
    }
}

const QRcodeGenerator = (qrData) => {

    return new Promise((resolve, reject) => {
        QRcode.toDataURL(qrData, (err, qrCodeUrl) => {
            if (err) {
                return reject(err)
            } else {
                return resolve(qrCodeUrl)
            }
        })
    })
}

const pdfGenerator = async (eventId) => {
    const bookedEvent = await Booking.findById(eventId).populate('concert_id')

    const template = await fs.readFile('./views/pdf_template.ejs', { encoding: 'utf-8' })
    const html = ejs.render(template, { bookingData: bookedEvent, qrCode: null })

    const options = { format: 'A4' }

    const pdfBuffer = await pdf.generatePdf({ content: html }, options)

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');

    const safeEmail = bookedEvent.email.replace(/[@.]/g, '_');
    const concertName = bookedEvent.concert_id.concertName.replace(/\s+/g, '_');

    const fileName = `${safeEmail}_${concertName}_${timestamp}.pdf`;
    const filePath = path.join(__dirname, '..', 'public', 'pdfs', fileName);
    await fs.writeFile(filePath, pdfBuffer);

    const pdfUrl = `/pdfs/${bookedEvent.email}_${bookedEvent.concert_id.concertName}.pdf`;

    return pdfUrl
}

const emailSender = async (eventId, qrcode) => {
    try {
        const bookedEvent = await Booking.findById(eventId).populate('concert_id')

        var transport = nodemailer.createTransport({
            host: "sandbox.smtp.mailtrap.io",
            port: 2525,
            auth: {
                user: "c24e9f0b88ac85",
                pass: "b8cb53bb44264d"
            }
        });

        const template = await fs.readFile('./views/pdf_template.ejs', { encoding: 'utf-8' })
        const mailOptions = {
            from: 'vivekpadinjarote@gmail.com',
            to: 'gokulth@gmail.com',
            subject: 'Ticket Booked Successfully',
            html: ejs.render(template, { bookingData: bookedEvent, qrCode: qrcode })
        }
        const mail = await transport.sendMail(mailOptions)
        console.log('Email Sent: ', mail.response)

        transport.close()
    } catch (err) {
        console.error(err)
        res.status(500).send('Internal Server Error')
    }

}



router.get('/details/:id', authentication, (req, res) => {
    event_Id = req.params.id
    Concert.findById(event_Id).then(event => {
        res.render('details', {
            title: event.concertName, userName: req.session.userName || "",
            role: req.session.role || "", event, userEmail: req.session.userEmail || ""
        })
    })
})



router.post('/booknow/:id', async (req, res) => {
    try {
        const { userName, userEmail, location, totalAmount, ticketsBooked } = req.body
        const concert = await Concert.findById(req.params.id)

        if (!concert) {
            return res.status(404).send('Data not found')
        }
        concert.ticketsAvailable = concert.ticketsAvailable - Number(ticketsBooked)

        await concert.save()

        const concertId = concert._id
        const concertName = concert.concertName
        const newBooking = new Booking({ concert_id: concertId, concertName, email: userEmail, username: userName, ticketsBooked, totalAmount, location })
        await newBooking.save()

        res.redirect(`/booking/confirmedBooking/${newBooking._id}`)

    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error')
    }
})

router.get('/confirmedBooking/:id', async (req, res) => {
    try {
        const bookedEvent = await Booking.findById(req.params.id).populate('concert_id')
        if (!bookedEvent) {
            return res.status(404).send('Booked Event Not Found')
        }

        const pdfUrl = await pdfGenerator(req.params.id)
        const qrCodeUrl = await QRcodeGenerator(pdfUrl)
        await emailSender(req.params.id, qrCodeUrl)

        res.render('confirmedBooking', { title: `Tickets for ${bookedEvent.concertName}`, bookingData: bookedEvent, QRCode: qrCodeUrl, userName: req.session.userName || "", role: req.session.role || "", })
    } catch (err) {
        console.error(err)
        res.status(500).send("Internal Server Error")
    }

})

router.get('/mybookings', authentication, async (req, res) => {
    try {
        const perPage = 3;
        const page = parseInt(req.query.page) || 1;

        const totalBookings = await Booking.countDocuments({ email: req.session.userEmail });

        const events = await Booking.find({ email: req.session.userEmail })
            .populate('concert_id')
            .sort({ createdAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage);

        if (!events) {
            res.status(404).send("No events booked")
        }
        const bookingsWithQR = await Promise.all(events.map(async (event) => {
            const data = {
                concertName: event.concertName,
                email_id: event.email,
                userName: event.username,
                ticketsBooked: event.ticketsBooked,
                totalAmount: event.totalAmount,
                location: event.location
            }


            const qrCodeData = JSON.stringify(data);

            const qrCodeUrl = await QRcodeGenerator(qrCodeData)

            return { ...event._doc, qrCodeUrl }

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

        res.render('bookingHistory', { title: 'My Bookings', events: bookingsWithQR, userName: req.session.userName || "", role: req.session.role || "", pagination })

    } catch (err) {
        console.error(err)
        res.status(500).send("Internal Server Error")
    }

})

module.exports = router