var express = require("express");
var router = express.Router();
var Concert = require("../model/concertSchema");
var moment = require("moment");
var multer = require("multer");

router.get("/", (req, res) => {
  const {page=1,limit=4}=req.query
  const options={
    page:parseInt(page,10),
    limit:parseInt(limit,10)
  }
  Concert.paginate({},options)
    .then((events) => {
      res.render("admin/add_event", {
        title: "Register",
        events:events.docs,
        pagination:events,
        role: req.session.role || "",
        userName: req.session.userName || "",
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post("/register_event", upload.single("coverPic"), (req, res) => {

  const {
    concertName,
    eventId,
    location,
    price,
    date,
    eventTime,
    ticketsAvailable,
  } = req.body;
  const coverPic = req.file.buffer.toString("base64");

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

  newEvent
    .save()
    .then(() => {
      res.redirect("/admin");
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

router.get("/update_event/:id", (req, res) => {
  const event_Id = req.params.id;
  Concert.findById(event_Id)
    .lean()
    .then((event) => {
      res.render("admin/update_event", {
        event: event,
        title: "Update Event",
        role: req.session.role || "",
        userName: req.session.userName || "",
      });
    })
    .catch((err) => {
      console.error(err);
    });
});

router.post("/update_event/:id", (req, res) => {
  const event_Id = req.params.id;
  const {
    concertName,
    eventId,
    location,
    price,
    date,
    eventTime,
    ticketsAvailable,
  } = req.body;
  
  const formatedDate = moment(date, "YYYY-MM-DD").format("DD-MM-YYYY");

  Concert.findByIdAndUpdate(event_Id, {
    concertName,
    eventId,
    location,
    price,
    date:formatedDate,
    eventTime,
    ticketsAvailable,
  })
    .then(() => {
      res.redirect("/admin");
    })
    .catch((err) => {
      console.error(err);
    });
});

router.post("/delete_event/:id", (req, res) => {
  const event_Id = req.params.id;

  Concert.findByIdAndDelete(event_Id)
    .then(() => {
      res.redirect("/admin");
    })
    .catch((err) => {
      console.error(err);
    });
});

router.get("/list_all_events", (req, res) => {
  const {page=1,limit=4}=req.query
  const options={
    page:parseInt(page,10),
    limit:parseInt(limit,10)
  }
  Concert.paginate({},options).then((events) => {
    res.render("admin/list_all_events", {
      title: "Update Events",
      events: events.docs,
      pagination:events,
      role: req.session.role || "",
      userName: req.session.userName || "",
    });
  });
});

module.exports = router;
