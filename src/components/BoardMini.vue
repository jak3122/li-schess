<template>
    <div class="mini-board-wrapper">
        <div class="black">{{ black }}</div>
        <div ref="miniBoard" class="mini-board" @click="onBoardClick">
        </div>
        <div class="white">{{ white }}</div>
    </div>
</template>

<script>
import Chessground from 'cg/dist/chessground';

export default {
    name: 'BoardMini',
    props: ['fen', 'white', 'black', 'onBoardClick'],
    data() {
        return {
            ground: null,
        }
    },
    mounted() {
        this.ground = Chessground(this.$refs.miniBoard, {
            drawable: {
                pieces: {
                    baseUrl: '/static/images/',
                },
            },
            fen: this.fen,
            coordinates: false,
            viewOnly: true,
            resizable: false,
        });
    },
    watch: {
        fen: function(newFen) {
            console.log("new fen:", newFen);
            this.ground.set({ fen: newFen });
        }
    }
}
</script>

<style scoped>
.mini-board-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

.mini-board {
    width: 300px;
    height: 300px;
}
</style>
    