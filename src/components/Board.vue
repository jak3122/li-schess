<template>
  <div class="board-view">
    <div class="schess-buttons">
      <span>
        <input type="checkbox" id="elephantOpponent" @click.prevent.stop :disabled="!elephantOpponentEnabled">
        <label for="elephantOpponent">elephant</label>
      </span>
      <span>
        <input type="checkbox" id="hawkOpponent" @click.prevent.stop :disabled="!hawkOpponentEnabled">
        <label for="hawkOpponent">hawk</label>
      </span>
    </div>
    <div id="board-wrapper">
      <div id="board"></div>
      <div id="promotion_choice" ref="promotion_choice"></div>
    </div>
    <div class="schess-buttons">
      <span>
        <input type="checkbox" id="elephant" :disabled="!elephantEnabled" v-model="elephantSelected">
        <label for="elephant">elephant</label>
      </span>
      <span>
        <input type="checkbox" id="hawk" :disabled="!hawkEnabled" v-model="hawkSelected">
        <label for="hawk">hawk</label>
      </span>
    </div>
  </div>
</template>

<script>
import SChess from 'schess.js';
import Chessground from 'cg/dist/chessground';
// import { patch } from 'snabbdom';
// import renderPromotion from "@/chess/promotion";


export default {
  name: 'Board',
  props: ['orientation'],
  data() {
    return {
      inCheck: false,
      elephantSelected: false,
      hawkSelected: false,
      elephantEnabled: true,
      hawkEnabled: true,
      elephantOpponentEnabled: true,
      hawkOpponentEnabled: true,
      ground: null,
      gameInProgress: false,
      game: new SChess()
    };
  },
  watch: {
    orientation: function(newOrientation) {
      this.ground.set({ orientation: newOrientation, movable: { color: newOrientation } });
    },
  },
  computed: {
    opponentColor: function() {
      return this.orientation === 'white' ? 'black' : 'white';
    },
  },
  methods: {
    turn: function() {
      return { w: 'white', b: 'black' }[this.game.turn()];
    },
    flipTurn() {
      return { w: 'black', b: 'white' }[this.game.turn()];
    },
    isPieceInHand: function(pieceType, color) {
      const colorIndex = color.charAt(0);
      return (this.game.get_hand()[colorIndex]
        .some(p => p.type === pieceType && p.color === colorIndex));
    },
    updateSPieceCheckboxes: function() {
      this.elephantEnabled = this.isPieceInHand('e', this.orientation);
      this.hawkEnabled = this.isPieceInHand('h', this.orientation);
      this.elephantOpponentEnabled = this.isPieceInHand('e', this.opponentColor);
      this.hawkOpponentEnabled = this.isPieceInHand('h', this.opponentColor);
    },
    isPromotion(orig, dest) {
      const piece = this.ground.state.pieces[dest];
      if (piece && piece.role === 'pawn') {
        return true;
      } else {
        return false;
      }
    },
    onMove: function(orig, dest) {
      console.log("onMove:", orig, dest);
      // if (this.isPromotion(orig, dest)) {
      //   // this.ground.setPieces({
      //   //   color: this.orientation,
      //   //   role: 
      //   // })
      //   patch(this.$refs, renderPromotion(dest, this.orientation, this.orientation));
      // }
      const move_obj = {
        from: orig, to: dest
      };
      const legalMoves = this.game.moves({ verbose: true });
      if (this.elephantSelected) {
        if (legalMoves.some(move => move.from === orig && "s_piece" in move && move.s_piece === 'e')) {
          move_obj.s_piece = 'e';
          this.addSPiece('elephant', orig, this.turn());
        }
        this.elephantSelected = false;
      }
      if (this.hawkSelected) {
        if (legalMoves.some(move => move.from === orig && "s_piece" in move && move.s_piece === 'h')) {
          move_obj.s_piece = 'h';
          this.addSPiece('hawk', orig, this.turn());
        }
        this.hawkSelected = false;
      }
      this.$socket.emit('move', move_obj);
      this.game.move(move_obj);
      this.updateBoard();
    },
    onOpponentMove: function(move) {
      this.game.move(move);
      this.ground.move(move.from, move.to);
      if ('s_piece' in move) {
        this.addSPiece(move.s_piece, move.from, this.flipTurn());
      }
      this.updateBoard();
      console.log("after opponent move:", this.game.pgn());
    },
    addSPiece: function(pieceType, square, color) {
      const role = { e: 'elephant', h: 'hawk' }[pieceType.charAt(0)];
      this.ground.setPieces({ [square]: { role: role, color } });
    },
    updateBoard: function() {
      this.updateSPieceCheckboxes();
      this.inCheck = this.game.in_check();
      this.ground.set({
        check: this.game.in_check(),
        turnColor: this.game.game_over() ? undefined : this.turn(),
        movable: {
          free: false,
          color: this.game.game_over() || !this.gameInProgress ? undefined : this.orientation,
          dests: this.legalDests(),
        },
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
      this.ground.set({ fen: this.game.fen() });
    }
  },
  mounted() {
    const onMove = this.onMove;
    this.ground = Chessground(document.getElementById('board'), {
      drawable: {
        pieces: {
          baseUrl: '/static/images/',
        },
      },
      resizable: true,
      movable: {
        free: false,
        color: undefined,
        dests: this.legalDests(),
        events: {
          after(orig, dest) {
            onMove(orig, dest);
          },
        }
      },
    });
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
  },
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

.schess-buttons input[type=checkbox] {
  transform: scale(2);
}

.schess-buttons input[type=checkbox]:disabled+label {
  color: #cbcaca;
}
</style>
