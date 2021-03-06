'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
require('./../app.js');

const room = Rooms.add('mocha');
room.on = function (message, listener) {
	listener();
};

const users = [];
for (let i = 0; i < 4; i++) {
	let user = Users.add("User " + i);
	room.onJoin(user, ' ');
	users.push(user);
}

const games = [];
for (let i in Games.games) {
	let game = Games.getFormat(i);
	if (game.inheritOnly) continue;
	games.push(game);
	if (game.variations) {
		for (let i in game.variations) {
			let variation = Games.getFormat(game.name + ',' + i);
			if (!variation.variationId) throw new Error("Games.getFormat('" + game.name + ',' + i + "') did not return a variation.");
			games.push(variation);
		}
	}
	if (game.modes) {
		for (let i in game.modes) {
			let mode = Games.getFormat(game.name + ',' + i);
			if (!mode.modeId) throw new Error("Games.getFormat('" + game.name + ',' + i + "') did not return a mode.");
			games.push(mode);
		}
	}
}

describe('Games', function () {
	for (let i = 0, len = games.length; i < len; i++) {
		let game = games[i];
		let name = game.name;
		if (game.modeId) name += " (" + Games.modes[game.modeId].name + ")";
		describe(name, function () {
			beforeEach(function () {
				Games.createGame(game, room);
			});
			afterEach(function () {
				if (room.game) room.game.forceEnd();
			});
			it('should have the necessary functions', function () {
				if (room.game.freeJoin) {
					assert(typeof room.game.onSignups === 'function');
				} else {
					let beginningFunction = room.game.onSignups || room.game.onStart;
					assert(typeof beginningFunction === 'function');
				}
				if (room.game.modeId) {
					let mode = Games.modes[room.game.modeId];
					if (mode.requiredFunctions) {
						for (let i = 0, len = mode.requiredFunctions.length; i < len; i++) {
							assert(typeof room.game[mode.requiredFunctions[i]] === 'function', mode.requiredFunctions[i]);
						}
					}
				}
			});
			it('should properly run through a round', function () {
				room.game.signups();
				if (!room.game.freeJoin) {
					let len = users.length;
					for (let i = 0; i < len; i++) {
						CommandParser.parse(Config.commandCharacter + 'joingame', room, users[i]);
					}
					assert.strictEqual(room.game.playerCount, len);
					room.game.start();
				}
				assert(room.game.started);
				room.game.nextRound();
			});
			it('should support ending at any time', function () {
				room.game.signups();
				room.game.end();

				Games.createGame(game, room);
				if (!room.game.freeJoin) {
					room.game.signups();
					for (let i = 0, len = users.length; i < len; i++) {
						CommandParser.parse(Config.commandCharacter + 'joingame', room, users[i]);
					}
					room.game.start();
					room.game.end();
					Games.createGame(game, room);
				}

				room.game.signups();
				if (!room.game.freeJoin) {
					for (let i = 0, len = users.length; i < len; i++) {
						CommandParser.parse(Config.commandCharacter + 'joingame', room, users[i]);
					}
					room.game.start();
				}
				room.game.nextRound();
				if (room.game) room.game.end();
			});
		});
	}

	let gameTests;
	let directory = path.resolve(__dirname, 'games');
	try {
		gameTests = fs.readdirSync(directory);
	} catch (e) {}
	if (gameTests) {
		for (let i = 0, len = gameTests.length; i < len; i++) {
			if (!gameTests[i].endsWith('.js')) continue;
			require(directory + '/' + gameTests[i]);
		}
	}
});
