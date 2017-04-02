window.elements = {} if !window.elements?
console.log "login element"
window.elements.login = Polymer(
  is: 'login',
  attributes:
    username:
      type: String
    password:
      type: String
  login: ()-> app.login(@username, @password)
)
