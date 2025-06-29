import React, { useState, useEffect } from 'react';
import { Heart, TrendingUp, Calendar, Plus, X, Check } from 'lucide-react';
import { moodService, MOOD_TYPES, COMMON_TRIGGERS, type MoodType, type MoodEntry } from '../lib/moodService';

interface MoodSelectorProps {
  userId: string;
  conversationId?: string;
  onMoodSelected?: (mood: string, intensity: number) => void;
  isSupabaseConnected: boolean;
}

const MoodSelector: React.FC<MoodSelectorProps> = ({
  userId,
  conversationId,
  onMoodSelected,
  isSupabaseConnected
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [notes, setNotes] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [secondaryMoods, setSecondaryMoods] = useState<MoodType[]>([]);
  const [todaysMood, setTodaysMood] = useState<MoodEntry | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);

  useEffect(() => {
    if (isSupabaseConnected) {
      loadTodaysMood();
    }
  }, [userId, isSupabaseConnected]);

  const loadTodaysMood = async () => {
    const mood = await moodService.getTodaysMoodEntry(userId);
    setTodaysMood(mood);
  };

  const handleMoodSelect = (mood: MoodType) => {
    setSelectedMood(mood);
    if (!showFullForm) {
      // Quick mood selection
      handleSubmit(mood, intensity);
    }
  };

  const handleSubmit = async (mood?: MoodType, moodIntensity?: number) => {
    if (!selectedMood && !mood) return;

    const finalMood = mood || selectedMood!;
    const finalIntensity = moodIntensity || intensity;

    setIsSubmitting(true);

    try {
      if (isSupabaseConnected) {
        // Add comprehensive mood entry
        await moodService.addMoodEntry(userId, finalMood, finalIntensity, {
          secondaryMoods: secondaryMoods,
          notes: notes.trim() || undefined,
          triggers: selectedTriggers
        });

        // Add conversation-specific mood if conversationId is provided
        if (conversationId) {
          await moodService.addConversationMood(
            conversationId,
            finalMood,
            finalIntensity,
            notes.trim() || undefined
          );
        }

        // Reload today's mood
        await loadTodaysMood();
      }

      // Notify parent component
      onMoodSelected?.(finalMood, finalIntensity);

      // Reset form
      resetForm();
      setIsOpen(false);
    } catch (error) {
      console.error('Error submitting mood:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedMood(null);
    setIntensity(3);
    setNotes('');
    setSelectedTriggers([]);
    setSecondaryMoods([]);
    setShowFullForm(false);
  };

  const toggleTrigger = (trigger: string) => {
    setSelectedTriggers(prev =>
      prev.includes(trigger)
        ? prev.filter(t => t !== trigger)
        : [...prev, trigger]
    );
  };

  const toggleSecondaryMood = (mood: MoodType) => {
    setSecondaryMoods(prev =>
      prev.includes(mood)
        ? prev.filter(m => m !== mood)
        : [...prev, mood]
    );
  };

  const getIntensityLabel = (level: number) => {
    const labels = ['Very Low', 'Low', 'Moderate', 'High', 'Very High'];
    return labels[level - 1];
  };

  const getIntensityColor = (level: number) => {
    const colors = [
      'bg-gray-200',
      'bg-blue-200',
      'bg-yellow-200',
      'bg-orange-200',
      'bg-red-200'
    ];
    return colors[level - 1];
  };

  return (
    <div className="relative">
      {/* Mood Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-pink-100 to-purple-100 hover:from-pink-200 hover:to-purple-200 rounded-lg transition-all duration-200 border border-pink-200"
      >
        <Heart className="h-4 w-4 text-pink-600" />
        <span className="text-sm font-medium text-gray-700">
          {todaysMood ? `Today: ${MOOD_TYPES[todaysMood.mood_type as MoodType]?.emoji} ${MOOD_TYPES[todaysMood.mood_type as MoodType]?.label}` : 'How are you feeling?'}
        </span>
      </button>

      {/* Mood Selection Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">How are you feeling?</h3>
                  <p className="text-sm text-gray-600">
                    {isSupabaseConnected 
                      ? 'Share your mood and feelings - they\'ll be saved for future reference'
                      : 'Share your current mood (local mode - not saved)'
                    }
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Quick vs Detailed Toggle */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setShowFullForm(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      !showFullForm 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Quick Check-in
                  </button>
                  <button
                    onClick={() => setShowFullForm(true)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      showFullForm 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Detailed Entry
                  </button>
                </div>
              </div>

              {/* Mood Selection Grid */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Select your primary mood:</h4>
                <div className="grid grid-cols-4 gap-3">
                  {Object.entries(MOOD_TYPES).map(([key, mood]) => (
                    <button
                      key={key}
                      onClick={() => handleMoodSelect(key as MoodType)}
                      className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                        selectedMood === key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{mood.emoji}</div>
                      <div className="text-xs font-medium text-gray-700">{mood.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Form */}
              {showFullForm && selectedMood && (
                <div className="space-y-6">
                  {/* Intensity Slider */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Intensity: {getIntensityLabel(intensity)}
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500">Low</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={intensity}
                        onChange={(e) => setIntensity(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-500">High</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      {[1, 2, 3, 4, 5].map(level => (
                        <div
                          key={level}
                          className={`w-4 h-2 rounded ${
                            level <= intensity ? getIntensityColor(intensity) : 'bg-gray-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Secondary Moods */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional feelings (optional):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(MOOD_TYPES)
                        .filter(([key]) => key !== selectedMood)
                        .slice(0, 9)
                        .map(([key, mood]) => (
                          <button
                            key={key}
                            onClick={() => toggleSecondaryMood(key as MoodType)}
                            className={`p-2 rounded-lg border text-xs transition-all ${
                              secondaryMoods.includes(key as MoodType)
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {mood.emoji} {mood.label}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Triggers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      What influenced this mood? (optional):
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {COMMON_TRIGGERS.map(trigger => (
                        <button
                          key={trigger}
                          onClick={() => toggleTrigger(trigger)}
                          className={`p-2 rounded-lg border text-xs text-left transition-all ${
                            selectedTriggers.includes(trigger)
                              ? 'border-purple-500 bg-purple-50 text-purple-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {trigger}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional notes (optional):
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe your feelings, what happened today, or anything else you'd like to remember..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        resetForm();
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSubmit()}
                      disabled={isSubmitting}
                      className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Save Mood</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Today's Mood Display */}
              {todaysMood && isSupabaseConnected && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Today's Mood Entry:</h4>
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {MOOD_TYPES[todaysMood.mood_type as MoodType]?.emoji}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">
                        {MOOD_TYPES[todaysMood.mood_type as MoodType]?.label}
                      </p>
                      <p className="text-sm text-gray-600">
                        Intensity: {getIntensityLabel(todaysMood.intensity)}
                      </p>
                      {todaysMood.notes && (
                        <p className="text-sm text-gray-600 mt-1">"{todaysMood.notes}"</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoodSelector;