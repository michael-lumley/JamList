(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function() {
  module.exports = {
    google: {
      track: function(track) {
        return {
          googleId: track[0],
          title: track[1],
          albumArtLink: track[2],
          artist: track[3],
          album: track[4],
          genre: track[11],
          millisduration: track[13],
          playCount: track[22],
          rating: track[23],
          trackNo: track[14],
          srcType: track[29]
        };
      }
    }
  };

}).call(this);

},{}]},{},[1]);
