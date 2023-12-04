let openedRoomName; // Used for drawing the appropriate messages and clients and sending message to correct room
let messages = {}; // Contains all messages from all rooms, including events like join or leave, timestamp and sender
let user; // Logged in user nickname, used to compare message senders

// Setup WarpTalk
let wt = new WarpTalk("wss", "warp.cs.au.dk/talk/");
console.log("Connecting to the WarpTalk server ...");

wt.isLoggedIn(function (isLoggedIn) {
    const promptContainer = document.getElementById("promptContainer");
    if (isLoggedIn) {
        // If we are already logged in we can call connect that we also give a function to call when the connection has been established
        promptContainer.style.display = 'none';
        wt.connect(connected);
    } else {
        promptContainer.style.display = 'block';
    }
});

function logInAsGuestOrRegistered() {
    let nickname = document.getElementById("nicknameInput").value;
    let password = document.getElementById("passwordInput").value;
    user = nickname;
    if (!password) {
        wt.connect(connected, nickname);
    } else {
        wt.login(nickname, password);
    }
}

function logout() {
    wt.logout();
}

document.getElementById('loginButton').addEventListener('click', logInAsGuestOrRegistered);
document.getElementById('logoutButton').addEventListener('click', logout);


// This function is called when the connection to the server is established (we give it as argument to connect above).
function connected() {
    // Remove the login prompt
    document.getElementById("promptContainer").style.display = 'none';
    document.getElementById('promptContainer').innerHTML = ''

    user = wt.nickname;
    console.log("Connection established.");
    // We can now list the rooms available on the server
    console.log("The server has the following rooms:");
    wt.availableRooms.forEach((room) => {
        console.log(`- ${room.name}: ${room.description}`);
    });
    populateRooms();
}

// Join a room
function joinRoom(roomName) {
    const joinedRoom = wt.join(roomName);
    populateRooms(); // Refresh the rooms

    joinedRoom.onMessage((joinedRoom, msg) => {
        console.log(`${joinedRoom.name} - ${msg.sender}: ${msg.message}`);

        // Check if the room exists in the rooms object, if not, initialize it
        if (!messages[joinedRoom.name]) {
            messages[joinedRoom.name] = [];
        }

        // Push the message to the specific room's array
        messages[joinedRoom.name].push({
            event: "message",
            sender: msg.sender,
            text: msg.message,
            timestamp: new Date(),
        });

        // If the opened room is this room, update the messages
        if (joinedRoom.name === openedRoomName) {
            populateMessages();
        }
    });

    joinedRoom.onJoin((joinedRoom, nickname) => {
        console.log(`${nickname} joined ${joinedRoom.name}`);

        // Check if the room exists in the rooms object, if not, initialize it
        if (!messages[joinedRoom.name]) {
            messages[joinedRoom.name] = [];
        }

        // Push the message to the specific room's array
        messages[joinedRoom.name].push({
            event: "join",
            text: nickname,
            timestamp: new Date(),
        });

        // If the opened room is this room, update the messages and clients
        if (joinedRoom.name === openedRoomName) {
            populateClients();
            populateMessages();
        }
    });

    joinedRoom.onLeave((joinedRoom, nickname) => {
        console.log(`${nickname} left ${joinedRoom.name}`);

        // Check if the room exists in the rooms object, if not, initialize it
        if (!messages[joinedRoom.name]) {
            messages[joinedRoom.name] = [];
        }

        // Push the message to the specific room's array
        messages[joinedRoom.name].push({
            event: "leave",
            text: nickname,
            timestamp: new Date(),
        });

        // If the opened room is this room, update the messages and clients
        if (joinedRoom.name === openedRoomName) {
            populateClients();
            populateMessages();
        }
    });

    joinedRoom.onDisconnect((joinedRoom) => {
        console.log(`Connection to server lost`);
    });
}

// Open a room
function openRoom(room) {
    openedRoomName = room.name;
    document.getElementById("roomNameHeader").textContent = room.name;
    document.querySelector(".roomInfoDescription").textContent = room.description;
    populateMessages();
    populateClients();
}

function leaveRoom(room) {
    wt.leave(room.name);
    populateRooms();
    messages[room.name] = null;
    if (room.name === openedRoomName) {
        openedRoomName = null;
        populateMessages();
        populateClients()
    }
}

// Code for sending message
const textInput = document.querySelector(".textInput");
const sendMessageButton = document.querySelector(".sendMessageButton");
sendMessageButton.addEventListener("click", function () {
    sendMessage();
});
textInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { // Shift + Enter makes a new line, doesn't send
        sendMessage();
        e.preventDefault(); // Don't insert a new line when pressing enter
    }
});

// Send message to opened room
function sendMessage() {
    const formattedText = textInput.value.replace(/\n/g, '<br>');
    wt.joinedRooms[openedRoomName].send(formattedText);
    textInput.value = "";
}

// Code for textarea adjustment
const textarea = document.querySelector(".textInput");
textarea.addEventListener("input", function () {
    this.style.height = "20px"; // Reset height
    this.style.height = this.scrollHeight + "px"; // Set height to scrollbar height in px
});

