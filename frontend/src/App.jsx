import React, { useState } from 'react';
import { MapPin, Clock, Heart, Navigation, Sparkles, Coffee, Camera, TreePine, ShoppingBag, BookOpen, Music, Zap, Shield, Shuffle, AlertCircle } from 'lucide-react';

const JourneyPlannerApp = () => {
  const [formData, setFormData] = useState({
    departure: '',
    destination: '',
    departureTime: '',
    arrivalTime: '',
    mood: [],
    suggestionStyle: 'balanced'
  });
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const suggestionStyles = [
    { 
      id: 'safe', 
      label: '定番・安心', 
      icon: Shield,
      color: 'bg-green-100 text-green-700',
      description: '確実で安全な定番スポット'
    },
    { 
      id: 'balanced', 
      label: 'バランス', 
      icon: Shuffle,
      color: 'bg-blue-100 text-blue-700',
      description: '定番とユニークのミックス'
    },
    { 
      id: 'creative', 
      label: '冒険・ユニーク', 
      icon: Zap,
      color: 'bg-purple-100 text-purple-700',
      description: '意外性のある隠れた体験'
    }
  ];

  const moodOptions = [
    { id: 'relaxed', label: 'リラックス', icon: TreePine, color: 'bg-green-100 text-green-700' },
    { id: 'adventurous', label: '冒険したい', icon: Navigation, color: 'bg-blue-100 text-blue-700' },
    { id: 'cultural', label: '文化に触れたい', icon: BookOpen, color: 'bg-purple-100 text-purple-700' },
    { id: 'foodie', label: 'グルメ気分', icon: Coffee, color: 'bg-orange-100 text-orange-700' },
    { id: 'shopping', label: 'ショッピング', icon: ShoppingBag, color: 'bg-pink-100 text-pink-700' },
    { id: 'photo', label: '写真を撮りたい', icon: Camera, color: 'bg-indigo-100 text-indigo-700' },
    { id: 'music', label: '音楽を楽しみたい', icon: Music, color: 'bg-yellow-100 text-yellow-700' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleMoodToggle = (moodId) => {
    setFormData(prev => ({
      ...prev,
      mood: prev.mood.includes(moodId) 
        ? prev.mood.filter(m => m !== moodId)
        : [...prev.mood, moodId]
    }));
    setError(null);
  };

  const calculateTravelTime = (departure, arrival) => {
    if (!departure || !arrival) return null;
    
    const [depHour, depMin] = departure.split(':').map(Number);
    const [arrHour, arrMin] = arrival.split(':').map(Number);
    
    let totalMinutes = (arrHour * 60 + arrMin) - (depHour * 60 + depMin);
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return { hours, minutes, totalMinutes };
  };

  const generateSuggestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('リクエストデータ:', formData);
      
      const response = await fetch('https://planner-backend-ee00.onrender.com/api/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      console.log('レスポンスステータス:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Gemini APIレスポンス:', result);
      
      if (result.success && result.data) {
        // Gemini APIの実際のレスポンスを安全に処理
        console.log('処理前のAPIデータ:', result.data);
        
        let safeSuggestions;
        
        // APIからの実際のデータを試みる
        if (result.data.suggestions && Array.isArray(result.data.suggestions)) {
          const processedSuggestions = result.data.suggestions.map((suggestion, index) => ({
            type: String(suggestion.type || 'AI提案'),
            name: String(suggestion.name || `Gemini提案 ${index + 1}`),
            duration: String(suggestion.duration || '60分'),
            description: String(suggestion.description || 'Gemini AIからの提案'),
          }));
          
          safeSuggestions = {
            route: String(result.data.route || `${formData.departure} → ${formData.destination}`),
            style: String(result.data.style || formData.suggestionStyle),
            travelTime: result.data.travelTime || calculateTravelTime(formData.departureTime, formData.arrivalTime),
            suggestions: processedSuggestions
          };
        } else {
          // フォールバック（APIデータ形式が期待と違う場合）
          safeSuggestions = {
            route: `${formData.departure} → ${formData.destination}`,
            style: formData.suggestionStyle,
            travelTime: calculateTravelTime(formData.departureTime, formData.arrivalTime),
            suggestions: [
              {
                type: 'AI提案',
                name: 'Gemini AIからの提案',
                duration: '60分',
                description: 'Gemini AIが生成した旅行提案が正常に受信されました。',
              }
            ]
          };
        }
        
        console.log('設定された提案データ:', safeSuggestions);
        setSuggestions(safeSuggestions);
      } else {
        throw new Error(result.error || 'APIエラー');
      }
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setError(`エラー: ${err.message}`);
      
      // フォールバック
      const travelTime = calculateTravelTime(formData.departureTime, formData.arrivalTime);
      const mockSuggestions = {
        route: `${formData.departure} → ${formData.destination}`,
        style: formData.suggestionStyle,
        travelTime: travelTime,
        suggestions: [
          {
            type: 'デモ',
            name: 'フォールバック提案',
            duration: '45分',
            description: 'デモ用の提案です。実際のGemini APIとの接続を確認中...',
          }
        ]
      };
      setSuggestions(mockSuggestions);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    return formData.departure && formData.destination && 
           formData.departureTime && formData.arrivalTime && 
           formData.mood.length > 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-800">Journey AI</h1>
          </div>
          <p className="text-gray-600 text-lg">気分に合わせた最適な旅程を提案します</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* 入力フォーム */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                旅程の詳細
              </h2>

              <div className="space-y-4">
                {/* 出発地 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    出発地
                  </label>
                  <input
                    type="text"
                    value={formData.departure}
                    onChange={(e) => handleInputChange('departure', e.target.value)}
                    placeholder="例: 東京駅"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 目的地 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目的地
                  </label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => handleInputChange('destination', e.target.value)}
                    placeholder="例: 横浜駅"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* 時刻設定 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      出発時刻
                    </label>
                    <input
                      type="time"
                      value={formData.departureTime}
                      onChange={(e) => handleInputChange('departureTime', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      到着希望時刻
                    </label>
                    <input
                      type="time"
                      value={formData.arrivalTime}
                      onChange={(e) => handleInputChange('arrivalTime', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* 気分選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    今日の気分（複数選択可）
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {moodOptions.map((mood) => {
                      const isSelected = formData.mood.includes(mood.id);
                      const IconComponent = mood.icon;
                      return (
                        <button
                          key={mood.id}
                          onClick={() => handleMoodToggle(mood.id)}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            isSelected 
                              ? `${mood.color} border-current` 
                              : 'bg-gray-200 border-gray-400 hover:bg-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {IconComponent && <IconComponent className="w-4 h-4" />}
                            <span className="text-sm font-medium">{mood.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 提案スタイル選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    提案のスタイル
                  </label>
                  <div className="space-y-2">
                    {suggestionStyles.map((style) => {
                      const isSelected = formData.suggestionStyle === style.id;
                      const IconComponent = style.icon;
                      return (
                        <button
                          key={style.id}
                          onClick={() => handleInputChange('suggestionStyle', style.id)}
                          className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                            isSelected 
                              ? `${style.color} border-current` 
                              : 'bg-gray-200 border-gray-400 hover:bg-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {IconComponent && <IconComponent className="w-5 h-5" />}
                            <div>
                              <div className="font-medium">{style.label}</div>
                              <div className="text-xs opacity-75">{style.description}</div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* エラー表示 */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                )}

                {/* 提案ボタン */}
                <button
                  onClick={generateSuggestions}
                  disabled={!isFormValid() || loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Gemini AIが最適なプランを考えています...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Gemini AIで最適なプランを提案
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* 提案結果 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-purple-600" />
                おすすめプラン
              </h2>

              {!suggestions ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Heart className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">
                    左のフォームに入力して、<br />
                    あなたにぴったりのプランを見つけましょう！
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 旅程概要 */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-800">旅程概要</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{suggestions.route || '旅程情報なし'}</p>
                    {suggestions.travelTime && (
                      <p className="text-sm text-gray-600 mb-1">
                        利用可能時間: {suggestions.travelTime.hours}時間{suggestions.travelTime.minutes}分
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-2">
                      {suggestions.style === 'safe' && <Shield className="w-3 h-3 text-green-600" />}
                      {suggestions.style === 'balanced' && <Shuffle className="w-3 h-3 text-blue-600" />}
                      {suggestions.style === 'creative' && <Zap className="w-3 h-3 text-purple-600" />}
                      <span className="text-xs text-gray-500">
                        {suggestions.style === 'safe' && '安心・定番プラン'}
                        {suggestions.style === 'balanced' && 'バランスプラン'}
                        {suggestions.style === 'creative' && '冒険・ユニークプラン'}
                      </span>
                    </div>
                  </div>

                  {/* 提案リスト */}
                  <div className="space-y-4">
                    {suggestions.suggestions && suggestions.suggestions.map((suggestion, index) => {
                      return (
                        <div key={`suggestion-${index}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Navigation className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-800">{suggestion.name || '名称不明'}</h3>
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                  {suggestion.type || 'その他'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{suggestion.description || '詳細情報なし'}</p>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>所要時間: {suggestion.duration || '不明'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JourneyPlannerApp;