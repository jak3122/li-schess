<template>
    <div id="promotion_choice" class="top" @click.prevent="cancel">
        <square v-for="square in squares" :key="square.role" :style="{top: square.top + '%', left: left + '%'}" @click.stop="finish(square.role)">
            <piece :class="square.role + ' ' + color"></piece>
        </square>
    </div>
</template>

<script>
const roles = ["queen", "elephant", "hawk", "knight", "rook", "bishop"];
const key2pos = k => [k.charCodeAt(0) - 96, k.charCodeAt(1) - 48];

export default {
    name: 'Promotion',
    props: ['orientation', 'dest', 'color'],
    computed: {
        left: function() {
            console.log("dest:", this.dest);
            let left = (8 - key2pos(this.dest)[0]) * 12.5;
            if (this.orientation === "white") left = 87.5 - left;
            return left;
        },
        squares: function() {
            return roles.map((role, i) => {
                let top = (this.color === this.orientation ? i : 7 - i) * 12.5;
                return {
                    top,
                    role
                };
            });
        }
    },
    methods: {
        finish: function(role) {
            this.$emit('finish', role);
        },
        cancel: function() {
            console.log("cancelled promotion");
            this.$emit('cancel');
        },
    }
};
</script>