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
let twitchSocket = null;

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
        
        // Check for actions in asterisks and use TTS
        if (message.includes('*')) {
            const matches = message.match(/\*(.*?)\*/g);
            if (matches && matches.length > 0) {
                const actions = matches.map(match => match.replace(/\*/g, '').trim());
                const ttsText = `Luna, ${actions.join(', ')}`;
                speakText(ttsText);
            }
        }
    }
}

// Function to speak text using TTS
function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
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
    const channel = channelInput.value.trim().toLowerCase();
    
    if (!isConnected && channel) {
        // Connect to Twitch chat
        connectToTwitch(channel);
    } else if (isConnected) {
        // Disconnect from Twitch
        disconnectFromTwitch();
    } else {
        alert('Please enter a Twitch channel name');
    }
}

function connectToTwitch(channel) {
    // Create WebSocket connection to Twitch IRC
    twitchSocket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    
    twitchSocket.onopen = function() {
        // Anonymous connection to Twitch chat
        twitchSocket.send('PASS SCHMOOPIIE');
        twitchSocket.send('NICK justinfan' + Math.floor(Math.random() * 999999));
        twitchSocket.send('CAP REQ :twitch.tv/commands twitch.tv/tags');
        twitchSocket.send(`JOIN #${channel}`);
        
        isConnected = true;
        statusIndicator.textContent = `Connected to ${channel}`;
        statusIndicator.classList.add('connected');
        connectBtn.textContent = 'Disconnect';
        
        addMessageToChat('System', `Luna is now connected to ${channel}'s Twitch chat!`);
    };
    
    twitchSocket.onmessage = function(event) {
        const message = event.data;
        
        // Keep connection alive
        if (message.includes('PING')) {
            twitchSocket.send('PONG :tmi.twitch.tv');
            return;
        }
        
        // Parse chat messages
        if (message.includes('PRIVMSG')) {
            try {
                // Extract message metadata and content
                const messageParts = message.split(' ');
                
                // Extract tags (metadata) from the message
                const tags = {};
                if (message.startsWith('@')) {
                    const tagsStr = messageParts[0].substring(1);
                    const tagsList = tagsStr.split(';');
                    tagsList.forEach(tag => {
                        const [key, value] = tag.split('=');
                        tags[key] = value;
                    });
                }
                
                // Get username from display-name tag or fallback to parsing
                const username = tags['display-name'] || message.split('!')[0].slice(1);
                
                // Find the actual message content
                const msgIndex = message.indexOf(` :${channel} :`);
                let chatMessage;
                
                if (msgIndex !== -1) {
                    chatMessage = message.substring(msgIndex + channel.length + 4);
                } else {
                    // Alternative parsing if the first method fails
                    const msgParts = message.split(`PRIVMSG #${channel} :`);
                    if (msgParts.length > 1) {
                        chatMessage = msgParts[1];
                    } else {
                        // Final fallback
                        const colonIndex = message.lastIndexOf(':');
                        chatMessage = message.substring(colonIndex + 1);
                    }
                }
                
                // Store message with metadata
                const messageData = {
                    username,
                    message: chatMessage,
                    tags
                };
                
                // Add message to chat
                addMessageToChat(username, chatMessage);
                
                // Luna responds
                setTimeout(() => {
                    const lunaResponse = generateLunaResponse(chatMessage);
                    addMessageToChat('Luna', lunaResponse, true);
                }, 1500);
            } catch (e) {
                console.error('Error parsing Twitch message:', e);
            }
        }
    };
    
    twitchSocket.onerror = function(error) {
        console.error('WebSocket Error:', error);
        addMessageToChat('System', 'Error connecting to Twitch chat. Please try again.');
        disconnectFromTwitch();
    };
    
    twitchSocket.onclose = function() {
        if (isConnected) {
            disconnectFromTwitch();
        }
    };
}

function disconnectFromTwitch() {
    isConnected = false;
    statusIndicator.textContent = 'Disconnected';
    statusIndicator.classList.remove('connected');
    connectBtn.textContent = 'Connect';
    
    addMessageToChat('System', 'Luna has been disconnected from Twitch chat.');
    
    // Close WebSocket connection
    if (twitchSocket) {
        twitchSocket.close();
        twitchSocket = null;
    }
    
    // Clear any intervals
    if (twitchConnection) {
        clearInterval(twitchConnection);
        twitchConnection = null;
    }
}

// Initial greeting
setTimeout(() => {
    addMessageToChat('Luna', 'Woof woof! I\'m Luna! Talk to me or connect me to a Twitch chat!', true);
}, 1000);