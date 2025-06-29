import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Menu, X, BarChart3, Settings, Zap } from 'lucide-react';
import ConversationSidebar from './ConversationSidebar';
import MoodSelector from './MoodSelector';
import MoodDashboard from './MoodDashboard';
import { conversationService, messageService, type Message as DBMessage, type Conversation } from '../lib/supabase';
import { moodService } from '../lib/moodService';
import { huggingFaceService, generateFallbackResponse, HF_MODELS } from '../lib/huggingface';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showMoodDashboard, setShowMoodDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [userId] = useState('anonymous'); // In a real app, this would come from auth
  const [aiModel, setAiModel] = useState<keyof typeof HF_MODELS>('CHAT');
  const [useAdvancedMode, setUseAdvancedMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check if Supabase is connected
  useEffect(() => {
    const checkSupabaseConnection = () => {
      const hasUrl = import.meta.env.VITE_SUPABASE_URL;
      const hasKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      setIsSupabaseConnected(Boolean(hasUrl && hasKey));
    };

    checkSupabaseConnection();
  }, []);

  const createNewConversation = async () => {
    if (!isSupabaseConnected) {
      // If Supabase is not connected, just clear messages
      setMessages([]);
      setCurrentConversationId(null);
      return;
    }

    const conversation = await conversationService.createConversation();
    if (conversation) {
      setCurrentConversationId(conversation.id);
      setMessages([]);
    }
  };

  const loadConversation = async (conversationId: string) => {
    if (!isSupabaseConnected) return;

    setCurrentConversationId(conversationId);
    const dbMessages = await messageService.getMessages(conversationId);
    
    const formattedMessages: Message[] = dbMessages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp)
    }));
    
    setMessages(formattedMessages);
  };

  const saveMessageToDb = async (role: 'user' | 'assistant', content: string) => {
    if (!isSupabaseConnected || !currentConversationId) return;

    await messageService.addMessage(currentConversationId, role, content);
    
    // Update conversation title based on first user message
    if (role === 'user' && messages.length === 0) {
      const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
      await conversationService.updateConversationTitle(currentConversationId, title);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    // Create new conversation if none exists and Supabase is connected
    let conversationId = currentConversationId;
    if (isSupabaseConnected && !conversationId) {
      const conversation = await conversationService.createConversation();
      if (conversation) {
        conversationId = conversation.id;
        setCurrentConversationId(conversationId);
      }
    }

    // Save user message to database
    if (isSupabaseConnected && conversationId) {
      await saveMessageToDb('user', currentInput);
    }

    try {
      let assistantContent = '';

      // Prepare chat messages for API call
      const chatMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      chatMessages.push({ role: 'user', content: currentInput });

      if (useAdvancedMode) {
        // Use Hugging Face API with advanced features
        // Get current mood for context
        const todaysMood = isSupabaseConnected ? await moodService.getTodaysMoodEntry(userId) : null;
        
        if (todaysMood && (currentInput.toLowerCase().includes('feel') || currentInput.toLowerCase().includes('mood'))) {
          // Use supportive response for mood-related queries
          assistantContent = await huggingFaceService.generateSupportiveResponse(
            currentInput,
            todaysMood.mood_type,
            todaysMood.intensity
          );
        } else if (currentInput.toLowerCase().includes('story') || currentInput.toLowerCase().includes('script') || currentInput.toLowerCase().includes('narrat')) {
          // Use creative content generation
          const contentType = currentInput.toLowerCase().includes('script') ? 'script' : 
                             currentInput.toLowerCase().includes('narrat') ? 'narration' : 'story';
          assistantContent = await huggingFaceService.generateCreativeContent(currentInput, contentType);
        } else {
          // Use regular chat response with selected model
          assistantContent = await huggingFaceService.generateChatResponse(chatMessages, {
            model: aiModel,
            temperature: 0.8,
            maxLength: 1000
          });
        }
      } else {
        // Use basic chat response through huggingFaceService (not direct fetch)
        assistantContent = await huggingFaceService.generateChatResponse(chatMessages, {
          model: 'CHAT',
          temperature: 0.7,
          maxLength: 1000
        });
      }

      // Clean up the response
      assistantContent = assistantContent.trim();
      if (!assistantContent) {
        assistantContent = generateFallbackResponse(currentInput);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      if (isSupabaseConnected && conversationId) {
        await saveMessageToDb('assistant', assistantContent);
      }
    } catch (error) {
      console.error('Error calling Hugging Face API:', error);
      
      // Fallback response
      const todaysMood = isSupabaseConnected ? await moodService.getTodaysMoodEntry(userId) : null;
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: generateFallbackResponse(currentInput, todaysMood?.mood_type),
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Save fallback message to database
      if (isSupabaseConnected && conversationId) {
        await saveMessageToDb('assistant', assistantMessage.content);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleMoodSelected = async (mood: string, intensity: number) => {
    // Add a contextual message about the mood selection
    const moodMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `I see you're feeling ${mood} with an intensity of ${intensity}/5. Thank you for sharing that with me. Your emotional state can provide valuable context for our conversation. How can I best support you today?`,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, moodMessage]);

    // Save mood context message to database
    if (isSupabaseConnected && currentConversationId) {
      await saveMessageToDb('assistant', moodMessage.content);
    }
  };

  const quickPrompts = [
    "Help me write a compelling story opening",
    "How do I structure a voice-over script?",
    "I'm feeling overwhelmed, can we talk?",
    "Tips for engaging narration",
    "I want to share how I'm feeling today",
    "Create content that connects with audience"
  ];

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex">
      {/* Sidebar */}
      {isSupabaseConnected && (
        <ConversationSidebar
          currentConversationId={currentConversationId}
          onConversationSelect={loadConversation}
          onNewConversation={createNewConversation}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {isSupabaseConnected && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                >
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              )}
              
              <div className="relative">
                <Bot className="h-8 w-8 text-blue-500" />
                <Sparkles className="h-4 w-4 text-yellow-500 absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NarumateAI</h1>
                <p className="text-sm text-gray-500">AI Assistant for Content & Emotional Well-being</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* AI Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center space-x-2 px-3 py-2 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
              >
                <Settings className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">AI Settings</span>
              </button>

              {/* Mood Dashboard Toggle */}
              <button
                onClick={() => setShowMoodDashboard(!showMoodDashboard)}
                className="flex items-center space-x-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
              >
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">
                  {showMoodDashboard ? 'Hide' : 'Show'} Mood Dashboard
                </span>
              </button>

              {/* Mood Selector */}
              <MoodSelector
                userId={userId}
                conversationId={currentConversationId || undefined}
                onMoodSelected={handleMoodSelected}
                isSupabaseConnected={isSupabaseConnected}
              />

              <div className="flex items-center space-x-2">
                <div className={`text-xs px-2 py-1 rounded-full ${
                  isSupabaseConnected 
                    ? 'text-green-600 bg-green-50' 
                    : 'text-orange-600 bg-orange-50'
                }`}>
                  {isSupabaseConnected ? '✓ Database Connected' : '⚠ Local Mode'}
                </div>
                <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  ✓ Free to Use
                </div>
                {useAdvancedMode && (
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full flex items-center">
                    <Zap className="h-3 w-3 mr-1" />
                    Advanced AI
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Database Connection Notice */}
        {!isSupabaseConnected && (
          <div className="bg-orange-50 border-b border-orange-200 p-3">
            <div className="text-center">
              <p className="text-sm text-orange-700">
                <strong>Note:</strong> To save your conversations and mood data, please connect to Supabase using the "Connect to Supabase" button in the top right.
                Currently running in local mode - data won't be saved.
              </p>
            </div>
          </div>
        )}

        {/* AI Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">AI Settings</h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Advanced Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Advanced AI Mode</h4>
                      <p className="text-xs text-gray-600">Enhanced responses with mood awareness and creative content generation</p>
                    </div>
                    <button
                      onClick={() => setUseAdvancedMode(!useAdvancedMode)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useAdvancedMode ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useAdvancedMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Model Selection */}
                  {useAdvancedMode && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">AI Model</h4>
                      <div className="space-y-2">
                        {Object.entries(HF_MODELS).map(([key, model]) => (
                          <label key={key} className="flex items-center">
                            <input
                              type="radio"
                              name="aiModel"
                              value={key}
                              checked={aiModel === key}
                              onChange={(e) => setAiModel(e.target.value as keyof typeof HF_MODELS)}
                              className="mr-3"
                            />
                            <div>
                              <span className="text-sm font-medium text-gray-900">{key}</span>
                              <p className="text-xs text-gray-600">{model}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* API Key Info */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Optional: Hugging Face API Key</h4>
                    <p className="text-xs text-blue-700">
                      Add VITE_HUGGINGFACE_API_KEY to your environment variables for higher rate limits and faster responses.
                      The app works without an API key using free tier limits.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex">
          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${showMoodDashboard ? 'md:w-2/3' : 'w-full'}`}>
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="max-w-4xl mx-auto space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12">
                    <div className="relative mb-6">
                      <Bot className="h-16 w-16 text-blue-400 mx-auto" />
                      <Sparkles className="h-6 w-6 text-yellow-500 absolute top-0 right-1/2 transform translate-x-8" />
                      {useAdvancedMode && (
                        <Zap className="h-6 w-6 text-blue-500 absolute bottom-0 left-1/2 transform -translate-x-8" />
                      )}
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Welcome to NarumateAI! {useAdvancedMode && '⚡ Advanced Mode'}
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto mb-6">
                      I'm your {useAdvancedMode ? 'enhanced' : 'free'} AI assistant for creating engaging narrated content and supporting your emotional well-being. 
                      {isSupabaseConnected ? ' Your conversations and mood data will be saved automatically!' : ' Connect to Supabase to save your conversations and track your moods.'}
                    </p>
                    
                    {/* Quick Start Prompts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                      {quickPrompts.map((prompt, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickPrompt(prompt)}
                          className="p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-sm text-left text-gray-700 hover:text-blue-600"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex items-start space-x-3 max-w-3xl ${
                        message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          message.role === 'user' ? 'bg-blue-500' : 'bg-gradient-to-r from-purple-500 to-blue-500'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <User className="h-5 w-5 text-white" />
                        ) : (
                          <Bot className="h-5 w-5 text-white" />
                        )}
                      </div>
                      
                      <div
                        className={`rounded-lg px-4 py-3 shadow-sm ${
                          message.role === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <p
                          className={`text-xs mt-2 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-3 max-w-3xl">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                          <span className="text-gray-600">
                            {useAdvancedMode ? 'Generating enhanced response...' : 'Crafting response...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="bg-white border-t border-gray-200 p-4 shadow-lg">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-end space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me about narration, storytelling, content creation, or share your feelings..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none shadow-sm"
                      rows={1}
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  </div>
                  
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
                
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {isSupabaseConnected 
                    ? `Powered by ${useAdvancedMode ? 'enhanced' : 'free'} Hugging Face AI - Conversations and moods saved automatically`
                    : `Powered by ${useAdvancedMode ? 'enhanced' : 'free'} Hugging Face AI - Connect to Supabase to save conversations and track moods`
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Mood Dashboard Sidebar */}
          {showMoodDashboard && (
            <div className="hidden md:block w-1/3 border-l border-gray-200 bg-gray-50 overflow-y-auto">
              <div className="p-4">
                <MoodDashboard
                  userId={userId}
                  isSupabaseConnected={isSupabaseConnected}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Mood Dashboard Modal */}
      {showMoodDashboard && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Mood Dashboard</h2>
              <button
                onClick={() => setShowMoodDashboard(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <MoodDashboard
                userId={userId}
                isSupabaseConnected={isSupabaseConnected}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;