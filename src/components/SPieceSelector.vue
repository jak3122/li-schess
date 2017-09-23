<template>
    <div id="s_piece_choice" class="top" @click.prevent="cancel">
        <square :style="{top: blankSquare.top + '%', left: left + '%'}" @click.stop="finish()">
        </square>
        <square v-for="square in squares" :key="square.role" :style="{top: square.top + '%', left: left + '%'}" @click.stop="finish(square.role)">
            <piece :class="square.role + ' ' + color"></piece>
        </square>
    </div>
</template>

<script>
const key2pos = k => [k.charCodeAt(0) - 96, k.charCodeAt(1) - 48];

export default {
    name: 'SPieceSelector',
    props: ['orientation', 'dest', 'color', 'roles'],
    computed: {
        left: function() {
            console.log("dest:", this.dest);
            let left = (8 - key2pos(this.dest)[0]) * 12.5;
            if (this.orientation === "white") left = 87.5 - left;
            return left;
        },
        squares: function() {
            return this.roles.map((role, i) => {
                let top = (this.color === this.orientation ? 7 - (i + 1) : (i + 1)) * 12.5;
                return { top, role };
            });
        },
        blankSquare: function() {
            const top = (this.color === this.orientation ? 7 : 0) * 12.5;
            return { top, role: "" };
        }
    },
    methods: {
        finish: function(role) {
            this.$emit('finish', role);
        },
        cancel: function() {
            console.log("cancelled spiece");
            this.$emit('cancel');
        },
    }
};
</script>
