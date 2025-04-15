var express = require("express");
var router = express.Router();
var Concert = require("../model/concertSchema");

/* GET home page. */
router.get("/", function (req, res, next) {
  Concert.find()
    .sort({ date: 1 })
    .limit(3)
    .then((events) => {
      res.render("index", {
        title: "Concert Nation",
        events: events,
        userName: req.session.userName || "",
        role: req.session.role || "",
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

router.get("/all_events", (req, res) => {
const {page=1,limit = 3} = req.query
const options = {
  page: parseInt(page, 10),
  limit: parseInt(limit, 10),
};

  Concert.paginate({},options)
    .then((events) => {
      console.log("Rendering all_event with title:", "All Events");
      res.render("all_events", {
        title: "All Events",
        events: events.docs,
        pagination:events,
        userName: req.session.userName,
        role: req.session.role || "",
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

module.exports = router;
