console.log("tracklist") 

window.elements = {} if !window.elements?
polymerDefinition = _.deepSafeExtend(window.elements.listElem, {
  is: "da-case-list"
  # Polymer Inits @fold-children
  properties:
    activeCase:
      type: Object
    cases:
      type: Array
      notify: true
    deleteAuditCases:
      type: Array
      notify: true
      value: []
    filters:
      type: Array
      notify: true
      value: []
    newAuditCases:
      type: Array
      notify: true
      value: []
    syncAuditCases:
      type: Array
      notify: true
      value: []
    tickingCount:
      type: Number
      computed: '_tickingCount(cases)'
    user:
      type: String
      notify: true
  listeners:
    '_deleteConfirm': '_deleteConfirm'
    '_generateNote': '_generateNote'
    '_generateLabel': '_generateLabel'
    '_generateDWIVideoRequest': '_generateDWIVideoRequest'
    '_fill911': '_fill911'
  # !fold

  # Lifecycle Functions @fold
  created: ()->
  ready: ()->       # Create Filters; Row Style Func
    window.daElements.listElem.ready.call(this) # call parent function
    @$.datatableList.customRowStyle = (item)=>
      #console.log app.onDates
      if moment(item.nextOn).isBefore(moment().add(-1, "days"))
        return "background: #FFFACD"
      else
        console.log _.indexOf(app.onDates, moment(item.nextOn).format("MM-DD-YYYY")) % 2
        if _.indexOf(app.onDates, moment(item.nextOn).format("MM-DD-YYYY")) % 2 == 1
          return "background: #F1F1F1"
        return ""
    ###
    @push("filters", new window.daElements.daCaseFilter(
      properties:
        name: "All Cases"
    ))
    @push("filters", new window.daElements.daCaseFilter(
      properties:
        name: "Two Week Trial List"
        onFor: ["TL", "H+TL"]
        nextDateIn: 140
        noDispos: true
    ))
    @push("filters", new window.daElements.daCaseFilter(
      properties:
        name: "Open Cases"
        open: true
    ))
    @push("filters", new window.daElements.daCaseFilter(
      properties:
        name: "Closed Cases"
        open: false
    ))
    @push("filters", new window.daElements.daCaseFilter(
      properties:
        name: "Ticking Cases"
        ticking: true
    ))
    @activeFilterId = 2
    @refresh()
    ###
  attached: ()->
  # !fold

  # Event Functions @fold
  _deleteConfirm: (e)->
    console.log e
    console.log e.srcElement.id
    @activeCase = app.get("case", e.srcElement.eid)
    console.log "deleteConfirm"
    console.log (@activeCase)
    @$.confirmDelete.open()
})
window.elements.trackList = Polymer(polymerDefinition);
