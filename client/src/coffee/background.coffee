console.log "backgroundjs"

background = {
  tabs:
    musicExtension: null
    app: null
  setup: ()->
    console.log "setting up listener"
    chrome.runtime.onMessage.addListener((message, sender, sendResponse)=>
      console.log("Got Message at Background!")
      console.log sender
      console.log @
      console.log message.action
      console.log @[message.action]
      if @[message.action]?
        @[message.action](message, sender, sendResponse)
      else
        console.log("ERROR: Recieved Message At Background Without An Action")
        console.log(message)
    )
  userToBackground: (message, sender, sendResponse)->
    console.log("subroutine")
    message.user.tabId = sender.tab.id
    @user = message.user
    @tabs.musicExtension = sender.tab.id
    console.log("createtab")
    chrome.tabs.create({
      url: "html/container.html"
    }, (tab)=>
      @tabs.app = tab.id
    )
  userToApp: (message, sender, sendResponse)->
    sendResponse(@user)
  testMessage: (message, sender, sendResponse)->
    console.log sender.tab.id
}

background.setup()
