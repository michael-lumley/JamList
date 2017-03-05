(function() {
  var portal, user;

  console.log(pluginPortals);

  portal = new pluginPortals.ClientPortal("application", {});

  user = {};

  setTimeout(function() {
    console.log("executing");
    return portal.sendMessage({
      target: "google_music",
      fn: "userInfo",
      args: {}
    }).then(function(response) {
      user = response.user;
      console.log(response);
      return portal.sendMessage({
        target: "background",
        fn: "allPlaylists",
        args: {
          user: response.user
        }
      });

      /*
      		portal.sendMessage({
      			target: "google_music"
      			fn: "getTracks"
      			args:
      				user: response.user
      		})
       */
    }).then(function(response) {
      console.log(response);
      return portal.sendMessage({
        target: "background",
        fn: "playlist",
        args: {
          user: user,
          id: response.data.items[0].id
        }
      });
    }).then(function(response) {
      return console.log(response);
    })["catch"](function(error) {
      return console.log(error);
    });
  }, "2000");

}).call(this);
