window.elements = {} if !window.elements?

Cookies = require("../../node_modules/js-cookie")
_ = require("../../node_modules/underscore")
$ = require("../../node_modules/jquery")

# Utility Functions @fold
String.prototype.toDash = () ->
  @replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
String.prototype.frontCap = () ->
  @charAt(0).toUpperCase() + @slice(1);
String.prototype.pluralize = (revert = false)->
  plural = {
      '(quiz)$'               : "$1zes",
      '^(ox)$'                : "$1en",
      '([m|l])ouse$'          : "$1ice",
      '(matr|vert|ind)ix|ex$' : "$1ices",
      '(x|ch|ss|sh)$'         : "$1es",
      '([^aeiouy]|qu)y$'      : "$1ies",
      '(hive)$'               : "$1s",
      '(?:([^f])fe|([lr])f)$' : "$1$2ves",
      '(shea|lea|loa|thie)f$' : "$1ves",
      'sis$'                  : "ses",
      '([ti])um$'             : "$1a",
      '(tomat|potat|ech|her|vet)o$': "$1oes",
      '(bu)s$'                : "$1ses",
      '(alias)$'              : "$1es",
      '(octop)us$'            : "$1i",
      '(ax|test)is$'          : "$1es",
      '(us)$'                 : "$1es",
      '([^s]+)$'              : "$1s"
  };
  singular = {
      '(quiz)zes$'             : "$1",
      '(matr)ices$'            : "$1ix",
      '(vert|ind)ices$'        : "$1ex",
      '^(ox)en$'               : "$1",
      '(alias)es$'             : "$1",
      '(octop|vir)i$'          : "$1us",
      '(cris|ax|test)es$'      : "$1is",
      '(shoe)s$'               : "$1",
      '(o)es$'                 : "$1",
      '(bus)es$'               : "$1",
      '([m|l])ice$'            : "$1ouse",
      '(x|ch|ss|sh)es$'        : "$1",
      '(m)ovies$'              : "$1ovie",
      '(s)eries$'              : "$1eries",
      '([^aeiouy]|qu)ies$'     : "$1y",
      '([lr])ves$'             : "$1f",
      '(tive)s$'               : "$1",
      '(hive)s$'               : "$1",
      '(li|wi|kni)ves$'        : "$1fe",
      '(shea|loa|lea|thie)ves$': "$1f",
      '(^analy)ses$'           : "$1sis",
      '((a)naly|(b)a|(d)iagno|(p)arenthe|(p)rogno|(s)ynop|(t)he)ses$': "$1$2sis",
      '([ti])a$'               : "$1um",
      '(n)ews$'                : "$1ews",
      '(h|bl)ouses$'           : "$1ouse",
      '(corpse)s$'             : "$1",
      '(us)es$'                : "$1",
      's$'                     : ""
  };
  irregular = {
      'move'   : 'moves',
      'foot'   : 'feet',
      'goose'  : 'geese',
      'sex'    : 'sexes',
      'child'  : 'children',
      'man'    : 'men',
      'tooth'  : 'teeth',
      'person' : 'people'
  };
  uncountable = [
      'sheep',
      'fish',
      'deer',
      'series',
      'species',
      'money',
      'rice',
      'information',
      'equipment'
  ];
  # save some time in the case that singular and plural are the same
  if(uncountable.indexOf(this.toLowerCase()) >= 0)
    return this;
  # check for irregular forms
  for word of irregular
    if revert
      pattern = new RegExp(irregular[word]+'$', 'i');
      replace = word;
    else
      pattern = new RegExp(word+'$', 'i');
      replace = irregular[word];
    if pattern.test(this)
      return this.replace(pattern, replace);

  if revert
    array = singular;
  else  array = plural;

  # check for matches using regular expressions
  for reg of array
    pattern = new RegExp(reg, 'i');
    if pattern.test(this)
      return this.replace(pattern, array[reg]);
  return this;
Function.prototype.clone = ()->
  that = this
  temp = ()->
    return that.apply(this, arguments)
  for key in this
    if this.hasOwnProperty(key)
      temp[key] = this[key]
  return temp
