module.exports =
	google:
		track: (track)->
			return {
				googleId: track[0]
				title: track[1]
				albumArtLink: track[2]
				artist: track[3]
				album: track[4]
				genre: track[11]
				millisduration: track[13]
				playCount: track[22]
				rating: track[23]
				trackNo: track[14]
				srcType: track[29]
			}
