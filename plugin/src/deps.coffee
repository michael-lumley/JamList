console.log("js deps module")

window.Cookies = require("../../../node_modules/js-cookie")
window._ = require("../../../node_modules/underscore")
window.$ = require("../../../node_modules/jquery")
window.page = require("../../../bower_components/page/page.js")

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
 
