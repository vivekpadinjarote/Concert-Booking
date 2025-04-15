var express = require("express");
var router = express.Router();
var User = require("../model/userSchema");
var { check, validationResult } = require("express-validator");
var bcrypt = require("bcrypt");

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.render("signup", { title: "Sign Up", errors: null, message: null });
});

router.post(
  "/signup",
  [
    check("username").isAlpha().withMessage("Invalid user name"),
    check("email").isEmail().withMessage("Invalid Email Address"),
    check("password")
      .isLength({ min: 8 })
      .withMessage("Password must contain atleast 8 characters"),
  ],
  (req, res) => {
    const { email, password, username, confirmpassword } = req.body;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(errors);
      return res.render("signup", {
        title: "Sign Up",
        errors: errors.array(),
        message: null,
      });
    }

    if (password !== confirmpassword) {
      return res.render("signup", {
        title: "Sign Up",
        errors: null,
        message: "Confirm Password is incorrect",
      });
    }

    User.findOne({ email })
      .then((existinUser) => {
        if (existinUser) {
          return res.render("signup", {
            title: "Sign Up",
            errors: null,
            message: "User already exist",
          });
        } else {
          return bcrypt.hash(password, 10);
        }
      })
      .then((hashedPassword) => {
        const user = new User({
          username,
          email,
          password: hashedPassword,
          role: "user",
        });
        return user.save();
      })
      .then(() => {
        res.redirect("/users/login");
      })
      .catch((err) => {
        console.error("Error:", err);
        res.status(500).send("Internal Server Error");
      });
  }
);

router.get("/login", (req, res) => {
  res.render("login", { title: "Login", errors: null, message: null });
});

router.post(
  "/login",
  [
    check("email").isEmail().withMessage("Invalid Email Address"),
    check("password")
      .isLength({ min: 8 })
      .withMessage("Password must contain atleast 8 characters"),
  ],
  (req, res) => {
    const { email, password } = req.body;

    const errors = validationResult(req);

    console.log(errors);

    if (!errors.isEmpty()) {
      return res.render("login", {
        title: "Login",
        errors: errors.array(),
        message: null,
      });
    }

    User.findOne({ email })
      .then((user) => {
        if (!user) {
          return res.render("login", {
            title: "Login",
            errors: null,
            message: "User Email Not Found",
          });
        }

        foundUser = user;

        return bcrypt.compare(password, user.password);
      })
      .then((isValidPassword) => {
        if (!isValidPassword) {
          return res.render("login", {
            title: "Login",
            errors: null,
            message: "Invalid Login credential",
          });
        }

        req.session.userId = foundUser._id;
        req.session.userEmail = foundUser.email;
        req.session.userName = foundUser.username;
        req.session.role = foundUser.role;

        res.redirect("/");
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send("Internal Server Error");
      });
  }
);

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Logout Failed");
    }
    res.redirect("/");
  });
});

module.exports = router;
