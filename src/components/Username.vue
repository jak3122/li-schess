<template>
    <div class="username">
        <template v-if="usernameSet">
            <span>{{ username }}</span>
            <button @click="clearUsername">x</button>
        </template>
        <template v-else>
            <input placeholder="username" v-model="username" maxlength="20" />
            <button @click="setUsername(username)">set</button>
        </template>
    </div>
</template>

<script>
export default {
    name: "Username",
    data() {
        return {
            usernameSet: false,
            username: "",
        }
    },
    created() {
        const storedUsername = localStorage.getItem("username");
        if (!!storedUsername) {
            this.setUsername(storedUsername);
        }
    },
    methods: {
        setUsername: function(name) {
            const cleanName = name.trim().slice(0, 20);
            if (!cleanName.length || cleanName === "")
                return;
            this.usernameSet = true;
            this.username = cleanName;
            this.$socket.emit("setUsername", cleanName);
            localStorage.setItem("username", cleanName);
        },
        clearUsername: function() {
            this.usernameSet = false;
            this.username = "";
            this.$socket.emit("clearUsername");
            localStorage.removeItem("username");
        }
    },
};
</script>

<style scoped>
.username {
    position: relative;
    margin-right: 50px;
    font-size: 14px;
}
</style>