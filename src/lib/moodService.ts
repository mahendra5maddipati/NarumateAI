import { supabase } from './supabase';

// Mood types and configurations
export const MOOD_TYPES = {
  happy: { emoji: '😊', color: 'bg-yellow-100 text-yellow-800', label: 'Happy' },
  excited: { emoji: '🤩', color: 'bg-orange-100 text-orange-800', label: 'Excited' },
  grateful: { emoji: '🙏', color: 'bg-green-100 text-green-800', label: 'Grateful' },
  calm: { emoji: '😌', color: 'bg-blue-100 text-blue-800', label: 'Calm' },
  content: { emoji: '😊', color: 'bg-teal-100 text-teal-800', label: 'Content' },
  sad: { emoji: '😢', color: 'bg-blue-200 text-blue-900', label: 'Sad' },
  anxious: { emoji: '😰', color: 'bg-purple-100 text-purple-800', label: 'Anxious' },
  stressed: { emoji: '😤', color: 'bg-red-100 text-red-800', label: 'Stressed' },
  angry: { emoji: '😠', color: 'bg-red-200 text-red-900', label: 'Angry' },
  frustrated: { emoji: '😤', color: 'bg-orange-200 text-orange-900', label: 'Frustrated' },
  confused: { emoji: '😕', color: 'bg-gray-100 text-gray-800', label: 'Confused' },
  tired: { emoji: '😴', color: 'bg-indigo-100 text-indigo-800', label: 'Tired' },
  lonely: { emoji: '😔', color: 'bg-gray-200 text-gray-900', label: 'Lonely' },
  hopeful: { emoji: '🌟', color: 'bg-yellow-200 text-yellow-900', label: 'Hopeful' },
  motivated: { emoji: '💪', color: 'bg-green-200 text-green-900', label: 'Motivated' },
  peaceful: { emoji: '☮️', color: 'bg-blue-50 text-blue-700', label: 'Peaceful' }
} as const;

export type MoodType = keyof typeof MOOD_TYPES;

export const COMMON_TRIGGERS = [
  'Work/Career',
  'Relationships',
  'Family',
  'Health',
  'Finances',
  'Weather',
  'Social Media',
  'News',
  'Exercise',
  'Sleep',
  'Food',
  'Travel',
  'Achievement',
  'Disappointment',
  'Change',
  'Uncertainty'
];

// Database types
export interface Mood {
  id: string;
  conversation_id: string;
  mood_type: string;
  intensity: number;
  description?: string;
  created_at: string;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  mood_type: string;
  secondary_moods: string[];
  intensity: number;
  notes?: string;
  triggers: string[];
  created_at: string;
  date: string;
}

export interface MoodStats {
  totalEntries: number;
  averageIntensity: number;
  mostCommonMood: string;
  moodDistribution: Record<string, number>;
  weeklyTrend: Array<{ date: string; mood: string; intensity: number }>;
}

// Mood service functions
export const moodService = {
  // Add mood to a conversation
  async addConversationMood(
    conversationId: string,
    moodType: string,
    intensity: number,
    description?: string
  ): Promise<Mood | null> {
    try {
      const { data, error } = await supabase
        .from('moods')
        .insert([{
          conversation_id: conversationId,
          mood_type: moodType,
          intensity,
          description
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding conversation mood:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error adding conversation mood:', error);
      return null;
    }
  },

  // Get moods for a conversation
  async getConversationMoods(conversationId: string): Promise<Mood[]> {
    try {
      const { data, error } = await supabase
        .from('moods')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching conversation moods:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching conversation moods:', error);
      return [];
    }
  },

  // Add comprehensive mood entry
  async addMoodEntry(
    userId: string,
    moodType: string,
    intensity: number,
    options: {
      secondaryMoods?: string[];
      notes?: string;
      triggers?: string[];
    } = {}
  ): Promise<MoodEntry | null> {
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .insert([{
          user_id: userId,
          mood_type: moodType,
          secondary_moods: options.secondaryMoods || [],
          intensity,
          notes: options.notes,
          triggers: options.triggers || []
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding mood entry:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error adding mood entry:', error);
      return null;
    }
  },

  // Get mood entries for a user
  async getMoodEntries(userId: string, limit: number = 50): Promise<MoodEntry[]> {
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching mood entries:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching mood entries:', error);
      return [];
    }
  },

  // Get mood entries for a specific date range
  async getMoodEntriesInRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<MoodEntry[]> {
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching mood entries in range:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching mood entries in range:', error);
      return [];
    }
  },

  // Get today's mood entry
  async getTodaysMoodEntry(userId: string): Promise<MoodEntry | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching today\'s mood entry:', error);
        return null;
      }

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching today\'s mood entry:', error);
      return null;
    }
  },

  // Get mood statistics
  async getMoodStats(userId: string, days: number = 30): Promise<MoodStats> {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];

      const entries = await this.getMoodEntriesInRange(userId, startDate, endDate);

      if (entries.length === 0) {
        return {
          totalEntries: 0,
          averageIntensity: 0,
          mostCommonMood: '',
          moodDistribution: {},
          weeklyTrend: []
        };
      }

      // Calculate statistics
      const totalEntries = entries.length;
      const averageIntensity = entries.reduce((sum, entry) => sum + entry.intensity, 0) / totalEntries;

      // Mood distribution
      const moodDistribution: Record<string, number> = {};
      entries.forEach(entry => {
        moodDistribution[entry.mood_type] = (moodDistribution[entry.mood_type] || 0) + 1;
      });

      // Most common mood
      const mostCommonMood = Object.entries(moodDistribution)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || '';

      // Weekly trend (last 7 days)
      const weeklyTrend = entries
        .slice(0, 7)
        .map(entry => ({
          date: entry.date,
          mood: entry.mood_type,
          intensity: entry.intensity
        }));

      return {
        totalEntries,
        averageIntensity: Math.round(averageIntensity * 10) / 10,
        mostCommonMood,
        moodDistribution,
        weeklyTrend
      };
    } catch (error) {
      console.error('Error calculating mood stats:', error);
      return {
        totalEntries: 0,
        averageIntensity: 0,
        mostCommonMood: '',
        moodDistribution: {},
        weeklyTrend: []
      };
    }
  },

  // Delete mood entry
  async deleteMoodEntry(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('mood_entries')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting mood entry:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting mood entry:', error);
      return false;
    }
  }
};