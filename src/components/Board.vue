<template>
  <div class="board-view">
    <div class="schess-buttons">
      <span :class="{ active: elephantOpponentEnabled }">elephant</span>
      </span>
      <span :class="{ active: hawkOpponentEnabled }">hawk</span>
    </div>
    <div id="board-wrapper">
      <div id="board"></div>
      <promotion v-if="isPlayer && promoting" :orientation="orientation" :dest="promotionDest" :color="orientation" v-on:finish="finishPromotion" v-on:cancel="cancelPromotion"></promotion>
      <sPieceSelector v-if="isPlayer && addingSPiece" :roles="sPieceRoles" :orientation="orientation" :dest="sPieceSquare" :color="orientation" :rookSquare="sPieceRookSquare" v-on:finish="finishSPiece" v-on:cancel="cancelSPiece"></sPieceSelector>
    </div>
    <div class="schess-buttons">
      <span :class="{ active: elephantEnabled }">elephant</span>
      <span :class="{ active: hawkEnabled }">hawk</span>
    </div>
  </div>
</template>

<script>
import SChess from "schess.js";
import Chessground from "cg/dist/chessground";
import Promotion from "@/components/Promotion";
import SPieceSelector from "@/components/SPieceSelector";

export default {
	name: "Board",
	components: {
		promotion: Promotion,
		sPieceSelector: SPieceSelector
	},
	props: ["orientation", "isPlayer"],
	data() {
		return {
			inCheck: false,
			elephantEnabled: true,
			hawkEnabled: true,
			elephantOpponentEnabled: true,
			hawkOpponentEnabled: true,
			ground: null,
			gameInProgress: true,
			promoting: false,
			promotionDest: "",
			promotionOrig: "",
			addingSPiece: false,
			sPieceRoles: [],
			sPieceSquare: "",
			sPieceMoveDest: "",
			sPieceRookSquare: "",
			premove: null,
			game: new SChess()
		};
	},
	watch: {
		orientation: function(newOrientation) {
			console.log("new orientation:", newOrientation);
			this.ground.set({ orientation: newOrientation });
		}
	},
	computed: {
		opponentColor: function() {
			return this.orientation === "white" ? "black" : "white";
		}
	},
	methods: {
		turn: function() {
			return { w: "white", b: "black" }[this.game.turn()];
		},
		flipTurn() {
			return { w: "black", b: "white" }[this.game.turn()];
		},
		isPieceInHand: function(pieceType, color) {
			const colorIndex = color.charAt(0);
			const hand = this.game.get_hand();
			return hand[colorIndex].some(
				p => p.type === pieceType && p.color === colorIndex
			);
		},
		updateSPieceCheckboxes: function() {
			this.elephantEnabled = this.isPieceInHand("e", this.orientation);
			this.hawkEnabled = this.isPieceInHand("h", this.orientation);
			this.elephantOpponentEnabled = this.isPieceInHand(
				"e",
				this.opponentColor
			);
			this.hawkOpponentEnabled = this.isPieceInHand(
				"h",
				this.opponentColor
			);
		},
		isPromotion(orig, dest) {
			const piece = this.ground.state.pieces[dest];
			if (
				piece &&
				piece.role === "pawn" &&
				((this.orientation === "white" && dest.charAt(1) === "8") ||
					(this.orientation === "black" && dest.charAt(1) === "1"))
			) {
				return true;
			} else {
				return false;
			}
		},
		isCastlingMove(orig, dest) {
			const piece = this.ground.state.pieces[dest];
			if (piece && piece.role === "king") {
				return (
					(orig === "e8" && (dest === "c8" || dest === "g8")) ||
					(orig === "e1" && (dest === "c1" || dest === "g1"))
				);
			}
			return false;
		},
		moveCanAddSPiece(orig, legalMoves) {
			return legalMoves.some(
				move => move.from === orig && "s_piece" in move
			);
		},
		moveCanAddSPieceOnRookSquare(orig, dest, legalMoves) {
			return legalMoves.some(
				move =>
					move.from === orig &&
					move.to === dest &&
					"s_piece" in move &&
					"s_square" in move &&
					move.s_square !== orig
			);
		},
		getRookSquare(orig, dest, legalMoves) {
			return legalMoves.find(
				move =>
					move.from === orig &&
					move.to === dest &&
					"s_square" in move &&
					move.s_square !== orig
			).s_square;
		},
		onMove: function(orig, dest, promotion, s_piece) {
			console.log("onMove:", orig, dest, promotion);
			const legalMoves = this.game.moves({ verbose: true });
			if (!promotion && this.isPromotion(orig, dest)) {
				console.log("onMove promotion", orig, dest, promotion);
				this.promotionOrig = orig;
				this.promotionDest = dest;
				this.promoting = true;
				return;
			}
			if (!this.addingSPiece && this.moveCanAddSPiece(orig, legalMoves)) {
				console.log("doing spiece");
				const hand = this.game.get_hand();
				this.sPieceRoles = hand[this.game.turn()].map(p => {
					return { e: "elephant", h: "hawk" }[p.type];
				});

				if (
					this.isCastlingMove(orig, dest) &&
					this.moveCanAddSPieceOnRookSquare(orig, dest, legalMoves)
				) {
					this.sPieceRookSquare = this.getRookSquare(
						orig,
						dest,
						legalMoves
					);
				}
				this.sPieceSquare = orig;
				this.sPieceMoveDest = dest;
				this.addingSPiece = true;
				return;
			}
			const move_obj = {
				from: orig,
				to: dest
			};
			if (promotion) {
				move_obj.promotion = promotion;
				move_obj.flags = "p";
			}
			if (s_piece) {
				move_obj.s_piece = s_piece.charAt(0);
			}
			if (this.sPieceRookSquare) {
				move_obj.s_square = this.sPieceRookSquare;
			}
			this.$socket.emit("move", move_obj);
			const moveResult = this.game.move({
				...move_obj,
				promotion: move_obj.promotion
					? move_obj.promotion.charAt(0)
					: undefined
			});
			if (moveResult === null) {
				this.resetBoard();
				return;
			}
			console.log("moveResult", moveResult);
			this.updateBoard();
		},
		onOpponentMove: function(move) {
			this.game.move({
				...move,
				promotion: move.promotion ? move.promotion.charAt(0) : undefined
			});
			this.ground.move(move.from, move.to);
			if ("s_piece" in move) {
				if ("s_square" in move)
					this.addSPiece(
						move.s_piece,
						move.s_square,
						this.flipTurn()
					);
				else this.addSPiece(move.s_piece, move.from, this.flipTurn());
			}
			if ("promotion" in move) {
				this.setPromotedPiece(move.to, move.promotion, this.flipTurn());
			}
			this.updateBoard();
			console.log("after opponent move:", this.game.pgn());
			this.performPremove();
		},
		setPromotedPiece: function(dest, role, color) {
			console.log("setPromotedPiece:", dest, role, color);
			const pieces = {};
			pieces[dest] = {
				color,
				role,
				promoted: true
			};
			this.ground.setPieces(pieces);
		},
		addSPiece: function(pieceType, square, color) {
			console.log("put spiece on board:", pieceType, square, color);
			const role = { e: "elephant", h: "hawk" }[pieceType.charAt(0)];
			this.ground.setPieces({ [square]: { role, color } });
		},
		updateBoard: function() {
			this.updateSPieceCheckboxes();
			this.inCheck = this.game.in_check();
			this.ground.set({
				check: this.game.in_check(),
				turnColor: this.game.game_over() ? undefined : this.turn(),
				movable: {
					free: false,
					color:
						this.game.game_over() || !this.gameInProgress
							? undefined
							: this.orientation,
					dests: this.legalDests()
				}
			});
			if (this.game.game_over()) this.ground.stop();
		},
		legalDests: function() {
			const dests = {};
			const legalMoves = this.game.moves({ verbose: true });
			legalMoves.forEach(move => {
				if (dests[move.from]) {
					if (!dests[move.from].includes(move.to))
						dests[move.from].push(move.to);
				} else {
					dests[move.from] = [move.to];
				}
			});
			return dests;
		},
		resetBoard: function() {
			const history = this.game.history({ verbose: true });
			const lastMove = history[history.length - 1];
			this.ground.set({
				fen: this.game.fen(),
				check: this.game.in_check(),
				turnColor: this.game.game_over() ? undefined : this.turn(),
				lastMove: lastMove ? [lastMove.from, lastMove.to] : undefined,
				movable: {
					free: false,
					color:
						this.game.game_over() || !this.gameInProgress
							? undefined
							: this.orientation,
					dests: this.legalDests()
				}
			});
		},
		finishPromotion: function(role) {
			console.log("finish promotion:", role);
			this.promoting = false;
			this.setPromotedPiece(this.promotionDest, role, this.turn());
			this.onMove(this.promotionOrig, this.promotionDest, role);
			this.promotionOrig = "";
			this.promotionDest = "";
		},
		cancelPromotion: function() {
			console.log("cancel promotion");
			this.promoting = false;
			this.promotionOrig = "";
			this.promotionDest = "";
			this.resetBoard();
		},
		finishSPiece: function(role, square) {
			console.log("finish spiece:", role, square);
			this.onMove(
				this.sPieceSquare,
				this.sPieceMoveDest,
				undefined,
				role
			);
			if (role) this.addSPiece(role, square, this.flipTurn());
			this.addingSPiece = false;
			this.sPieceSquare = "";
			this.sPieceMoveDest = "";
			this.sPieceRookSquare = "";
		},
		cancelSPiece: function() {
			this.addingSPiece = false;
			this.sPieceSelector = "";
			this.sPieceMoveDest = "";
			this.resetBoard();
		},
		setPremove: function(orig, dest) {
			this.premove = { orig, dest };
		},
		unsetPremove: function() {
			this.premove = null;
		},
		performPremove: function() {
			if (this.premove) {
				const orig = this.premove[0];
				const dest = this.premove[1];
				this.onMove(orig, dest);
				this.ground.playPremove();
				this.premove = null;
			}
		},
		createGround: function() {
			const onMove = this.onMove;
			this.ground = Chessground(document.getElementById("board"), {
				drawable: {
					pieces: {
						baseUrl: "/static/images/"
					}
				},
				viewOnly: !this.isPlayer,
				resizable: true,
				orientation: this.orientation,
				movable: {
					free: false,
					color: this.orientation,
					dests: this.legalDests(),
					events: {
						after(orig, dest) {
							onMove(orig, dest);
						}
					}
				},
				premovable: {
					events: {
						set: this.setPremove,
						unset: this.unsetPremove
					}
				}
			});
		}
	},
	mounted() {
		this.createGround();
	},
	sockets: {
		connect: function() {
			console.log("socket connected");
		},
		startGame: function() {
			console.log("starting game");
			this.gameInProgress = true;
			this.game = new SChess();
			this.resetBoard();
			this.updateBoard();
		},
		opponentMove: function(move) {
			console.log("got opponent move:", move);
			this.onOpponentMove(move);
		},
		fullGameUpdate: function(data) {
			console.log("fullGameUpdate:", data);
			this.gameInProgress = true;
			this.game = new SChess(data.currentFen);
			this.resetBoard();
			this.updateBoard();
		}
	}
};
</script>


<style scoped>
#board {
	width: 600px;
	height: 600px;
	margin: 0 auto;
}

.schess-buttons {
	text-align: center;
	margin: 30px;
	user-select: none;
	font-size: 20px;
}

.schess-buttons span {
	margin: 10px;
}

.schess-buttons span:not(.active) {
	color: #ddd;
}

.schess-buttons input[type="checkbox"] {
	transform: scale(2);
}

.schess-buttons input[type="checkbox"]:disabled + label {
	color: #cbcaca;
}

#board-wrapper {
	position: relative;
}
</style>