// Messages rendering
function populateMessages() {
    const messagesDiv = document.querySelector(".messages");

    // Clear messages
    messagesDiv.innerHTML = "";

    // Check if a room is opened. If not, don't attempt rendering messages.
    if (!openedRoomName) {
        return;
    }

    // Check if any messages has been received. If not, don't render any
    if (!messages[openedRoomName]) {
        return;
    }

    messages[openedRoomName].forEach((item) => {
        // Convert time
        const timeString = item.timestamp.toLocaleTimeString("dk-DK", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        });

        // Handle different events in array
        switch (item.event) {
            case "message":
                // Create a div for the sender and timestamp
                const senderDiv = document.createElement("div");
                senderDiv.className =
                    item.sender === user ? "senderInfoUser" : "senderInfoOther";
                senderDiv.innerHTML = `${item.sender} at ${timeString}`;
                messagesDiv.appendChild(senderDiv);

                // Create a div for the message
                const messageDiv = document.createElement("div");
                messageDiv.className =
                    item.sender === user ? "messageUser" : "messageOther";
                messageDiv.innerHTML = item.text;
                messagesDiv.appendChild(messageDiv);
                break;

            case "leave":
                // Create a div for the event
                const leaveDiv = document.createElement("div");
                leaveDiv.className = "messageEventLeft";
                leaveDiv.innerHTML = `${item.text} has left the chat at ${timeString}`;
                messagesDiv.appendChild(leaveDiv);
                break;

            case "join":
                // Create a div for the event
                const joinDiv = document.createElement("div");
                joinDiv.className = "messageEventJoin";
                joinDiv.textContent = `${item.text} has joined the chat at ${timeString}`;
                messagesDiv.appendChild(joinDiv);
                break;

            default:
                console.log("Invalid message event");
        }
    });
}

// Clients rendering
function populateClients() {
    const connectedClientsHeader = document.getElementById('connectedClientsHeader')
    const connectedClients = document.querySelector(".clients");

    // Remove clients
    connectedClients.innerHTML = "";

    if (!openedRoomName) {
        return;
    }

    // Set header to include number of connected clients
    connectedClientsHeader.textContent = "Connected Clients: " + wt.joinedRooms[openedRoomName].clients.length


    // Add the current user to the top
    const clientDiv = document.createElement("div");
    clientDiv.className = "client";
    clientDiv.textContent = "(You)"
    clientDiv.textContent += " " + user;
    connectedClients.appendChild(clientDiv);

    // Create divs for all clients
    wt.joinedRooms[openedRoomName].clients.forEach((client) => {
        const clientDiv = document.createElement("div");
        clientDiv.className = "client";
        clientDiv.textContent = client.nickname;

        if (!client.registered) {
            clientDiv.textContent += " (Guest)"
        }

        // Dont render the user as client, as they will be created above all other clients
        if (client.nickname === user) {
            return
        }

        connectedClients.appendChild(clientDiv);
    });
}

// Rooms rendering
function populateRooms() {
    const joinedRoomsContainer = document.querySelector(".joinedRooms");
    const availableRoomsContainer =
        document.querySelector(".availableRooms");

    // Clear any existing divs in both containers
    joinedRoomsContainer.innerHTML = "";
    availableRoomsContainer.innerHTML = "";

    // Create divs for all rooms
    wt.availableRooms.forEach((room) => {
        const roomDiv = document.createElement("div");
        roomDiv.className = "room";

        const roomDetailsDiv = document.createElement("div");
        roomDetailsDiv.className = "roomDetails";

        const roomNameDiv = document.createElement("div");
        roomNameDiv.textContent = room.name;
        roomNameDiv.className = "roomName";

        const roomDescriptionDiv = document.createElement("div");
        roomDescriptionDiv.textContent = room.description;
        roomDescriptionDiv.className = "roomDescription";

        roomDetailsDiv.appendChild(roomNameDiv);
        roomDetailsDiv.appendChild(roomDescriptionDiv);
        roomDiv.appendChild(roomDetailsDiv);

        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "roomButtonsContainer"

    // Add event listeners and icons based on wether the room is joined or not
    if (!wt.joinedRooms[room.name]) {
    const joinRoomButton = document.createElement("button");
    joinRoomButton.innerHTML =
    '<img src="icons/icons8-enter-100.png" alt="Join" class="icon" aria-label="placeholder">';
    joinRoomButton.ariaLabel = `join room ${room.name}`;
    joinRoomButton.className = "joinRoomButton";
    joinRoomButton.addEventListener("click", function () {
    console.log(`Joining room: ${room.name}`);
    joinRoom(room.name);
});
    buttonsContainer.appendChild(joinRoomButton);

} else {
    const leaveRoomButton = document.createElement("button");
    leaveRoomButton.innerHTML =
    '<img src="icons/icons8-close-24.png" alt="Leave" class="icon" aria-label="placeholder">';
    leaveRoomButton.className = "leaveRoomButton";
    leaveRoomButton.ariaLabel = `leave room ${room.name}`;
    leaveRoomButton.addEventListener("click", function () {
    console.log(`Leaving room: ${room.name}`);
    leaveRoom(room);
});
    buttonsContainer.appendChild(leaveRoomButton);

            const openRoomButton = document.createElement("button");
            openRoomButton.innerHTML =
                '<img src="icons/icons8-open-128.png" alt="Open" class="icon">';
            openRoomButton.className = "openRoomButton";
            openRoomButton.addEventListener("click", function () {
                console.log(`Opening room: ${room.name}`);
                openRoom(room);
            });
            buttonsContainer.appendChild(openRoomButton);
        }

        roomDiv.appendChild(buttonsContainer);


        // Add to the correct container
        if (!wt.joinedRooms[room.name]) {
            availableRoomsContainer.appendChild(roomDiv);
        } else {
            joinedRoomsContainer.appendChild(roomDiv);
        }
    });
}