import { LUNA_RESPONSES, BARK_KEYWORDS } from './config.js';

// DOM Elements
const dogMouth = document.getElementById('dog-mouth');
const dogTail = document.getElementById('dog-tail');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const connectBtn = document.getElementById('connect-btn');
const channelInput = document.getElementById('channel');
const statusIndicator = document.getElementById('status-indicator');

// Create audio element for bark sound
const barkSound = new Audio('dog-bark-179915.mp3');
barkSound.volume = 0.7;

// Luna's state
let isConnected = false;
let twitchConnection = null;
let twitchSocket = null;
let conversationHistory = [];
let userHasInteracted = false;

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

async function generateLunaResponse(message) {
    // Convert message to lowercase for easier matching
    const lowercaseMsg = message.toLowerCase();
    
    // Use LLM to generate a response based on message content
    return getLLMResponse(message);
}

async function getLLMResponse(message) {
    try {
        const newMessage = {
            role: "user", 
            content: message
        };
        
        conversationHistory.push(newMessage);
        conversationHistory = conversationHistory.slice(-10);
        
        const completion = await websim.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are Luna, a friendly dog. Respond ONLY like a dog would with barks, whines, and physical actions in asterisks. Always format your response with bark sounds (woof, bark, arf, ruff, awoo) separated from actions. For example: 'Woof! Woof! *wags tail excitedly*' or '*tilts head curiously* Arf arf!' Keep responses under 2 sentences. Never use human language or explain things. Always include at least one bark sound (woof, bark, arf, ruff, awoo)."
                },
                ...conversationHistory
            ]
        });
        
        const response = completion.content;
        conversationHistory.push(completion);
        
        return response;
    } catch (error) {
        console.error("Error getting LLM response:", error);
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
        
        // Parse the message to play barks and TTS in sequence
        processLunaResponse(message);
    }
}

function processLunaResponse(message) {
    // Don't try to play sounds if user hasn't interacted yet
    if (!userHasInteracted) return;
    
    // Extract parts of the message: bark sounds and actions
    const parts = [];
    
    // Extract actions in asterisks
    const asteriskRegex = /\*(.*?)\*/g;
    let match;
    let lastIndex = 0;
    
    while ((match = asteriskRegex.exec(message)) !== null) {
        // If there's text before the asterisk, add it as a potential bark part
        if (match.index > lastIndex) {
            const textBefore = message.substring(lastIndex, match.index).trim();
            if (textBefore) {
                parts.push({ type: 'bark', text: textBefore });
            }
        }
        
        // Add the action in asterisks
        parts.push({ type: 'action', text: match[1].trim() });
        
        lastIndex = match.index + match[0].length;
    }
    
    // Add any remaining text after the last asterisk
    if (lastIndex < message.length) {
        const textAfter = message.substring(lastIndex).trim();
        if (textAfter) {
            parts.push({ type: 'bark', text: textAfter });
        }
    }
    
    // If we couldn't parse into parts properly, just try to count barks
    if (parts.length === 0) {
        countAndPlayBarks(message);
        return;
    }
    
    // Process the parts in sequence
    processLunaParts(parts, 0);
}

function processLunaParts(parts, index) {
    if (index >= parts.length) return;
    
    const part = parts[index];
    
    if (part.type === 'bark') {
        // Count and play barks for this part
        const barkCount = countBarksInText(part.text);
        
        if (barkCount > 0) {
            playBarkSequence(barkCount, () => {
                // When barks are done, move to next part
                setTimeout(() => processLunaParts(parts, index + 1), 300);
            });
        } else {
            // No barks found, move to next part
            processLunaParts(parts, index + 1);
        }
    } else if (part.type === 'action') {
        // Speak the action with TTS
        const ttsText = `Luna, ${part.text}`;
        console.log("Speaking with TTS:", ttsText);
        speakTextWithCallback(ttsText, () => {
            // When TTS is done, move to next part
            setTimeout(() => processLunaParts(parts, index + 1), 300);
        });
    }
}

function countBarksInText(text) {
    const lowercaseText = text.toLowerCase();
    let count = 0;
    
    BARK_KEYWORDS.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = lowercaseText.match(regex) || [];
        count += matches.length;
    });
    
    return count;
}

function playBarkSequence(count, callback) {
    let played = 0;
    
    function playNext() {
        barkSound.currentTime = 0;
        barkSound.play().catch(err => {
            console.log("Audio play error:", err);
            if (callback) callback();
        });
        
        played++;
        
        if (played < count) {
            barkSound.onended = playNext;
        } else {
            barkSound.onended = callback;
        }
    }
    
    playNext();
}

function speakTextWithCallback(text, callback) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;
    
    utterance.onend = function() {
        if (callback) callback();
    };
    
    utterance.onerror = function(event) {
        console.error("TTS error:", event);
        if (callback) callback();
    };
    
    window.speechSynthesis.speak(utterance);
}

function countAndPlayBarks(message) {
    // This function can be kept as a fallback but is largely replaced by processLunaResponse
    const lowercaseMsg = message.toLowerCase();
    
    // Check for any bark keywords
    let barkCount = 0;
    
    BARK_KEYWORDS.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = lowercaseMsg.match(regex) || [];
        barkCount += matches.length;
    });
    
    if (barkCount > 0 && userHasInteracted) {
        playBarkSequence(barkCount);
    }
}

function speakText(text) {
    if (!text) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.volume = 0.9;
    
    window.speechSynthesis.speak(utterance);
}

// Event listeners
sendBtn.addEventListener('click', function() {
    userHasInteracted = true;
    handleSendMessage();
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        userHasInteracted = true;
        handleSendMessage();
    }
});

connectBtn.addEventListener('click', function() {
    userHasInteracted = true;
    toggleTwitchConnection();
});

// Add event listeners to ensure user has interacted with the page
document.addEventListener('click', function() {
    userHasInteracted = true;
});

document.addEventListener('keypress', function() {
    userHasInteracted = true;
});

function handleSendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        addMessageToChat('You', message);
        
        // Generate Luna's response only if her name is mentioned
        if (message.toLowerCase().includes('luna')) {
            setTimeout(async () => {
                const lunaResponse = await generateLunaResponse(message);
                addMessageToChat('Luna', lunaResponse, true);
            }, 1000);
        }
        
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
                
                // Luna only responds if her name is mentioned
                if (chatMessage.toLowerCase().includes('luna')) {
                    setTimeout(async () => {
                        const lunaResponse = await generateLunaResponse(chatMessage);
                        addMessageToChat('Luna', lunaResponse, true);
                    }, 1500);
                }
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

// Add speech synthesis initialization code
// Initialize speech synthesis when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Pre-warm speech synthesis engine
    if ('speechSynthesis' in window) {
        // Create and immediately cancel a blank utterance
        // This helps initialize the speech engine on some browsers
        const warmupUtterance = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(warmupUtterance);
        window.speechSynthesis.cancel();
        
        console.log("Speech synthesis initialized");
    } else {
        console.error("Speech synthesis not supported in this browser");
    }
});