_.deepClone = (obj)->
  ret = _.clone(obj)
  for prop of ret
    if typeof ret[prop] == "object"
      ret[prop] = _.deepClone(obj[prop])
  return ret
_.deepSafeExtend = (parent, child) ->
  parent = _.deepClone(parent)
  for prop of child
    if typeof parent[prop] == "object" and typeof child[prop] == "object"
      parent[prop] = _.deepSafeExtend(parent[prop], child[prop])
    else
      parent[prop] = child[prop]
  return parent
_.toClipboard = (text)->
  textArea = document.createElement("textarea");

  #
  # *** This styling is an extra step which is likely not required. ***
  #
  # Why is it here? To ensure:
  # 1. the element is able to have focus and selection.
  # 2. if element was to flash render it has minimal visual impact.
  # 3. less flakyness with selection and copying which **might** occur if
  #    the textarea element is not visible.
  #
  # The likelihood is the element won't even render, not even a flash,
  # so some of these are just precautions. However in IE the element
  # is visible whilst the popup box asking the user for permission for
  # the web page to copy to the clipboard.
  #

  # Place in top-left corner of screen regardless of scroll position.
  textArea.style.position = 'fixed';
  textArea.style.top = 0;
  textArea.style.left = 0;

  # Ensure it has a small width and height. Setting to 1px / 1em
  # doesn't work as this gives a negative w/h on some browsers.
  textArea.style.width = '2em';
  textArea.style.height = '2em';

  # We don't need padding, reducing the size if it does flash render.
  textArea.style.padding = 0;

  # Clean up any borders.
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';

  # Avoid flash of white box if rendered for any reason.
  textArea.style.background = 'transparent';


  textArea.value = text;

  document.body.appendChild(textArea);

  textArea.select();

  try
    successful = document.execCommand('copy');
    msg = successful ? 'successful' : 'unsuccessful';
    document.body.removeChild(textArea);
    return 'Copying text command was ' + msg
  catch err
    document.body.removeChild(textArea);
    return 'Oops, unable to copy'
# !fold

