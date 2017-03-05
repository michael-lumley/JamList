window.elements = {} if !window.elements?
console.log "login element"
window.elements.login = Polymer(
  is: 'da-login',
  attributes:
    username:
      type: String
    password:
      type: String
  login: ()-> app.login(@username, @password)
  created: ()-> console.log "created login"
  ready: ()-> console.log "ready login"
)