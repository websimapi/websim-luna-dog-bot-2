import { LUNA_RESPONSES } from './config.js';

// DOM Elements
const dogMouth = document.getElementById('dog-mouth');
const dogTail = document.getElementById('dog-tail');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const connectBtn = document.getElementById('connect-btn');
const channelInput = document.getElementById('channel');
const statusIndicator = document.getElementById('status-indicator');

// Luna's state
let isConnected = false;
let twitchConnection = null;

// Luna's behaviors
function bark() {
    dogMouth.classList.add('bark');
    dogTail.classList.add('wag');
    
    setTimeout(() => {
        dogMouth.classList.remove('bark');
    }, 500);
    
    setTimeout(() => {
        dogTail.classList.remove('wag');
    }, 1000);
}

function generateLunaResponse(message) {
    // Convert message to lowercase for easier matching
    const lowercaseMsg = message.toLowerCase();
    
    // Check for key words/phrases to determine response type
    if (lowercaseMsg.includes('treat') || lowercaseMsg.includes('food') || lowercaseMsg.includes('snack')) {
        return getRandomResponse('excited');
    } else if (lowercaseMsg.includes('walk') || lowercaseMsg.includes('play') || lowercaseMsg.includes('outside')) {
        return getRandomResponse('playful');
    } else if (lowercaseMsg.includes('bad') || lowercaseMsg.includes('no') || lowercaseMsg.includes('stop')) {
        return getRandomResponse('sad');
    } else if (lowercaseMsg.includes('good') || lowercaseMsg.includes('pet') || lowercaseMsg.includes('love')) {
        return getRandomResponse('happy');
    } else if (lowercaseMsg.includes('?')) {
        return getRandomResponse('confused');
    } else {
        // Default response
        return getRandomResponse('neutral');
    }
}

function getRandomResponse(mood) {
    const responses = LUNA_RESPONSES[mood] || LUNA_RESPONSES.neutral;
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
}

function addMessageToChat(sender, message, isLuna = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${isLuna ? 'luna-message' : 'user-message'}`;
    
    const senderElement = document.createElement('div');
    senderElement.className = 'sender';
    senderElement.textContent = sender;
    
    const contentElement = document.createElement('div');
    contentElement.className = 'content';
    contentElement.textContent = message;
    
    messageElement.appendChild(senderElement);
    messageElement.appendChild(contentElement);
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    if (isLuna) {
        bark();
    }
}

// Event listeners
sendBtn.addEventListener('click', handleSendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSendMessage();
    }
});

connectBtn.addEventListener('click', toggleTwitchConnection);

function handleSendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        addMessageToChat('You', message);
        
        // Generate Luna's response
        setTimeout(() => {
            const lunaResponse = generateLunaResponse(message);
            addMessageToChat('Luna', lunaResponse, true);
        }, 1000);
        
        messageInput.value = '';
    }
}

function toggleTwitchConnection() {
    const channel = channelInput.value.trim();
    
    if (!isConnected && channel) {
        // Connect to Twitch (simulated for demonstration)
        connectToTwitch(channel);
    } else if (isConnected) {
        // Disconnect from Twitch
        disconnectFromTwitch();
    } else {
        alert('Please enter a Twitch channel name');
    }
}

function connectToTwitch(channel) {
    // Simulate connection to Twitch
    isConnected = true;
    statusIndicator.textContent = `Connected to ${channel}`;
    statusIndicator.classList.add('connected');
    connectBtn.textContent = 'Disconnect';
    
    addMessageToChat('System', `Luna is now connected to ${channel}'s Twitch chat!`);
    
    // Simulate receiving messages from Twitch chat
    startTwitchSimulation(channel);
}

function disconnectFromTwitch() {
    isConnected = false;
    statusIndicator.textContent = 'Disconnected';
    statusIndicator.classList.remove('connected');
    connectBtn.textContent = 'Connect';
    
    addMessageToChat('System', 'Luna has been disconnected from Twitch chat.');
    
    // Clear the simulation
    if (twitchConnection) {
        clearInterval(twitchConnection);
        twitchConnection = null;
    }
}

function startTwitchSimulation(channel) {
    // Create fake Twitch users and messages
    const twitchUsers = [
        'StreamFan123', 'GamerGirl42', 'TwitchViewer', 'ChatLurker', 
        'StreamSupporter', 'GameEnthusiast', 'StreamNewbie', 'LongTimeViewer'
    ];
    
    const twitchMessages = [
        'Hello Luna!', 'Good doggo!', 'Can Luna do tricks?', 
        'Who\'s a good girl?', 'Luna is so cute!', 'Woof woof!',
        'Does Luna want a treat?', 'Luna come play with me!',
        'No barking Luna!', 'I love dogs so much!',
        'Luna what do you think of cats?', 'Is Luna sleepy?'
    ];
    
    twitchConnection = setInterval(() => {
        // Random chance to simulate a new message
        if (Math.random() > 0.7) {
            const randomUser = twitchUsers[Math.floor(Math.random() * twitchUsers.length)];
            const randomMessage = twitchMessages[Math.floor(Math.random() * twitchMessages.length)];
            
            addMessageToChat(randomUser, randomMessage);
            
            // Luna responds
            setTimeout(() => {
                const lunaResponse = generateLunaResponse(randomMessage);
                addMessageToChat('Luna', lunaResponse, true);
            }, 1500);
        }
    }, 5000); // Check every 5 seconds
}

// Initial greeting
setTimeout(() => {
    addMessageToChat('Luna', 'Woof woof! I\'m Luna! Talk to me or connect me to a Twitch chat!', true);
}, 1000);

