<template>
    <div class="chats">
        <div v-if="isPlayer" class="chat-select">
            <button @click="selectSpectatorChat" :class="{active: selectedChat === 'spectator'}">spectator chat</button>
            <button @click="selectGameChat" :class="{active: selectedChat === 'game'}">game chat</button>
        </div>
        <div v-if="selectedChat === 'spectator'" class="chat">
            <ul ref="spectatorChatbox">
                <li v-for="(message, index) in spectatorChatMessages" :key="index">{{ message }}</li>
            </ul>
            <div class="chat-input">
                <input v-on:keyup.enter="sendSpectatorChat" v-model="spectatorChatInput" />
                <button @click="sendSpectatorChat">send</button>
            </div>
        </div>
        <div v-if="isPlayer && selectedChat === 'game'" class="chat">
            <ul ref="gameChatbox">
                <li v-for="(message, index) in gameChatMessages" :key="index">{{ message }}</li>
            </ul>
            <div class="chat-input">
                <input v-on:keyup.enter="sendGameChat" v-model="gameChatInput" />
                <button @click="sendGameChat">send</button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Chat',
    props: ['isPlayer'],
    data() {
        return {
            selectedChat: this.isPlayer ? "game" : "spectator",
            spectatorChatMessages: [],
            gameChatMessages: [],
            spectatorChatInput: "",
            gameChatInput: "",
        }
    },
    updated() {
        if (this.selectedChat === "spectator")
            this.$refs.spectatorChatbox.scrollTop = this.$refs.spectatorChatbox.scrollHeight;
        else if (this.selectedChat === "game")
            this.$refs.gameChatbox.scrollTop = this.$refs.gameChatbox.scrollHeight;
    },
    methods: {
        sendSpectatorChat: function() {
            this.$socket.emit("spectatorChatMessage", this.spectatorChatInput);
            this.spectatorChatInput = "";
        },
        sendGameChat: function() {
            this.$socket.emit("gameChatMessage", this.gameChatInput);
            this.gameChatInput = "";
        },
        selectSpectatorChat: function() {
            this.selectedChat = "spectator";
        },
        selectGameChat: function() {
            this.selectedChat = "game";
        }
    },
    sockets: {
        newSpectatorChatMessage: function(message) {
            this.spectatorChatMessages.push(message);
        },
        newGameChatMessage: function(message) {
            this.gameChatMessages.push(message);
        }
    }
}
</script>

<style scoped>
.chat-select {
    display: flex;
}

.chat-select button {
    flex: 1;
}

.chat-select button:focus {
    background: #e0e0e0;
    outline: none;
    box-shadow: inset 0px 0px 4px #ccc;
}

.chat-select button.active {
    background: #ededed;
    border: 1px solid #ccc;
    box-shadow: 1px 1px 2px #ccc;
    border-radius: 3px;
    font-weight: bold;
}

.chat {
    display: flex;
    flex-direction: column;
    height: 400px;
    width: 300px;
    margin-right: 5px;
    border: 1px solid darkgray;
}

.chat ul {
    list-style: none;
    margin: 0;
    padding: 20px;
    flex: 1;
    overflow-y: scroll;
    word-wrap: break-word;
}

.chat li {
    padding: 3px 0;
}

.chat .chat-input {
    display: flex;
    flex-direction: row;
}

.chat input {
    flex: 1;
}
</style>