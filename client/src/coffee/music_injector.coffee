console.log "Advanced Database Running"

# This is the code we will inject into the site to retrieve user data
codeToInject = ()->
  console.log "injected code"
  console.log window.USER_CONTEXT
  if window.USER_CONTEXT != ''
    window.postMessage(
      id: window.USER_ID,
      email: window.USER_CONTEXT[12]
      tier: window.USER_CONTEXT[13]
      xt: window._GU_getCookie('xt')
    , 'https://play.google.com') 

# Injects the passed function into the document, runs it, then removes it
injectFunc = (func)->
  script = document.createElement('script');
  script.textContent = "(#{func})()"
  (document.head || document.documentElement).appendChild(script);
  script.parentNode.removeChild(script)

getTracks = ()->
  #TODO: Error handling with promise reject
  console.log user
  tracks = []
  DBOpenRequest = window.indexedDB.open("music_#{user.id}", 6)
  return new Promise((resolve, reject)=>
    DBOpenRequest.onsuccess = (event)->
      db = DBOpenRequest.result
      transaction = db.transaction(['tracks', 'info'], 'readonly')
      transaction.objectStore('tracks').openCursor().onsuccess = (event)->
        cursor = event.target.result
        if cursor
          shard = JSON.parse(cursor.value)
          console.log "looping shard"
          for id, track of shard
            tracks.push(track)
          cursor.continue()
        else
          console.log tracks
          resolve(tracks)
  )

#Listener for the retrieved user information
window.addEventListener('message', (event)=>
  if event.origin == "https://play.google.com"
    window.user = event.data
    console.log event.data
    message = {}
    message.user = event.data
    message.action = "userToBackground"

    #Send Data Back to the App
    chrome.runtime.sendMessage(message)
    ###
    console.log transaction.objectStore('info').get;
    transaction.objectStore('info').get('sync_token').onsuccess = (event)->
      console.log event.target.result
    ###

)

#Listener for requests from app
chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>
  console.log "Got message at Injector!"
  if request.action == "getTracks"
    getTracks().then((data)->
      sendResponse(data)
    )
  # We need to return true so that the event handler knows we will respond asyncronously
  return true
)

console.log "injecting"
injectFunc(codeToInject)

console.log window.user
