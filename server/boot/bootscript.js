(function() {
  module.exports = function(app) {
    console.log("booting");
    app.refresh = true;
    console.log(app.refresh);
    if (app.refresh) {
      console.log("refreshing app");
      return app.dataSources.sql.automigrate(function(err) {
        if (err) {
          throw err;
        }
        console.log("creating michael user");
        return app.models.jlUser.create({
          "username": "lumleym",
          "email": "mike.lumley@gmail.com",
          "password": "mr3uue"
        }, function(err, obj) {
          if (err) {
            throw err;
          }
          return console.log(obj);
        });
      });
    }
  };

}).call(this);
