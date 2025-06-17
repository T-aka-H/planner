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

  // アイコン名から実際のコンポーネントへのマッピング
  const getIconComponent = (iconName) => {
    const iconMap = {
      BookOpen,
      Coffee,
      TreePine,
      Navigation,
      Camera,
      ShoppingBag,
      Music,
      Heart
    };
    
    if (typeof iconName === 'string') {
      return iconMap[iconName] || Navigation;
    }
    
    return iconName || Navigation;
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
        // レスポンスデータを安全に処理
        const safeData = processSafeData(result.data);
        console.log('処理後の安全なデータ:', safeData);
        setSuggestions(safeData);
      } else {
        throw new Error(result.error || 'APIエラー');
      }
    } catch (err) {
      console.error('Error generating suggestions:', err);
      setError(`エラー: ${err.message}`);
      
      // フォールバック
      const travelTime = calculateTravelTime(formData.departureTime, formData.arrivalTime);
      const mockSuggestions = generateMockSuggestions(formData, travelTime);
      setSuggestions(mockSuggestions);
    } finally {
      setLoading(false);
    }
  };

  // 安全なデータ処理関数
  const processSafeData = (data) => {
    if (!data || typeof data !== 'object') {
      return generateDefaultSuggestions();
    }

    const safeSuggestions = [];
    
    if (Array.isArray(data.suggestions)) {
      data.suggestions.forEach((suggestion, index) => {
        if (suggestion && typeof suggestion === 'object') {
          safeSuggestions.push({
            type: String(suggestion.type || 'その他'),
            name: String(suggestion.name || `提案 ${index + 1}`),
            duration: String(suggestion.duration || '不明'),
            description: String(suggestion.description || '詳細情報なし'),
            icon: getIconComponent(suggestion.icon)
          });
        }
      });
    }

    return {
      travelTime: data.travelTime || null,
      route: String(data.route || `${formData.departure} → ${formData.destination}`),
      style: String(data.style || formData.suggestionStyle),
      suggestions: safeSuggestions.length > 0 ? safeSuggestions : generateDefaultSuggestions().suggestions
    };
  };

  const generateDefaultSuggestions = () => {
    return {
      travelTime: calculateTravelTime(formData.departureTime, formData.arrivalTime),
      route: `${formData.departure} → ${formData.destination}`,
      style: formData.suggestionStyle,
      suggestions: [
        {
          type: '直行',
          name: '目的地へ直行',
          duration: '移動時間のみ',
          description: '最適なプランを生成中です。しばらくお待ちください。',
          icon: Navigation
        }
      ]
    };
  };

  const generateMockSuggestions = (data, travelTime) => {
    const selectedMoods = data.mood || [];
    const style = data.suggestionStyle || 'balanced';
    let suggestions = [];

    if (travelTime && travelTime.totalMinutes > 60) {
      if (style === 'safe') {
        if (selectedMoods.includes('cultural')) {
          suggestions.push({
            type: '文化スポット',
            name: '地域の歴史博物館',
            duration: '45分',
            description: '地域の歴史と文化に触れることができる素敵な博物館です。',
            icon: BookOpen
          });
        }
        if (selectedMoods.includes('foodie')) {
          suggestions.push({
            type: 'グルメ',
            name: '老舗の和食レストラン',
            duration: '60分',
            description: '地元で愛される老舗の和食店で、季節の料理を楽しめます。',
            icon: Coffee
          });
        }
      } else if (style === 'creative') {
        if (selectedMoods.includes('cultural')) {
          suggestions.push({
            type: '隠れ文化',
            name: '地下に眠る防空壕跡ツアー',
            duration: '60分',
            description: '一般公開されていない戦時中の防空壕を地元ガイドと探検。',
            icon: BookOpen
          });
        }
      }
    }

    return {
      travelTime,
      route: `${data.departure} → ${data.destination}`,
      style: style,
      suggestions: suggestions.length > 0 ? suggestions : [
        {
          type: '直行',
          name: '目的地へ直行',
          duration: '移動時間のみ',
          description: '時間が限られているため、目的地へ直行することをお勧めします。',
          icon: Navigation
        }
      ]
    };
  };

  const isFormValid = () => {
    return formData.departure && formData.destination && 
           formData.departureTime && formData.arrivalTime && 
           formData.mood.length > 0;
  };

  const renderIcon = (IconComponent, className = "") => {
    if (!IconComponent) return null;
    try {
      return React.createElement(IconComponent, { className });
    } catch (error) {
      console.error('Icon render error:', error);
      return React.createElement(Navigation, { className });
    }
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
                      return (
                        <button
                          key={mood.id}
                          onClick={() => handleMoodToggle(mood.id)}
                          className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                            isSelected 
                              ? `${mood.color} border-current` 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {renderIcon(mood.icon, "w-4 h-4")}
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
                      return (
                        <button
                          key={style.id}
                          onClick={() => handleInputChange('suggestionStyle', style.id)}
                          className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                            isSelected 
                              ? `${style.color} border-current` 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {renderIcon(style.icon, "w-5 h-5")}
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
                      AIが最適なプランを考えています...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      最適なプランを提案
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
                      {suggestions.style === 'safe' ? <Shield className="w-3 h-3 text-green-600" /> : null}
                      {suggestions.style === 'balanced' ? <Shuffle className="w-3 h-3 text-blue-600" /> : null}
                      {suggestions.style === 'creative' ? <Zap className="w-3 h-3 text-purple-600" /> : null}
                      <span className="text-xs text-gray-500">
                        {suggestions.style === 'safe' && '安心・定番プラン'}
                        {suggestions.style === 'balanced' && 'バランスプラン'}
                        {suggestions.style === 'creative' && '冒険・ユニークプラン'}
                      </span>
                    </div>
                  </div>

                  {/* 提案リスト */}
                  <div className="space-y-4">
                    {(suggestions.suggestions || []).map((suggestion, index) => {
                      return (
                        <div key={`suggestion-${index}-${suggestion.name || index}`} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              {renderIcon(suggestion.icon, "w-5 h-5 text-blue-600")}
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