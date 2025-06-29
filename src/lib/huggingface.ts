// Hugging Face API integration
const HF_API_URL = 'https://api-inference.huggingface.co/models';

// Available models for different use cases
export const HF_MODELS = {
  CHAT: 'microsoft/DialoGPT-medium',
  CONVERSATIONAL: 'facebook/blenderbot-400M-distill',
  SUPPORTIVE: 'microsoft/DialoGPT-large',
  CREATIVE: 'gpt2-medium'
} as const;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface HuggingFaceResponse {
  generated_text?: string;
  conversation?: {
    generated_responses: string[];
    past_user_inputs: string[];
  };
  error?: string;
}

class HuggingFaceService {
  private apiKey: string | null = null;
  private baseUrl = HF_API_URL;

  constructor() {
    // Optional: Set API key if available (for higher rate limits)
    this.apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY || null;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  private async makeRequest(model: string, payload: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/${model}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  async generateChatResponse(
    messages: ChatMessage[],
    options: {
      model?: keyof typeof HF_MODELS;
      maxLength?: number;
      temperature?: number;
      topP?: number;
      doSample?: boolean;
    } = {}
  ): Promise<string> {
    const {
      model = 'CHAT',
      maxLength = 1000,
      temperature = 0.7,
      topP = 0.9,
      doSample = true
    } = options;

    const modelName = HF_MODELS[model];
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    const assistantMessages = messages.filter(m => m.role === 'assistant').map(m => m.content);
    const currentInput = userMessages[userMessages.length - 1] || '';

    try {
      // For conversational models like DialoGPT
      if (model === 'CHAT' || model === 'SUPPORTIVE') {
        const payload = {
          inputs: {
            past_user_inputs: userMessages.slice(0, -1),
            generated_responses: assistantMessages,
            text: currentInput
          },
          parameters: {
            max_length: maxLength,
            temperature,
            top_p: topP,
            do_sample: doSample,
            pad_token_id: 50256,
            repetition_penalty: 1.1
          },
          options: {
            wait_for_model: true,
            use_cache: false
          }
        };

        const response = await this.makeRequest(modelName, payload);
        return response.generated_text || response.conversation?.generated_responses?.[0] || '';
      }

      // For other models (text generation)
      const conversationContext = messages
        .slice(-6) // Keep last 6 messages for context
        .map(m => `${m.role === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
        .join('\n');

      const prompt = `${conversationContext}\nAssistant:`;

      const payload = {
        inputs: prompt,
        parameters: {
          max_new_tokens: maxLength,
          temperature,
          top_p: topP,
          do_sample: doSample,
          return_full_text: false,
          repetition_penalty: 1.1
        },
        options: {
          wait_for_model: true,
          use_cache: false
        }
      };

      const response = await this.makeRequest(modelName, payload);
      
      if (Array.isArray(response)) {
        return response[0]?.generated_text || '';
      }
      
      return response.generated_text || '';
    } catch (error) {
      console.error('Hugging Face API error:', error);
      throw error;
    }
  }

  async generateSupportiveResponse(
    userMessage: string,
    mood?: string,
    intensity?: number
  ): Promise<string> {
    const moodContext = mood && intensity 
      ? `The user is feeling ${mood} with intensity ${intensity}/5. `
      : '';

    const supportivePrompt = `${moodContext}Please provide a supportive, empathetic response to: "${userMessage}"`;

    try {
      const payload = {
        inputs: supportivePrompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.8,
          top_p: 0.9,
          do_sample: true,
          repetition_penalty: 1.2
        },
        options: {
          wait_for_model: true
        }
      };

      const response = await this.makeRequest(HF_MODELS.SUPPORTIVE, payload);
      return Array.isArray(response) ? response[0]?.generated_text || '' : response.generated_text || '';
    } catch (error) {
      console.error('Error generating supportive response:', error);
      throw error;
    }
  }

  async generateCreativeContent(
    prompt: string,
    type: 'story' | 'script' | 'narration' = 'story'
  ): Promise<string> {
    const typePrompts = {
      story: 'Write a compelling story based on: ',
      script: 'Create a voice-over script for: ',
      narration: 'Write engaging narration for: '
    };

    const fullPrompt = typePrompts[type] + prompt;

    try {
      const payload = {
        inputs: fullPrompt,
        parameters: {
          max_new_tokens: 500,
          temperature: 0.9,
          top_p: 0.95,
          do_sample: true,
          repetition_penalty: 1.1
        },
        options: {
          wait_for_model: true
        }
      };

      const response = await this.makeRequest(HF_MODELS.CREATIVE, payload);
      return Array.isArray(response) ? response[0]?.generated_text || '' : response.generated_text || '';
    } catch (error) {
      console.error('Error generating creative content:', error);
      throw error;
    }
  }

  // Check if a model is available
  async checkModelStatus(model: keyof typeof HF_MODELS): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${HF_MODELS[model]}`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const huggingFaceService = new HuggingFaceService();

// Fallback responses for when API is unavailable
export const generateFallbackResponse = (userInput: string, mood?: string): string => {
  const input = userInput.toLowerCase();
  
  // Mood and feelings related responses
  if (input.includes('feel') || input.includes('mood') || input.includes('emotion') || mood) {
    const moodResponses = [
      "I understand you're sharing your feelings with me. It's important to acknowledge and process our emotions. Would you like to talk more about what's affecting your mood today?",
      "Thank you for opening up about how you're feeling. Emotions are a natural part of the human experience. What do you think might be contributing to these feelings?",
      "I appreciate you sharing your emotional state. Sometimes talking through our feelings can help us understand them better. Is there anything specific that's been on your mind?",
      "It sounds like you're experiencing some strong emotions. Remember that it's okay to feel whatever you're feeling. Would you like to explore what might be behind these feelings?",
      "Your feelings are valid and important. Sometimes our moods can tell us a lot about what we need. Have you noticed any patterns in what affects your emotional state?"
    ];
    return moodResponses[Math.floor(Math.random() * moodResponses.length)];
  }
  
  // Narration and storytelling responses
  if (input.includes('story') || input.includes('narrative') || input.includes('plot')) {
    const storyResponses = [
      "Great storytelling starts with a compelling hook! Consider opening with conflict, mystery, or an intriguing character moment. What genre or theme are you exploring?",
      "Every good narrative needs three key elements: engaging characters, a clear conflict, and emotional stakes. What's the central tension in your story?",
      "For narrative structure, try the three-act format: Setup (25%), Confrontation (50%), and Resolution (25%). What's your story's main turning point?",
      "Character development drives great narration. Give your characters clear motivations, flaws, and growth arcs. Who is your protagonist and what do they want?"
    ];
    return storyResponses[Math.floor(Math.random() * storyResponses.length)];
  }
  
  if (input.includes('voice') || input.includes('narration') || input.includes('script')) {
    const voiceResponses = [
      "For effective voice-over scripts, write conversationally and include natural pauses. Read your script aloud to test its flow. What type of content are you creating?",
      "Voice narration works best with clear, concise language. Avoid complex sentences and use active voice. Are you writing for educational, marketing, or entertainment content?",
      "Consider your audience when crafting narration. Formal tone for business, casual for social media, warm for educational content. What's your target audience?",
      "Good narration pacing includes strategic pauses, emphasis on key points, and varied sentence lengths. What's the main message you want to convey?"
    ];
    return voiceResponses[Math.floor(Math.random() * voiceResponses.length)];
  }
  
  if (input.includes('content') || input.includes('create') || input.includes('write')) {
    const contentResponses = [
      "Content creation starts with understanding your audience's needs and interests. What problem are you solving or what value are you providing?",
      "Effective content follows the AIDA framework: Attention, Interest, Desire, Action. How can you grab attention in your opening?",
      "For engaging content, use storytelling techniques: relatable characters, conflict, and resolution. What story can you tell to illustrate your point?",
      "Content that resonates combines useful information with emotional connection. What emotions do you want your audience to feel?"
    ];
    return contentResponses[Math.floor(Math.random() * contentResponses.length)];
  }
  
  if (input.includes('help') || input.includes('how') || input.includes('what')) {
    return "I'm NarumateAI, your AI assistant for creating engaging narrated content and supporting your emotional well-being! I can help you with:\n\n• Storytelling techniques and narrative structure\n• Script writing for voice-overs\n• Content creation strategies\n• Processing feelings and emotions\n• Mood tracking and self-reflection\n• Character development\n• Dialogue writing\n\nWhat specific aspect would you like to explore?";
  }
  
  // General conversational responses
  const generalResponses = [
    "That's an interesting point! I'm here to help with both your creative projects and emotional well-being. How would you like to develop this idea further?",
    "I'd love to help you explore that concept. Whether it's for content creation or personal reflection, what specific aspect would you like to focus on?",
    "Great question! I can assist with narration, storytelling, and also provide a supportive space to discuss your feelings. What's your main goal today?",
    "That sounds like it could make for compelling content or meaningful self-reflection! How are you planning to approach this?"
  ];
  
  return generalResponses[Math.floor(Math.random() * generalResponses.length)];
};