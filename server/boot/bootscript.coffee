module.exports = (app) ->
  console.log("booting")
  app.refresh = true

  if app.refresh
    console.log("refreshing app")
    app.dataSources.sql.automigrate((err) ->
      throw err if err
      console.log("creating michael user")
      app.models.jlUser.create({"username":"lumleym", "email": "mike.lumley@gmail.com", "password": "mr3uue"}, (err, obj)->
        throw err if err
        console.log(obj)
      )
    )
