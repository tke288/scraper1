const express = require("express");
const mongojs = require("mongojs");
const cheerio = require("cheerio");
const exphbs = require("express-handlebars");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const logger = require("morgan");
const axios = require("axios");

const app = express();

const PORT = process.env.PORT || 4100;

var db = require("./models");

app.use(logger("dev"));
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");


mongoose.Promise = Promise;

if (process.env.MONGODB_URI){
  mongoose.connect(process.env.MONGODB_URI)
}else{
  mongoose.connect("mongodb://localhost/scraper", {
      useMongoClient: true
  })
}

// show the main page if no route was requested
app.get("/", function (req, res) {
  db.article
  .find({})
  .then(function(dbArticle) {
    if (dbArticle < 1) {
      res.render("scrape")
    } else {
      res.render("index", {data: dbArticle})
    }
  })
  .catch(function(error) {
    res.json(error);
  });
});


// // show list of movies
app.get("/movies", function (req, res) {
  db.article
  .find({saved: true})
  .then(function(dbArticle) {
    res.json(dbArticle);
  })
  .catch(function(error) {
    res.json(error);
  });
});


// show saved movies
app.get("/saved", function (req, res) {
  db.article
  .find({saved: true})
  .then(function(dbArticle) {
      res.render("saved", {data: dbArticle})
  })
  .catch(function(error) {
    res.json(error);
  });
});

// our user wants to get new movie listings, go scrape the site
app.get("/scrape", function (req, res) {
  db.article.remove().exec();
  axios("https://www.amctheatres.com/movies").then(function (response) {
    var $ = cheerio.load(response.data);
      $("div.MoviePostersGrid-text").each(function (i, element) {
              var newArticle = {};
      newArticle.link = 'https://www.amctheatres.com' + $(element).children('a').attr('href');
      newArticle.headline = $(element).children('h3').text();
      newArticle.summary = $(element).children('div').children('p').children("span:last-of-type").text();

      // insert the article into the db
      db.article.create(newArticle)
        .then(function (dbArticle) {
          res.json(dbArticle);
        })
        .catch(function (error) {
          res.json(error);
        });
    });

    res.redirect("/");
  });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  db.article
    .findOne({ _id: req.params.id })
    .populate("note")
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  db.note
    .create(req.body)
      return db.article.findOneAndUpdate({ _id: req.params.id }, {note: dbNote._id}, { new: true });
    })
    .then(function(dbArticle) {
      res.json(dbArticle);
    })
    .catch(function(err) {
      res.json(err);
    });
});


app.post("/delnote/:id", function(req, res) {
  console.log("made it to delnote route");
  console.log("note id is ", req.params.id);
  db.note.findOneAndRemove({"_id": req.params.id})
  .then(function(dbArticle) {
      console.log("delete note ", req.params.id );
    })
    .catch(function(err) {
      res.json(err);
    });
});

// Route to delete a movie
app.post("/delmovie/:id", function(req, res) {
  console.log("made it to delmovie route");
  console.log("movieid is ", req.params.id);
  db.article.findOneAndRemove({"_id": req.params.id})
  .then(function(dbArticle) {
    res.send("Movie has been deleted");
    })
    .catch(function(err) {
      res.json(err);
    });
});


// Route for grabbing a specific Article by id, populate it with it's note
app.post("/savemovie/:id", function(req, res) {
  db.article
  .update({ _id: req.params.id }, {$set: {saved:true}})
    .populate("note")
    .then(function(dbArticle) {
      res.send("Movie has been saved");
    })
    .catch(function(err) {
      res.json(err);
    });
});

app.listen(PORT, function () {
  console.log("app listening on PORT " + PORT);
});
