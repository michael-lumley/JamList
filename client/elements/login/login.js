(function() {
  if (window.elements == null) {
    window.elements = {};
  }

  console.log("login element");

  window.elements.login = Polymer({
    is: 'da-login',
    attributes: {
      username: {
        type: String
      },
      password: {
        type: String
      }
    },
    login: function() {
      return app.login(this.username, this.password);
    }
  });

}).call(this);