window.elements.app = Polymer(
  is: "jamlist-app"
  # Polymer Inits @fold-children
  properties:
    #Set to true when message recieved from Play Music that a user has been loaded into the app
    playerActive:
      type: Boolean
      value: false
    serviceActive:
      type: Boolean
      value: false
    tracks:
      type: Array
    libraryEntries:
      type: Array
    playlists:
      type: Array
    tags:
      type: Array
    user:
      type: Object
      notify: true
      value: ()->
        return {}
    urlBase:
      type: "string"
    tokens:
      type: Array
  listeners:
    'close-case': 'closeCase'
  # !fold
  messages:
    none: null #no message listeners coded yet
  # Message Passing Functions @fold
  setupListeners: ()->
    chrome.runtime.onMessage.addListener((request, sender, sendResponse)=>
      console.log("Got Message at App!")
      if @messages[message.action]?
        @messages[message.action](message, sender, sendResponse)
      else
        console.log("ERROR: Recieved Message At App Without An Action" + message)
      # We need to return true so that the event handler knows we will respond asyncronously
      return true
    )
  # !fold

  # Lifecycle Functions @fold
  created: ()->
    console.log("created")
    @setupListeners()
    window.app = @
    @urlBase = "localhost"
    @tokens = []
    @getUser().then((user)=>
      #TODO: What if no user yet?
      @user = user
    )
  ready: ()->
    console.log("ready")
  attached: ()->                  # Page JS Setup, Plugin Listener Creation
    console.log "attached"
    if !app.tokens[app.user.email]?
      app.displayLogin()
  # !fold

  #Data Access Functions @fold
  getUser: ()->
    return new Promise((resolve, reject)=>
      chrome.runtime.sendMessage({action: "userToApp"}, (user)=>
        resolve(user)
      )
    )
  getPlaylists: ()->
    #TODO: fix U var for multi-login
    return new Promise((resolve, reject)=>
      @xhr(
        method: "POST"
        url: "https://play.google.com/music/services/loadplaylists?format=jsarray&u=0&xt=#{@user.xt}"
        data: [["",1],[]]
      ).then((data)=>
        resolve(data.response[1][0])
      )
    )
  getGoogleTracks: ()->
    #TODO: Reject fallback
    return new Promise((resolve, reject)=>
      chrome.tabs.sendMessage(@user.tabId, {action: "getTracks"}, (tracks)=>
        resolve(tracks)
      )
    )
  getPlaylistTracks: (playlistId)->
    return new Promise((resolve, reject)=>
      @xhr(
        method: "POST"
        url: "https://play.google.com/music/services/loaduserplaylist?format=jsarray&u=0&xt=#{@user.xt}"
        data: [["",1], [playlistId]]
      ).then((data)=>
        resolve(data.response[1][0])
      )
    )

  upsertTrack: (track)->
    @xhr(
      method: "POST"
      url: "http://#{@urlBase}:3000/api/tracks/upsertTrack"
      data:
        track:
          googleId: track[0]
          artist: track[3]
          title: track[1]
          album: track[4]
    )
  syncFromService: ()->
    @getGoogleTracks().then((googleTracks)=>
      console.log googleTracks
      for track, key in googleTracks
        do (track) =>
          if key < 60
            if !@find("libraryEntry", (entry)-> entry.track.googleId == track[0])?
              console.log "upserting"
              @upsertTrack(track).then((data)=>
                console.log "#{track[22]} - #{track[23]} - #{track[1]} - #{track[3]}"
                @add("libraryEntry", {
                  playCount: track[22]
                  rating: track[23]
                  trackId: data.id
                })
              )
    )
  loadServiceData: ()->
    #TODO user authentication
    return new Promise((resolve, reject)=>
      libraryEntries = @xhr(
        method: "GET"
        url: "http://localhost:3000/api/jlUsers/#{@user.username}/libraryEntries"
        data:
          filter:
            include: ['track', 'tags']
      )
      playlists = @xhr(
        method: "GET"
        url: "http://localhost:3000/api/jlUsers/#{@user.username}/playlists"
        data:
          filter:
            include:
              relation: 'rules'
      )
      Promise.all([libraryEntries, playlists]).then((data)=>
        @libraryEntries = data[0]
        @playlists = data[1]
        resolve()
      )
    )

  get: (type, id)->
    id = +id
    return _.find(@[type.pluralize()], (instData)-> instData.id == id)
  find: (type, data)->
    if typeof data == "object"
      return _.findWhere(@[type.pluralize()], data)
    if typeof data == "function"
      return _.find(@[type.pluralize()], data)
  setAttr: (type, id, localProp, value)->
    id = +id
    obj = @get(type, id)
    if localProp != 'id' #we don't want to change ID, both because it's not a changable prop, and because if we do, we change type and interfere with retreval
      obj[localProp] = value
      @queueData(type, id, localProp, value)
      return true
    return false
  add: (type, data)->
    @xhr(
      method: "POST"
      url: "http://#{@urlBase}:3000/api/jlUsers/#{@user.username}/#{type.pluralize()}"
      data: data
    )
  delete: (type, id)->
    if type == "case"
      caseData = @get('case', id)
      return new Promise((resolve, reject)=>
        app.xhr(
          method: "DELETE"
          url: "http://#{@urlBase}:3000/api/Cases/#{caseData.id}"
        ).then((data)=>
          index = @cases.indexOf(caseData)
          @splice('cases', index, 1)
          resolve(data.response)
        )
      )
    else
      id = +id
      plType = type.pluralize()
      item = @get(type, id)
      return new Promise((resolve, reject)=>
        app.xhr(
          method: "DELETE"
          url: "http://#{@urlBase}:3000/api/#{plType.frontCap()}/#{id}"
        ).then((data)=>
          @[plType] = _.without(@[plType], item)
          if item.caseId?
            caseElem = @get('case', item.caseId)
            caseElem[plType] = _.without(caseElem[plType], item)
          if @activeCase? and @activeCase.id == "#{item.caseId}"
            @activeCase[plType] = _.without(caseElem[plType], item)
            @activeCase._renderSubElements(type)
            if type == 'event'
              @activeCase.recalculate()
          resolve(data.response)
        )
    )
  # !fold

  #Data Sync Functions @fold
  load: ()->
    console.log "loading"
    @displaySpinner()
    return new Promise((resolve, reject)=>
      @xhr({
        method: "GET",
        url: "http://#{@urlBase}:3000/api/DAUsers/#{@user.name}/profile"
      }).then((data)=>
        console.log data
        @user = _.extend(@user, data.response.profile)
      )
      @xhr({
        method: "GET",
        url: "http://#{@urlBase}:3000/api/DAUsers/#{@user.name}/loadOpenCases"
      }).then((data)=>
        console.log data
        @cases = data.response.cases
        @onDates = []
        for caseData in @cases
          @onDates = _.union(@onDates, [moment(caseData.nextOn).format("MM-DD-YYYY")])
          for todo in caseData.todos
            todo.case = caseData
            @push('todos', todo)
          for event in caseData.events
            @push('events', event)
          for witness in caseData.witnesses
            @push('witnesses', witness)
          if caseData.nextEvent?
            for notification in caseData.nextEvent.notifications
              @push('notifications', notification)
        @onDates.sort((a, b)->
          if moment(a).isBefore(moment(b))
            return -1
          if moment(b).isBefore(moment(a))
            return 1
          return 0
        )
        @hideSpinner()
        @xhr({
          method: "GET"
          url: "http://#{@urlBase}:3000/api/DAUsers/#{@user.name}/loadClosedCases"
        }).then((data)=>
          for caseData in data.response.cases
            @push('cases', caseData)
        )
        resolve()
      )
    )
  queueData: (type, id, localProp, value)->
    calcedVars = {                                                              #todo - don't send calked vars
      case: ["nextOn", "onFor", "thirtyThirty", "thirtyThirtyNextDate"]
    }
    window.clearTimeout(@timeout) if @timeout?
    @queue[type.pluralize()][id] = {} if !@queue[type.pluralize()][id]?
    @queue[type.pluralize()][id][localProp] = value
    @timeout = window.setTimeout(()=>
      xhrs = []
      for typeKey, type of @queue
        for id, data of type
          xhrs.push(@xhr(
            method: "PUT"
            url: "http://#{@urlBase}:3000/api/#{typeKey.frontCap()}/#{id}"
            data: @queue[typeKey][id]
          ))
          delete @queue[typeKey][id]
      ##Promise.all(xhrs).then()                                                #todo - clear queue
    , "1000")
  xhr: (settings)->
    #make sure headers in place
    if !settings.headers?
      settings.headers = {}
    #set login information
    if Cookies.get("token")?
      settings.headers.Authorization = Cookies.get("token")
    return $.ajax(settings)
  # !fold

  #User Management Functions @fold
  login: (username, password)->
    console.log "login"
    @user.username = username
    @displaySpinner()
    @xhr(
      method: "POST"
      url: "http://#{@urlBase}:3000/api/JLUsers/login"
      data:
        username: username
        password: password
    ).then((data)=>
      # TODO: failure handling
      console.log data
      ###
      if data.xhr.status == 401
        @fail("Incorrect or unknown username/password!")
        return
      ###
      Cookies.set("token", data.id)
      Cookies.set("user", data.userId)
      #@syncFromService()
      @loadServiceData().then((data)=>
        console.log(@libraryEntries)
        console.log(@playlists)
      ).then((data)=>
        @syncFromService()
      )
    )
  logout: ()->
    @xhr({method: "POST", url: "http://#{@urlBase}:3000/api/DAUsers/login"}).then((response, xhr)->
      Cookies.remove("token")
      Cookies.remove("user")
      page("/login")
    )

  #Main Display Functions @fold
  displayLogin: ()->
    console.log "display login func"
    login = new elements.login()
    @$.display.appendChild(login)

  displayPrelim: (ctx, next)->
    console.log "prelim"
    console.log ctx.path
    if !@menu?
      console.log daElements.daLogin
      console.log daElements.daHome
      console.log daElements.daMenu
      @menu = new daElements.daMenu()
      @$.menuDrawer.appendChild(@menu)
    @.menu.closeSlide()
    while @$.display.firstChild?
      @$.display.removeChild(@$.display.firstChild)
    if ctx.path == "/test" or ctx.path == "/logout"
      console.log "found test or logout path"
      next()
    if ctx.path == "/login" or !Cookies.get('token')? or !Cookies.get('user')?
      @hideSpinner()
      login = new daElements.daLogin()
      @$.display.appendChild(login)
      return
    else
      if !@cases? or !@events? or !@todos?
        console.log "loading"
        @load().then(()->
          console.log "running next"
          next()
        )
      else
        next();
  displayLogout: (ctx, next)->
  displayHome: (ctx, next)->
    @home = new daElements.daHome() if !@home?
    @$.display.appendChild(@home)
  displayCases: (ctx, next)->
    console.log "displaying cases"
    @caseList = new daElements.daCaseList() if !@caseList?
    @$.display.appendChild(@caseList)
  displayToDoList: ()->
    @todoList = new daElements.daTodoList() if !@todoList?
    @$.display.appendChild(@todoList)
  displayNotificationsList: ()->
    @notificationsElem = new daElements.daNotificationList() if !@notificationsElem?
    @notificationsElem.user = @user.name
    @$.display.appendChild(@notificationsElem)
  displayNineOneOneList: ()->
    console.log "yes"
    @nooElem = new daElements.da911List() if !@nooElem?
    @$.display.appendChild(@nooElem)
  displayCrbList: ()->
    @crbElem = new daElements.daCrbList() if !@crbElem?
    @$.display.appendChild(@crbElem)
  displayTest: ()->
    console.log "test path"
    #@$.display.appendChild(@testElem)
    @testElem = new daElements.daTestSuite() if !@testElem?
    @testElem.testCaseConverter()
  displaySpinner: ()->
    @$["spinner-dialog"].open()
    @$.spinner.active=true
  hideSpinner: ()->
    @$["spinner-dialog"].close()
    @$.spinner.active=false
  refreshAllViews: ()->
    @caseList.refresh() if @caseList?
  # !fold

  #Modal Display Functions @fold
  displayCase: (id)->
    @displaySpinner();
    while @$.DACaseDisplay.firstChild?
      @$.DACaseDisplay.removeChild(@$.DACaseDisplay.firstChild)
    caseElem = new daElements.daCase(id)
    @$.DACaseDisplay.appendChild(caseElem)
    @$.DACaseDisplay.open()
    @$.DACaseDisplay.notifyResize()
    @$.DACaseDisplay.sizingTarget = caseElem
    #Our modal DOES NOT CARE about sizing responsive to it's children
    @$.DACaseDisplay._onDescendantIronResize = ()->
      return null
    #Put a pointer to the active case in the app scope
    app.activeCase = caseElem
    @hideSpinner()
  closeCase: ()->
    app.activeCase = null
    @$.DACaseDisplay.close()
    @caseList.refresh() if @caseList?
    @crbList.refresh() if @crbList?
    @nooElem.refresh() if @nooElem?
  ### Confirm Dialog
    @title - Title
    @message - Content
    @cb - Function
    @context - Object
  ###
  confirm: (args)->
    console.log args
    @$.confirmDialog.open()
    @$.confirmTitle.innerHTML = args.title if args.title?
    @$.confirmContent.innerHTML = args.message if args.message?
    $(@$.confirmButton).off()
    $(@$.confirmButton).on("click", ()=>
      args.cb(args.context)
      @$.confirmDialog.close()
    )
  fail: (msg)->
    @$.errorDialog.open()
    console.log @$
    @$.message.innerHTML = msg
    window.setTimeout(()=>
      @$.errorDialog.close()
    , "10000")
  # !fold

  # Patch Functions @fold-children
  patchDatatable: (datatable, element)->
    datatable._internalSort = (column)->
      if @_internalSortEnabled
        @_rowKeys.sort((a, b)=>
          if column.sortDirection == 'desc'
            c = a
            a = b
            b = c
          valA = @_getByKey(a)
          valB = @_getByKey(b)
          if typeof column.sort == 'function'
            return column.sort(valA, valB)
          else
            console.log column.sort
            sorts = column.sort.split("/")
            properties = column.property.split("/")
            for sort, key in sorts
              return app[sort](valA, valB, properties[key]) if app[sort](valA, valB, properties[key])?
            return 0
        )
        this.set("_rowKeys", JSON.parse(JSON.stringify(this._rowKeys)));
  setupElement: (element, id, type)->
    elementData = @get(type, id)
    for property, value of elementData
      element[property] = value if value != null
    for property, value of element.properties
      element.addEventListener("#{property.toDash()}-changed", ((e)=>
        localProp = "#{property}"
        ()=>
          console.log "event update"
          @setAttr(type, id, localProp, element[localProp])
          element.fire("#{type}-update")
          if @activeCase? and type == "event"
            @activeCase.recalculate()
      )())
  bindToParent: (path, element)-> #used to notify all paths on an object following a change in an object
    rebind = (path, element)=>
      element[path] = @[path]
      for key, value of element[path]
        console.log "notifying #{path}.#{key} with #{value}"
        element.notifyPath("#{path}.#{key}", value)
    rebind(path, element)
    @addEventListener("#{path.toDash()}-changed", rebind(path, element))
  # !fold

  #Sorting Functions @fold
  getSortProperty: (item, field)->
    fields = field.split(".")
    if fields.length > 1
      for field, key in fields
        if key != fields.length
          returnProperty = item[field]
        item = item[field]
    else
      returnProperty = item[field]
    return returnProperty
  preliminarySort: (aProp, bProp)->
    return -1 if aProp == "" or !aProp?
    return 1 if bProp == "" or !bProp?
    return -1 if aProp == "n/a"
    return 1 if bProp == "n/a"
    return null
  sortByDefault: (a, b, field)->
    aProp = @getSortProperty(a, field)
    bProp = @getSortProperty(b, field)
    return @preliminarySort(aProp, bProp) if @preliminarySort(aProp, bProp)?
    return 1 if aProp < bProp
    return -1 if aProp > bProp
    return null
  sortByDate: (a, b, field)->
    aProp = @getSortProperty(a, field)
    bProp = @getSortProperty(b, field)
    return @preliminarySort(aProp, bProp) if @preliminarySort(aProp, bProp)?
    return -1 if moment(aProp).isAfter(moment(bProp))
    return 1 if moment(aProp).isBefore(moment(bProp))
    return null
  sortByEventType: (a, b, field)->
    aProp = @getSortProperty(a, field)
    bProp = @getSortProperty(b, field)
    return @preliminarySort(aProp, bProp) if @preliminarySort(aProp, bProp)?
    aVal = switch
      when aProp == "CRB" then 1
      when aProp == "R+D" then 2
      when aProp == "TL" then 3
      when aProp == "H+TL" then 4
      else '0'
    bVal = switch
      when bProp == "CRB" then 1
      when bProp == "R+D" then 2
      when bProp == "TL" then 3
      when bProp == "H+TL" then 4
      else '0'
    return -1 if aVal < bVal
    return 1 if aVal > bVal
    return null
  sortByCharge: (a, b, field)->
    return @sortByDefault(a, b, field)
  sortByTicking: (a, b, field)->
    return -@sortByDefault(a, b, field)
  sortBy3030: (a, b, field)->
    return @sortByDefault(a, b, field)
  sortByColor: (a, b, field)->
    aProp = @getSortProperty(a, field)
    bProp = @getSortProperty(b, field)
    return @preliminarySort(aProp, bProp) if @preliminarySort(aProp, bProp)?
    aVal = switch
      when aProp == "grey" then 1
      when aProp == "brown" then 2
      when aProp == "blue" then 3
      when aProp == "green" then 4
      when aProp == "yellow" then 4.5
      when aProp == "orange" then 5
      when aProp == "red" then 5.5
      when aProp == "purple" then 6
    bVal = switch
      when bProp == "grey" then 1
      when bProp == "brown" then 2
      when bProp == "blue" then 3
      when bProp == "green" then 4
      when bProp == "yellow" then 4.5
      when bProp == "orange" then 5
      when bProp == "red" then 5.5
      when bProp == "purple" then 6
    return -1 if aVal < bVal
    return 1 if aVal > bVal
    return null
  # !fold
);
