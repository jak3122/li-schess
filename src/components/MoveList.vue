<template>
    <div class="move-list">
        <div class="nav">
            <button class="first" @click="first">&lt;&lt;</button>
            <button class="prev" @click="prev">&lt;</button>
            <button class="next" @click="next">&gt;</button>
            <button class="last" @click="last">&gt;&gt;</button>
        </div>
        <div class="moves">
            <template v-for="(move, ply) in moveList" v-if="ply > 0">
                <div v-if="ply % 2 !== 0" class="index">{{ (ply + 1) / 2 }}</div>
                <div class="move" :class="{ active: ply === currentPly }" @click="jump(ply)">
                    {{ move.lastMove.san }}
                </div>
            </template>
            <div v-if="moveList.length % 2 === 0" class="move empty"></div>
        </div>
    </div>
</template>

<script>
import { mapGetters } from "vuex";

export default {
    name: "MoveList",
    computed: {
		...mapGetters({
            moveList: "getMoves",
            currentPly: "getPly"
        })
    },
    methods: {
        jump(ply) {
            this.$store.commit("setPly", ply);
        },
        first() {
            this.jump(0);
        },
        prev() {
            this.jump(Math.max(0, this.currentPly - 1));
        },
        next() {
            const lastPly = this.moveList.length - 1;
            this.jump(Math.min(lastPly, this.currentPly + 1));
        },
        last() {
            const lastPly = this.moveList.length - 1;
            this.jump(lastPly);
        },
    }
}
</script>

<style scoped>
.move-list {
    border-top: 1px solid #e2e2e2;
    width: 242px;
}
.nav {
    display: flex;
    justify-content: center;
}
.nav button {
    padding: 5px 10px;
    background: none;
    border: none;
    outline: none;
    padding: 10px 13px;
    text-transform: uppercase;
    user-select: none;
    cursor: pointer;
    color: #747474;
    font-weight: bold;
}
.nav button:not(disabled):hover {
    background: rgba(56,147,232,0.8);
    color: #fff;
    animation: none;
}
.nav button:not(disabled):active {
    background: #3893E8;
    color: #fff;
}
.moves {
    border-top: 1px solid #e2e2e2;
    border-bottom: 1px solid #e2e2e2;
    height: 100px;
    overflow: auto;
    position: relative;
    will-change: scroll-position;
    user-select: none;
    display: flex;
    flex-flow: row wrap;
    align-content: flex-start;
}
.moves .index, .moves .move {
    height: 25px;
    line-height: 25px;
}
.moves .index {
    display: flex;
    flex: 0 0 15%;
    max-width: 15%;
    line-height: 27px;
    background: #e6e6e6;
    justify-content: center;
    font-family: 'Roboto';
    font-weight: 300;
}
.moves .move {
    flex: 0 0 42.5%;
    max-width: 42.5%;
    box-sizing: border-box;
    padding-left: 7px;
    font-family: 'Noto Sans';
    font-size: 15px;
}
.moves .move:not(.empty):hover {
    background: #e6e6e6;
}
.moves .move:not(.empty) {
    cursor: pointer;
    transition: background-color 0.13s;
}
.moves .move.active {
    color: #d85000;
    font-weight: bold;
}
</style>