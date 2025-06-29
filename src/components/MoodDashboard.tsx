import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, TrendingUp, Heart, Clock, Target } from 'lucide-react';
import { moodService, MOOD_TYPES, type MoodEntry, type MoodStats, type MoodType } from '../lib/moodService';

interface MoodDashboardProps {
  userId: string;
  isSupabaseConnected: boolean;
}

const MoodDashboard: React.FC<MoodDashboardProps> = ({ userId, isSupabaseConnected }) => {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [moodStats, setMoodStats] = useState<MoodStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');

  useEffect(() => {
    if (isSupabaseConnected) {
      loadMoodData();
    }
  }, [userId, isSupabaseConnected, timeRange]);

  const loadMoodData = async () => {
    setLoading(true);
    try {
      const [entries, stats] = await Promise.all([
        moodService.getMoodEntries(userId, 50),
        moodService.getMoodStats(userId, parseInt(timeRange))
      ]);
      setMoodEntries(entries);
      setMoodStats(stats);
    } catch (error) {
      console.error('Error loading mood data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const getStreakCount = () => {
    if (moodEntries.length === 0) return 0;
    
    let streak = 0;
    const today = new Date().toISOString().split('T')[0];
    const sortedEntries = [...moodEntries].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Check if there's an entry for today or yesterday
    const latestEntry = sortedEntries[0];
    const latestDate = new Date(latestEntry.date);
    const todayDate = new Date(today);
    const daysDiff = Math.floor((todayDate.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 1) return 0; // Streak broken
    
    // Count consecutive days
    let currentDate = new Date(latestEntry.date);
    for (const entry of sortedEntries) {
      const entryDate = new Date(entry.date);
      const diff = Math.floor((currentDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diff <= 1) {
        streak++;
        currentDate = entryDate;
      } else {
        break;
      }
    }
    
    return streak;
  };

  if (!isSupabaseConnected) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Mood Tracking</h3>
        <p className="text-gray-600">
          Connect to Supabase to track your moods and see insights over time.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!moodStats || moodStats.totalEntries === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Start Tracking Your Mood</h3>
        <p className="text-gray-600">
          Begin logging your daily moods to see patterns and insights over time.
        </p>
      </div>
    );
  }

  const streakCount = getStreakCount();

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Heart className="h-5 w-5 text-pink-500 mr-2" />
          Mood Dashboard
        </h2>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['7', '30', '90'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range} days
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">{moodStats.totalEntries}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Avg Intensity</p>
              <p className="text-2xl font-bold text-gray-900">{moodStats.averageIntensity}/5</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Most Common</p>
              <div className="flex items-center">
                <span className="text-lg mr-1">
                  {MOOD_TYPES[moodStats.mostCommonMood as MoodType]?.emoji}
                </span>
                <p className="text-sm font-bold text-gray-900">
                  {MOOD_TYPES[moodStats.mostCommonMood as MoodType]?.label}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Streak</p>
              <p className="text-2xl font-bold text-gray-900">{streakCount} days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mood Distribution */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Mood Distribution</h3>
        <div className="space-y-3">
          {Object.entries(moodStats.moodDistribution)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 8)
            .map(([mood, count]) => {
              const percentage = (count / moodStats.totalEntries) * 100;
              const moodInfo = MOOD_TYPES[mood as MoodType];
              
              return (
                <div key={mood} className="flex items-center">
                  <div className="flex items-center w-24">
                    <span className="text-lg mr-2">{moodInfo?.emoji}</span>
                    <span className="text-sm font-medium text-gray-700">
                      {moodInfo?.label}
                    </span>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 w-12 text-right">
                    {count} ({Math.round(percentage)}%)
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Recent Entries */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Entries</h3>
        <div className="space-y-3">
          {moodEntries.slice(0, 10).map(entry => {
            const moodInfo = MOOD_TYPES[entry.mood_type as MoodType];
            
            return (
              <div key={entry.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{moodInfo?.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {moodInfo?.label}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(entry.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center mt-1">
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map(level => (
                        <div
                          key={level}
                          className={`w-2 h-2 rounded-full ${
                            level <= entry.intensity ? 'bg-blue-400' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500 ml-2">
                      Intensity: {entry.intensity}/5
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      "{entry.notes}"
                    </p>
                  )}
                  {entry.triggers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.triggers.map(trigger => (
                        <span
                          key={trigger}
                          className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MoodDashboard;